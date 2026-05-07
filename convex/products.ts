import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

type VariantDef = { name: string; values: string[] };

async function requireCurrentUser(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
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

async function requireShopOwnedByUser(ctx: Ctx, shopId: Id<"shops">) {
  const user = await requireCurrentUser(ctx);
  const shop = await ctx.db.get(shopId);
  if (!shop) throw new Error("Shop not found");
  if (shop.userId !== user._id) throw new Error("Unauthorized");
  return { user, shop };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const listByShop = query({
  args: {
    shopId: v.id("shops"),
  },
  handler: async (ctx, args) => {
    await requireShopOwnedByUser(ctx, args.shopId);

    const products = await ctx.db
      .query("products")
      .withIndex("by_shopId", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();

    const withUrls = await Promise.all(
      products.map(async (p) => ({
        ...p,
        imageUrls: await Promise.all(p.imageIds.map((id) => ctx.storage.getUrl(id))),
      })),
    );

    return withUrls;
  },
});

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    const shopsById = new Map<string, { _id: Id<"shops">; name: string; slug: string }>();
    const ensureShop = async (shopId: Id<"shops">) => {
      const key = shopId as unknown as string;
      const cached = shopsById.get(key);
      if (cached) return cached;
      const shop = await ctx.db.get(shopId);
      if (!shop) return null;
      const value = { _id: shop._id, name: shop.name, slug: shop.slug };
      shopsById.set(key, value);
      return value;
    };

    return await Promise.all(
      products.map(async (p) => {
        const shop = await ensureShop(p.shopId);
        const imageUrl = p.imageIds[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null;
        const skus = await ctx.db
          .query("productSkus")
          .withIndex("by_productId", (q) => q.eq("productId", p._id))
          .collect();
        const skuPrices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
        const minSkuPrice = skuPrices.length ? Math.min(...skuPrices) : null;
        return {
          ...p,
          imageUrl,
          shop,
          minSkuPrice,
        };
      }),
    );
  },
});

export const listPublicByShopSlug = query({
  args: {
    shopSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const shop = await ctx.db
      .query("shops")
      .withIndex("by_slug", (q) => q.eq("slug", args.shopSlug))
      .unique();

    if (!shop) return { shop: null, products: [] };
    const shopLogoUrl = shop.logoId ? await ctx.storage.getUrl(shop.logoId) : null;

    const products = await ctx.db
      .query("products")
      .withIndex("by_shopId", (q) => q.eq("shopId", shop._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    const mapped = await Promise.all(
      products.map(async (p) => {
        const imageUrl = p.imageIds[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null;
        const skus = await ctx.db
          .query("productSkus")
          .withIndex("by_productId", (q) => q.eq("productId", p._id))
          .collect();
        const skuPrices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
        const minSkuPrice = skuPrices.length ? Math.min(...skuPrices) : null;
        return {
          ...p,
          imageUrl,
          shop: { _id: shop._id, name: shop.name, slug: shop.slug },
          minSkuPrice,
        };
      }),
    );

    return {
      shop: {
        _id: shop._id,
        name: shop.name,
        slug: shop.slug,
        description: shop.description,
        address: shop.address,
        location: shop.location,
        logoUrl: shopLogoUrl,
      },
      products: mapped,
    };
  },
});

export const getPublicById = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;
    if (!product.isActive) return null;

    const shop = await ctx.db.get(product.shopId);
    const shopLogoUrl = shop?.logoId ? await ctx.storage.getUrl(shop.logoId) : null;
    const imageUrls = await Promise.all(
      product.imageIds.map((id) => ctx.storage.getUrl(id)),
    );

    const skus = await ctx.db
      .query("productSkus")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();
    skus.sort((a, b) => a.key.localeCompare(b.key));
    const skuPrices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
    const minSkuPrice = skuPrices.length ? Math.min(...skuPrices) : null;
    const maxSkuPrice = skuPrices.length ? Math.max(...skuPrices) : null;

    return {
      ...product,
      imageUrls,
      shop: shop
        ? { _id: shop._id, name: shop.name, slug: shop.slug, logoUrl: shopLogoUrl }
        : null,
      skus: skus.map((s) => ({
        key: s.key,
        options: s.options,
        price: s.price,
        stock: s.stock,
      })),
      minSkuPrice,
      maxSkuPrice,
    };
  },
});

export const searchPublic = query({
  args: {
    q: v.optional(v.string()),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const q = (args.q ?? "").trim();
    const limit = Math.min(60, Math.max(1, Math.floor(args.limit ?? 24)));
    const minPrice = typeof args.minPrice === "number" && Number.isFinite(args.minPrice)
      ? Math.max(0, args.minPrice)
      : null;
    const maxPrice = typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice)
      ? Math.max(0, args.maxPrice)
      : null;

    const matchesPrice = async (productId: Id<"products">, basePrice?: number) => {
      const base = typeof basePrice === "number" && Number.isFinite(basePrice) ? basePrice : null;
      if (base !== null) {
        const okMin = minPrice === null || base >= minPrice;
        const okMax = maxPrice === null || base <= maxPrice;
        if (okMin && okMax) return true;
      }
      // Fallback to sku prices (more accurate)
      const skus = await ctx.db
        .query("productSkus")
        .withIndex("by_productId", (qq) => qq.eq("productId", productId))
        .collect();
      const prices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
      if (!prices.length) return minPrice === null && maxPrice === null;
      const minSku = Math.min(...prices);
      const okMin = minPrice === null || minSku >= minPrice;
      const okMax = maxPrice === null || minSku <= maxPrice;
      return okMin && okMax;
    };

    const candidates =
      q.length > 0
        ? await ctx.db
            .query("products")
            .withSearchIndex("search_name", (search) => search.search("name", q))
            .collect()
        : await ctx.db
            .query("products")
            .filter((qq) => qq.eq(qq.field("isActive"), true))
            .order("desc")
            .take(200);

    const results: any[] = [];

    for (const p of candidates) {
      if (!p.isActive) continue;
      if (args.categoryId !== undefined) {
        const wanted = args.categoryId;
        const current = p.categoryId ?? null;
        if ((wanted ?? null) !== (current ?? null)) continue;
      }
      if (!(await matchesPrice(p._id, p.basePrice))) continue;

      const shop = await ctx.db.get(p.shopId);
      const imageUrl = p.imageIds[0] ? await ctx.storage.getUrl(p.imageIds[0]) : null;
      const skus = await ctx.db
        .query("productSkus")
        .withIndex("by_productId", (qq) => qq.eq("productId", p._id))
        .collect();
      const skuPrices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
      const minSkuPrice = skuPrices.length ? Math.min(...skuPrices) : null;

      results.push({
        ...p,
        imageUrl,
        shop: shop ? { _id: shop._id, name: shop.name, slug: shop.slug } : null,
        minSkuPrice,
      });

      if (results.length >= limit) break;
    }

    return results;
  },
});

export const getById = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) return null;

    await requireShopOwnedByUser(ctx, product.shopId);

    return {
      ...product,
      imageUrls: await Promise.all(product.imageIds.map((id) => ctx.storage.getUrl(id))),
    };
  },
});

export const create = mutation({
  args: {
    shopId: v.id("shops"),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    name: v.string(),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    imageIds: v.array(v.id("_storage")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireShopOwnedByUser(ctx, args.shopId);

    const categoryId = args.categoryId ?? null;
    if (categoryId !== null) {
      const category = await ctx.db.get(categoryId);
      if (!category) throw new Error("Category not found");
    }

    const now = Date.now();
    return await ctx.db.insert("products", {
      shopId: args.shopId,
      categoryId,
      name: args.name.trim(),
      description: args.description?.trim(),
      basePrice:
        args.basePrice !== undefined ? Math.max(0, args.basePrice) : undefined,
      imageIds: args.imageIds,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    deleteRemovedImages: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.productId);
    if (!existing) throw new Error("Product not found");

    await requireShopOwnedByUser(ctx, existing.shopId);

    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.description !== undefined) patch.description = args.description.trim();
    if (args.basePrice !== undefined) {
      patch.basePrice = Math.max(0, args.basePrice);
    }
    if (args.imageIds !== undefined) {
      patch.imageIds = args.imageIds;

      if (args.deleteRemovedImages) {
        const nextSet = new Set(args.imageIds);
        const removed = existing.imageIds.filter((id) => !nextSet.has(id));
        await Promise.all(removed.map((id) => ctx.storage.delete(id)));
      }
    }
    if (args.categoryId !== undefined) {
      const categoryId = args.categoryId ?? null;
      if (categoryId !== null) {
        const category = await ctx.db.get(categoryId);
        if (!category) throw new Error("Category not found");
      }
      patch.categoryId = categoryId;
    }
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.productId, patch);
    return args.productId;
  },
});

export const remove = mutation({
  args: {
    productId: v.id("products"),
    deleteImages: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.productId);
    if (!existing) throw new Error("Product not found");

    await requireShopOwnedByUser(ctx, existing.shopId);

    await ctx.db.delete(args.productId);

    const existingSkus = await ctx.db
      .query("productSkus")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();
    await Promise.all(existingSkus.map((s) => ctx.db.delete(s._id)));

    if (args.deleteImages) {
      await Promise.all(existing.imageIds.map((id) => ctx.storage.delete(id)));
    }

    return null;
  },
});

function normalizeVariants(variants: VariantDef[]) {
  const cleaned: VariantDef[] = [];
  const seenNames = new Set<string>();

  for (const vDef of variants) {
    const name = vDef.name.trim();
    if (!name) continue;
    if (seenNames.has(name)) throw new Error(`Duplicate variant name: ${name}`);
    seenNames.add(name);

    const seenValues = new Set<string>();
    const values = (vDef.values ?? [])
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => {
        if (seenValues.has(x)) return false;
        seenValues.add(x);
        return true;
      });

    cleaned.push({ name, values });
  }

  return cleaned;
}

function skuKeyFromOptions(options: { name: string; value: string }[]) {
  if (!options.length) return "base";
  return options.map((o) => `${o.name}=${o.value}`).join("|");
}

export const listSkusByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    await requireShopOwnedByUser(ctx, product.shopId);

    const skus = await ctx.db
      .query("productSkus")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();

    return skus.sort((a, b) => a.key.localeCompare(b.key));
  },
});

export const setProductVariants = mutation({
  args: {
    productId: v.id("products"),
    variants: v.array(
      v.object({
        name: v.string(),
        values: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.productId);
    if (!existing) throw new Error("Product not found");

    await requireShopOwnedByUser(ctx, existing.shopId);

    const previousVariants = normalizeVariants(
      ((existing.variants as VariantDef[] | undefined) ?? []) satisfies VariantDef[],
    );
    const variants = normalizeVariants(args.variants);
    const now = Date.now();

    await ctx.db.patch(args.productId, {
      variants: variants.length ? variants : undefined,
      updatedAt: now,
    });

    // Only clear SKUs if the change can invalidate existing combinations.
    // Adding new values to an existing variant keeps existing SKUs valid.
    const shouldClearSkus = (() => {
      const prevNames = previousVariants.map((v) => v.name);
      const nextNames = variants.map((v) => v.name);
      if (prevNames.join("|") !== nextNames.join("|")) return true;

      for (let i = 0; i < previousVariants.length; i++) {
        const prev = previousVariants[i];
        const next = variants[i];
        if (!prev || !next) return true;
        if (prev.name !== next.name) return true;
        const nextSet = new Set(next.values);
        for (const value of prev.values) {
          if (!nextSet.has(value)) return true; // value removed
        }
      }

      return false;
    })();

    if (shouldClearSkus) {
      const existingSkus = await ctx.db
        .query("productSkus")
        .withIndex("by_productId", (q) => q.eq("productId", args.productId))
        .collect();
      await Promise.all(existingSkus.map((s) => ctx.db.delete(s._id)));
    }

    return args.productId;
  },
});

export const replaceSkusForProduct = mutation({
  args: {
    productId: v.id("products"),
    skus: v.array(
      v.object({
        options: v.array(v.object({ name: v.string(), value: v.string() })),
        price: v.number(),
        stock: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.productId);
    if (!existing) throw new Error("Product not found");

    await requireShopOwnedByUser(ctx, existing.shopId);

    const variants = normalizeVariants(
      ((existing.variants as VariantDef[] | undefined) ?? []) satisfies VariantDef[],
    );
    const variantNames = variants.map((vDef) => vDef.name);
    const variantValuesByName = new Map<string, Set<string>>(
      variants.map((vDef) => [vDef.name, new Set(vDef.values)]),
    );

    const normalizedSkus = args.skus.map((sku) => {
      const options = sku.options.map((o) => ({
        name: o.name.trim(),
        value: o.value.trim(),
      }));

      if (options.some((o) => !o.name || !o.value)) {
        throw new Error("Invalid SKU option");
      }

      const seen = new Set<string>();
      for (const opt of options) {
        if (seen.has(opt.name)) {
          throw new Error(`Duplicate option in SKU: ${opt.name}`);
        }
        seen.add(opt.name);

        if (variantNames.length) {
          if (!variantValuesByName.has(opt.name)) {
            throw new Error(`Unknown variant: ${opt.name}`);
          }
          if (!variantValuesByName.get(opt.name)?.has(opt.value)) {
            throw new Error(`Unknown variant value: ${opt.name}=${opt.value}`);
          }
        }
      }

      if (variantNames.length) {
        const expected = new Set(variantNames);
        for (const opt of options) expected.delete(opt.name);
        if (expected.size !== 0) {
          throw new Error("SKU options must include every variant");
        }
      } else if (options.length) {
        throw new Error("SKU options not allowed without variants");
      }

      if (!Number.isFinite(sku.price) || sku.price < 0) {
        throw new Error("Invalid price");
      }
      if (!Number.isFinite(sku.stock) || sku.stock < 0) {
        throw new Error("Invalid stock");
      }

      const orderedOptions = variantNames.length
        ? variantNames.map((name) => {
            const found = options.find((o) => o.name === name);
            if (!found) throw new Error("Missing SKU option");
            return found;
          })
        : [];

      return {
        options: orderedOptions,
        key: skuKeyFromOptions(orderedOptions),
        price: sku.price,
        stock: Math.floor(sku.stock),
      };
    });

    const seenKeys = new Set<string>();
    for (const sku of normalizedSkus) {
      if (seenKeys.has(sku.key)) throw new Error(`Duplicate SKU: ${sku.key}`);
      seenKeys.add(sku.key);
    }

    const now = Date.now();
    await ctx.db.patch(args.productId, { updatedAt: now });

    const existingSkus = await ctx.db
      .query("productSkus")
      .withIndex("by_productId", (q) => q.eq("productId", args.productId))
      .collect();
    await Promise.all(existingSkus.map((s) => ctx.db.delete(s._id)));

    await Promise.all(
      normalizedSkus.map((sku) =>
        ctx.db.insert("productSkus", {
          productId: args.productId,
          shopId: existing.shopId,
          key: sku.key,
          options: sku.options,
          price: sku.price,
          stock: sku.stock,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    return args.productId;
  },
});

export const getShopStats = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await requireShopOwnedByUser(ctx, args.shopId);

    const products = await ctx.db
      .query("products")
      .withIndex("by_shopId", (q) => q.eq("shopId", args.shopId))
      .collect();

    const skus = await ctx.db
      .query("productSkus")
      .withIndex("by_shopId", (q) => q.eq("shopId", args.shopId))
      .collect();

    const productCount = products.length;
    const activeProductCount = products.filter((p) => p.isActive).length;
    const productWithVariantsCount = products.filter(
      (p) => Array.isArray(p.variants) && p.variants.length > 0,
    ).length;

    const skuCount = skus.length;
    const inStockSkuCount = skus.filter((s) => (s.stock ?? 0) > 0).length;
    const totalStock = skus.reduce((sum, s) => sum + Math.max(0, s.stock ?? 0), 0);
    const inventoryValue = skus.reduce(
      (sum, s) => sum + Math.max(0, s.stock ?? 0) * Math.max(0, s.price ?? 0),
      0,
    );

    const prices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
    const minSkuPrice = prices.length ? Math.min(...prices) : null;
    const maxSkuPrice = prices.length ? Math.max(...prices) : null;

    const lastProductUpdatedAt = products.reduce(
      (max, p) => Math.max(max, p.updatedAt ?? 0),
      0,
    );
    const lastSkuUpdatedAt = skus.reduce((max, s) => Math.max(max, s.updatedAt ?? 0), 0);
    const lastUpdatedAt = Math.max(lastProductUpdatedAt, lastSkuUpdatedAt) || null;

    const productNameById = new Map<string, string>(
      products.map((p) => [p._id as unknown as string, p.name]),
    );
    const stockByProductId = new Map<string, number>();
    for (const sku of skus) {
      const key = sku.productId as unknown as string;
      stockByProductId.set(key, (stockByProductId.get(key) ?? 0) + Math.max(0, sku.stock ?? 0));
    }

    const topProductsByStock = Array.from(stockByProductId.entries())
      .map(([productId, stock]) => ({
        productId: productId as Id<"products">,
        name: productNameById.get(productId) ?? "Unknown",
        stock,
      }))
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);

    return {
      productCount,
      activeProductCount,
      productWithVariantsCount,
      skuCount,
      inStockSkuCount,
      totalStock,
      inventoryValue,
      minSkuPrice,
      maxSkuPrice,
      lastUpdatedAt,
      topProductsByStock,
    };
  },
});

export const getCartSnapshots = query({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        skuKey: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const productsById = new Map<string, any>();
    const shopsById = new Map<string, any>();

    const getProduct = async (productId: Id<"products">) => {
      const key = productId as unknown as string;
      if (productsById.has(key)) return productsById.get(key) ?? null;
      const product = await ctx.db.get(productId);
      productsById.set(key, product ?? null);
      return product ?? null;
    };

    const getShop = async (shopId: Id<"shops">) => {
      const key = shopId as unknown as string;
      if (shopsById.has(key)) return shopsById.get(key) ?? null;
      const shop = await ctx.db.get(shopId);
      shopsById.set(key, shop ?? null);
      return shop ?? null;
    };

    const imageUrlByStorageId = new Map<string, string | null>();
    const getStorageUrl = async (id: Id<"_storage">) => {
      const key = id as unknown as string;
      if (imageUrlByStorageId.has(key)) return imageUrlByStorageId.get(key) ?? null;
      const url = await ctx.storage.getUrl(id);
      imageUrlByStorageId.set(key, url ?? null);
      return url ?? null;
    };

    const results: {
      productId: Id<"products">;
      skuKey: string;
      price: number | null;
      stock: number | null;
      productName: string | null;
      imageUrl: string | null;
      shopId: Id<"shops"> | null;
      shopName: string | null;
      shopSlug: string | null;
      shopLogoUrl: string | null;
    }[] = [];

    for (const item of args.items) {
      const sku = await ctx.db
        .query("productSkus")
        .withIndex("by_productId_key", (q) =>
          q.eq("productId", item.productId).eq("key", item.skuKey),
        )
        .unique();

      const product = await getProduct(item.productId);
      const shop = product?.shopId ? await getShop(product.shopId as Id<"shops">) : null;

      const imageUrl =
        product?.imageIds?.[0] ? await getStorageUrl(product.imageIds[0]) : null;
      const shopLogoUrl = shop?.logoId ? await getStorageUrl(shop.logoId) : null;

      results.push({
        productId: item.productId,
        skuKey: item.skuKey,
        price: sku ? sku.price : null,
        stock: sku ? sku.stock : null,
        productName: product?.name ?? null,
        imageUrl,
        shopId: shop?._id ?? null,
        shopName: shop?.name ?? null,
        shopSlug: shop?.slug ?? null,
        shopLogoUrl,
      });
    }

    return results;
  },
});


export const getProductsByCategorySlug = query({
  args: {
    slug: v.string(),
    limit: v.optional(v.number()),
    cursor: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    const { slug, limit = 10, cursor } = args;

    // First, find the category by slug
    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (!category) {
      return {
        products: [],
        nextCursor: undefined,
        hasMore: false,
        category: null,
      };
    }

    // Then get products for that category
    let productsQuery = ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .filter((q) => q.eq(q.field("isActive"), true));

    if (cursor) {
      productsQuery = productsQuery.filter((q) => q.gt(q.field("_id"), cursor));
    }

    const products = await productsQuery.take(limit + 1);
    const hasMore = products.length > limit;
    const nextCursor = hasMore ? products[products.length - 1]._id : null;

    // Cache untuk shop dan data lainnya (seperti di listPublic)
    const shopsById = new Map<string, { _id: Id<"shops">; name: string; slug: string }>();
    const ensureShop = async (shopId: Id<"shops">) => {
      const key = shopId as unknown as string;
      const cached = shopsById.get(key);
      if (cached) return cached;
      const shop = await ctx.db.get(shopId);
      if (!shop) return null;
      const value = { _id: shop._id, name: shop.name, slug: shop.slug };
      shopsById.set(key, value);
      return value;
    };

    // Fetch products dengan detail yang sama seperti listPublic
    const productsWithDetails = await Promise.all(
      products.slice(0, limit).map(async (product) => {
        const shop = await ensureShop(product.shopId);
        const imageUrl = product.imageIds[0] 
          ? await ctx.storage.getUrl(product.imageIds[0]) 
          : null;
        
        // Get SKUs untuk mendapatkan min price
        const skus = await ctx.db
          .query("productSkus")
          .withIndex("by_productId", (q) => q.eq("productId", product._id))
          .collect();
        
        const skuPrices = skus.map((s) => s.price).filter((x): x is number => Number.isFinite(x));
        const minSkuPrice = skuPrices.length ? Math.min(...skuPrices) : null;

        return {
          ...product,
          imageUrl,
          shop,
          minSkuPrice,
        };
      })
    );

    return {
      products: productsWithDetails,
      category,
      nextCursor: nextCursor || undefined,
      hasMore,
    };
  },
});
