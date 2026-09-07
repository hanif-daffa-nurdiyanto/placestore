import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx } from "./_generated/server";
import {
  SEED_CATEGORY_ALIASES,
  SEED_CONFIG,
  SEED_PRODUCTS,
  SEED_SHOPS,
  type SeedProduct,
} from "./seedManifest";

type SourceImage = {
  sourceUrl: string;
  sourcePage: string;
  creator?: string;
  license: string;
  attribution?: string;
};

type InspectResult = {
  totalUsersFound: number;
  users: Array<{ _id: Id<"users">; plan: "free" | "pro"; shopCount: number }>;
  seededShopKeys: string[];
  seededShops: Array<{ seedKey: string; userId: Id<"users"> }>;
  categories: Array<{
    _id: Id<"categories">;
    name: string;
    slug: string;
    totalProducts: number;
    seedProducts: number;
    nonSeedProducts: number;
  }>;
  missingCategorySlugs: string[];
};

function requireSeedAccess(secret: string) {
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Seeder is disabled. Set ALLOW_SEED=true on this deployment.");
  }
  const expected = process.env.SEED_SECRET;
  if (!expected || secret !== expected) throw new Error("Invalid seed secret");
}

function checksum(value: unknown) {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function skuKey(options: Array<{ name: string; value: string }>) {
  return options.map((option) => `${option.name}=${option.value}`).join("|") || "base";
}

async function searchPexels(query: string): Promise<SourceImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=square&per_page=15`,
    { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(20_000) },
  );
  if (!response.ok) throw new Error(`Pexels search failed: HTTP ${response.status}`);
  const payload = (await response.json()) as {
    photos?: Array<{
      photographer?: string;
      photographer_url?: string;
      url: string;
      src?: { large?: string; medium?: string; original?: string };
    }>;
  };
  const photo = payload.photos?.find(
    (item) => item.src?.large || item.src?.medium || item.src?.original,
  );
  if (!photo) return null;
  const photographer = photo.photographer?.trim();
  return {
    sourceUrl: photo.src?.large ?? photo.src?.medium ?? photo.src?.original ?? "",
    sourcePage: photo.url,
    creator: photographer,
    license: "Pexels License",
    attribution: photographer
      ? `Photo by ${photographer} on Pexels${photo.photographer_url ? ` (${photo.photographer_url})` : ""}`
      : "Photo from Pexels",
  };
}

async function searchOpenverse(query: string): Promise<SourceImage | null> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("license", "cc0,pdm");
  url.searchParams.set("page_size", "20");
  const response = await fetch(url, {
    headers: { "User-Agent": "PlaceStoreSeeder/1.0" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Openverse search failed: HTTP ${response.status}`);
  const payload = (await response.json()) as {
    results?: Array<{
      url?: string;
      thumbnail?: string;
      foreign_landing_url?: string;
      creator?: string;
      creator_url?: string;
      license?: string;
      license_url?: string;
    }>;
  };
  const image = payload.results?.find(
    (item) =>
      (item.thumbnail || item.url) &&
      item.foreign_landing_url &&
      ["cc0", "pdm"].includes((item.license ?? "").toLowerCase()),
  );
  if (!image) return null;
  const creator = image.creator?.trim();
  return {
    sourceUrl: image.thumbnail ?? image.url ?? "",
    sourcePage: image.foreign_landing_url ?? "https://openverse.org/",
    creator,
    license: (image.license ?? "CC0/Public Domain").toUpperCase(),
    attribution: creator
      ? `${creator}${image.creator_url ? ` (${image.creator_url})` : ""}`
      : undefined,
  };
}

async function findSourceImage(query: string) {
  const errors: string[] = [];
  try {
    const pexels = await searchPexels(query);
    if (pexels) return pexels;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  try {
    const openverse = await searchOpenverse(query);
    if (openverse) return openverse;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  throw new Error(
    `No Pexels/Openverse image found for "${query}"${errors.length ? `: ${errors.join("; ")}` : ""}`,
  );
}

async function ensureAsset(
  ctx: ActionCtx,
  seedKey: string,
  query: string,
): Promise<Id<"_storage">> {
  const existing: { storageId?: Id<"_storage"> } | null = await ctx.runQuery(
    internal.seedInternal.getAsset,
    { namespace: SEED_CONFIG.namespace, seedKey },
  );
  if (existing?.storageId) return existing.storageId;

  const source = await findSourceImage(query);
  const imageResponse = await fetch(source.sourceUrl, {
    headers: { "User-Agent": "PlaceStoreSeeder/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!imageResponse.ok) {
    throw new Error(`Image download failed for ${seedKey}: HTTP ${imageResponse.status}`);
  }
  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Invalid image MIME for ${seedKey}: ${contentType || "unknown"}`);
  }
  const blob = await imageResponse.blob();
  if (blob.size > 8 * 1024 * 1024) {
    throw new Error(`Image exceeds 8 MB for ${seedKey}`);
  }
  const storageId = await ctx.storage.store(blob);
  await ctx.runMutation(internal.seedInternal.saveAsset, {
    namespace: SEED_CONFIG.namespace,
    seedKey,
    checksum: checksum({ ...source, size: blob.size }),
    storageId,
    ...source,
  });
  return storageId;
}

async function inspect(ctx: ActionCtx): Promise<InspectResult> {
  return await ctx.runQuery(internal.seedInternal.inspect, {
    namespace: SEED_CONFIG.namespace,
    categorySlugs: Array.from(
      new Set(
        SEED_SHOPS.flatMap(
          (shop) => SEED_CATEGORY_ALIASES[shop.categorySlug] ?? [shop.categorySlug],
        ),
      ),
    ),
  });
}

function resolveCategory(result: InspectResult, canonicalSlug: string) {
  const aliases = SEED_CATEGORY_ALIASES[canonicalSlug] ?? [canonicalSlug];
  return result.categories.find((category) => aliases.includes(category.slug)) ?? null;
}

function assignShopsToUsers(result: InspectResult) {
  const assignments = new Map<string, Id<"users">>();
  const usersById = new Map(result.users.map((user) => [String(user._id), user]));
  const newShopCounts = new Map(result.users.map((user) => [String(user._id), 0]));
  const seedShopCounts = new Map(result.users.map((user) => [String(user._id), 0]));

  for (const seededShop of result.seededShops) {
    const userKey = String(seededShop.userId);
    if (!usersById.has(userKey)) continue;
    assignments.set(seededShop.seedKey, seededShop.userId);
    seedShopCounts.set(userKey, (seedShopCounts.get(userKey) ?? 0) + 1);
  }

  for (const shop of SEED_SHOPS) {
    if (assignments.has(shop.seedKey)) continue;
    const user = [...result.users]
      .filter((candidate) => {
        const key = String(candidate._id);
        const limit = candidate.plan === "pro" ? 5 : 3;
        return (
          (seedShopCounts.get(key) ?? 0) + (newShopCounts.get(key) ?? 0) < 2 &&
          candidate.shopCount + (newShopCounts.get(key) ?? 0) < limit
        );
      })
      .sort((left, right) => {
        const leftCount = left.shopCount + (newShopCounts.get(String(left._id)) ?? 0);
        const rightCount = right.shopCount + (newShopCounts.get(String(right._id)) ?? 0);
        return leftCount - rightCount;
      })[0];
    if (!user) {
      throw new Error(
        `No account has capacity for shop ${shop.seedKey}; each account may receive at most 2 seed shops and must stay within its plan limit.`,
      );
    }
    const userKey = String(user._id);
    assignments.set(shop.seedKey, user._id);
    newShopCounts.set(userKey, (newShopCounts.get(userKey) ?? 0) + 1);
  }
  return assignments;
}

function validateInspection(result: InspectResult) {
  const minimumUsers = Math.max(
    Math.ceil(SEED_SHOPS.length / 2),
    SEED_CONFIG.reviewsPerProduct + 1,
  );
  if (result.users.length < minimumUsers) {
    throw new Error(
      `At least ${minimumUsers} seed users are required for ${SEED_SHOPS.length} shops, found ${result.users.length}`,
    );
  }
  const missingCategories = SEED_SHOPS.filter(
    (shop) => !resolveCategory(result, shop.categorySlug),
  ).map((shop) => shop.categorySlug);
  if (missingCategories.length) {
    throw new Error(`Missing categories: ${missingCategories.join(", ")}`);
  }
  assignShopsToUsers(result);
}

function buildPreview(result: InspectResult) {
  return {
    namespace: SEED_CONFIG.namespace,
    manifestVersion: SEED_CONFIG.manifestVersion,
    users: result.users.length,
    shopsPlanned: SEED_SHOPS.length,
    reviewsPerProduct: SEED_CONFIG.reviewsPerProduct,
    reviewsPlanned: result.categories.reduce(
      (total, category) =>
        total +
        Math.max(0, SEED_CONFIG.productsPerCategory - category.nonSeedProducts) *
          SEED_CONFIG.reviewsPerProduct,
      0,
    ),
    categories: result.categories.map((category) => ({
      slug: category.slug,
      currentTotal: category.totalProducts,
      currentNonSeed: category.nonSeedProducts,
      seedProductsManaged: Math.max(
        0,
        SEED_CONFIG.productsPerCategory - category.nonSeedProducts,
      ),
      seedProductsPlanned: Math.max(
        0,
        SEED_CONFIG.productsPerCategory - category.totalProducts,
      ),
      targetTotal: SEED_CONFIG.productsPerCategory,
    })),
    imageProvider: process.env.PEXELS_API_KEY
      ? "Pexels with Openverse fallback"
      : "Openverse CC0/Public Domain",
  };
}

async function applySeed(ctx: ActionCtx, inspection: InspectResult) {
  const shopIds = new Map<string, Id<"shops">>();
  const shopAssignments = assignShopsToUsers(inspection);

  for (const shop of SEED_SHOPS) {
    const userId = shopAssignments.get(shop.seedKey);
    if (!userId) throw new Error(`Missing user for shop ${shop.seedKey}`);
    const logoId = await ensureAsset(ctx, `shop-${shop.seedKey}-logo`, shop.logoQuery);
    const shopId: Id<"shops"> = await ctx.runMutation(
      internal.seedInternal.upsertShop,
      {
        namespace: SEED_CONFIG.namespace,
        userId,
        seedKey: shop.seedKey,
        checksum: checksum(shop),
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        address: shop.address,
        logoId,
      },
    );
    shopIds.set(shop.seedKey, shopId);
  }

  let productsApplied = 0;
  let skusApplied = 0;
  let transactionsApplied = 0;
  let reviewsApplied = 0;
  for (const shop of SEED_SHOPS) {
    const category = resolveCategory(inspection, shop.categorySlug);
    const shopId = shopIds.get(shop.seedKey);
    if (!category || !shopId) throw new Error(`Invalid mapping for ${shop.seedKey}`);
    const targetCount = Math.max(
      0,
      SEED_CONFIG.productsPerCategory - category.nonSeedProducts,
    );
    const selectedProducts = SEED_PRODUCTS.filter(
      (product) => product.categorySlug === shop.categorySlug,
    ).slice(0, targetCount);
    const seededProducts = new Map<
      string,
      { productId: Id<"products">; primarySkuId: Id<"productSkus"> }
    >();

    for (let offset = 0; offset < selectedProducts.length; offset += 5) {
      const batch = selectedProducts.slice(offset, offset + 5);
      const prepared = await Promise.all(
        batch.map(async (item) => {
          const imageId = await ensureAsset(
            ctx,
            `product-${item.seedKey}-cover`,
            item.imageQuery,
          );
          const skus = await Promise.all(
            item.skus.map(async (sku, skuIndex) => {
              const key = skuKey(sku.options);
              const skuImageId = sku.imageQuery
                ? await ensureAsset(
                    ctx,
                    `product-${item.seedKey}-sku-${skuIndex + 1}`,
                    sku.imageQuery,
                  )
                : undefined;
              return {
                seedKey: `${item.seedKey}:${key}`,
                key,
                options: sku.options,
                price: sku.price,
                stock: sku.stock,
                imageId: skuImageId,
                checksum: checksum({ ...sku, key, imageId: skuImageId }),
              };
            }),
          );
          return {
            seedKey: item.seedKey,
            checksum: checksum({ ...item, imageId }),
            name: item.name,
            description: item.description,
            basePrice: item.basePrice,
            imageId,
            variants: item.variants,
            skus,
          };
        }),
      );
      const upserted: Array<{
        seedKey: string;
        productId: Id<"products">;
        primarySkuId: Id<"productSkus">;
      }> = await ctx.runMutation(internal.seedInternal.upsertProductBatch, {
        namespace: SEED_CONFIG.namespace,
        shopId,
        categoryId: category._id,
        products: prepared,
      });
      for (const item of upserted) {
        seededProducts.set(item.seedKey, {
          productId: item.productId,
          primarySkuId: item.primarySkuId,
        });
      }
      productsApplied += prepared.length;
      skusApplied += prepared.reduce((total, item) => total + item.skus.length, 0);
    }

    if (selectedProducts.length === 0) continue;

    const shopOwnerId = shopAssignments.get(shop.seedKey);
    const reviewers = inspection.users
      .filter((user) => user._id !== shopOwnerId)
      .slice(0, SEED_CONFIG.reviewsPerProduct);
    if (reviewers.length < SEED_CONFIG.reviewsPerProduct) {
      throw new Error(
        `Not enough non-owner reviewers for ${shop.seedKey}; expected ${SEED_CONFIG.reviewsPerProduct}`,
      );
    }

    for (let reviewIndex = 0; reviewIndex < reviewers.length; reviewIndex += 1) {
      const reviewer = reviewers[reviewIndex];
      const transactionSeedKey = `${shop.seedKey}:reviewer-${reviewIndex + 1}`;
      const products = selectedProducts.map((product) => {
        const seeded = seededProducts.get(product.seedKey);
        const primarySku = product.skus[0];
        const review = product.reviews[reviewIndex];
        if (!seeded || !primarySku || !review) {
          throw new Error(`Incomplete review seed data for ${product.seedKey}`);
        }
        const key = skuKey(primarySku.options);
        const reviewSeedKey = `${product.seedKey}:review-${reviewIndex + 1}`;
        return {
          seedKey: product.seedKey,
          reviewSeedKey,
          reviewChecksum: checksum({
            reviewSeedKey,
            buyerUserId: reviewer._id,
            ...review,
          }),
          productId: seeded.productId,
          skuId: seeded.primarySkuId,
          skuKey: key,
          productName: product.name,
          options: primarySku.options,
          price: primarySku.price,
          rating: review.rating,
          reviewText: review.reviewText,
        };
      });
      const result: { transactionId: Id<"transactions">; reviewsApplied: number } =
        await ctx.runMutation(internal.seedInternal.upsertReviewBatch, {
          namespace: SEED_CONFIG.namespace,
          transactionSeedKey,
          transactionChecksum: checksum({
            transactionSeedKey,
            buyerUserId: reviewer._id,
            shopId,
            products,
          }),
          buyerUserId: reviewer._id,
          shopId,
          products,
        });
      transactionsApplied += 1;
      reviewsApplied += result.reviewsApplied;
    }
  }
  return {
    productsApplied,
    skusApplied,
    shopsApplied: shopIds.size,
    transactionsApplied,
    reviewsApplied,
  };
}

async function cleanupSeed(ctx: ActionCtx) {
  const totals: Record<string, number> = {};
  let retainedShops = 0;
  for (const entityType of [
    "review",
    "transaction",
    "sku",
    "product",
    "asset",
    "shop",
  ] as const) {
    let total = 0;
    for (let page = 0; page < 20; page += 1) {
      const result: { deleted: number; retained: number; hasMore: boolean } =
        await ctx.runMutation(internal.seedInternal.cleanupEntityBatch, {
          namespace: SEED_CONFIG.namespace,
          entityType,
          limit: 25,
        });
      total += result.deleted;
      retainedShops += result.retained;
      if (!result.hasMore) break;
    }
    totals[entityType] = total;
  }
  const runsDeleted: number = await ctx.runMutation(
    internal.seedInternal.cleanupRuns,
    { namespace: SEED_CONFIG.namespace },
  );
  return { ...totals, runsDeleted, retainedShops };
}

export const run = action({
  args: {
    secret: v.string(),
    mode: v.union(
      v.literal("dry-run"),
      v.literal("apply"),
      v.literal("repair"),
      v.literal("cleanup"),
    ),
  },
  handler: async (ctx, args) => {
    requireSeedAccess(args.secret);
    if (args.mode === "cleanup") return await cleanupSeed(ctx);

    const inspection = await inspect(ctx);
    validateInspection(inspection);
    const preview = buildPreview(inspection);
    if (args.mode === "dry-run") return preview;

    const runId: Id<"seedRuns"> = await ctx.runMutation(
      internal.seedInternal.startRun,
      {
        namespace: SEED_CONFIG.namespace,
        manifestVersion: SEED_CONFIG.manifestVersion,
      },
    );
    try {
      const applied = await applySeed(ctx, inspection);
      const summary = JSON.stringify({ ...preview, ...applied });
      await ctx.runMutation(internal.seedInternal.finishRun, {
        runId,
        status: "completed",
        summary,
      });
      return { ...preview, ...applied };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(internal.seedInternal.finishRun, {
        runId,
        status: "failed",
        summary: message,
      });
      throw error;
    }
  },
});

export type { SeedProduct };
