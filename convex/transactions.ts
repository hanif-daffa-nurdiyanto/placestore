import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

// type Ctx = QueryCtx | MutationCtx;

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();
}

async function getShopOwnedByUser(ctx: QueryCtx, shopId: Id<"shops">) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Unauthorized");
  
  const shop = await ctx.db.get(shopId);
  if (!shop) throw new Error("Shop not found");
  if (shop.userId !== user._id) throw new Error("Unauthorized");
  return { user, shop };
}

async function requireCurrentUser(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  if (user) return user;

  const email = typeof identity.email === "string" && identity.email
    ? identity.email
    : `${identity.subject}@unknown`;
  const name = typeof identity.name === "string" && identity.name ? identity.name : undefined;
  const imageUrl = typeof identity.pictureUrl === "string" && identity.pictureUrl
    ? identity.pictureUrl : undefined;

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

// async function requireShopOwnedByUser(ctx: MutationCtx, shopId: Id<"shops">) {
//   const user = await requireCurrentUser(ctx);
//   const shop = await ctx.db.get(shopId);
//   if (!shop) throw new Error("Shop not found");
//   if (shop.userId !== user._id) throw new Error("Unauthorized");
//   return { user, shop };
// }


function computeFees(shippingMethod: string, subtotal: number) {
  const shippingFee = shippingMethod === "express" ? 20000 : 10000;
  const serviceFee = subtotal > 0 ? 2000 : 0;
  return { shippingFee, serviceFee, total: subtotal + shippingFee + serviceFee };
}

type TransactionStatus =
  | "pending"
  | "processing"
  | "shipping"
  | "received"
  | "canceled";

function normalizeStatus(input: string): TransactionStatus {
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

export const checkout = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        skuKey: v.string(),
        quantity: v.number(),
      }),
    ),
    addressId: v.id("addresses"),
    shippingMethod: v.string(),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const buyer = await requireCurrentUser(ctx);

    const address = await ctx.db.get(args.addressId);
    if (!address) throw new Error("Address not found");
    if (address.userId !== buyer._id) throw new Error("Unauthorized");

    const addressSnapshot = {
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      address: address.address,
      location: address.location,
    };

    const resolved: {
      shopId: Id<"shops">;
      skuId: Id<"productSkus">;
      skuKey: string;
      productId: Id<"products">;
      productName: string;
      imageUrl?: string;
      options: { name: string; value: string }[];
      price: number;
      quantity: number;
      lineTotal: number;
    }[] = [];

    for (const it of args.items) {
      const qty = Math.max(1, Math.floor(it.quantity));
      if (!Number.isFinite(qty)) throw new Error("Invalid quantity");

      const sku = await ctx.db
        .query("productSkus")
        .withIndex("by_productId_key", (q) =>
          q.eq("productId", it.productId).eq("key", it.skuKey),
        )
        .unique();

      if (!sku) throw new Error("SKU not found");
      if (sku.stock < qty) throw new Error("Stock not enough");

      const product = await ctx.db.get(it.productId);
      if (!product) throw new Error("Product not found");

      const imageUrl = product.imageIds[0]
        ? ((await ctx.storage.getUrl(product.imageIds[0])) ?? undefined)
        : undefined;

      resolved.push({
        shopId: sku.shopId,
        skuId: sku._id,
        skuKey: sku.key,
        productId: it.productId,
        productName: product.name,
        imageUrl,
        options: sku.options,
        price: sku.price,
        quantity: qty,
        lineTotal: sku.price * qty,
      });
    }

    const byShop = new Map<string, typeof resolved>();
    for (const r of resolved) {
      const key = r.shopId as unknown as string;
      const current = byShop.get(key);
      if (current) current.push(r);
      else byShop.set(key, [r]);
    }

    const createdAt = Date.now();
    const ids: Id<"transactions">[] = [];

    for (const [, shopItems] of byShop) {
      const shopId = shopItems[0]!.shopId;
      const subtotal = shopItems.reduce((sum, x) => sum + x.lineTotal, 0);
      const { shippingFee, serviceFee, total } = computeFees(args.shippingMethod, subtotal);

      for (const item of shopItems) {
        const current = await ctx.db.get(item.skuId);
        if (!current) throw new Error("SKU not found");
        if (current.stock < item.quantity) throw new Error("Stock not enough");
        await ctx.db.patch(item.skuId, {
          stock: current.stock - item.quantity,
          updatedAt: Date.now(),
        });
      }

      const txId = await ctx.db.insert("transactions", {
        buyerUserId: buyer._id,
        shopId,
        status: "pending",
        items: shopItems.map((x) => ({
          productId: x.productId,
          skuId: x.skuId,
          skuKey: x.skuKey,
          productName: x.productName,
          imageUrl: x.imageUrl,
          options: x.options,
          price: x.price,
          quantity: x.quantity,
          lineTotal: x.lineTotal,
        })),
        addressSnapshot,
        shippingMethod: args.shippingMethod,
        shippingFee,
        paymentMethod: args.paymentMethod,
        serviceFee,
        subtotal,
        total,
        createdAt,
        updatedAt: createdAt,
      });

      ids.push(txId);
    }

    return { transactionIds: ids };
  },
});

export const listByShop = query({
  args: { shopId: v.id("shops") },
  handler: async (ctx, args) => {
    await getShopOwnedByUser(ctx, args.shopId);
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_shopId", (q) => q.eq("shopId", args.shopId))
      .order("desc")
      .collect();

    const enrichedTxs = await Promise.all(
      txs.map(async (tx) => {
        const enrichedItems = await Promise.all(
          tx.items.map(async (item) => {
            const sku = await ctx.db.get(item.skuId);
            
            return {
              ...item,
              skuOptions: sku?.options || [],
            };
          })
        );

        return {
          ...tx,
          status: normalizeStatus(tx.status as string),
          items: enrichedItems,
        };
      })
    );

    return enrichedTxs;
  },
});

export const listCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_buyerUserId", (q) =>
        q.eq("buyerUserId", user._id),
      )
      .order("desc")
      .collect();

    const result = await Promise.all(
      txs.map(async (tx) => {
        const enrichedItems = await Promise.all(
          tx.items.map(async (item) => {
            const sku = await ctx.db.get(item.skuId);
            
            return {
              ...item,
              skuOptions: sku?.options ?? [],
            };
          })
        );

        const shop = await ctx.db.get(tx.shopId);
        const imageUrl = shop?.logoId
          ? await ctx.storage.getUrl(shop.logoId)
          : null;

        return {
          ...tx,
          status: normalizeStatus(tx.status as string),
          items: enrichedItems, 
          shop: {
            id: tx.shopId,
            name: shop?.name ?? "Unknown shop",
            imageUrl,
            slug: shop?.slug ?? null,
            address: shop?.address ?? null,
          },
        };
      }),
    );

    return result;
  },
});

export const updateStatus = mutation({
  args: {
    transactionId: v.id("transactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("shipping"),
      v.literal("received"),
      v.literal("canceled"),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");
    const shop = await ctx.db.get(tx.shopId);
    if (!shop) throw new Error("Shop not found");
    if (shop.userId !== user._id) throw new Error("Unauthorized");

    const current = normalizeStatus(tx.status as string);
    const next = args.status as TransactionStatus;

    if (current === "received" || current === "canceled") {
      throw new Error("Cannot update a completed order");
    }

    const allowed =
      (current === "pending" && (next === "processing" || next === "canceled")) ||
      (current === "processing" && (next === "shipping" || next === "canceled"));

    if (!allowed) throw new Error(`Invalid status transition: ${current} -> ${next}`);

    await ctx.db.patch(args.transactionId, { status: next, updatedAt: Date.now() });
    return args.transactionId;
  },
});

export const cancelMyOrder = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.buyerUserId !== user._id) throw new Error("Unauthorized");

    const current = normalizeStatus(tx.status as string);
    if (current === "received" || current === "canceled") {
      throw new Error("Order is already completed");
    }
    if (current === "shipping") {
      throw new Error("Order is already in shipping");
    }

    await ctx.db.patch(args.transactionId, {
      status: "canceled",
      updatedAt: Date.now(),
    });
    return args.transactionId;
  },
});

export const markMyOrderReceived = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const tx = await ctx.db.get(args.transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.buyerUserId !== user._id) throw new Error("Unauthorized");

    const current = normalizeStatus(tx.status as string);
    if (current !== "shipping") throw new Error("Order is not in shipping");

    await ctx.db.patch(args.transactionId, {
      status: "received",
      updatedAt: Date.now(),
    });
    return args.transactionId;
  },
});
