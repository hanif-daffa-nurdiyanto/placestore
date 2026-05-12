/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import EmblaAdvertisementCarousel from "#/components/ui/embla/EmblaAdvertisementCarousel";
import { Header } from "#/components/ui/Header";
import LandingChatbot from "#/components/ui/LandingChatbot";
import { pageTitle } from "#/lib/seo";
import { HomeCategories } from "#/section/HomeCategories";
import ProductsHome from "#/section/ProductsHome";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	head: ({ loaderData }) => {
		const firstAdImage =
			loaderData?.ads?.find((a) => typeof a.imageUrl === "string" && a.imageUrl)
				?.imageUrl ?? null;

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
		const products = await context.convexClient.query(
			api.products.listPublic,
			{},
		);
		const ads = await context.convexClient.query(api.advertisements.listActive, {});

		return { products, ads };
	},
});

function Home() {
	const { products, ads } = Route.useLoaderData();

	return (
		<div className="min-h-screen" dir="ltr">
			<Header />

			<main className="mx-auto space-y-6 pb-20">
				{/* ── Hero Carousel ── */}
				<section className="">
					{ads && ads.length > 0 ? (
						<div className="">
							<EmblaAdvertisementCarousel
								slides={ads
									.filter((a) => typeof a.imageUrl === "string" && a.imageUrl)
									.map((a) => ({
										id: a._id,
										label: a.label,
										imageUrl: a.imageUrl as string,
										url: a.url,
									}))}
								options={{ loop: true }}
							/>
						</div>
					) : (
						<div className="home-fallback-hero">
							<div className="relative z-10 container mx-auto py-12 sm:px-14 sm:py-12 space-y-5">
								<p className="island-kicker">Welcome to Place Store</p>
								<h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight display-title">
									Discover Amazing Products
								</h2>
								<p className="text-white/80 text-base sm:text-lg leading-relaxed max-w-md">
									Shop the latest from local sellers. Fast checkout, reliable
									delivery, all in one place.
								</p>
								<Link to="/explore" className="home-cta mt-2">
									Start Shopping
									<ArrowRight className="h-4 w-4" />
								</Link>
							</div>
						</div>
					)}
				</section>

				{/* ── Category Strip ── */}
				<HomeCategories />

				{/* ── Featured Products ── */}
				<ProductsHome products={products} />
			</main>

			<LandingChatbot />
		</div>
	);
}
