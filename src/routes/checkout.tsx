import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "#/components/ui/Header";
import { useCart } from "#/lib/cart";
import {
	clearCheckoutSelection,
	loadCheckoutSelection,
} from "#/lib/checkoutSelection";
import { formatUSDMaybe } from "#/lib/money";
import { pageTitle } from "#/lib/seo";
import { api } from "../../convex/_generated/api";

type ShippingMethod = "regular" | "express";
type PaymentMethod = "cod" | "bank_transfer" | "ewallet";

const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: init?.credentials ?? "include" });

const authStateFn = createServerFn({ method: "GET" }).handler(async () => {
	const { isAuthenticated } = await auth();
	return { isAuthenticated };
});

export const Route = createFileRoute("/checkout")({
	head: () => ({
		meta: [{ title: pageTitle("Checkout") }],
	}),
	beforeLoad: async ({ location }) => {
		const { isAuthenticated } = await authStateFn({
			fetch: fetchWithCredentials,
		});

		if (!isAuthenticated) {
			throw redirect({
				to: "/sign-in",
				search: { redirect_url: location.pathname },
			});
		}

		// Client-only data (sessionStorage) is read inside the component.
		// This route is safe to SSR, but will redirect client-side if empty.
		return null;
	},
	component: CheckoutPage,
});

function CheckoutPage() {
	const navigate = useNavigate();
	const { items, removeItem, setQuantity, syncSku } = useCart();
	const addresses = useQuery(api.addresses.listCurrentUserAddresses);
	const checkout = useMutation(anyApi.transactions.checkout);

	const [isClient, setIsClient] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [shippingMethod, setShippingMethod] =
		useState<ShippingMethod>("regular");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
		null,
	);

	useEffect(() => {
		setIsClient(true);
		setSelectedIds(loadCheckoutSelection());
	}, []);

	useEffect(() => {
		if (addresses === undefined) return;
		if (selectedAddressId) return;
		const primary = addresses.find((a) => a.isPrimary);
		if (primary) setSelectedAddressId(primary._id);
		else if (addresses[0]) setSelectedAddressId(addresses[0]._id);
	}, [addresses, selectedAddressId]);

	const selectedItems = useMemo(() => {
		if (!selectedIds.length) return [];
		const set = new Set(selectedIds);
		return items.filter((it) => set.has(it.id));
	}, [items, selectedIds]);

	const skuSnapshots = useQuery(
		anyApi.products.getCartSnapshots,
		selectedItems.length
			? {
					items: selectedItems.map((it) => ({
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
				items: typeof selectedItems;
			}
		>();

		for (const it of selectedItems) {
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
				items: [it],
			});
		}

		return Array.from(groups.values()).sort((a, b) =>
			a.shopName.localeCompare(b.shopName),
		);
	}, [selectedItems]);

	const subtotal = useMemo(
		() => selectedItems.reduce((sum, it) => sum + it.price * it.quantity, 0),
		[selectedItems],
	);

	const shippingFee = useMemo(() => {
		// Dummy shipping fees for now
		return shippingMethod === "express" ? 20000 : 10000;
	}, [shippingMethod]);

	const serviceFee = useMemo(() => {
		// Dummy service fee
		return subtotal > 0 ? 2000 : 0;
	}, [subtotal]);

	const total = subtotal + shippingFee + serviceFee;

	const etaLabel = useMemo(() => {
		// Dummy ETA labels
		return shippingMethod === "express" ? "1–2 hari" : "3–5 hari";
	}, [shippingMethod]);

	useEffect(() => {
		if (!isClient) return;
		if (selectedIds.length) return;
		// No selection, go back to cart
		navigate({ to: "/cart" });
	}, [isClient, navigate, selectedIds.length]);

	const selectedAddress = useMemo(() => {
		if (!addresses || !selectedAddressId) return null;
		return addresses.find((a) => a._id === selectedAddressId) ?? null;
	}, [addresses, selectedAddressId]);

	if (!isClient) return null;

	if (!selectedIds.length) {
		// Navigation effect will run; render nothing to avoid flicker.
		return null;
	}

	return (
		<div className="checkout-page min-h-screen bg-white">
			<Header />
			<main className="mega-container mx-auto py-10 space-y-6">
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-1">
						<h1 className="text-2xl font-semibold">Checkout</h1>
						<p className="text-sm text-slate-500">
							{selectedItems.length} items selected
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
					<div className="lg:col-span-2 space-y-4">
						<div className="rounded-xl border p-4 space-y-3">
							<p className="font-medium">Summary</p>
							{grouped.length === 0 ? (
								<p className="text-sm text-slate-500">No items.</p>
							) : (
								<div className="space-y-4">
									{grouped.map((g) => (
										<div key={g.shopId ?? "unknown"} className="space-y-2">
											<p className="text-sm font-semibold">{g.shopName}</p>
											<div className="space-y-3">
												{g.items.map((it) => (
													<div key={it.id} className="checkout-summary-item">
														<div className="checkout-item-info">
															<p>{it.productName}</p>
															<small>{formatUSDMaybe(it.price)} each</small>
														</div>
														<fieldset className="product-quantity-stepper checkout-quantity-stepper">
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
																max={Math.max(1, it.stock)}
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
														<p className="checkout-item-total">
															{formatUSDMaybe(it.price * it.quantity) ?? "-"}
														</p>
													</div>
												))}
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="rounded-xl border p-4 space-y-3">
							<p className="font-medium">Shipping address</p>
							{addresses === undefined ? (
								<p className="text-sm text-slate-500">Loading addresses...</p>
							) : addresses.length === 0 ? (
								<div className="text-sm text-slate-600 space-y-2">
									<p>
										No address. Please add an address in My Account → My
										Addresses
									</p>
									<button
										type="button"
										className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
										onClick={() =>
											navigate({
												to: "/user/account/profile",
												search: { tab: "addresses" },
											})
										}
									>
										Add address
									</button>
								</div>
							) : (
								<div className="space-y-3">
									<div className="space-y-2">
										{addresses.map((a) => (
											<label
												key={a._id}
												className="flex items-start gap-3 rounded-xl border p-3 cursor-pointer"
											>
												<input
													type="radio"
													name="shippingAddress"
													checked={selectedAddressId === a._id}
													onChange={() => setSelectedAddressId(a._id)}
													className="mt-1"
												/>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<p className="font-medium">{a.label}</p>
														{a.isPrimary && (
															<span className="checkout-primary-pill">
																Primary
															</span>
														)}
													</div>
													<p className="text-sm text-slate-700">
														{a.recipientName} • {a.phone}
													</p>
													<p className="text-sm text-slate-600">{a.address}</p>
												</div>
											</label>
										))}
									</div>
								</div>
							)}
						</div>

						<div className="rounded-xl border p-4 space-y-3">
							<p className="font-medium">Shipping options</p>
							<div className="space-y-2">
								<label className="flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer">
									<span className="flex items-center gap-2">
										<input
											type="radio"
											name="shippingMethod"
											checked={shippingMethod === "regular"}
											onChange={() => setShippingMethod("regular")}
										/>
										<span className="text-sm font-medium">Regular</span>
									</span>
									<span className="text-sm text-slate-600">
										{formatUSDMaybe(10000) ?? "-"}
									</span>
								</label>
								<label className="flex items-center justify-between gap-3 rounded-xl border p-3 cursor-pointer">
									<span className="flex items-center gap-2">
										<input
											type="radio"
											name="shippingMethod"
											checked={shippingMethod === "express"}
											onChange={() => setShippingMethod("express")}
										/>
										<span className="text-sm font-medium">Express</span>
									</span>
									<span className="text-sm text-slate-600">
										{formatUSDMaybe(20000) ?? "-"}
									</span>
								</label>
							</div>
							<p className="text-sm text-slate-600">
								Estimated delivery:{" "}
								<span className="font-medium">{etaLabel}</span>
							</p>
						</div>

						<div className="rounded-xl border p-4 space-y-3">
							<p className="font-medium">Payment method</p>
							<div className="space-y-2">
								<label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
									<input
										type="radio"
										name="paymentMethod"
										checked={paymentMethod === "cod"}
										onChange={() => setPaymentMethod("cod")}
									/>
									<span className="text-sm font-medium">COD</span>
								</label>
								<label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
									<input
										type="radio"
										name="paymentMethod"
										checked={paymentMethod === "bank_transfer"}
										onChange={() => setPaymentMethod("bank_transfer")}
									/>
									<span className="text-sm font-medium">Bank Transfer</span>
								</label>
								<label className="flex items-center gap-2 rounded-xl border p-3 cursor-pointer">
									<input
										type="radio"
										name="paymentMethod"
										checked={paymentMethod === "ewallet"}
										onChange={() => setPaymentMethod("ewallet")}
									/>
									<span className="text-sm font-medium">E-Wallet</span>
								</label>
							</div>
						</div>
					</div>

					<div className="rounded-xl border p-4 space-y-3 h-fit">
						<p className="font-medium">Total</p>
						<div className="space-y-2 text-sm">
							<div className="flex items-center justify-between gap-3">
								<span className="text-slate-600">Subtotal</span>
								<span className="font-medium">
									{formatUSDMaybe(subtotal) ?? "-"}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3">
								<span className="text-slate-600">Shipping</span>
								<span className="font-medium">
									{formatUSDMaybe(shippingFee) ?? "-"}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3">
								<span className="text-slate-600">Service fee</span>
								<span className="font-medium">
									{formatUSDMaybe(serviceFee) ?? "-"}
								</span>
							</div>
							<hr />
							<div className="flex items-center justify-between gap-3">
								<span className="text-slate-600">Total</span>
								<span className="font-semibold">
									{formatUSDMaybe(total) ?? "-"}
								</span>
							</div>
						</div>

						<button
							type="button"
							className="product-checkout-button w-full"
							disabled={!selectedItems.length || !selectedAddress}
							onClick={async () => {
								if (!selectedAddress) return;
								try {
									const result = (await checkout({
										items: selectedItems.map((it) => ({
											productId: it.productId,
											skuKey: it.skuKey,
											quantity: it.quantity,
										})),
										addressId: selectedAddress._id,
										shippingMethod,
										paymentMethod,
									})) as { transactionIds?: string[] };

									for (const it of selectedItems) removeItem(it.id);
									clearCheckoutSelection();
									toast.success(
										`Checkout successful. Transactions created: ${result.transactionIds?.length ?? 0}`,
									);
									navigate({ to: "/cart" });
								} catch (err) {
									console.error(err);
									toast.error(
										err instanceof Error ? err.message : "Checkout failed",
									);
								}
							}}
						>
							Checkout
						</button>
						{!selectedAddress && addresses && addresses.length > 0 && (
							<p className="text-xs text-red-600">
								Please select a shipping address first.
							</p>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
