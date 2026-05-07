import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type TransactionStatus = "pending" | "processing" | "shipping" | "received" | "canceled";

async function requireCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
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

function normalizeTxStatus(input: string): TransactionStatus {
  if (
    input === "pending" ||
    input === "processing" ||
    input === "shipping" ||
    input === "received" ||
    input === "canceled"
  ) {
    return input;
  }
  if (input === "cancelled") return "canceled";
  if (input === "paid") return "processing";
  if (input === "shipped") return "shipping";
  if (input === "delivered") return "received";
  return "pending";
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    transactionId: v.id("transactions"),
    productId: v.id("products"),
    rating: v.number(),
    reviewText: v.optional(v.string()),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const buyer = await requireCurrentUser(ctx);

    const rating = Math.floor(args.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new Error("Invalid rating");
    }
    if (args.imageIds.length > 8) throw new Error("Too many images");

    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.buyerUserId !== buyer._id) throw new Error("Unauthorized");
    if (normalizeTxStatus(tx.status as string) !== "received") {
      throw new Error("You can only review received orders");
    }

    const hasProduct = tx.items.some((it) => it.productId === args.productId);
    if (!hasProduct) throw new Error("Product not found in transaction");

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_buyerUserId_and_productId_and_transactionId", (q) =>
        q
          .eq("buyerUserId", buyer._id)
          .eq("productId", args.productId)
          .eq("transactionId", args.transactionId),
      )
      .unique();
    if (existing) throw new Error("You already reviewed this product for this order");

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    const now = Date.now();
    const id = await ctx.db.insert("reviews", {
      buyerUserId: buyer._id,
      transactionId: args.transactionId,
      productId: args.productId,
      shopId: product.shopId,
      rating,
      reviewText: args.reviewText?.trim() ? args.reviewText.trim() : undefined,
      imageIds: args.imageIds,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const listByProduct = query({
  args: { productId: v.id("products"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(50, Math.max(1, Math.floor(args.limit ?? 20)));
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .order("desc")
      .take(limit);

    return await Promise.all(
      reviews.map(async (r) => {
        const buyer = await ctx.db.get(r.buyerUserId);
        const imageUrls = await Promise.all(r.imageIds.map((id) => ctx.storage.getUrl(id)));
        return {
          ...r,
          buyer: buyer
            ? { name: buyer.name ?? buyer.email, imageUrl: buyer.imageUrl ?? null }
            : { name: "Unknown", imageUrl: null },
          imageUrls: imageUrls.filter((u): u is string => typeof u === "string" && u.length > 0),
        };
      }),
    );
  },
});

export const listMyByTransaction = query({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const buyer = await requireCurrentUser(ctx);
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_transactionId_and_buyerUserId", (q) =>
        q.eq("transactionId", args.transactionId).eq("buyerUserId", buyer._id),
      )
      .collect();

    return reviews.map((r) => ({
      _id: r._id,
      productId: r.productId,
      rating: r.rating,
      createdAt: r.createdAt,
    }));
  },
});

export const getProductSummary = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    if (reviews.length === 0) return { avgRating: null as number | null, reviewCount: 0 };
    const sum = reviews.reduce((acc, r) => acc + (typeof r.rating === "number" ? r.rating : 0), 0);
    const avg = sum / reviews.length;
    return { avgRating: Math.round(avg * 10) / 10, reviewCount: reviews.length };
  },
});

export const getSummariesForProducts = query({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const result: Record<string, { avgRating: number | null; reviewCount: number }> = {};
    for (const productId of args.productIds) {
      const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_productId", (q) => q.eq("productId", productId))
        .collect();
      if (reviews.length === 0) {
        result[String(productId)] = { avgRating: null, reviewCount: 0 };
        continue;
      }
      const sum = reviews.reduce((acc, r) => acc + (typeof r.rating === "number" ? r.rating : 0), 0);
      const avg = sum / reviews.length;
      result[String(productId)] = { avgRating: Math.round(avg * 10) / 10, reviewCount: reviews.length };
    }
    return result;
  },
});
