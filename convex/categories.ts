import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

async function getImageUrl(ctx: Ctx, imageId?: Id<"_storage">) {
  if (!imageId) return null;
  return await ctx.storage.getUrl(imageId);
}

async function requireUniqueSlug(ctx: Ctx, slug: string, excludeId?: Id<"categories">) {
  const existing = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (!existing) return;
  if (excludeId && existing._id === excludeId) return;
  throw new Error("Slug sudah dipakai");
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").order("desc").collect();
    return await Promise.all(
      categories.map(async (category) => ({
        ...category,
        imageUrl: await getImageUrl(ctx, category.imageId),
      })),
    );
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.trim()))
      .unique();

    if (!category) return null;
    return { ...category, imageUrl: await getImageUrl(ctx, category.imageId) };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    imageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const slug = args.slug.trim();
    if (!name) throw new Error("Name wajib diisi");
    if (!slug) throw new Error("Slug wajib diisi");

    await requireUniqueSlug(ctx, slug);

    const now = Date.now();
    return await ctx.db.insert("categories", {
      name,
      slug,
      imageId: args.imageId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.string(),
    slug: v.string(),
    imageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.categoryId);
    if (!existing) throw new Error("Category not found");

    const name = args.name.trim();
    const slug = args.slug.trim();
    if (!name) throw new Error("Name wajib diisi");
    if (!slug) throw new Error("Slug wajib diisi");

    if (slug !== existing.slug) {
      await requireUniqueSlug(ctx, slug, args.categoryId);
    }

    const nextImageId = args.removeImage ? undefined : args.imageId ?? existing.imageId;

    await ctx.db.patch(args.categoryId, {
      name,
      slug,
      imageId: nextImageId,
      updatedAt: Date.now(),
    });

    if (args.removeImage && existing.imageId) {
      await ctx.storage.delete(existing.imageId);
    }

    return null;
  },
});

export const remove = mutation({
  args: {
    categoryId: v.id("categories"),
    deleteImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.categoryId);
    if (!existing) return null;

    await ctx.db.delete(args.categoryId);

    if ((args.deleteImage ?? true) && existing.imageId) {
      await ctx.storage.delete(existing.imageId);
    }

    return null;
  },
});

