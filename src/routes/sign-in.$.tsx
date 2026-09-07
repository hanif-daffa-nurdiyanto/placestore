import { SignIn } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { pageTitle } from "#/lib/seo";

const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: init?.credentials ?? "include" });

export const Route = createFileRoute("/sign-in/$")({
	head: () => ({
		meta: [{ title: pageTitle("Sign In") }],
	}),
	validateSearch: (search: Record<string, unknown>) => {
		const redirect_url =
			typeof search.redirect_url === "string" ? search.redirect_url : undefined;
		return { redirect_url };
	},
	beforeLoad: async ({ search }) => {
		const { isAuthenticated } = await authStateFn({
			fetch: fetchWithCredentials,
		});
		if (isAuthenticated) {
			throw redirect({ to: search.redirect_url ?? "/" });
		}
	},
	component: Page,
});

const authStateFn = createServerFn({ method: "GET" }).handler(async () => {
	const { isAuthenticated } = await auth();
	return { isAuthenticated };
});

function Page() {
	return (
		<div
			className="h-screen flex container mx-auto justify-center items-center"
			suppressHydrationWarning
		>
			<SignIn routing="path" signUpUrl="/sign-up" path="/sign-in" />
		</div>
	);
}
