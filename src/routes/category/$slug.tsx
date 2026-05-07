import { createFileRoute } from "@tanstack/react-router";
import { Header } from "#/components/ui/Header";
import ProductCard from "#/components/ui/ProductCard";
import { pageTitle } from "#/lib/seo";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/category/$slug")({
	head: () => ({
		meta: [{ title: pageTitle("Category") }],
	}),
	component: RouteComponent,
	loader: async ({ context, params }) => {
		const products = await context.convexClient.query(
			api.products.getProductsByCategorySlug,
			{ slug: params.slug },
		);

		return { products };
	},
});

function RouteComponent() {
	const { products } = Route.useLoaderData();

	return (
		<div>
			<Header />
			<div className="container mx-auto">
				{products.products.length === 0 ? (
					<p>No products found in this category</p>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
						{products.products.map((product) => (
							<ProductCard key={product._id} product={product} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
