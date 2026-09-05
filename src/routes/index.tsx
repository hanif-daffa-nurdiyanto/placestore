import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgePercent, ShieldCheck, Truck } from "lucide-react";
import EmblaAdvertisementCarousel from "#/components/ui/embla/EmblaAdvertisementCarousel";
import { Header } from "#/components/ui/Header";
import LandingChatbot from "#/components/ui/LandingChatbot";
import { pageTitle } from "#/lib/seo";
import ProductsHome from "#/section/ProductsHome";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	head: ({ loaderData }) => {
		const firstAdImage =
			loaderData?.ads?.find(
				(ad) => typeof ad.imageUrl === "string" && ad.imageUrl,
			)?.imageUrl ?? null;
		return {
			meta: [{ title: pageTitle("Home") }],
			links: firstAdImage
				? [
						{
							rel: "preload",
							as: "image",
							href: firstAdImage,
							fetchPriority: "high",
						},
					]
				: [],
		};
	},
	component: Home,
	loader: async ({ context }) => {
		const [products, ads] = await Promise.all([
			context.convexClient.query(api.products.listPublic, {}),
			context.convexClient.query(api.advertisements.listActive, {}),
		]);
		return { products, ads };
	},
});

function Home() {
	const { products, ads } = Route.useLoaderData();
	const slides = ads
		.filter((ad) => typeof ad.imageUrl === "string" && ad.imageUrl)
		.map((ad) => ({
			id: ad._id,
			label: ad.label,
			imageUrl: ad.imageUrl as string,
			url: ad.url,
		}));

	return (
		<div className="min-h-screen bg-white" dir="ltr">
			<Header />
			<main>
				<section className="mega-hero mega-container">
					{slides.length > 0 ? (
						<EmblaAdvertisementCarousel
							slides={slides}
							options={{ loop: true }}
						/>
					) : (
						<div className="home-fallback-hero">
							<div className="hero-copy">
								<p>Best Deal Online</p>
								<h1>
									Everyday finds.
									<br />
									<span>Exceptional prices.</span>
								</h1>
								<p>
									Discover products from trusted local sellers, delivered
									straight to your door.
								</p>
								<Link to="/explore">
									Shop Now <ArrowRight />
								</Link>
							</div>
							<div className="hero-art" aria-hidden="true">
								<span>50%</span>
								<b>OFF</b>
							</div>
						</div>
					)}
				</section>

				<div className="benefit-bar mega-container">
					<span>
						<Truck />
						<b>Free delivery</b>
						<small>On selected orders</small>
					</span>
					<span>
						<ShieldCheck />
						<b>Secure payment</b>
						<small>100% protected checkout</small>
					</span>
					<span>
						<BadgePercent />
						<b>Daily offers</b>
						<small>Fresh deals every day</small>
					</span>
				</div>

				<ProductsHome products={products} />
			</main>
			<LandingChatbot />
		</div>
	);
}
