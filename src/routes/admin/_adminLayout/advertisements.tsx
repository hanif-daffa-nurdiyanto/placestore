import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { pageTitle } from "#/lib/seo";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const Route = createFileRoute("/admin/_adminLayout/advertisements")({
	head: () => ({
		meta: [{ title: pageTitle("Advertisements") }],
	}),
	component: Page,
});

type LocalImage = { file: File; previewUrl: string };

function Page() {
	const ads = useQuery(api.advertisements.listAll);
	const createAd = useMutation(api.advertisements.create);
	const setActive = useMutation(api.advertisements.setActive);
	const removeAd = useMutation(api.advertisements.remove);
	const generateUploadUrl = useMutation(api.advertisements.generateUploadUrl);

	const [label, setLabel] = useState("");
	const [url, setUrl] = useState("");
	const [image, setImage] = useState<LocalImage | null>(null);
	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const imageRef = useRef(image);
	useEffect(() => {
		imageRef.current = image;
	}, [image]);
	useEffect(() => {
		return () => {
			const current = imageRef.current;
			if (current) URL.revokeObjectURL(current.previewUrl);
		};
	}, []);

	const setImageFile = (file: File | null) => {
		setImage((prev) => {
			if (prev) URL.revokeObjectURL(prev.previewUrl);
			return file ? { file, previewUrl: URL.createObjectURL(file) } : null;
		});
	};

	async function uploadImage(file: File): Promise<Id<"_storage">> {
		const uploadUrl = await generateUploadUrl();
		const result = await fetch(uploadUrl, {
			method: "POST",
			headers: { "Content-Type": file.type || "application/octet-stream" },
			body: file,
		});
		if (!result.ok) throw new Error("Failed to upload image");
		const json = (await result.json()) as { storageId?: Id<"_storage"> };
		if (!json.storageId) throw new Error("Upload did not return storageId");
		return json.storageId;
	}

		const onCreate = async (e: React.FormEvent) => {
			e.preventDefault();
			setError("");
			if (!label.trim()) return setError("Label is required");
			if (!url.trim()) return setError("URL is required");

		try {
			setIsSaving(true);
			const imageId = image ? await uploadImage(image.file) : undefined;
			await createAd({
				label: label.trim(),
				url: url.trim(),
				...(imageId ? { imageId } : {}),
			});
			setLabel("");
			setUrl("");
			setImageFile(null);
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
					<h1 className="text-2xl font-semibold">Advertisement</h1>
					<p className="text-sm text-slate-500">
						Add a banner for the home carousel.
					</p>
				</div>

			<form onSubmit={onCreate} className="rounded-2xl border p-4 space-y-4">
				<div className="grid gap-4 md:grid-cols-2">
					<div>
						<label className="block text-sm font-medium">Label</label>
						<input
							value={label}
							onChange={(e) => setLabel(e.target.value)}
							className="mt-1 w-full rounded-xl border px-4 py-3"
								placeholder="Holiday promo"
							/>
						</div>
					<div>
						<label className="block text-sm font-medium">URL</label>
						<input
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							className="mt-1 w-full rounded-xl border px-4 py-3"
								placeholder="https://... or /product/123"
							/>
						</div>
					</div>

				<div>
					<label className="block text-sm font-medium">Gambar</label>
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
								className="h-16 w-28 rounded-lg border object-cover"
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
						{ads === undefined ? "Loading..." : `${ads.length} item`}
					</p>
				</div>

					{ads && ads.length === 0 && (
						<div className="p-4 text-sm text-slate-500">No data yet.</div>
					)}

				{ads && ads.length > 0 && (
					<ul className="divide-y">
						{ads.map((ad) => (
							<li key={ad._id} className="p-4 flex gap-4 items-center">
								<div className="h-14 w-24 rounded-lg border bg-slate-50 overflow-hidden flex items-center justify-center">
									{ad.imageUrl ? (
										<img
											src={ad.imageUrl}
											alt={ad.label}
											className="h-full w-full object-cover"
										/>
									) : (
										<span className="text-xs text-slate-400">No image</span>
									)}
								</div>

								<div className="min-w-0 flex-1">
									<p className="font-medium truncate">{ad.label}</p>
									<p className="text-xs text-slate-500 truncate">{ad.url}</p>
								</div>

								<div className="flex items-center gap-2">
									<button
										type="button"
										className={
											ad.isActive
												? "rounded-xl bg-green-600 px-3 py-2 text-white text-sm"
												: "rounded-xl border px-3 py-2 text-sm"
										}
										onClick={() =>
											setActive({ advertisementId: ad._id, isActive: !ad.isActive })
										}
									>
										{ad.isActive ? "Active" : "Inactive"}
									</button>
									<button
										type="button"
										className="rounded-xl border px-3 py-2 text-sm"
											onClick={() => {
												const ok = confirm("Delete this advertisement?");
												if (!ok) return;
												void removeAd({ advertisementId: ad._id, deleteImage: true });
											}}
										>
										Delete
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
