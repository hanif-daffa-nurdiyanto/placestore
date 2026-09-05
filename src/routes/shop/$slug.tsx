import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import ShopPublicMap from "#/components/maps/ShopPublicMap";
import { Header } from "#/components/ui/Header";
import { pageTitle } from "#/lib/seo";
import ProductsHome from "#/section/ProductsHome";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/shop/$slug")({
	head: () => ({
		meta: [{ title: pageTitle("Shop") }],
	}),
	component: RouteComponent,
	loader: async ({ context, params }) => {
		const result = await context.convexClient.query(
			api.products.listPublicByShopSlug,
			{ shopSlug: params.slug },
		);
		return { shop: result.shop, products: result.products };
	},
});

function RouteComponent() {
	const { shop, products } = Route.useLoaderData();
	const [isClient, setIsClient] = useState(false);
	useEffect(() => setIsClient(true), []);

	if (!shop) {
		return (
			<div className="mega-container mx-auto py-10 space-y-4">
				<p className="text-sm text-slate-500">Shop not found.</p>
				<Link to="/" className="underline text-sm">
					Back
				</Link>
			</div>
		);
	}

	return (
		<>
			<Header />
			<div className="mega-container mx-auto py-10 space-y-6">
				<div className="space-y-6 mb-12">
					<div className="flex flex-col items-center gap-3">
						{shop.logoUrl ? (
							<img
								src={shop.logoUrl}
								alt={`${shop.name} logo`}
								className="h-36 w-36 rounded-full border object-cover bg-slate-50"
								loading="lazy"
							/>
						) : (
							<div className="h-12 w-12 rounded-full border bg-slate-100" />
						)}
						<h1 className="text-2xl font-semibold">{shop.name}</h1>
						{shop.description && (
							<p className="text-sm text-slate-500">{shop.description}</p>
						)}
					</div>
				</div>

				<ProductsHome products={products} nodesc />

				<section className="shop-address-section">
					<div className="mega-section-heading">
						<h2>
							Store <span>Address</span>
						</h2>
					</div>

					<div className="shop-address-layout">
						<div className="shop-address-map">
							{shop.location ? (
								isClient ? (
									<ShopPublicMap
										location={{
											lat: shop.location.lat,
											lng: shop.location.lng,
										}}
									/>
								) : (
									<div className="shop-address-map__placeholder">
										Loading map...
									</div>
								)
							) : (
								<div className="shop-address-map__placeholder">
									Location has not been added.
								</div>
							)}
						</div>

						<div className="shop-address-card">
							<span className="shop-address-card__icon" aria-hidden="true">
								<MapPin />
							</span>
							<div>
								<small>Store location</small>
								<h3>{shop.name}</h3>
								<p>{shop.address || "Address has not been added."}</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</>
	);
}
