import { createFileRoute, Outlet } from "@tanstack/react-router";
import Sidebar from "#/components/admin/sidebar";
import { pageTitle } from "#/lib/seo";

export const Route = createFileRoute("/shop/_admin/_adminLayout")({
	head: () => ({
		meta: [{ title: pageTitle("Shop Dashboard") }],
	}),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="min-h-screen bg-white">
			<Sidebar />
			<div className="mx-auto w-full max-w-6xl px-4 pt-16 md:pt-6 md:pl-72">
				<Outlet />
			</div>
		</div>
	);
}
