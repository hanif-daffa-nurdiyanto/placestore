import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { api } from "../../../../../../convex/_generated/api";
import { formatIDRMaybe, formatIDRRange } from "#/lib/money";
import { useActiveShop } from "../../../../../lib/useActiveShop";

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/dashboard",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const shops = useQuery(api.shops.getCurrentUserShops);
	const { activeShop } = useActiveShop(shops);

	const stats = useQuery(
		anyApi.products.getShopStats,
		activeShop ? { shopId: activeShop._id } : "skip",
	) as
		| {
				productCount: number;
				activeProductCount: number;
				productWithVariantsCount: number;
				skuCount: number;
				inStockSkuCount: number;
				totalStock: number;
				inventoryValue: number;
				minSkuPrice: number | null;
				maxSkuPrice: number | null;
				lastUpdatedAt: number | null;
				topProductsByStock: { productId: string; name: string; stock: number }[];
		  }
		| undefined;

	const priceRangeLabel = formatIDRRange(stats?.minSkuPrice, stats?.maxSkuPrice);
	const inventoryValueLabel = formatIDRMaybe(stats?.inventoryValue ?? null);

	return (
		<div className="space-y-6 py-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<p className="text-sm text-slate-600">
					{activeShop ? `Active shop: ${activeShop.name}` : "Select an active shop"}
				</p>
			</div>

			{activeShop && (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
					<StatCard
						label="Products"
						value={
							stats === undefined ? "Loading..." : String(stats.productCount ?? 0)
						}
						sub={
							stats === undefined
								? ""
								: `${stats.activeProductCount ?? 0} active`
						}
					/>
					<StatCard
						label="SKUs"
						value={stats === undefined ? "Loading..." : String(stats.skuCount ?? 0)}
						sub={
							stats === undefined ? "" : `${stats.inStockSkuCount ?? 0} in stock`
						}
					/>
					<StatCard
						label="Total stock"
						value={
							stats === undefined ? "Loading..." : String(stats.totalStock ?? 0)
						}
						sub={
							stats === undefined
								? ""
								: `${stats.productWithVariantsCount ?? 0} products w/ variants`
						}
					/>
					<StatCard
						label="Inventory value"
						value={stats === undefined ? "Loading..." : inventoryValueLabel ?? "-"}
						sub={stats === undefined ? "" : priceRangeLabel ?? "No prices yet"}
					/>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					<div className="rounded-xl border p-4 space-y-3">
						<div>
							<p className="font-medium">Top products by stock</p>
							<p className="text-sm text-slate-500">
								Currently based on SKU data.
							</p>
						</div>

					{!activeShop ? (
						<p className="text-sm text-slate-500">No active shop.</p>
					) : stats === undefined ? (
						<p className="text-sm text-slate-500">Loading...</p>
					) : stats.topProductsByStock.length === 0 ? (
						<p className="text-sm text-slate-500">No SKUs yet.</p>
					) : (
						<ul className="space-y-2">
							{stats.topProductsByStock.map((p) => (
								<li
									key={p.productId}
									className="flex items-center justify-between gap-3"
								>
									<p className="text-sm font-medium line-clamp-1">{p.name}</p>
									<p className="text-sm text-slate-600">Stock: {p.stock}</p>
								</li>
							))}
						</ul>
					)}
				</div>

					<div className="rounded-xl border p-4 space-y-3">
						<div>
							<p className="font-medium">Notes</p>
							<p className="text-sm text-slate-500">
								Placeholder dashboard. Next: orders, revenue, charts.
							</p>
						</div>
						<ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
							<li>Active products vs total</li>
							<li>In-stock SKUs vs total</li>
							<li>Inventory value = Σ(price × stock)</li>
						</ul>
					</div>
				</div>
			</div>
	);
}

function StatCard(props: { label: string; value: string; sub?: string }) {
	return (
		<div className="rounded-xl border p-4 space-y-1">
				<p className="text-xs text-slate-500">{props.label}</p>
				<p className="text-xl font-semibold">{props.value}</p>
				{props.sub && <p className="text-xs text-slate-500">{props.sub}</p>}
			</div>
		);
	}
