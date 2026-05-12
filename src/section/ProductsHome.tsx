import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ProductCard from "../components/ui/ProductCard";

export type PublicProduct = {
	_id: Id<"products">;
	name: string;
	description?: string;
	basePrice?: number;
	minSkuPrice?: number | null;
	imageUrl: string | null;
	shop: { _id: Id<"shops">; name: string; slug: string } | null;
	avgRating?: number | null;
	reviewCount?: number;
};

const ProductsHome = ({
	products,
	nodesc = false,
}: {
	products: PublicProduct[];
	nodesc?: boolean;
}) => {
	const summaries = useQuery(
		api.reviews.getSummariesForProducts,
		products.length ? { productIds: products.map((p) => p._id) } : "skip",
	);
	const merged = useMemo(() => {
		if (!summaries) return products;
		return products.map((p) => {
			const s = summaries[String(p._id)];
			return {
				...p,
				avgRating: s?.avgRating ?? null,
				reviewCount: s?.reviewCount ?? 0,
			};
		});
	}, [products, summaries]);

	return (
		<>
			<section className="container mx-auto">
				<div className="space-y-8">
					<div className="text-center">
						<h2 className="section-heading uppercase">Featured</h2>
					</div>

					{products.length === 0 ? (
						<p className="text-sm text-slate-500">No products yet.</p>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 justify-center">
							{merged.map((product) => (
								<ProductCard key={product._id} product={product} />
							))}
						</div>
					)}
				</div>
			</section>
			<section className="container mx-auto">
				<div className="space-y-8">
					<div className="text-center">
						<h2 className="section-heading uppercase">Latest</h2>
					</div>

					{products.length === 0 ? (
						<p className="text-sm text-slate-500">No products yet.</p>
					) : (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 justify-center">
							{merged.map((product) => (
								<ProductCard key={product._id} product={product} />
							))}
						</div>
					)}
				</div>
			</section>
		</>
	);
};

export default ProductsHome;
