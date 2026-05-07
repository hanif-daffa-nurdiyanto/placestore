import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payloadString = await request.text();
    const headerPayload = request.headers;

    try {
      const result = await ctx.runAction(internal.clerk.fulfill, {
        payload: payloadString,
        svixId: headerPayload.get("svix-id") || "",
        svixTimestamp: headerPayload.get("svix-timestamp") || "",
        svixSignature: headerPayload.get("svix-signature") || "",
      });

      switch (result.type) {
        case "user.created":
          await ctx.runMutation(internal.users.createUser, {
            externalId: result.data.id,
            email: result.data.email_addresses[0]?.email_address,
            name: `${result.data.first_name} ${result.data.last_name}`,
            imageUrl: result.data.image_url,
          });
          break;
      }

      return new Response(null, { status: 200 });
    } catch (err) {
      return new Response("Webhook Error", { status: 400 });
    }
  }),
});

export default http;