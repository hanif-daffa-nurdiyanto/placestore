import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

type CartItemInput = {
  productId: string;
  productName: string;
  imageUrl: string | null;
  shopId: string | null;
  shopName: string | null;
  shopSlug: string | null;
  shopLogoUrl: string | null;
  skuKey: string;
  options: { name: string; value: string }[];
  price: number;
  stock: number;
  quantity: number;
};

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

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();
}

async function ensureCartForUser(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("carts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  const cartId = await ctx.db.insert("carts", {
    userId,
    items: [],
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(cartId);
  if (!created) throw new Error("Failed to create cart");
  return created;
}

function normalizeQty(stock: number, quantity: number) {
  const nextStock = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
  const requested =
    Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  return Math.min(nextStock > 0 ? nextStock : 999, Math.max(1, requested));
}

export const getMyCart = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
      
    return cart?.items ?? [];
  },
});

export const addItem = mutation({
  args: {
    item: v.object({
      productId: v.string(),
      productName: v.string(),
      imageUrl: v.union(v.string(), v.null()),
      shopId: v.union(v.string(), v.null()),
      shopName: v.union(v.string(), v.null()),
      shopSlug: v.union(v.string(), v.null()),
      shopLogoUrl: v.union(v.string(), v.null()),
      skuKey: v.string(),
      options: v.array(
        v.object({
          name: v.string(),
          value: v.string(),
        }),
      ),
      price: v.number(),
      stock: v.number(),
      quantity: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const cart = await ensureCartForUser(ctx, user._id);

    const id = `${args.item.productId}:${args.item.skuKey}`;
    const nextStock = Math.max(0, Math.floor(args.item.stock));
    if (!Number.isFinite(nextStock) || nextStock <= 0) return null;

    const nextQty = normalizeQty(nextStock, args.item.quantity);

    const idx = cart.items.findIndex(
      (it) => it.productId === args.item.productId && it.skuKey === args.item.skuKey,
    );

    const now = Date.now();

    if (idx >= 0) {
      const existing = cart.items[idx]!;
      const mergedQty = normalizeQty(
        nextStock,
        existing.quantity + Math.min(nextStock || 999, nextQty),
      );
      const items = cart.items.slice();
      items[idx] = {
        ...existing,
        ...args.item,
        id,
        stock: nextStock,
        quantity: mergedQty,
      };
      await ctx.db.patch(cart._id, { items, updatedAt: now });
      return null;
    }

    const item: CartItemInput & { id: string } = {
      ...args.item,
      id,
      stock: nextStock,
      quantity: nextQty,
    };

    await ctx.db.patch(cart._id, { items: [...cart.items, item], updatedAt: now });
    return null;
  },
});

export const setQuantity = mutation({
  args: { id: v.string(), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const cart = await ensureCartForUser(ctx, user._id);

    const items = cart.items
      .map((it) => {
        if (it.id !== args.id) return it;
        const nextQty = normalizeQty(it.stock, args.quantity);
        return { ...it, quantity: nextQty };
      })
      .filter((it) => it.quantity > 0);

    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    return null;
  },
});

export const removeItem = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const cart = await ensureCartForUser(ctx, user._id);
    const items = cart.items.filter((it) => it.id !== args.id);
    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    return null;
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const cart = await ensureCartForUser(ctx, user._id);
    await ctx.db.patch(cart._id, { items: [], updatedAt: Date.now() });
    return null;
  },
});

export const syncSku = mutation({
  args: {
    key: v.object({ productId: v.string(), skuKey: v.string() }),
    patch: v.object({
      price: v.optional(v.number()),
      stock: v.optional(v.number()),
      productName: v.optional(v.string()),
      imageUrl: v.optional(v.union(v.string(), v.null())),
      shopId: v.union(v.string(), v.null()),
      shopName: v.union(v.string(), v.null()),
      shopSlug: v.union(v.string(), v.null()),
      shopLogoUrl: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const cart = await ensureCartForUser(ctx, user._id);

    const items = cart.items.map((it) => {
      if (it.productId !== args.key.productId || it.skuKey !== args.key.skuKey) {
        return it;
      }

      const nextStockRaw = args.patch.stock ?? it.stock;
      const nextStock =
        typeof nextStockRaw === "number" && Number.isFinite(nextStockRaw)
          ? Math.max(0, Math.floor(nextStockRaw))
          : it.stock;

      const nextPriceRaw = args.patch.price ?? it.price;
      const nextPrice =
        typeof nextPriceRaw === "number" && Number.isFinite(nextPriceRaw)
          ? Math.max(0, nextPriceRaw)
          : it.price;

      const nextQty = Math.min(
        nextStock > 0 ? nextStock : 999,
        Math.max(1, it.quantity),
      );

      return {
        ...it,
        productName: args.patch.productName ?? it.productName,
        imageUrl:
          args.patch.imageUrl !== undefined ? args.patch.imageUrl : it.imageUrl,
        shopId: args.patch.shopId,
        shopName: args.patch.shopName,
        shopSlug: args.patch.shopSlug,
        shopLogoUrl: args.patch.shopLogoUrl,
        stock: nextStock,
        price: nextPrice,
        quantity: nextQty,
      };
    });

    await ctx.db.patch(cart._id, { items, updatedAt: Date.now() });
    return null;
  },
});
