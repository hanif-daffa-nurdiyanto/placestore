	import { ConvexQueryClient } from "@convex-dev/react-query";
	import { QueryClient } from "@tanstack/react-query";
	import { Link, createRouter as createTanStackRouter } from "@tanstack/react-router";
	import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
	import { ConvexReactClient } from "convex/react";
	import { routeTree } from "./routeTree.gen";

	function DefaultNotFound() {
		return (
			<div className="mx-auto w-full max-w-3xl px-4 py-10">
				<h1 className="text-2xl font-semibold">Not found</h1>
				<p className="mt-2 text-muted-foreground">
					The page you’re looking for doesn’t exist.
				</p>
				<div className="mt-6">
					<Link to="/" className="underline underline-offset-4">
						Go back home
					</Link>
				</div>
			</div>
		);
	}

	export function getRouter() {
		const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
		if (!CONVEX_URL) {
			console.error("missing envar VITE_CONVEX_URL");
	}
	const convex = new ConvexReactClient(CONVEX_URL, {
		unsavedChangesWarning: false,
	});
	const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
	});
	convexQueryClient.connect(queryClient);

		const router = createTanStackRouter({
			routeTree,
			context: { queryClient, convexClient: convex, convexQueryClient },
			scrollRestoration: true,
			defaultPreload: "intent",
			defaultPreloadStaleTime: 0,
			defaultNotFoundComponent: DefaultNotFound,
		});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
