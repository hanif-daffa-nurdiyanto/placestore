import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ProductCard from "../components/ui/ProductCard";
import { HomeCategories } from "./HomeCategories";

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

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
	<div className="mega-section-heading">
		<h2>{children}</h2>
		<Link to="/explore">
			View All <ArrowRight />
		</Link>
	</div>
);

const ProductsHome = ({
	products,
}: {
	products: PublicProduct[];
	nodesc?: boolean;
}) => {
	const summaries = useQuery(
		api.reviews.getSummariesForProducts,
		products.length
			? { productIds: products.map((product) => product._id) }
			: "skip",
	);
	const merged = useMemo(() => {
		if (!summaries) return products;
		return products.map((product) => {
			const summary = summaries[String(product._id)];
			return {
				...product,
				avgRating: summary?.avgRating ?? null,
				reviewCount: summary?.reviewCount ?? 0,
			};
		});
	}, [products, summaries]);

	if (products.length === 0) {
		return (
			<>
				<section className="mega-section mega-container">
					<SectionHeading>
						Grab the best deal on <span>Featured Products</span>
					</SectionHeading>
					<div className="mega-empty-state">
						Great deals will appear here as soon as products are published.
					</div>
				</section>
				<HomeCategories />
			</>
		);
	}

	const brands = merged.slice(0, 3);
	const essentials = merged.slice(0, 6);

	return (
		<>
			<section className="mega-section mega-container">
				<SectionHeading>
					Grab the best deal on <span>Featured Products</span>
				</SectionHeading>
				<div className="deal-grid">
					{merged.slice(0, 5).map((product) => (
						<ProductCard key={product._id} product={product} />
					))}
				</div>
			</section>

			<HomeCategories />

			<section className="mega-section mega-container">
				<SectionHeading>
					Top <span>Stores &amp; Brands</span>
				</SectionHeading>
				<div className="brand-grid">
					{brands.map((product, index) => (
						<Link
							key={product._id}
							to="/product/$id"
							params={{ id: product._id }}
							className={`brand-card brand-card--${index + 1}`}
						>
							<div className="brand-card__copy">
								<small>{product.shop?.name ?? "PLACE STORE"}</small>
								<strong>{product.name}</strong>
								<span>Up to 50% OFF</span>
							</div>
							{product.imageUrl ? (
								<img src={product.imageUrl} alt="" loading="lazy" />
							) : (
								<div className="brand-card__monogram">PS</div>
							)}
						</Link>
					))}
				</div>
				<div className="brand-dots" aria-hidden="true">
					<b />
					<i />
					<i />
					<i />
					<i />
				</div>
			</section>

			<section className="mega-section mega-container mega-essentials-section">
				<SectionHeading>
					Daily <span>Essentials</span>
				</SectionHeading>
				<div className="essentials-grid">
					{essentials.map((product) => (
						<Link
							key={product._id}
							to="/product/$id"
							params={{ id: product._id }}
							className="essential-card"
						>
							<span>
								{product.imageUrl ? (
									<img src={product.imageUrl} alt="" loading="lazy" />
								) : (
									<b>PS</b>
								)}
							</span>
							<small>{product.name}</small>
							<strong>Best price today</strong>
						</Link>
					))}
				</div>
			</section>
		</>
	);
};

export default ProductsHome;
