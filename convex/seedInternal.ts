import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";

const entityTypeValidator = v.union(
  v.literal("shop"),
  v.literal("product"),
  v.literal("sku"),
  v.literal("transaction"),
  v.literal("review"),
  v.literal("asset"),
);

type SeedEntityType =
  | "shop"
  | "product"
  | "sku"
  | "transaction"
  | "review"
  | "asset";

async function getSeedRecord(
  ctx: MutationCtx,
  namespace: string,
  entityType: SeedEntityType,
  seedKey: string,
) {
  return await ctx.db
    .query("seedRecords")
    .withIndex("by_namespace_and_entityType_and_seedKey", (q) =>
      q.eq("namespace", namespace).eq("entityType", entityType).eq("seedKey", seedKey),
    )
    .unique();
}

async function upsertSeedRecord(
  ctx: MutationCtx,
  args: {
    namespace: string;
    entityType: SeedEntityType;
    seedKey: string;
    entityId: string;
    checksum: string;
    storageId?: Id<"_storage">;
    sourceUrl?: string;
    sourcePage?: string;
    creator?: string;
    license?: string;
    attribution?: string;
  },
) {
  const now = Date.now();
  const existing = await getSeedRecord(
    ctx,
    args.namespace,
    args.entityType,
    args.seedKey,
  );
  const value = {
    entityId: args.entityId,
    checksum: args.checksum,
    storageId: args.storageId,
    sourceUrl: args.sourceUrl,
    sourcePage: args.sourcePage,
    creator: args.creator,
    license: args.license,
    attribution: args.attribution,
    updatedAt: now,
  };
  if (existing) {
    await ctx.db.patch(existing._id, value);
    return existing._id;
  }
  return await ctx.db.insert("seedRecords", {
    namespace: args.namespace,
    entityType: args.entityType,
    seedKey: args.seedKey,
    ...value,
    createdAt: now,
  });
}

export const inspect = internalQuery({
  args: { namespace: v.string(), categorySlugs: v.array(v.string()) },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").order("asc").take(6);
    const categories = await ctx.db.query("categories").take(20);
    const seededProducts = await ctx.db
      .query("seedRecords")
      .withIndex("by_namespace_and_entityType_and_seedKey", (q) =>
        q.eq("namespace", args.namespace).eq("entityType", "product"),
      )
      .take(100);
    const seededShops = await ctx.db
      .query("seedRecords")
      .withIndex("by_namespace_and_entityType_and_seedKey", (q) =>
        q.eq("namespace", args.namespace).eq("entityType", "shop"),
      )
      .take(20);
    const seededShopStats = (
      await Promise.all(
        seededShops.map(async (record) => {
          const shopId = ctx.db.normalizeId("shops", record.entityId);
          const shop = shopId ? await ctx.db.get(shopId) : null;
          return shop ? { seedKey: record.seedKey, userId: shop.userId } : null;
        }),
      )
    ).filter((shop) => shop !== null);
    const seededProductIds = new Set(seededProducts.map((record) => record.entityId));

    const selectedCategories = categories.filter((category) =>
      args.categorySlugs.includes(category.slug),
    );
    const categoryStats = await Promise.all(
      selectedCategories.map(async (category) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
          .take(50);
        return {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          totalProducts: products.length,
          seedProducts: products.filter((product) =>
            seededProductIds.has(String(product._id)),
          ).length,
          nonSeedProducts: products.filter(
            (product) => !seededProductIds.has(String(product._id)),
          ).length,
        };
      }),
    );
    const selectedUsers = users.slice(0, 5);
    const userStats = await Promise.all(
      selectedUsers.map(async (user) => ({
        _id: user._id,
        plan: user.plan,
        shopCount: (
          await ctx.db
            .query("shops")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .take(6)
        ).length,
      })),
    );

    return {
      totalUsersFound: users.length,
      users: userStats,
      seededShopKeys: seededShops.map((record) => record.seedKey),
      seededShops: seededShopStats,
      categories: categoryStats,
      missingCategorySlugs: args.categorySlugs.filter(
        (slug) => !selectedCategories.some((category) => category.slug === slug),
      ),
    };
  },
});

export const getAsset = internalQuery({
  args: { namespace: v.string(), seedKey: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("seedRecords")
      .withIndex("by_namespace_and_entityType_and_seedKey", (q) =>
        q
          .eq("namespace", args.namespace)
          .eq("entityType", "asset")
          .eq("seedKey", args.seedKey),
      )
      .unique();
    if (!record?.storageId) return null;
    const file = await ctx.db.system.get("_storage", record.storageId);
    return file ? { ...record, valid: true as const } : null;
  },
});

export const saveAsset = internalMutation({
  args: {
    namespace: v.string(),
    seedKey: v.string(),
    checksum: v.string(),
    storageId: v.id("_storage"),
    sourceUrl: v.string(),
    sourcePage: v.string(),
    creator: v.optional(v.string()),
    license: v.string(),
    attribution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await upsertSeedRecord(ctx, {
      ...args,
      entityType: "asset",
      entityId: String(args.storageId),
    });
    return args.storageId;
  },
});

export const startRun = internalMutation({
  args: { namespace: v.string(), manifestVersion: v.string() },
  handler: async (ctx, args) =>
    await ctx.db.insert("seedRuns", {
      namespace: args.namespace,
      manifestVersion: args.manifestVersion,
      status: "running",
      startedAt: Date.now(),
    }),
});

export const finishRun = internalMutation({
  args: {
    runId: v.id("seedRuns"),
    status: v.union(v.literal("completed"), v.literal("failed")),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      status: args.status,
      summary: args.summary,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const upsertShop = internalMutation({
  args: {
    namespace: v.string(),
    userId: v.id("users"),
    seedKey: v.string(),
    checksum: v.string(),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    address: v.string(),
    logoId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const record = await getSeedRecord(ctx, args.namespace, "shop", args.seedKey);
    const existingId = record
      ? ctx.db.normalizeId("shops", record.entityId)
      : null;
    const existing = existingId ? await ctx.db.get(existingId) : null;
    const value = {
      userId: args.userId,
      name: args.name,
      slug: args.slug,
      description: args.description,
      address: args.address,
      logoId: args.logoId,
    };
    let shopId: Id<"shops">;
    if (existing) {
      await ctx.db.patch(existing._id, value);
      shopId = existing._id;
    } else {
      const slugOwner = await ctx.db
        .query("shops")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .unique();
      if (slugOwner) throw new Error(`Shop slug already exists: ${args.slug}`);
      const user = await ctx.db.get(args.userId);
      if (!user) throw new Error("Seed user not found");
      const limit = user.plan === "pro" ? 5 : 3;
      const shops = await ctx.db
        .query("shops")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .take(limit + 1);
      if (shops.length >= limit) {
        throw new Error(`Shop limit reached for seed user ${args.userId}`);
      }
      shopId = await ctx.db.insert("shops", value);
    }
    await upsertSeedRecord(ctx, {
      namespace: args.namespace,
      entityType: "shop",
      seedKey: args.seedKey,
      entityId: String(shopId),
      checksum: args.checksum,
    });
    return shopId;
  },
});

const optionValidator = v.object({ name: v.string(), value: v.string() });
const skuValidator = v.object({
  seedKey: v.string(),
  key: v.string(),
  options: v.array(optionValidator),
  price: v.number(),
  stock: v.number(),
  imageId: v.optional(v.id("_storage")),
  checksum: v.string(),
});
const productValidator = v.object({
  seedKey: v.string(),
  checksum: v.string(),
  name: v.string(),
  description: v.string(),
  basePrice: v.number(),
  imageId: v.id("_storage"),
  variants: v.array(
    v.object({ name: v.string(), values: v.array(v.string()) }),
  ),
  skus: v.array(skuValidator),
});

export const upsertProductBatch = internalMutation({
  args: {
    namespace: v.string(),
    shopId: v.id("shops"),
    categoryId: v.id("categories"),
    products: v.array(productValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const seededProducts: Array<{
      seedKey: string;
      productId: Id<"products">;
      primarySkuId: Id<"productSkus">;
    }> = [];
    for (const input of args.products) {
      const record = await getSeedRecord(
        ctx,
        args.namespace,
        "product",
        input.seedKey,
      );
      const existingId = record
        ? ctx.db.normalizeId("products", record.entityId)
        : null;
      const existing = existingId ? await ctx.db.get(existingId) : null;
      const value = {
        shopId: args.shopId,
        categoryId: args.categoryId,
        name: input.name,
        description: input.description,
        basePrice: input.basePrice,
        imageIds: [input.imageId],
        variants: input.variants,
        isActive: true,
        updatedAt: now,
      };
      let productId: Id<"products">;
      if (existing) {
        await ctx.db.patch(existing._id, value);
        productId = existing._id;
      } else {
        productId = await ctx.db.insert("products", { ...value, createdAt: now });
      }
      await upsertSeedRecord(ctx, {
        namespace: args.namespace,
        entityType: "product",
        seedKey: input.seedKey,
        entityId: String(productId),
        checksum: input.checksum,
      });

      let primarySkuId: Id<"productSkus"> | null = null;
      for (const sku of input.skus) {
        const existingSku = await ctx.db
          .query("productSkus")
          .withIndex("by_productId_key", (q) =>
            q.eq("productId", productId).eq("key", sku.key),
          )
          .unique();
        const skuValue = {
          productId,
          shopId: args.shopId,
          key: sku.key,
          options: sku.options,
          price: Math.max(0, Math.floor(sku.price)),
          stock: Math.max(0, Math.floor(sku.stock)),
          imageId: sku.imageId,
          updatedAt: now,
        };
        const skuId = existingSku
          ? (await ctx.db.patch(existingSku._id, skuValue), existingSku._id)
          : await ctx.db.insert("productSkus", { ...skuValue, createdAt: now });
        primarySkuId ??= skuId;
        await upsertSeedRecord(ctx, {
          namespace: args.namespace,
          entityType: "sku",
          seedKey: sku.seedKey,
          entityId: String(skuId),
          checksum: sku.checksum,
        });
      }
      if (!primarySkuId) throw new Error(`Seed product has no SKU: ${input.seedKey}`);
      seededProducts.push({ seedKey: input.seedKey, productId, primarySkuId });
    }
    return seededProducts;
  },
});

const reviewProductValidator = v.object({
  seedKey: v.string(),
  reviewSeedKey: v.string(),
  reviewChecksum: v.string(),
  productId: v.id("products"),
  skuId: v.id("productSkus"),
  skuKey: v.string(),
  productName: v.string(),
  options: v.array(optionValidator),
  price: v.number(),
  rating: v.number(),
  reviewText: v.string(),
});

export const upsertReviewBatch = internalMutation({
  args: {
    namespace: v.string(),
    transactionSeedKey: v.string(),
    transactionChecksum: v.string(),
    buyerUserId: v.id("users"),
    shopId: v.id("shops"),
    products: v.array(reviewProductValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const subtotal = args.products.reduce(
      (total, product) => total + Math.max(0, Math.floor(product.price)),
      0,
    );
    const transactionValue = {
      buyerUserId: args.buyerUserId,
      shopId: args.shopId,
      status: "received" as const,
      items: args.products.map((product) => ({
        productId: product.productId,
        skuId: product.skuId,
        skuKey: product.skuKey,
        productName: product.productName,
        options: product.options,
        price: Math.max(0, Math.floor(product.price)),
        quantity: 1,
        lineTotal: Math.max(0, Math.floor(product.price)),
      })),
      addressSnapshot: {
        label: "Alamat Seed",
        recipientName: "Pembeli Demo",
        phone: "080000000000",
        address: "Alamat transaksi demo PlaceStore",
      },
      shippingMethod: "Reguler (Seed)",
      shippingFee: 0,
      paymentMethod: "Seed",
      serviceFee: 0,
      subtotal,
      total: subtotal,
      updatedAt: now,
    };

    const transactionRecord = await getSeedRecord(
      ctx,
      args.namespace,
      "transaction",
      args.transactionSeedKey,
    );
    const existingTransactionId = transactionRecord
      ? ctx.db.normalizeId("transactions", transactionRecord.entityId)
      : null;
    const existingTransaction = existingTransactionId
      ? await ctx.db.get(existingTransactionId)
      : null;
    const transactionId = existingTransaction
      ? (await ctx.db.patch(existingTransaction._id, transactionValue),
        existingTransaction._id)
      : await ctx.db.insert("transactions", {
          ...transactionValue,
          createdAt: now,
        });
    await upsertSeedRecord(ctx, {
      namespace: args.namespace,
      entityType: "transaction",
      seedKey: args.transactionSeedKey,
      entityId: String(transactionId),
      checksum: args.transactionChecksum,
    });

    let reviewsApplied = 0;
    for (const product of args.products) {
      const rating = Math.max(1, Math.min(5, Math.floor(product.rating)));
      const reviewValue = {
        buyerUserId: args.buyerUserId,
        transactionId,
        productId: product.productId,
        shopId: args.shopId,
        rating,
        reviewText: product.reviewText.trim(),
        imageIds: [],
        updatedAt: now,
      };
      const reviewRecord = await getSeedRecord(
        ctx,
        args.namespace,
        "review",
        product.reviewSeedKey,
      );
      const existingReviewId = reviewRecord
        ? ctx.db.normalizeId("reviews", reviewRecord.entityId)
        : null;
      const existingReview = existingReviewId
        ? await ctx.db.get(existingReviewId)
        : null;
      const reviewId = existingReview
        ? (await ctx.db.patch(existingReview._id, reviewValue), existingReview._id)
        : await ctx.db.insert("reviews", { ...reviewValue, createdAt: now });
      await upsertSeedRecord(ctx, {
        namespace: args.namespace,
        entityType: "review",
        seedKey: product.reviewSeedKey,
        entityId: String(reviewId),
        checksum: product.reviewChecksum,
      });
      reviewsApplied += 1;
    }

    return { transactionId, reviewsApplied };
  },
});

export const cleanupEntityBatch = internalMutation({
  args: {
    namespace: v.string(),
    entityType: entityTypeValidator,
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("seedRecords")
      .withIndex("by_namespace_and_entityType_and_seedKey", (q) =>
        q.eq("namespace", args.namespace).eq("entityType", args.entityType),
      )
      .take(Math.max(1, Math.min(50, Math.floor(args.limit))));
    let deleted = 0;
    let retained = 0;
    for (const record of records) {
      if (args.entityType === "review") {
        const id = ctx.db.normalizeId("reviews", record.entityId);
        if (id && (await ctx.db.get(id))) await ctx.db.delete(id);
      } else if (args.entityType === "transaction") {
        const id = ctx.db.normalizeId("transactions", record.entityId);
        if (id && (await ctx.db.get(id))) await ctx.db.delete(id);
      } else if (args.entityType === "sku") {
        const id = ctx.db.normalizeId("productSkus", record.entityId);
        if (id && (await ctx.db.get(id))) await ctx.db.delete(id);
      } else if (args.entityType === "product") {
        const id = ctx.db.normalizeId("products", record.entityId);
        if (id && (await ctx.db.get(id))) await ctx.db.delete(id);
      } else if (args.entityType === "asset" && record.storageId) {
        try {
          await ctx.storage.delete(record.storageId);
        } catch (error) {
          console.warn(`Seed asset cleanup skipped ${record.storageId}`, error);
        }
      } else if (args.entityType === "shop") {
        const id = ctx.db.normalizeId("shops", record.entityId);
        if (id && (await ctx.db.get(id))) {
          const remainingProduct = await ctx.db
            .query("products")
            .withIndex("by_shopId", (q) => q.eq("shopId", id))
            .first();
          if (remainingProduct) retained += 1;
          else await ctx.db.delete(id);
        }
      }
      await ctx.db.delete(record._id);
      deleted += 1;
    }
    return { deleted, retained, hasMore: records.length >= args.limit };
  },
});

export const cleanupRuns = internalMutation({
  args: { namespace: v.string() },
  handler: async (ctx, args) => {
    const runs = await ctx.db
      .query("seedRuns")
      .withIndex("by_namespace", (q) => q.eq("namespace", args.namespace))
      .take(50);
    await Promise.all(runs.map((run) => ctx.db.delete(run._id)));
    return runs.length;
  },
});
