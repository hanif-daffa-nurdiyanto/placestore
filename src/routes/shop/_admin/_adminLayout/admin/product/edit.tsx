import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadImages } from "#/lib/convex";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useActiveShop } from "../../../../../../lib/useActiveShop";

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/product/edit",
)({
	component: RouteComponent,
	validateSearch: (search: Record<string, unknown>) => {
		const productId =
			typeof search.productId === "string"
				? (search.productId as Id<"products">)
				: undefined;

		return { productId };
	},
});

type LocalImage = {
	id: string;
	file: File;
	previewUrl: string;
};

function RouteComponent() {
	const { productId } = Route.useSearch();

	const shops = useQuery(api.shops.getCurrentUserShops);
	const { activeShop } = useActiveShop(shops);

	const product = useQuery(
		api.products.getById,
		productId ? { productId } : "skip",
	);
	const categories = useQuery(api.categories.listAll);

	const generateUploadUrl = useMutation(api.products.generateUploadUrl);
	const updateProduct = useMutation(api.products.update);

	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [categoryId, setCategoryId] = useState<Id<"categories"> | null>(null);
	const [basePrice, setBasePrice] = useState("0");
	const [isActive, setIsActive] = useState(true);
	const [images, setImages] = useState<LocalImage[]>([]);
	const [isPickingImages, setIsPickingImages] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [removedCurrentImageIds, setRemovedCurrentImageIds] = useState<
		Set<Id<"_storage">>
	>(() => new Set());

	const files = useMemo(() => images.map((i) => i.file), [images]);

	const imagesRef = useRef<LocalImage[]>([]);
	useEffect(() => {
		imagesRef.current = images;
	}, [images]);
	useEffect(() => {
		return () => {
			for (const img of imagesRef.current) URL.revokeObjectURL(img.previewUrl);
		};
	}, []);

	const didInit = useRef(false);
	useEffect(() => {
		if (!product) return;
		if (didInit.current) return;
		didInit.current = true;
		setName(product.name ?? "");
		setDescription(product.description ?? "");
		setCategoryId((product.categoryId as Id<"categories"> | null | undefined) ?? null);
		setBasePrice(String(product.basePrice ?? 0));
		setIsActive(product.isActive ?? true);
		setRemovedCurrentImageIds(new Set());
	}, [product]);

	const addFiles = (nextFiles: File[]) => {
		setIsPickingImages(false);
		setImages((prev) => {
			const next: LocalImage[] = [];
			for (const file of nextFiles) {
				const id = `${file.name}:${file.size}:${file.lastModified}:${Math.random()
					.toString(16)
					.slice(2)}`;
				next.push({ id, file, previewUrl: URL.createObjectURL(file) });
			}
			return [...prev, ...next];
		});
	};

	const removeImage = (id: string) => {
		setImages((prev) => {
			const target = prev.find((p) => p.id === id);
			if (target) URL.revokeObjectURL(target.previewUrl);
			return prev.filter((p) => p.id !== id);
		});
	};

	useEffect(() => {
		if (!isPickingImages) return;

		const onFocus = () => {
			const count = fileInputRef.current?.files?.length ?? 0;
			if (count === 0) setIsPickingImages(false);
		};

		window.addEventListener("focus", onFocus, { once: true });
		return () => window.removeEventListener("focus", onFocus);
	}, [isPickingImages]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!productId) {
			setError("Missing productId");
			return;
		}
		if (!activeShop) {
			setError("No active shop selected");
			return;
		}
		if (!product) {
			setError("Product not found");
			return;
		}
		if (product.shopId !== activeShop._id) {
			setError("This product is not in your active shop");
			return;
		}
		if (!name.trim()) {
			setError("Name is required");
			return;
		}

		try {
			setIsSubmitting(true);

			const parsedBasePrice = Number(basePrice);
			const payloadBasePrice =
				Number.isFinite(parsedBasePrice) && parsedBasePrice > 0
					? parsedBasePrice
					: 0;

			const uploadedStorageIds =
				files.length > 0
					? await uploadImages({ files, generateUploadUrl })
					: [];

			const keptCurrentIds = product.imageIds.filter(
				(id) => !removedCurrentImageIds.has(id),
			);
			const nextImageIds =
				uploadedStorageIds.length > 0 || removedCurrentImageIds.size > 0
					? [...keptCurrentIds, ...uploadedStorageIds]
					: undefined;

			await updateProduct({
				productId,
				name: name.trim(),
				description: description.trim(),
				categoryId,
				basePrice: payloadBasePrice,
				isActive,
				...(nextImageIds ? { imageIds: nextImageIds } : {}),
			});
			setImages((prev) => {
				for (const img of prev) URL.revokeObjectURL(img.previewUrl);
				return [];
			});
			setRemovedCurrentImageIds(new Set());
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to save product");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!productId) {
		return (
			<div className="space-y-4 py-6">
				<p className="text-sm text-slate-600">Missing `productId`.</p>
				<Link to="/shop/admin/product" className="underline text-sm">
					Back
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-6">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold">Edit Product</h1>
				</div>
				<Link
					to="/shop/admin/product"
					className="text-sm underline text-slate-600"
				>
					Back
				</Link>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="name">
						Name
					</label>
					<input
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full rounded-md border px-3 py-2"
						placeholder="Product name"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="description">
						Description
					</label>
					<textarea
						id="description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="w-full min-h-27.5 rounded-md border px-3 py-2"
						placeholder="Optional description"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="category">
						Category
					</label>
					<select
						id="category"
						value={categoryId ?? ""}
						onChange={(e) => {
							const next = e.target.value;
							setCategoryId(next ? (next as Id<"categories">) : null);
						}}
						className="w-full rounded-md border px-3 py-2 bg-white"
					>
						<option value="">(No category)</option>
						{categories
							?.slice()
							.sort((a, b) => a.name.localeCompare(b.name))
							.map((c) => (
								<option key={c._id} value={c._id}>
									{c.name}
								</option>
							))}
					</select>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="basePrice">
						Base price
					</label>
					<input
						id="basePrice"
						type="number"
						min={0}
						inputMode="numeric"
						value={basePrice}
						onChange={(e) => setBasePrice(e.target.value)}
						className="w-full rounded-md border px-3 py-2"
						placeholder="0"
					/>
					<p className="text-xs text-slate-500">
						Akan dicoret jika harga SKU terendah lebih kecil.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<input
						id="isActive"
						type="checkbox"
						checked={isActive}
						onChange={(e) => setIsActive(e.target.checked)}
					/>
					<label className="text-sm" htmlFor="isActive">
						Active
					</label>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<label className="text-sm font-medium" htmlFor="images">
							Images
						</label>

						<input
							id="images"
							ref={fileInputRef}
							type="file"
							accept="image/*"
							multiple
							className="sr-only"
							onChange={(e) => {
								const selected = Array.from(e.target.files ?? []);
								if (selected.length > 0) addFiles(selected);
								else setIsPickingImages(false);
								e.target.value = "";
							}}
						/>
						{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
						<label
							htmlFor="images"
							onClick={() => setIsPickingImages(true)}
							className="inline-flex h-10 w-10 items-center justify-center rounded-md border bg-white hover:bg-slate-50 cursor-pointer"
							title="Add images"
						>
							<Plus className="h-5 w-5" />
						</label>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
						{product?.imageIds.map((id, idx) => {
							if (removedCurrentImageIds.has(id)) return null;
							const url = product.imageUrls?.[idx] ?? null;
							if (!url) return null;
							return (
								<div key={id} className="relative overflow-hidden">
									{/* biome-ignore lint/a11y/useAltText: admin-only preview */}
									<img
										src={url}
										className="h-36 aspect-square w-full object-contain"
									/>
									<button
										type="button"
										onClick={() =>
											setRemovedCurrentImageIds((prev) => {
												const next = new Set(prev);
												next.add(id);
												return next;
											})
										}
										className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs border hover:bg-white"
										title="Remove current image"
									>
										<Trash2 className="h-4 w-4 text-red-500" />
									</button>
								</div>
							);
						})}

						{images.map((img) => (
							<div key={img.id} className="relative overflow-hidden">
								{/* biome-ignore lint/a11y/useAltText: local preview */}
								<img
									src={img.previewUrl}
									className="h-36 aspect-square w-full object-contain"
								/>
								<button
									type="button"
									onClick={() => removeImage(img.id)}
									className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs border hover:bg-white"
								>
									<Trash2 className="h-4 w-4 text-red-500" />
								</button>
								<div className="px-2 py-1 text-[11px] text-slate-600 truncate">
									{img.file.name}
								</div>
							</div>
						))}

						{(((product?.imageIds.length ?? 0) - removedCurrentImageIds.size ===
							0 &&
							images.length === 0) ||
							isPickingImages) && (
							<div className="aspect-square rounded-lg border bg-slate-50 overflow-hidden">
								<div className="h-36 w-full animate-pulse bg-slate-200/70" />
								<div className="h-8 w-full border-t bg-white px-2 py-1">
									<div className="mt-1 h-3 w-3/4 animate-pulse rounded bg-slate-200/70" />
								</div>
							</div>
						)}
					</div>
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<button
					type="submit"
					disabled={
						isSubmitting ||
						!activeShop ||
						!product ||
						product.shopId !== activeShop._id
					}
					className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
				>
					{isSubmitting ? "Saving..." : "Save"}
				</button>
			</form>
		</div>
	);
}
