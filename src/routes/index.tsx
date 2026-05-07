/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import EmblaAdvertisementCarousel from "#/components/ui/embla/EmblaAdvertisementCarousel";
import EmblaCarousel from "#/components/ui/embla/EmblaCarousel";
import { Header } from "#/components/ui/Header";
import { pageTitle } from "#/lib/seo";
import ProductsHome from "#/section/ProductsHome";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [{ title: pageTitle("Home") }],
	}),
	component: Home,
	loader: async ({ context }) => {
		const products = await context.convexClient.query(
			api.products.listPublic,
			{},
		);

		return { products };
	},
});
function Home() {
	const { products } = Route.useLoaderData();
	const ads = useQuery(api.advertisements.listActive);
	const categories = useQuery(api.categories.listAll);

	return (
		<div className="min-h-screen">
			<Header />

			<div className="">
				{ads && ads.length > 0 ? (
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
				) : (
					<EmblaCarousel
						slides={Array.from(Array(5).keys())}
						options={{ loop: true }}
					/>
				)}
			</div>

			<main className="container mx-auto py-10 space-y-6">
				<div className="space-y-3">
					<div>
						<h2 className="text-lg font-semibold">Category</h2>
					</div>

					{categories === undefined ? (
						<div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="animate-pulse">
									<div className="aspect-square rounded-2xl bg-slate-100" />
									<div className="mt-2 h-3 w-3/4 rounded bg-slate-100 mx-auto" />
								</div>
							))}
						</div>
					) : categories.length === 0 ? (
						<p className="text-sm text-slate-500">No categories yet.</p>
					) : (
						<div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-4">
							{categories.map((category) => (
								<div key={category._id} className="text-center cursor-pointer">
									<Link
										to="/explore" search={{ categoryId: category._id }}
										className="aspect-square rounded-2xl border bg-slate-50 overflow-hidden flex items-center justify-center"
									>
										{category.imageUrl ? (
											<img
												src={category.imageUrl}
												alt={category.name}
												className="h-full w-full object-cover"
												loading="lazy"
											/>
										) : (
											<span className="text-xs text-slate-400">No image</span>
										)}
									</Link>
									<p className="mt-2 text-sm font-medium truncate">
										{category.name}
									</p>
								</div>
							))}
						</div>
					)}
				</div>

				<ProductsHome products={products} />
			</main>
		</div>
	);
}
