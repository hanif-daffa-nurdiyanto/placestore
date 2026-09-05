import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "#/components/ui/Header";
import { useCart } from "#/lib/cart";
import { saveCheckoutSelection } from "#/lib/checkoutSelection";
import { formatIDRMaybe } from "#/lib/money";
import { pageTitle } from "#/lib/seo";

export const Route = createFileRoute("/cart")({
	head: () => ({
		meta: [{ title: pageTitle("Cart") }],
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const { items, setQuantity, removeItem, clear, totalItems, syncSku } =
		useCart();

	const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
	const prevItemIdsRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		const currentIds = new Set(items.map((it) => it.id));
		// const prevIds = prevItemIdsRef.current;

		setSelectedIds((prev) => {
			const next = new Set<string>();

			// Keep current selection for items that still exist.
			for (const id of prev) if (currentIds.has(id)) next.add(id);

			// Auto-select truly new items (new in cart), not previously deselected ones.
			// for (const id of currentIds) if (!prevIds.has(id)) next.add(id);

			return next;
		});

		prevItemIdsRef.current = currentIds;
	}, [items]);

	const skuSnapshots = useQuery(
		anyApi.products.getCartSnapshots,
		items.length
			? {
					items: items.map((it) => ({
						productId: it.productId,
						skuKey: it.skuKey,
					})),
				}
			: "skip",
	) as
		| {
				productId: string;
				skuKey: string;
				price: number | null;
				stock: number | null;
				productName: string | null;
				imageUrl: string | null;
				shopId: string | null;
				shopName: string | null;
				shopSlug: string | null;
				shopLogoUrl: string | null;
		  }[]
		| undefined;

	useEffect(() => {
		if (!skuSnapshots) return;
		for (const snap of skuSnapshots) {
			if (snap.price === null && snap.stock === null) continue;
			syncSku(
				{ productId: snap.productId, skuKey: snap.skuKey },
				{
					...(snap.price !== null ? { price: snap.price } : {}),
					...(snap.stock !== null ? { stock: snap.stock } : {}),
					...(snap.productName !== null
						? { productName: snap.productName }
						: {}),
					...(snap.imageUrl !== null ? { imageUrl: snap.imageUrl } : {}),
					shopId: snap.shopId,
					shopName: snap.shopName,
					shopSlug: snap.shopSlug,
					shopLogoUrl: snap.shopLogoUrl,
				},
			);
		}
	}, [skuSnapshots, syncSku]);

	const grouped = useMemo(() => {
		const groups = new Map<
			string,
			{
				shopId: string | null;
				shopName: string;
				shopSlug: string | null;
				shopLogoUrl: string | null;
				items: typeof items;
			}
		>();

		for (const it of items) {
			const key = it.shopId ?? "unknown";
			const current = groups.get(key);
			if (current) {
				current.items.push(it);
				continue;
			}
			groups.set(key, {
				shopId: it.shopId,
				shopName: it.shopName ?? "Unknown shop",
				shopSlug: it.shopSlug ?? null,
				shopLogoUrl: it.shopLogoUrl ?? null,
				items: [it],
			});
		}

		return Array.from(groups.values()).sort((a, b) =>
			a.shopName.localeCompare(b.shopName),
		);
	}, [items]);

	const selectedItems = useMemo(
		() => items.filter((it) => selectedIds.has(it.id)),
		[items, selectedIds],
	);
	const selectedTotalItems = useMemo(
		() => selectedItems.reduce((sum, it) => sum + Math.max(0, it.quantity), 0),
		[selectedItems],
	);
	const selectedTotalPrice = useMemo(
		() => selectedItems.reduce((sum, it) => sum + it.price * it.quantity, 0),
		[selectedItems],
	);

	return (
		<div className="min-h-screen">
			<Header />

			<main className="mega-container mx-auto py-10 space-y-6">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold">Cart</h1>
						<p className="text-sm text-slate-500">{totalItems} items</p>
					</div>

					{items.length > 0 && (
						<button
							type="button"
							onClick={clear}
							className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
						>
							Clear
						</button>
					)}
				</div>

				{items.length === 0 ? (
					<div className="rounded-xl border p-6 text-sm text-slate-500">
						Cart is empty.{" "}
						<Link to="/" className="underline">
							Browse products
						</Link>
						.
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						<div className="lg:col-span-2 space-y-3">
							{grouped.map((group) => {
								const groupItemIds = group.items.map((it) => it.id);
								const groupAllSelected =
									groupItemIds.length > 0 &&
									groupItemIds.every((id) => selectedIds.has(id));
								const groupAnySelected = groupItemIds.some((id) =>
									selectedIds.has(id),
								);

								return (
									<div
										key={group.shopId ?? "unknown"}
										className="rounded-xl border"
									>
										<div className="p-4 border-b flex items-center justify-between gap-3">
											<div className="flex items-center gap-3 min-w-0">
												<input
													type="checkbox"
													checked={groupAllSelected}
													ref={(el) => {
														if (!el) return;
														el.indeterminate =
															groupAnySelected && !groupAllSelected;
													}}
													onChange={(e) => {
														const checked = e.target.checked;
														setSelectedIds((prev) => {
															const next = new Set(prev);
															for (const id of groupItemIds) {
																if (checked) next.add(id);
																else next.delete(id);
															}
															return next;
														});
													}}
												/>
												{group.shopLogoUrl ? (
													<img
														src={group.shopLogoUrl}
														alt={`${group.shopName} logo`}
														className="h-8 w-8 rounded-full border object-cover bg-slate-50"
														loading="lazy"
													/>
												) : (
													<div className="h-8 w-8 rounded-full border bg-slate-100" />
												)}
												<div className="min-w-0">
													{group.shopSlug ? (
														<Link
															to="/shop/$slug"
															params={{ slug: group.shopSlug }}
															className="font-medium hover:underline line-clamp-1"
														>
															{group.shopName}
														</Link>
													) : (
														<p className="font-medium line-clamp-1">
															{group.shopName}
														</p>
													)}
													<p className="text-xs text-slate-500">
														{group.items.length} items
													</p>
												</div>
											</div>
										</div>

										<div className="p-4 space-y-3">
											{group.items.map((it) => (
												<div key={it.id} className="flex gap-4 items-start">
													<input
														type="checkbox"
														checked={selectedIds.has(it.id)}
														onChange={(e) => {
															const checked = e.target.checked;
															setSelectedIds((prev) => {
																const next = new Set(prev);
																if (checked) next.add(it.id);
																else next.delete(it.id);
																return next;
															});
														}}
														className="mt-2"
													/>

													<div className="h-20 w-20 rounded-lg border bg-slate-50 overflow-hidden shrink-0">
														{it.imageUrl && (
															<img
																src={it.imageUrl}
																alt={it.productName}
																className="h-full w-full object-cover"
																loading="lazy"
															/>
														)}
													</div>

													<div className="flex-1 space-y-1">
														<Link
															to="/product/$id"
															params={{ id: it.productId as never }}
															className="font-medium hover:underline"
														>
															{it.productName}
														</Link>
														<p className="text-xs text-slate-500">
															Stock: {it.stock}
														</p>
														{it.options.length > 0 && (
															<p className="text-xs text-slate-500">
																{it.options
																	.map((o) => `${o.name}: ${o.value}`)
																	.join(" • ")}
															</p>
														)}
														<p className="text-sm font-semibold">
															{formatIDRMaybe(it.price) ?? "-"}
														</p>

														<div className="flex items-center gap-2 pt-2">
															<fieldset className="product-quantity-stepper">
																<legend className="sr-only">
																	Quantity for {it.productName}
																</legend>
																<button
																	type="button"
																	onClick={() =>
																		setQuantity(
																			it.id,
																			Math.max(1, it.quantity - 1),
																		)
																	}
																	disabled={it.quantity <= 1}
																	aria-label={`Decrease ${it.productName} quantity`}
																>
																	<Minus />
																</button>
																<input
																	type="number"
																	min={1}
																	max={it.stock > 0 ? it.stock : 999}
																	value={it.quantity}
																	onChange={(event) => {
																		const next = Number(event.target.value);
																		if (Number.isFinite(next))
																			setQuantity(it.id, next);
																	}}
																	aria-label={`Quantity for ${it.productName}`}
																/>
																<button
																	type="button"
																	onClick={() =>
																		setQuantity(
																			it.id,
																			Math.min(
																				Math.max(1, it.stock),
																				it.quantity + 1,
																			),
																		)
																	}
																	disabled={
																		it.stock <= 0 || it.quantity >= it.stock
																	}
																	aria-label={`Increase ${it.productName} quantity`}
																>
																	<Plus />
																</button>
															</fieldset>
															<button
																type="button"
																onClick={() => {
																	removeItem(it.id);
																	setSelectedIds((prev) => {
																		if (!prev.has(it.id)) return prev;
																		const next = new Set(prev);
																		next.delete(it.id);
																		return next;
																	});
																}}
																className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
															>
																Remove
															</button>
														</div>
													</div>

													<div className="text-right">
														<p className="text-sm font-semibold">
															{formatIDRMaybe(it.price * it.quantity) ?? "-"}
														</p>
													</div>
												</div>
											))}
										</div>
									</div>
								);
							})}
						</div>

						<div className="rounded-xl border p-4 space-y-3 h-fit">
							<p className="font-medium">Summary</p>
							{selectedItems.length ? (
								<div className="space-y-2">
									{selectedItems.map((it) => (
										<div
											key={it.id}
											className="flex items-start justify-between gap-3 text-sm"
										>
											<p className="text-slate-700 line-clamp-2">
												{it.productName}
												<span className="font-bold text-green-600">
													{it.quantity > 1 ? ` x ${it.quantity}` : ""}
												</span>
											</p>
											<p className="font-medium shrink-0">
												{formatIDRMaybe(it.price * it.quantity) ?? "-"}
											</p>
										</div>
									))}
								</div>
							) : (
								<p className="text-sm text-slate-500">No items selected.</p>
							)}
							<hr />
							<div className="flex items-center justify-between text-sm">
								<span className="text-slate-600">Total</span>
								<span className="font-semibold">
									{formatIDRMaybe(selectedTotalPrice) ?? "-"}
								</span>
							</div>
							<button
								type="button"
								className="product-checkout-button w-full"
								disabled={selectedTotalItems === 0}
								onClick={() => {
									if (selectedTotalItems === 0) return;
									saveCheckoutSelection(Array.from(selectedIds));
									navigate({ to: "/checkout" });
								}}
							>
								Checkout
							</button>
						</div>
					</div>
				)}
			</main>
		</div>
	);
}
