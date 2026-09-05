import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    externalId: v.string(), // Clerk User ID
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro")),
  }).index("by_externalId", ["externalId"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
    imageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  shops: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    location: v.optional(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    logoId: v.optional(v.id("_storage")),
    slug: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_slug", ["slug"]),

  products: defineTable({
    shopId: v.id("shops"),
    categoryId: v.optional(v.union(v.id("categories"), v.null())),
    name: v.string(),
    description: v.optional(v.string()),
    basePrice: v.optional(v.number()),
    imageIds: v.array(v.id("_storage")),
    variants: v.optional(
      v.array(
        v.object({
          name: v.string(),
          values: v.array(v.string()),
        }),
      ),
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shopId", ["shopId"])
    .index("by_categoryId", ["categoryId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["shopId"] }),

  productSkus: defineTable({
    productId: v.id("products"),
    shopId: v.id("shops"),
    key: v.string(),
    options: v.array(
      v.object({
        name: v.string(),
        value: v.string(),
      }),
    ),
    price: v.number(),
    stock: v.number(),
    imageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_shopId", ["shopId"])
    .index("by_productId_key", ["productId", "key"]),

  addresses: defineTable({
    userId: v.id("users"),
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
    isPrimary: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_isPrimary", ["userId", "isPrimary"]),

  transactions: defineTable({
    buyerUserId: v.id("users"),
    shopId: v.id("shops"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("shipping"),
      v.literal("received"),
      v.literal("canceled"),
      // Backward compatibility (pre-status-flow change)
      v.literal("paid"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled"),
    ),
    items: v.array(
      v.object({
        productId: v.id("products"),
        skuId: v.id("productSkus"),
        skuKey: v.string(),
        productName: v.string(),
        imageUrl: v.optional(v.string()),
        options: v.array(
          v.object({
            name: v.string(),
            value: v.string(),
          }),
        ),
        price: v.number(),
        quantity: v.number(),
        lineTotal: v.number(),
      }),
    ),
    addressSnapshot: v.object({
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
    }),
    shippingMethod: v.string(),
    shippingFee: v.number(),
    paymentMethod: v.string(),
    serviceFee: v.number(),
    subtotal: v.number(),
    total: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shopId", ["shopId"])
    .index("by_buyerUserId", ["buyerUserId"])
    .index("by_shopId_status", ["shopId", "status"]),

  carts: defineTable({
    userId: v.id("users"),
    items: v.array(
      v.object({
        id: v.string(),
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
    ),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  advertisements: defineTable({
    label: v.string(),
    imageId: v.optional(v.id("_storage")),
    url: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_isActive", ["isActive"]),

  reviews: defineTable({
    buyerUserId: v.id("users"),
    transactionId: v.id("transactions"),
    productId: v.id("products"),
    shopId: v.id("shops"),
    rating: v.number(), // 1..5
    reviewText: v.optional(v.string()),
    imageIds: v.array(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_buyerUserId", ["buyerUserId"])
    .index("by_transactionId", ["transactionId"])
    .index("by_transactionId_and_buyerUserId", ["transactionId", "buyerUserId"])
    .index("by_buyerUserId_and_productId_and_transactionId", [
      "buyerUserId",
      "productId",
      "transactionId",
    ]),
});
