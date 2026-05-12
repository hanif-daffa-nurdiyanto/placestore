import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { uploadImage as uploadImageToStorage } from "#/lib/convex";
import { pageTitle } from "#/lib/seo";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/_adminLayout/categories")({
	head: () => ({
		meta: [{ title: pageTitle("Categories") }],
	}),
	component: Page,
});

type LocalImage = { file: File; previewUrl: string };

function slugify(input: string) {
	return input
		.trim()
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function Page() {
	const categories = useQuery(api.categories.listAll);
	const createCategory = useMutation(api.categories.create);
	const updateCategory = useMutation(api.categories.update);
	const removeCategory = useMutation(api.categories.remove);
	const generateUploadUrl = useMutation(api.categories.generateUploadUrl);

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [image, setImage] = useState<LocalImage | null>(null);
	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
	const [editingName, setEditingName] = useState("");
	const [editingSlug, setEditingSlug] = useState("");
	const [editingImage, setEditingImage] = useState<LocalImage | null>(null);
	const [removeEditingImage, setRemoveEditingImage] = useState(false);

	const imageRef = useRef(image);
	const editingImageRef = useRef(editingImage);
	useEffect(() => {
		imageRef.current = image;
	}, [image]);
	useEffect(() => {
		editingImageRef.current = editingImage;
	}, [editingImage]);
	useEffect(() => {
		return () => {
			const current = imageRef.current;
			if (current) URL.revokeObjectURL(current.previewUrl);
			const currentEditing = editingImageRef.current;
			if (currentEditing) URL.revokeObjectURL(currentEditing.previewUrl);
		};
	}, []);

	const setImageFile = (file: File | null) => {
		setImage((prev) => {
			if (prev) URL.revokeObjectURL(prev.previewUrl);
			return file ? { file, previewUrl: URL.createObjectURL(file) } : null;
		});
	};

	const setEditingImageFile = (file: File | null) => {
		setEditingImage((prev) => {
			if (prev) URL.revokeObjectURL(prev.previewUrl);
			return file ? { file, previewUrl: URL.createObjectURL(file) } : null;
		});
	};

	async function uploadImage(file: File): Promise<Id<"_storage">> {
		return uploadImageToStorage({ file, generateUploadUrl });
	}

	const orderedCategories = useMemo(() => {
		if (!categories) return categories;
		return [...categories].sort((a, b) => a.name.localeCompare(b.name));
	}, [categories]);

		const onCreate = async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			if (!name.trim()) return setError("Name is required");
			if (!slug.trim()) return setError("Slug is required");

		try {
			setIsSaving(true);
			const imageId = image ? await uploadImage(image.file) : undefined;
			await createCategory({
				name: name.trim(),
				slug: slug.trim(),
				...(imageId ? { imageId } : {}),
			});
			setName("");
			setSlug("");
			setImageFile(null);
			} catch (err) {
				console.error(err);
				setError(err instanceof Error ? err.message : "Failed to save");
			} finally {
				setIsSaving(false);
			}
		};

	const startEdit = (category: NonNullable<typeof categories>[number]) => {
		setEditingId(category._id);
		setEditingName(category.name);
		setEditingSlug(category.slug);
		setEditingImageFile(null);
		setRemoveEditingImage(false);
		setError("");
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditingName("");
		setEditingSlug("");
		setEditingImageFile(null);
		setRemoveEditingImage(false);
		setError("");
	};

		const onSaveEdit = async () => {
			if (!editingId) return;
			setError("");
			if (!editingName.trim()) return setError("Name is required");
			if (!editingSlug.trim()) return setError("Slug is required");

		try {
			setIsSaving(true);
			const imageId = editingImage ? await uploadImage(editingImage.file) : undefined;
			await updateCategory({
				categoryId: editingId,
				name: editingName.trim(),
				slug: editingSlug.trim(),
				...(imageId ? { imageId } : {}),
				...(removeEditingImage ? { removeImage: true } : {}),
			});
			cancelEdit();
			} catch (err) {
				console.error(err);
				setError(err instanceof Error ? err.message : "Failed to save");
			} finally {
				setIsSaving(false);
			}
		};

	return (
		<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-semibold">Category</h1>
					<p className="text-sm text-slate-500">Manage categories (CRUD).</p>
				</div>

			<form onSubmit={onCreate} className="rounded-2xl border p-4 space-y-4">
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium">Name</label>
						<input
							value={name}
							onChange={(e) => {
								const next = e.target.value;
								setName(next);
								if (!slug.trim()) setSlug(slugify(next));
							}}
							className="mt-1 w-full rounded-xl border px-4 py-3"
								placeholder="Food"
							/>
						</div>
					<div>
						<label className="block text-sm font-medium">Slug</label>
						<input
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							className="mt-1 w-full rounded-xl border px-4 py-3"
								placeholder="food"
							/>
						</div>
					</div>

				<div>
					<label className="block text-sm font-medium">Image</label>
					<div className="mt-1 flex items-center gap-4">
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
						/>
						{image?.previewUrl && (
							<img
								src={image.previewUrl}
								alt="Preview"
								className="h-16 w-16 rounded-lg border object-cover"
							/>
						)}
					</div>
				</div>

				{error && (
					<p className="text-sm text-red-600" role="alert">
						{error}
					</p>
				)}

				<button
					type="submit"
					disabled={isSaving}
					className="rounded-xl bg-black px-4 py-3 text-white disabled:opacity-50"
					>
						{isSaving ? "Saving..." : "Add"}
					</button>
				</form>

			<div className="rounded-2xl border overflow-hidden">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<p className="font-medium">List</p>
					<p className="text-xs text-slate-500">
						{orderedCategories === undefined
							? "Loading..."
							: `${orderedCategories.length} item`}
					</p>
				</div>

					{orderedCategories && orderedCategories.length === 0 && (
						<div className="p-4 text-sm text-slate-500">No data yet.</div>
					)}

				{orderedCategories && orderedCategories.length > 0 && (
					<ul className="divide-y">
						{orderedCategories.map((category) => {
							const isEditing = editingId === category._id;
							return (
								<li key={category._id} className="p-4">
									<div className="flex gap-4 items-center">
										<div className="h-14 w-14 rounded-lg border bg-slate-50 overflow-hidden flex items-center justify-center">
											{category.imageUrl ? (
												<img
													src={category.imageUrl}
													alt={category.name}
													className="h-full w-full object-cover"
												/>
											) : (
												<span className="text-xs text-slate-400">No image</span>
											)}
										</div>

										<div className="min-w-0 flex-1">
											<p className="font-medium truncate">{category.name}</p>
											<p className="text-xs text-slate-500 truncate">
												{category.slug}
											</p>
										</div>

										<div className="flex items-center gap-2">
											{isEditing ? (
												<>
													<button
														type="button"
														disabled={isSaving}
														className="rounded-xl bg-black px-3 py-2 text-white text-sm disabled:opacity-50"
														onClick={() => void onSaveEdit()}
													>
														Save
													</button>
													<button
														type="button"
														disabled={isSaving}
														className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
														onClick={cancelEdit}
													>
														Cancel
													</button>
												</>
											) : (
												<>
													<button
														type="button"
														className="rounded-xl border px-3 py-2 text-sm"
														onClick={() => startEdit(category)}
													>
														Edit
													</button>
													<button
														type="button"
														className="rounded-xl border px-3 py-2 text-sm"
															onClick={() => {
																const ok = confirm("Delete this category?");
																if (!ok) return;
																void removeCategory({
																	categoryId: category._id,
																	deleteImage: true,
															});
														}}
													>
														Delete
													</button>
												</>
											)}
										</div>
									</div>

									{isEditing && (
										<div className="mt-4 rounded-xl border bg-white p-4 space-y-4">
											<div className="grid gap-4 md:grid-cols-2">
												<div>
													<label className="block text-sm font-medium">Name</label>
													<input
														value={editingName}
														onChange={(e) => setEditingName(e.target.value)}
														className="mt-1 w-full rounded-xl border px-4 py-3"
													/>
												</div>
												<div>
													<label className="block text-sm font-medium">Slug</label>
													<input
														value={editingSlug}
														onChange={(e) => setEditingSlug(e.target.value)}
														className="mt-1 w-full rounded-xl border px-4 py-3"
													/>
												</div>
											</div>

											<div>
												<label className="block text-sm font-medium">Image</label>
												<div className="mt-1 flex items-center gap-4">
													<input
														type="file"
														accept="image/*"
														onChange={(e) =>
															setEditingImageFile(e.target.files?.[0] ?? null)
														}
													/>
													{editingImage?.previewUrl && (
														<img
															src={editingImage.previewUrl}
															alt="Preview"
															className="h-16 w-16 rounded-lg border object-cover"
														/>
													)}
													<label className="text-sm flex items-center gap-2">
														<input
															type="checkbox"
															checked={removeEditingImage}
															onChange={(e) =>
																setRemoveEditingImage(e.target.checked)
															}
														/>
														Remove current image
													</label>
												</div>
											</div>
										</div>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
