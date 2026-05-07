import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { pageTitle } from "#/lib/seo";

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: init?.credentials ?? "include" });

const authStateFn = createServerFn({ method: "GET" })
	.inputValidator((data: { url: string }) => data)
	.handler(async ({ data }) => {
		const { isAuthenticated, userId } = await auth();

		if (!isAuthenticated) {
			throw redirect({
				to: "/sign-in",
				search: { redirect_url: data.url },
			});
		}

		const shop = await convex.query(api.shops.getByClerkUserId, {
			clerkUserId: userId,
		});

		if (!shop) {
			throw redirect({
				to: "/shop/new",
			});
		}

		return { userId, shopId: shop._id };
	});

export const Route = createFileRoute("/shop/_admin")({
	head: () => ({
		meta: [{ title: pageTitle("Shop Admin") }],
	}),
	beforeLoad: async ({ location }) => {
		const search =
			typeof location.search === "string"
				? location.search
				: location.search
					? `?${new URLSearchParams(
							location.search as Record<string, string>,
						).toString()}`
					: "";

		return authStateFn({
			data: { url: `${location.pathname}${search}` },
			fetch: fetchWithCredentials,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		// <div className="container mx-auto">
		// 	<div className="grid grid-cols-12 gap-x-1">
		// 		<Sidebar />
				<Outlet />
		// 	</div>
		// </div>
	);
}
