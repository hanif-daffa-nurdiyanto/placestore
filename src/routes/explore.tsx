import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Header } from "#/components/ui/Header";
import ProductCard from "#/components/ui/ProductCard";
import { pageTitle } from "#/lib/seo";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type SearchParams = {
	q?: string;
	categoryId?: string;
	minPrice?: string;
	maxPrice?: string;
	minRating?: string;
};

const EXPLORE_SKELETON_IDS = [
	"product-1",
	"product-2",
	"product-3",
	"product-4",
	"product-5",
	"product-6",
	"product-7",
	"product-8",
] as const;

export const Route = createFileRoute("/explore")({
	head: () => ({
		meta: [{ title: pageTitle("Explore") }],
	}),
	validateSearch: (search: Record<string, unknown>): SearchParams => {
		const q = typeof search.q === "string" ? search.q : undefined;
		const categoryId =
			typeof search.categoryId === "string" ? search.categoryId : undefined;
		const minPrice =
			typeof search.minPrice === "string" ? search.minPrice : undefined;
		const maxPrice =
			typeof search.maxPrice === "string" ? search.maxPrice : undefined;
		const minRating =
			typeof search.minRating === "string" ? search.minRating : undefined;
		return { q, categoryId, minPrice, maxPrice, minRating };
	},
	component: ExplorePage,
});

function toNumberOrNull(input?: string) {
	if (!input) return null;
	const n = Number(input);
	if (!Number.isFinite(n)) return null;
	return n;
}

function ExploreProductSkeleton() {
	return (
		<div className="deal-card" aria-hidden="true">
			<div className="deal-card__image animate-pulse bg-slate-200" />
			<div className="deal-card__body space-y-3">
				<div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
				<div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
				<div className="h-2.5 w-3/5 animate-pulse rounded bg-slate-100" />
			</div>
		</div>
	);
}

function ExplorePage() {
	const navigate = useNavigate();
	const search = Route.useSearch();

	const categories = useQuery(api.categories.listAll);

	const categoryId = (search.categoryId ?? "") as unknown as Id<"categories">;
	const minPrice = toNumberOrNull(search.minPrice ?? undefined);
	const maxPrice = toNumberOrNull(search.maxPrice ?? undefined);

	const products = useQuery(api.products.searchPublic, {
		q: search.q?.trim() ? search.q.trim() : undefined,
		categoryId: search.categoryId ? categoryId : undefined,
		...(minPrice !== null ? { minPrice } : {}),
		...(maxPrice !== null ? { maxPrice } : {}),
		limit: 48,
	});

	const summaries = useQuery(
		api.reviews.getSummariesForProducts,
		products?.length ? { productIds: products.map((p) => p._id) } : "skip",
	);

	const minRating = toNumberOrNull(search.minRating ?? undefined);

	const merged = useMemo(() => {
		if (!products) return products;
		const withSummary = products.map((p) => {
			const s = summaries ? summaries[String(p._id)] : undefined;
			return {
				...p,
				avgRating: s?.avgRating ?? null,
				reviewCount: s?.reviewCount ?? 0,
			};
		});
		if (minRating === null) return withSummary;
		return withSummary.filter((p) => (p.avgRating ?? 0) >= minRating);
	}, [products, summaries, minRating]);

	return (
		<div className="min-h-screen">
			<Header />

			<div className="mega-container mx-auto py-10">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
					<aside className="h-fit rounded-2xl border bg-white p-4 space-y-4">
						<div>
							<p className="text-sm font-semibold">Filters</p>
							<p className="text-xs text-slate-500">
								Refine results in real time.
							</p>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium" htmlFor="explore-q">
								Search
							</label>
							<input
								id="explore-q"
								value={search.q ?? ""}
								onChange={(e) =>
									navigate({
										to: "/explore",
										search: {
											...search,
											q: e.target.value || undefined,
										},
										replace: true,
									})
								}
								className="w-full rounded-xl border px-3 py-2 text-sm"
								placeholder="Search products…"
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium" htmlFor="explore-category">
								Category
							</label>
							<select
								id="explore-category"
								value={search.categoryId ?? ""}
								onChange={(e) =>
									navigate({
										to: "/explore",
										search: {
											...search,
											categoryId: e.target.value || undefined,
										},
										replace: true,
									})
								}
								className="w-full rounded-xl border px-3 py-2 text-sm"
							>
								<option value="">All categories</option>
								{categories?.map((c) => (
									<option key={c._id} value={String(c._id)}>
										{c.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<p className="text-sm font-medium">Price</p>
							<div className="grid grid-cols-2 gap-2">
								<input
									value={search.minPrice ?? ""}
									onChange={(e) =>
										navigate({
											to: "/explore",
											search: {
												...search,
												minPrice: e.target.value || undefined,
											},
											replace: true,
										})
									}
									className="w-full rounded-xl border px-3 py-2 text-sm"
									placeholder="Min"
									inputMode="numeric"
								/>
								<input
									value={search.maxPrice ?? ""}
									onChange={(e) =>
										navigate({
											to: "/explore",
											search: {
												...search,
												maxPrice: e.target.value || undefined,
											},
											replace: true,
										})
									}
									className="w-full rounded-xl border px-3 py-2 text-sm"
									placeholder="Max"
									inputMode="numeric"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label
								className="text-sm font-medium"
								htmlFor="explore-minRating"
							>
								Min rating
							</label>
							<select
								id="explore-minRating"
								value={search.minRating ?? ""}
								onChange={(e) =>
									navigate({
										to: "/explore",
										search: {
											...search,
											minRating: e.target.value || undefined,
										},
										replace: true,
									})
								}
								className="w-full rounded-xl border px-3 py-2 text-sm"
							>
								<option value="">Any</option>
								<option value="5">5+</option>
								<option value="4">4+</option>
								<option value="3">3+</option>
								<option value="2">2+</option>
								<option value="1">1+</option>
							</select>
						</div>

						<button
							type="button"
							className="w-full rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
							onClick={() =>
								navigate({ to: "/explore", search: {}, replace: true })
							}
						>
							Clear filters
						</button>
					</aside>

					<main className="space-y-4">
						<div className="flex items-end justify-between gap-3">
							<div>
								<h1 className="text-2xl font-semibold">Explore</h1>
								{merged === undefined ? (
									<div
										className="mt-1 h-4 w-20 animate-pulse rounded bg-slate-200"
										aria-hidden="true"
									/>
								) : (
									<p className="text-sm text-slate-500">
										{merged.length} result(s)
									</p>
								)}
							</div>
						</div>

						{merged === undefined ? (
							<div
								className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
								aria-live="polite"
							>
								{EXPLORE_SKELETON_IDS.map((id) => (
									<ExploreProductSkeleton key={id} />
								))}
								<span className="sr-only">Loading products…</span>
							</div>
						) : merged.length === 0 ? (
							<div className="rounded-2xl border bg-white p-6 text-sm text-slate-600">
								No products found. Try adjusting your filters.
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
								{merged.map((p) => (
									<ProductCard key={p._id} product={p} />
								))}
							</div>
						)}
					</main>
				</div>
			</div>
		</div>
	);
}
