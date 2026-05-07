import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Webhook } from "svix";

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export const fulfill = internalAction({
  args: {
    payload: v.string(),
    svixId: v.string(),
    svixTimestamp: v.string(),
    svixSignature: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!CLERK_WEBHOOK_SECRET) {
      throw new Error("Lupa setup CLERK_WEBHOOK_SECRET di dashboard Convex");
    }

    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    let payload: any;

    try {
      // Kita susun kembali objek header untuk Svix di sini
      payload = wh.verify(args.payload, {
        "svix-id": args.svixId,
        "svix-timestamp": args.svixTimestamp,
        "svix-signature": args.svixSignature,
      }) as any;
    } catch (err) {
      console.error("Gagal memverifikasi webhook:", err);
      throw new Error("Invalid signature");
    }

    return {
      type: payload.type,
      data: payload.data,
    };
  },
});
