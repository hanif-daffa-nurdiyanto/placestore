	/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
	import { createFileRoute } from "@tanstack/react-router";
	import { useMutation, useQuery } from "convex/react";
		import { StatusPill } from "#/components/ui/StatusPill";
		import { formatUSD, formatUSDMaybe } from "#/lib/money";
		import { useActiveShop } from "#/lib/useActiveShop";
		import { formatDateTime } from "#/lib/utils";
		import { api } from "../../../../../../convex/_generated/api";
		import { useMemo, useState } from "react";

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/transactions",
)({
	component: RouteComponent,
});

		function RouteComponent() {
			const shops = useQuery(api.shops.getCurrentUserShops);
			const { activeShop } = useActiveShop(shops);
			const updateStatus = useMutation(api.transactions.updateStatus);
			const [activeStatus, setActiveStatus] = useState("all");

			const txs = useQuery(
				api.transactions.listByShop,
				activeShop ? { shopId: activeShop._id } : "skip",
		);

		const filtered = useMemo(() => {
			if (!txs) return txs;
			if (activeStatus === "all") return txs;
			return txs.filter((t) => t.status === activeStatus);
		}, [txs, activeStatus]);

		return (
			<div className="space-y-6 py-6">
			<div className="space-y-1">
				<h1 className="text-2xl font-semibold">Transactions</h1>
				<p className="text-sm text-slate-600">
					{activeShop
						? `Active shop: ${activeShop.name}`
						: "Select an active shop"}
				</p>
			</div>

			{!activeShop ? (
				<p className="text-sm text-slate-500">No active shop.</p>
			) : txs === undefined ? (
				<p className="text-sm text-slate-500">Loading...</p>
				) : txs.length === 0 ? (
					<p className="text-sm text-slate-500">No transactions yet.</p>
				) : (
					<>
						<div className="flex rounded-xl border p-2 w-fit">
							{[
								"all",
								"pending",
								"processing",
								"shipping",
								"received",
								"canceled",
							].map((status) => (
								<button
									type="button"
									className={`flex items-center gap-1 cursor-pointer rounded capitalize px-2 ${
										status === activeStatus
											? "bg-slate-100 text-slate-900"
											: "text-slate-500"
									}`}
									onClick={() => setActiveStatus(status)}
									key={status}
								>
									{status}
								</button>
							))}
						</div>

						{filtered && filtered.length === 0 ? (
							<p className="text-sm text-slate-500">No transactions in this status.</p>
						) : (
							<ul className="space-y-3">
								{filtered?.map((t) => (
									<li key={t._id} className="rounded-xl border p-4 space-y-3">
								<div className="flex items-start justify-between gap-3">
									<div className="min-w-0 space-y-1">
										<div className="flex items-center gap-2">
										<p className="font-medium">
											Transaction: {t._id.slice(0, 8)}
										</p>
										<StatusPill status={t.status} />
									</div>
									<p className="text-xs text-slate-500">
										{formatDateTime(t.createdAt)} • {t.shippingMethod} •{" "}
										{t.paymentMethod}
									</p>
								</div>
								<p className="font-semibold">
											{formatUSDMaybe(t.total) ?? "-"}
										</p>
									</div>
									<div className="flex flex-wrap gap-2">
										{t.status === "pending" && (
											<>
												<button
													type="button"
													className="rounded-md bg-black px-3 py-2 text-sm text-white"
													onClick={() =>
														updateStatus({
															transactionId: t._id,
															status: "processing",
														})
													}
												>
													Accept
												</button>
												<button
													type="button"
													className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
													onClick={() => {
														const ok = confirm("Reject this order?");
														if (!ok) return;
														void updateStatus({
															transactionId: t._id,
															status: "canceled",
														});
													}}
												>
													Reject
												</button>
											</>
										)}
										{t.status === "processing" && (
											<button
												type="button"
												className="rounded-md bg-black px-3 py-2 text-sm text-white"
												onClick={() =>
													updateStatus({
														transactionId: t._id,
														status: "shipping",
													})
												}
											>
												Hand over to courier
											</button>
										)}
									</div>

									<div className="text-sm text-slate-700 space-y-1">
										<p className="text-xs text-slate-500">Shipping address</p>
								<p className="font-medium">
									{t.addressSnapshot.recipientName} • {t.addressSnapshot.phone}
								</p>
								<p className="text-slate-600">{t.addressSnapshot.address}</p>
							</div>

							<div className="space-y-2">
								<p className="text-xs text-slate-500">Items</p>
								<div className="space-y-1">
									{t.items.map((it, i) => (
										<div
											key={`${t._id}:${i}`}
											className="flex items-start justify-between gap-3 text-sm"
										>
											<p className="line-clamp-2 flex gap-3">
												<img
													src={it.imageUrl}
													alt={it.productName}
													className="w-16 h-16 object-contain border rounded"
												/>
												<div className="flex flex-col">
													<span className="font-bold">{it.productName}</span>
													<span>
														{it.skuOptions
															.map((o) => `${o.name}: ${o.value}`)
															.join(" / ")}
													</span>
													<span className="font-semibold">
														{it.quantity > 1 &&
															`${it.lineTotal > 0 && formatUSD(it.lineTotal)} x ${it.quantity}`}
													</span>
												</div>
											</p>
											<p className="font-medium shrink-0">
												{formatUSDMaybe(it.lineTotal) ?? "-"}
											</p>
										</div>
									))}
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
								<div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
									<span className="text-slate-600">Subtotal</span>
									<span className="font-medium">
									{formatUSDMaybe(t.subtotal) ?? "-"}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
									<span className="text-slate-600">Shipping</span>
									<span className="font-medium">
									{formatUSDMaybe(t.shippingFee) ?? "-"}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
									<span className="text-slate-600">Service fee</span>
									<span className="font-medium">
									{formatUSDMaybe(t.serviceFee) ?? "-"}
									</span>
								</div>
								</div>
							</li>
								))}
							</ul>
						)}
					</>
				)}
			</div>
		);
	}
