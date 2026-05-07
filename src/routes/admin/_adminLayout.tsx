import {
	createFileRoute,
	Outlet,
	redirect,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import GlobalAdminSidebar from "#/components/global-admin/sidebar";
import { isAdminAuthed } from "#/lib/adminAuth";
import { pageTitle } from "#/lib/seo";

export const Route = createFileRoute("/admin/_adminLayout")({
	head: () => ({
		meta: [{ title: pageTitle("Admin") }],
	}),
	beforeLoad: () => {
		// Client-only guard. During SSR we can't read localStorage.
		if (typeof window !== "undefined" && !isAdminAuthed()) {
			throw redirect({ to: "/admin" });
		}
	},
	component: AdminLayout,
});

function AdminLayout() {
	const navigate = useNavigate();
	const [authed, setAuthed] = useState(() => isAdminAuthed());

	useEffect(() => {
		const sync = () => setAuthed(isAdminAuthed());
		sync();
		window.addEventListener("storage", sync);
		return () => window.removeEventListener("storage", sync);
	}, []);

	useEffect(() => {
		if (!authed) void navigate({ to: "/admin" });
	}, [authed, navigate]);

	if (!authed) return null;

	return (
		<div className="min-h-screen bg-white">
			<GlobalAdminSidebar />
			<div className="mx-auto w-full max-w-6xl px-4 pt-16 md:pt-6 md:pl-72">
				<Outlet />
			</div>
		</div>
	);
}
