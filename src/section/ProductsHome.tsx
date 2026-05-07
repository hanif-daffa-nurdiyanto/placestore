import type { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ProductCard from "../components/ui/ProductCard";
import { useMemo } from "react";

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
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold">Products</h2>
				{!nodesc && (
					<p className="text-sm text-slate-500">
						Browse the latest active products.
					</p>
				)}
			</div>

				{products.length === 0 ? (
					<p className="text-sm text-slate-500">No products yet.</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{merged.map((product) => (
							<ProductCard key={product._id} product={product} />
						))}
					</div>
				)}
		</div>
	);
};

export default ProductsHome;
