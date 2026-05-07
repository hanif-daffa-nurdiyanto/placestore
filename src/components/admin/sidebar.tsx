import { UserButton } from "@clerk/tanstack-react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Truck, User } from "lucide-react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { useActiveShop } from "../../lib/useActiveShop";

const NavData = [
	{
		label: "Dashboard",
		to: "/shop/admin/dashboard",
	},
	{
		label: "Transactions",
		to: "/shop/admin/transactions",
	},
	{
		label: "Products",
		to: "/shop/admin/product",
	},
	{
		label: "Settings",
		to: "/shop/admin/settings",
	},
];

const Sidebar = () => {
	const shops = useQuery(api.shops.getCurrentUserShops);
	const [isOpen, setIsOpen] = useState(false);
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const navigate = useNavigate();

	const { activeShop, activeShopSlug, setActiveShopSlug } =
		useActiveShop(shops);

	const handleSelectShop = async (slug: string) => {
		setActiveShopSlug(slug);
		setIsOpen(false);
		setIsMobileOpen(false);
		await navigate({ to: "/shop/admin/dashboard" });
	};

	const handleCloseAll = () => {
		setIsOpen(false);
		setIsMobileOpen(false);
	};

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
					onClick={handleCloseAll}
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
						<p className="text-lg font-semibold">Shop Admin</p>
						<p className="text-xs text-slate-400">Manage your shops</p>
					</div>
					<button
						type="button"
						className="md:hidden rounded-lg border bg-white px-2 py-1 text-sm"
						onClick={handleCloseAll}
						aria-label="Close admin menu"
					>
						✕
					</button>
				</div>

				<div className="relative mb-6">
					<button
						type="button"
						onClick={() => setIsOpen((prev) => !prev)}
						className="w-full rounded-xl border px-4 py-3 text-left"
					>
						<p className="text-xs text-slate-400">Active shop</p>
						<div className="flex items-center justify-between">
							<span className="font-medium">
								{shops === undefined
									? "Loading..."
									: (activeShop?.name ?? "Select shop")}
							</span>
							<span className="text-slate-400">⌄</span>
						</div>
					</button>

					{isOpen && (
						<div className="absolute z-20 mt-2 w-full rounded-xl bg-slate-200 shadow-lg overflow-hidden">
							{shops?.map((shop) => (
								<button
									key={shop._id}
									type="button"
									onClick={() => handleSelectShop(shop.slug)}
									className={`w-full px-4 py-3 text-left hover:border-b-2 ${
										activeShopSlug === shop.slug ? "bg-yellow-100" : ""
									}`}
								>
									<p className="font-medium">{shop.name}</p>
									<p className="text-xs text-slate-400">/{shop.slug}</p>
								</button>
							))}

							<Link
								to="/shop/new"
								onClick={handleCloseAll}
								className="block px-4 py-3 text-sm text-slate-600 hover:border-b-2 "
							>
								+ Create new shop
							</Link>
						</div>
					)}
				</div>

				<div className="flex flex-col gap-2">
					{NavData.map(({ label, to }) => (
						<Link
							key={label}
							to={to}
							onClick={handleCloseAll}
							className="w-full rounded-xl px-4 py-3 text-left hover:bg-slate-50"
						>
							{label}
						</Link>
					))}
				</div>

				<div className="mt-auto pt-6">
					<UserButton/>
				</div>
			</aside>

			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 z-30 hidden md:block"
					aria-label="Close active shop dropdown backdrop"
					onClick={() => setIsOpen(false)}
				/>
			)}
		</>
	);
};

export default Sidebar;
