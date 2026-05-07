import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { setAdminAuthed } from "#/lib/adminAuth";

const nav = [
	{ label: "Dashboard", to: "/admin/dashboard" },
	{ label: "Advertisement", to: "/admin/advertisements" },
	{ label: "Category", to: "/admin/categories" },
];

export default function GlobalAdminSidebar() {
	const navigate = useNavigate();
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	const close = () => setIsMobileOpen(false);

	return (
		<>
			<button
				type="button"
				className="md:hidden fixed left-3 top-3 z-50 inline-flex items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm shadow-sm"
				onClick={() => setIsMobileOpen(true)}
				aria-label="Open admin menu"
			>
				☰
			</button>

			{isMobileOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/40 md:hidden"
					aria-label="Close admin menu backdrop"
					onClick={close}
				/>
			)}

			<aside
				className={[
					"fixed inset-y-0 left-0 z-50 w-72 border-r bg-white p-4 flex flex-col",
					"transition-transform duration-200 ease-out",
					"md:translate-x-0",
					isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
				].join(" ")}
			>
				<div className="mb-6 flex items-start justify-between gap-3">
					<div>
						<p className="text-lg font-semibold">Admin</p>
						<p className="text-xs text-slate-400">Dashboard, Ads, Category</p>
					</div>
					<button
						type="button"
						className="md:hidden rounded-lg border bg-white px-2 py-1 text-sm"
						onClick={close}
						aria-label="Close admin menu"
					>
						✕
					</button>
				</div>

				<div className="flex flex-col gap-2">
					{nav.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							onClick={close}
							className="w-full rounded-xl px-4 py-3 text-left hover:bg-slate-50"
						>
							{item.label}
						</Link>
					))}
				</div>

				<div className="mt-auto pt-6">
					<button
						type="button"
						className="w-full rounded-xl border px-4 py-3 text-left"
						onClick={async () => {
							setAdminAuthed(false);
							await navigate({ to: "/admin" });
						}}
					>
						Logout
					</button>
				</div>
			</aside>
		</>
	);
}
