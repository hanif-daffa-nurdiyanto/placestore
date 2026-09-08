import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const syncUser = internalMutation({
  args: {
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        ...(args.email !== undefined ? { email: args.email } : {}),
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      externalId: args.externalId,
      email: args.email ?? `${args.externalId}@unknown`,
      name: args.name,
      imageUrl: args.imageUrl,
      plan: "free",
    });
  },
});
