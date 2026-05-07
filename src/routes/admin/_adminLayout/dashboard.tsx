import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/lib/seo";

export const Route = createFileRoute("/admin/_adminLayout/dashboard")({
	head: () => ({
		meta: [{ title: pageTitle("Admin Dashboard") }],
	}),
	component: Page,
});

function Page() {
	return (
		<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<p className="text-sm text-slate-500">
					Use the sidebar to manage advertisements.
				</p>
			</div>
		);
	}
