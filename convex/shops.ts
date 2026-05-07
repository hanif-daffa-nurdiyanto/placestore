import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function requireCurrentUser(ctx: { auth: { getUserIdentity: () => Promise<any> }; db: any }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  if (user) return user;

  // Fallback: if Clerk webhook isn't configured, create the user on first auth.
  const email =
    typeof identity.email === "string" && identity.email
      ? identity.email
      : `${identity.subject}@unknown`;
  const name =
    typeof identity.name === "string" && identity.name ? identity.name : undefined;
  const imageUrl =
    typeof identity.pictureUrl === "string" && identity.pictureUrl
      ? identity.pictureUrl
      : undefined;

  const id = await ctx.db.insert("users", {
    externalId: identity.subject,
    email,
    name,
    imageUrl,
    plan: "free",
  });

  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create user");
  return created;
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createShop = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    logoId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const userShops = await ctx.db
      .query("shops")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const limit = user.plan === "pro" ? 5 : 3; // Pro = 3 + 2

    if (userShops.length >= limit) {
      throw new Error(`Limit tercapai! Upgrade ke Pro untuk membuat lebih dari ${limit} toko.`);
    }

    return await ctx.db.insert("shops", {
      userId: user._id,
      name: args.name.trim(),
      description: args.description?.trim(),
      address: args.address?.trim(),
      location: args.location,
      logoId: args.logoId as Id<"_storage"> | undefined,
      slug: args.slug.trim(),
    });
  },
});


export const getByClerkUserId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) =>
        q.eq("externalId", args.clerkUserId)
      )
      .first();

    if (!user) return null;

    const shop = await ctx.db
      .query("shops")
      .withIndex("by_userId", (q) =>
        q.eq("userId", user._id)
      )
      .first();

    return shop ?? null;
  },
});


export const getCurrentUserShops = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return [];

    return await ctx.db
      .query("shops")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getById = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) return null;
    if (shop.userId !== user._id) throw new Error("Unauthorized");

    const logoUrl = shop.logoId ? await ctx.storage.getUrl(shop.logoId) : null;
    return { ...shop, logoUrl };
  },
});

export const updateShop = mutation({
  args: {
    shopId: v.id("shops"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    logoId: v.optional(v.id("_storage")),
    removeLogo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    if (shop.userId !== user._id) throw new Error("Unauthorized");

    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.address !== undefined) patch.address = args.address.trim();
    if (args.location !== undefined) patch.location = args.location;

    let shouldDeleteOldLogo = false;
    if (args.removeLogo) {
      patch.logoId = undefined;
      shouldDeleteOldLogo = Boolean(shop.logoId);
    } else if (args.logoId !== undefined) {
      patch.logoId = args.logoId as Id<"_storage">;
      shouldDeleteOldLogo = Boolean(shop.logoId && shop.logoId !== args.logoId);
    }

    await ctx.db.patch(args.shopId, patch);

    if (shouldDeleteOldLogo && shop.logoId) {
      await ctx.storage.delete(shop.logoId);
    }

    return args.shopId;
  },
});

export const deleteShop = mutation({
  args: {
    shopId: v.id("shops"),
    deleteProducts: v.optional(v.boolean()),
    deleteProductImages: v.optional(v.boolean()),
    deleteLogo: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const shop = await ctx.db.get(args.shopId);
    if (!shop) throw new Error("Shop not found");
    if (shop.userId !== user._id) throw new Error("Unauthorized");

    if (args.deleteProducts) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_shopId", (q) => q.eq("shopId", args.shopId))
        .collect();

      for (const p of products) {
        const skus = await ctx.db
          .query("productSkus")
          .withIndex("by_productId", (q) => q.eq("productId", p._id))
          .collect();
        for (const sku of skus) {
          await ctx.db.delete(sku._id);
        }

        await ctx.db.delete(p._id);
        if (args.deleteProductImages) {
          await Promise.all(p.imageIds.map((id) => ctx.storage.delete(id)));
        }
      }
    }

    if (args.deleteLogo && shop.logoId) {
      await ctx.storage.delete(shop.logoId);
    }

    await ctx.db.delete(args.shopId);
    return null;
  },
});
