import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type CtxAny = { auth: { getUserIdentity: () => Promise<any> }; db: any };

async function requireCurrentUser(ctx: CtxAny) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q: any) => q.eq("externalId", identity.subject))
    .unique();

  if (user) return user;

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

export const listCurrentUserAddresses = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return [];

    const items = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    return items.sort((a: any, b: any) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    });
  },
});

export const createAddress = mutation({
  args: {
    label: v.string(),
    recipientName: v.string(),
    phone: v.string(),
    address: v.string(),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    setAsPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .collect();

    const shouldBePrimary = Boolean(args.setAsPrimary) || existing.length === 0;

    if (shouldBePrimary) {
      for (const a of existing) {
        if (a.isPrimary) {
          await ctx.db.patch(a._id, { isPrimary: false, updatedAt: now });
        }
      }
    }

    return await ctx.db.insert("addresses", {
      userId: user._id,
      label: args.label.trim(),
      recipientName: args.recipientName.trim(),
      phone: args.phone.trim(),
      address: args.address.trim(),
      location: args.location,
      isPrimary: shouldBePrimary,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateAddress = mutation({
  args: {
    addressId: v.id("addresses"),
    label: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    clearLocation: v.optional(v.boolean()),
    setAsPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const doc = await ctx.db.get(args.addressId);
    if (!doc) throw new Error("Address not found");
    if (doc.userId !== user._id) throw new Error("Unauthorized");

    if (args.setAsPrimary) {
      const existing = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
        .collect();
      for (const a of existing) {
        if (a._id !== args.addressId && a.isPrimary) {
          await ctx.db.patch(a._id, { isPrimary: false, updatedAt: now });
        }
      }
    }

    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.label !== undefined) patch.label = args.label.trim();
    if (args.recipientName !== undefined)
      patch.recipientName = args.recipientName.trim();
    if (args.phone !== undefined) patch.phone = args.phone.trim();
    if (args.address !== undefined) patch.address = args.address.trim();
    if (args.clearLocation) patch.location = undefined;
    else if (args.location !== undefined) patch.location = args.location;
    if (args.setAsPrimary !== undefined) patch.isPrimary = Boolean(args.setAsPrimary);

    await ctx.db.patch(args.addressId, patch);
    return args.addressId;
  },
});

export const deleteAddress = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.addressId);
    if (!doc) return null;
    if (doc.userId !== user._id) throw new Error("Unauthorized");

    const wasPrimary = Boolean(doc.isPrimary);
    await ctx.db.delete(args.addressId);

    if (wasPrimary) {
      const remaining = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
        .collect();

      const next = remaining.sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
      if (next) {
        await ctx.db.patch(next._id, { isPrimary: true, updatedAt: Date.now() });
      }
    }

    return null;
  },
});

export const setPrimaryAddress = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const doc = await ctx.db.get(args.addressId);
    if (!doc) throw new Error("Address not found");
    if (doc.userId !== user._id) throw new Error("Unauthorized");

    const now = Date.now();

    const existing = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .collect();

    for (const a of existing) {
      if (a._id === args.addressId) continue;
      if (a.isPrimary) await ctx.db.patch(a._id, { isPrimary: false, updatedAt: now });
    }

    await ctx.db.patch(args.addressId, { isPrimary: true, updatedAt: now });
    return args.addressId;
  },
});

