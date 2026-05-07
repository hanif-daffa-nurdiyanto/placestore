import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const createUser = internalMutation({
  args: {
    externalId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (!existingUser) {
      await ctx.db.insert("users", {
        externalId: args.externalId,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        plan: "free",
      });
    }
  },
});