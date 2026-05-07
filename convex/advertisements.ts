import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

async function getImageUrl(ctx: Ctx, imageId?: Id<"_storage">) {
  if (!imageId) return null;
  return await ctx.storage.getUrl(imageId);
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const ads = await ctx.db
      .query("advertisements")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    return await Promise.all(
      ads.map(async (ad) => ({
        ...ad,
        imageUrl: await getImageUrl(ctx, ad.imageId),
      })),
    );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const ads = await ctx.db.query("advertisements").order("desc").collect();
    return await Promise.all(
      ads.map(async (ad) => ({
        ...ad,
        imageUrl: await getImageUrl(ctx, ad.imageId),
      })),
    );
  },
});

export const create = mutation({
  args: {
    label: v.string(),
    url: v.string(),
    imageId: v.optional(v.id("_storage")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("advertisements", {
      label: args.label.trim(),
      url: args.url.trim(),
      imageId: args.imageId,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    advertisementId: v.id("advertisements"),
    label: v.string(),
    url: v.string(),
    imageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.advertisementId);
    if (!existing) throw new Error("Advertisement not found");

    const nextImageId = args.removeImage ? undefined : args.imageId ?? existing.imageId;

    await ctx.db.patch(args.advertisementId, {
      label: args.label.trim(),
      url: args.url.trim(),
      imageId: nextImageId,
      updatedAt: Date.now(),
    });

    if (args.removeImage && existing.imageId) {
      await ctx.storage.delete(existing.imageId);
    }

    return null;
  },
});

export const setActive = mutation({
  args: {
    advertisementId: v.id("advertisements"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.advertisementId, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: {
    advertisementId: v.id("advertisements"),
    deleteImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.advertisementId);
    if (!existing) return null;

    await ctx.db.delete(args.advertisementId);

    if ((args.deleteImage ?? true) && existing.imageId) {
      await ctx.storage.delete(existing.imageId);
    }

    return null;
  },
});
