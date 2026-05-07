import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
	useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
	import { createServerFn } from "@tanstack/react-start";
	import type { ConvexReactClient } from "convex/react";
	import { ConvexProviderWithClerk } from "convex/react-clerk";
	import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
	import appCss from "../styles.css?url";
	import { Footer } from "#/components/ui/Footer";
	import { Toaster } from "#/components/ui/sonner";
	import { CartProvider } from "#/lib/cart";
	import { pageTitle } from "#/lib/seo";

	interface MyRouterContext {
		queryClient: QueryClient;
		convexClient: ConvexReactClient;
	convexQueryClient: ConvexQueryClient;
}

const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: init?.credentials ?? "include" });

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
	const { userId, getToken } = await auth();
	// Convex expects a Clerk JWT issued for the "convex" JWT template.
	// Using the default token can cause "NoAuthProvider" on refresh/SSR.
	const token = await getToken({ template: "convex" });

	return {
		userId,
		token,
	};
});

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
				{
					title: pageTitle(),
				},
			],
			links: [
				{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	beforeLoad: async (ctx) => {
		const { userId, token } = await fetchClerkAuth({ fetch: fetchWithCredentials });

		if (token) {
			ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
		}

		return {
			userId,
			token,
		};
	},
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const context = useRouteContext({ from: Route.id });
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body suppressHydrationWarning>
				<ClerkProvider>
					<ConvexProviderWithClerk
						client={context.convexClient}
						useAuth={useAuth}
					>
						<CartProvider>
							{children}
							<Footer />
							<div suppressHydrationWarning>
								<TanStackDevtools
									config={{
										position: "bottom-right",
									}}
									plugins={[
										{
											name: "Tanstack Router",
											render: <TanStackRouterDevtoolsPanel />,
										},
										TanStackQueryDevtools,
									]}
								/>
							</div>
							<Toaster />
							<Scripts />
						</CartProvider>
					</ConvexProviderWithClerk>
				</ClerkProvider>
			</body>
		</html>
	);
}
