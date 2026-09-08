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
        case "user.updated": {
          const primaryEmail = result.data.email_addresses.find(
            (email: { id: string }) =>
              email.id === result.data.primary_email_address_id,
          );
          const name = [result.data.first_name, result.data.last_name]
            .filter(
              (part): part is string =>
                typeof part === "string" && part.trim().length > 0,
            )
            .join(" ");

          await ctx.runMutation(internal.users.syncUser, {
            externalId: result.data.id,
            email:
              primaryEmail?.email_address ??
              result.data.email_addresses[0]?.email_address,
            name: name || undefined,
            imageUrl:
              typeof result.data.image_url === "string"
                ? result.data.image_url
                : undefined,
          });
          break;
        }
      }

      return new Response(null, { status: 200 });
    } catch (err) {
      return new Response("Webhook Error", { status: 400 });
    }
  }),
});

export default http;
