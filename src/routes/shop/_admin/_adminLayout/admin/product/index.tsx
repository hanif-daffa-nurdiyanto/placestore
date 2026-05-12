import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useActiveShop } from "../../../../../../lib/useActiveShop";

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/product/",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const shops = useQuery(api.shops.getCurrentUserShops);
	const deleteProduct = useMutation(api.products.remove);

	const { activeShop } = useActiveShop(shops);
	const [error, setError] = useState("");

	const products = useQuery(
		api.products.listByShop,
		activeShop ? { shopId: activeShop._id } : "skip",
	);

	const handleDelete = async (productId: Id<"products">) => {
		const ok = confirm("Delete this product?");
		if (!ok) return;
		setError("");

		try {
			await deleteProduct({ productId, deleteImages: true });
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to delete product");
		}
	};

	return (
		<div className="space-y-6 py-6">
			<div>
				<h1 className="text-2xl font-semibold">Products</h1>
				<p className="text-sm text-slate-600">
					Manage products for your active shop.
				</p>
			</div>

			<Link
				to="/shop/admin/product/new"
				className="inline-flex w-fit text-sm"
			>
				New Product
			</Link>

			{error && <p className="text-sm text-red-600">{error}</p>}

			<div className="gap-6">
				{products === undefined ? (
					<p className="text-sm text-slate-500">Loading...</p>
				) : products.length === 0 ? (
					<p className="text-sm text-slate-500">No products yet.</p>
				) : (
					<ul className="space-y-3">
						{products.map((p) => (
							<li
								key={p._id}
								className="rounded-xl border h-24 overflow-clip pr-3 flex items-start gap-3"
							>
								<div className="h-full aspect-square overflow-hidden bg-slate-100 shrink-0">
									{p.imageUrls?.[0] ? (
										// biome-ignore lint/a11y/useAltText: admin-only thumbnail
										<img
											src={p.imageUrls[0] ?? ""}
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
											No image
										</div>
									)}
								</div>

								<div className="flex-1 py-3">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="font-medium">{p.name}</p>

											<p className="text-xs text-slate-500 mt-1">
												{p.imageIds.length} images
											</p>
										</div>

										<div className="flex gap-2">
											<Link
												to="/shop/admin/product/stok/$id"
												params={{ id: `${p._id}` }}
												className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
											>
												Stock
											</Link>
											<Link
												to="/shop/admin/product/edit"
												search={{ productId: p._id }}
												className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
											>
												Edit
											</Link>
											<button
												type="button"
												onClick={() => handleDelete(p._id)}
												className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
											>
												Delete
											</button>
										</div>
									</div>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
