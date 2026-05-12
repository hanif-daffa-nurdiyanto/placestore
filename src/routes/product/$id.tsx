/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/useButtonType: <explanation> */
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	useNavigate,
	useRouteContext,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronDown, ChevronUp, ShoppingCart, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Header } from "#/components/ui/Header";
import { useCart } from "#/lib/cart";
import { saveCheckoutSelection } from "#/lib/checkoutSelection";
import { formatIDRMaybe, formatIDRRange } from "#/lib/money";
import { pageTitle } from "#/lib/seo";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/product/$id")({
	head: () => ({
		meta: [{ title: pageTitle("Product") }],
	}),
	component: RouteComponent,
	loader: async ({ context, params }) => {
		const productId = params.id as Id<"products">;

		await context.queryClient.ensureQueryData(
			context.convexQueryClient.queryOptions(api.products.getPublicById, {
				productId,
			}),
		);

		return { productId };
	},
});

type VariantDef = { name: string; values: string[] };
type PublicSku = {
	key: string;
	options: { name: string; value: string }[];
	price: number;
	stock: number;
};

function cleanVariants(input: VariantDef[]) {
	return input
		.map((v) => ({
			name: v.name.trim(),
			values: v.values.map((x) => x.trim()).filter(Boolean),
		}))
		.filter((v) => v.name && v.values.length > 0);
}

function skuKey(options: { name: string; value: string }[]) {
	if (!options.length) return "base";
	return options.map((o) => `${o.name}=${o.value}`).join("|");
}

function RouteComponent() {
	const { productId } = Route.useLoaderData();
	const { convexQueryClient } = useRouteContext({ from: Route.id });
	const reviewSummary = useQuery(api.reviews.getProductSummary, { productId });
	const reviews = useQuery(api.reviews.listByProduct, { productId, limit: 10 });

	const [isDetailOpen, setIsDetailOpen] = useState(false);

	const productQuery = convexQueryClient.queryOptions(
		api.products.getPublicById,
		{
			productId,
		},
	);

	if (typeof productQuery.queryFn !== "function") {
		throw new Error("Invalid queryFn for product detail query");
	}

	const { data: product } = useSuspenseQuery({
		queryKey: productQuery.queryKey,
		queryFn: productQuery.queryFn,
		staleTime: productQuery.staleTime,
	});

	if (!product) {
		return (
			<div className="container mx-auto py-10 space-y-4">
				<p className="text-sm text-slate-500">Product not found.</p>
				<Link to="/" className="underline text-sm">
					Back
				</Link>
			</div>
		);
	}

	const variants = cleanVariants(
		((product.variants as VariantDef[] | undefined) ??
			[]) satisfies VariantDef[],
	);
	const skus = ((product.skus as PublicSku[] | undefined) ??
		[]) satisfies PublicSku[];

	return (
		<>
			<Header />

			<div className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
					<section className="space-y-4 lg:col-span-5">
						<div className="rounded-2xl bg-white overflow-hidden">
							<ProductImageGallery
								productName={product.name}
								imageUrls={(product.imageUrls ?? []).filter(
									(u): u is string => typeof u === "string" && u.length > 0,
								)}
							/>
						</div>
					</section>

					<aside className="lg:col-span-7">
						<div className="lg:sticky lg:top-6 space-y-3">
							<div className="rounded-2xl bg-white p-5 space-y-4">
								<h1 className="text-2xl font-semibold leading-tight">
									{product.name}
								</h1>
								<ProductMeta
									productId={productId}
									productName={product.name}
									imageUrl={product.imageUrls?.[0] ?? null}
									shop={product.shop}
									basePrice={product.basePrice}
									variants={variants}
									skus={skus}
									minSkuPrice={product.minSkuPrice}
									maxSkuPrice={product.maxSkuPrice}
								/>
							</div>
						</div>
					</aside>

					<div className="rounded-2xl border bg-white p-5 space-y-3 col-span-12">
						<div className="">
							<button
								className="flex items-center justify-between cursor-pointer w-full"
								onClick={() => setIsDetailOpen((v) => !v)}
							>
								<h2 className="text-lg font-semibold">Details</h2>
								{/** biome-ignore lint/a11y/useButtonType: <explanation> */}
								<div className="">
									{isDetailOpen ? <ChevronUp /> : <ChevronDown />}
								</div>
							</button>
							{/* <div className="space-y-2">
							{product.shop ? (
								<div className="flex items-center gap-2">
									{product.shop.logoUrl && (
										<img
											src={product.shop.logoUrl}
											alt={`${product.shop.name} logo`}
											className="h-7 w-7 rounded-full border object-cover bg-slate-50"
											loading="lazy"
										/>
									)}
									<Link
										to="/shop/$slug"
										params={{ slug: product.shop.slug }}
										className="text-sm text-slate-600 hover:underline hover:underline-offset-4"
									>
										{product.shop.name}
									</Link>
								</div>
							) : (
								<p className="text-sm text-slate-500">Unknown shop</p>
							)}
						</div> */}
							{isDetailOpen && (
								<div className="my-8">
									{product.description ? (
										<p className="text-slate-700 whitespace-pre-wrap">
											{product.description}
										</p>
									) : (
										<p className="text-sm text-slate-500">No description.</p>
									)}
								</div>
							)}
						</div>
						<hr />

						<section>
							<div className="flex items-start justify-between gap-3 mb-4">
								<div>
									<h2 className="text-lg font-semibold">Ratings & reviews</h2>
									{reviewSummary && (
										<p className="text-sm text-slate-600 flex items-center gap-2">
											{reviewSummary.reviewCount === 0 ? (
												""
											) : (
												<>
													<Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
													{`${reviewSummary.avgRating ?? "-"} / 5 • ${reviewSummary.reviewCount} review(s)`}
												</>
											)}
										</p>
									)}
								</div>
							</div>

							{reviews === undefined ? (
								<p className="text-sm text-slate-500">Loading reviews...</p>
							) : reviews.length === 0 ? (
								<p className="text-sm text-slate-500">No reviews yet.</p>
							) : (
								<ul className="space-y-3">
									{reviews.map((r) => (
										<li key={r._id} className="border-b p-4 space-y-2">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0 flex items-center gap-3">
													{r.buyer.imageUrl && (
														<img
															src={r.buyer.imageUrl}
															alt={r.buyer.name}
															className="h-10 w-10 rounded-full"
														/>
													)}
													<div className="flex flex-col justify-between">
														<p className="text-sm font-medium line-clamp-1 font-semibold">
															{r.buyer.name}
														</p>
														<span className="flex items-center gap-0.5">
															{[1, 2, 3, 4, 5].map((star) => (
																<Star
																	key={star}
																	className={`w-3 h-3 ${
																		star <= r.rating
																			? "text-yellow-400 fill-yellow-400"
																			: "text-slate-300"
																	}`}
																/>
															))}
														</span>
													</div>
												</div>
											</div>
											{r.reviewText && (
												<p className="text-sm text-slate-700 whitespace-pre-wrap">
													{r.reviewText}
												</p>
											)}
											{r.imageUrls.length > 0 && (
												<div className="flex flex-wrap gap-2">
													{r.imageUrls.map((u) => (
														// biome-ignore lint/a11y/useAltText: review image
														<img
															key={u}
															src={u}
															className="h-20 w-20 rounded-lg border object-cover"
															loading="lazy"
														/>
													))}
												</div>
											)}
										</li>
									))}
								</ul>
							)}
						</section>
					</div>
				</div>
			</div>
		</>
	);
}

function ProductImageGallery(props: {
	productName: string;
	imageUrls: string[];
}) {
	const { imageUrls } = props;
	const hasImages = imageUrls.length > 0;

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [viewportRef, emblaApi] = useEmblaCarousel({
		align: "start",
		loop: imageUrls.length > 1,
	});

	const syncSelected = useCallback(() => {
		if (!emblaApi) return;
		const api = emblaApi as unknown as Record<string, unknown>;
		const selectedSnap = api.selectedSnap;
		const selectedScrollSnap = api.selectedScrollSnap;
		if (typeof selectedSnap === "function")
			setSelectedIndex((selectedSnap as () => number)());
		else if (typeof selectedScrollSnap === "function")
			setSelectedIndex((selectedScrollSnap as () => number)());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		syncSelected();
		emblaApi.on("reinit", syncSelected).on("select", syncSelected);
	}, [emblaApi, syncSelected]);

	const scrollTo = useCallback(
		(index: number) => {
			if (!emblaApi) return;
			const api = emblaApi as unknown as Record<string, unknown>;
			const goTo = api.goTo;
			const scrollTo = api.scrollTo;
			if (typeof goTo === "function") (goTo as (i: number) => void)(index);
			else if (typeof scrollTo === "function")
				(scrollTo as (i: number) => void)(index);
		},
		[emblaApi],
	);

	if (!hasImages) {
		return <div className="p-10 text-sm text-slate-500">No images.</div>;
	}

	return (
		<div className="space-y-3 pb-1">
			<div className="aspect-square w-full overflow-hidden rounded-2xl border bg-slate-50">
				<div className="h-full w-full overflow-hidden" ref={viewportRef}>
					<div className="flex h-full">
						{imageUrls.map((src, index) => (
							<div
								key={src}
								className="h-full min-w-0 flex-[0_0_100%] select-none"
							>
								<img
									src={src}
									alt={`${props.productName} thumbnail ${index + 1}`}
									className="h-full w-full object-contain"
									loading={index === 0 ? "eager" : "lazy"}
									fetchPriority={index === 0 ? "high" : "auto"}
									decoding="async"
								/>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="flex flex-wrap justify-center gap-2">
				{imageUrls.map((src, index) => (
					<button
						key={`${src}:${index}`}
						type="button"
						onClick={() => scrollTo(index)}
						className={`h-16 w-16 overflow-hidden rounded-xl border bg-white transition ${
							index === selectedIndex
								? "ring-2 ring-emerald-500"
								: "hover:shadow"
						}`}
						aria-label={`Select image ${index + 1}`}
					>
						<img
							src={src}
							alt={`${props.productName} thumbnail ${index + 1}`}
							className="h-full w-full object-contain p-1"
							loading="lazy"
							decoding="async"
						/>
					</button>
				))}
			</div>
		</div>
	);
}

function ProductMeta(props: {
	productId: Id<"products">;
	productName: string;
	imageUrl: string | null;
	shop: {
		_id: Id<"shops">;
		name: string;
		slug: string;
		logoUrl?: string | null;
	} | null;
	basePrice?: number;
	variants: VariantDef[];
	skus: PublicSku[];
	minSkuPrice?: number | null;
	maxSkuPrice?: number | null;
}) {
	const navigate = useNavigate();
	const { addItem } = useCart();
	const { basePrice, variants, skus, minSkuPrice, maxSkuPrice } = props;

	const skuByKey = useMemo(() => new Map(skus.map((s) => [s.key, s])), [skus]);
	const inStockSkus = useMemo(() => skus.filter((s) => s.stock > 0), [skus]);

	const selectionToKey = useMemo(() => {
		return (selection: Record<string, string>) => {
			if (variants.length === 0) return "base";
			const options: { name: string; value: string }[] = [];
			for (const v of variants) {
				const value = selection[v.name] ?? "";
				if (!value) return null;
				options.push({ name: v.name, value });
			}
			return skuKey(options);
		};
	}, [variants]);

	const selectionFromSku = useMemo(() => {
		return (sku: PublicSku) => {
			const next: Record<string, string> = {};
			for (const opt of sku.options ?? []) next[opt.name] = opt.value;
			return next;
		};
	}, []);

	const fallbackSelection = useMemo(() => {
		const init: Record<string, string> = {};
		for (const v of variants) init[v.name] = v.values[0] ?? "";
		return init;
	}, [variants]);

	const [selected, setSelected] = useState<Record<string, string>>(() => {
		const first = inStockSkus[0];
		return first ? selectionFromSku(first) : fallbackSelection;
	});

	useEffect(() => {
		const first = inStockSkus[0];
		setSelected(first ? selectionFromSku(first) : fallbackSelection);
	}, [fallbackSelection, inStockSkus, selectionFromSku]);

	const selectedKey = useMemo(
		() => selectionToKey(selected),
		[selectionToKey, selected],
	);
	const selectedSku = useMemo(
		() => (selectedKey ? (skuByKey.get(selectedKey) ?? null) : null),
		[selectedKey, skuByKey],
	);

	const selectedOptions = useMemo(() => {
		if (variants.length === 0) return [];
		const next: { name: string; value: string }[] = [];
		for (const v of variants) {
			const value = selected[v.name] ?? "";
			if (!value) continue;
			next.push({ name: v.name, value });
		}
		return next;
	}, [selected, variants]);

	const [qty, setQty] = useState(1);

	const rangeLabel = formatIDRRange(minSkuPrice, maxSkuPrice);
	const currentPrice =
		typeof selectedSku?.price === "number"
			? selectedSku.price
			: typeof minSkuPrice === "number"
				? minSkuPrice
				: null;

	const showStrike =
		typeof basePrice === "number" &&
		typeof currentPrice === "number" &&
		basePrice > currentPrice;

	const stockForValue = useMemo(() => {
		return (variantName: string, value: string) => {
			if (variants.length === 0) return 0;
			const key = selectionToKey({ ...selected, [variantName]: value });
			if (!key) return 0;
			const sku = skuByKey.get(key);
			if (!sku) return 0;
			return sku.stock;
		};
	}, [selected, selectionToKey, skuByKey, variants.length]);

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				{rangeLabel ? (
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
						<p className="text-lg font-semibold">
							{selectedSku ? formatIDRMaybe(selectedSku.price) : rangeLabel}
						</p>
						{showStrike && (
							<p className="text-sm text-slate-500 line-through">
								{formatIDRMaybe(basePrice)}
							</p>
						)}
					</div>
				) : (
					<p className="text-sm text-slate-500">Price not set</p>
				)}

				<p className="text-xs text-slate-500">
					Stock: {selectedSku ? selectedSku.stock : 0}
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<div className="space-y-1">
					<input
						type="number"
						min={1}
						max={selectedSku ? Math.max(1, selectedSku.stock) : 999}
						value={qty}
						onChange={(e) => setQty(Number(e.target.value))}
						className="w-24 rounded-md border px-3 py-2 text-sm"
					/>
				</div>

				<button
					type="button"
					disabled={!selectedSku || selectedSku.stock <= 0}
					onClick={() => {
						if (!selectedSku) return;
						if (selectedSku.stock <= 0) return;
						const requested =
							Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
						const clampedQty = Math.min(
							Math.max(1, requested),
							Math.max(1, selectedSku.stock),
						);
						addItem({
							productId: String(props.productId),
							productName: props.productName,
							imageUrl: props.imageUrl,
							shopId: props.shop ? String(props.shop._id) : null,
							shopName: props.shop ? props.shop.name : null,
							shopSlug: props.shop ? props.shop.slug : null,
							shopLogoUrl: props.shop?.logoUrl ?? null,
							skuKey: selectedSku.key,
							options: selectedOptions,
							price: selectedSku.price,
							stock: selectedSku.stock,
							quantity: clampedQty,
						});
						toast.success("Added to cart");
					}}
					className="cursor-pointer rounded-md border px-4 py-2 text-sm disabled:opacity-50"
				>
					<ShoppingCart className="h-4 w-4" />
				</button>

				<button
					type="button"
					disabled={!selectedSku || selectedSku.stock <= 0}
					onClick={() => {
						if (!selectedSku) return;
						if (selectedSku.stock <= 0) return;
						const requested =
							Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
						const clampedQty = Math.min(
							Math.max(1, requested),
							Math.max(1, selectedSku.stock),
						);

						const productId = String(props.productId);
						const cartItemId = `${productId}:${selectedSku.key}`;

						addItem({
							productId,
							productName: props.productName,
							imageUrl: props.imageUrl,
							shopId: props.shop ? String(props.shop._id) : null,
							shopName: props.shop ? props.shop.name : null,
							shopSlug: props.shop ? props.shop.slug : null,
							shopLogoUrl: props.shop?.logoUrl ?? null,
							skuKey: selectedSku.key,
							options: selectedOptions,
							price: selectedSku.price,
							stock: selectedSku.stock,
							quantity: clampedQty,
						});

						saveCheckoutSelection([cartItemId]);
						navigate({ to: "/checkout" });
					}}
					className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
				>
					Checkout Now
				</button>
				{selectedSku && Number.isFinite(qty) && qty > selectedSku.stock && (
					<p className="text-xs text-red-600">Max {selectedSku.stock}.</p>
				)}
				{!selectedSku ? (
					<p className="text-xs text-slate-500">
						Please select an available variant.
					</p>
				) : (
					selectedSku.stock <= 0 && (
						<p className="text-xs text-slate-500">Out of stock.</p>
					)
				)}
			</div>

			{variants.length > 0 && (
				<div className="space-y-4">
					{variants.map((v) => (
						<div key={v.name} className="space-y-2">
							<p className="text-xs text-slate-500">{v.name}</p>
							<div className="flex flex-wrap gap-2">
								{v.values.map((value) => {
									const stock = stockForValue(v.name, value);
									const active = (selected[v.name] ?? "") === value;
									return (
										<button
											key={value}
											type="button"
											onClick={() =>
												setSelected((prev) => ({ ...prev, [v.name]: value }))
											}
											className={[
												"px-3 py-1.5 rounded-md border text-sm transition",
												active
													? "bg-black text-white border-black"
													: "bg-white",
												stock > 0 ? "hover:border-black" : "opacity-60",
											].join(" ")}
										>
											<span className="flex items-center gap-2">
												<span>{value}</span>
											</span>
										</button>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
