// src/lib/convex.ts
import { ConvexReactClient } from "convex/react";
import type { Id } from "../../convex/_generated/dataModel";

export const convex = new ConvexReactClient(
	import.meta.env.VITE_CONVEX_URL,
);

export async function compressImageForUpload(
	file: File,
	opts?: {
		maxDimension?: number;
		quality?: number;
		skipBelowBytes?: number;
	},
): Promise<File> {
	const maxDimension = opts?.maxDimension ?? 1920;
	const quality = opts?.quality ?? 0.82;
	const skipBelowBytes = opts?.skipBelowBytes ?? 200 * 1024;

	if (!file.type.startsWith("image/")) return file;
	if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
	if (file.size < skipBelowBytes) return file;

	try {
		const bitmap = await createImageBitmap(file);
		const srcW = bitmap.width;
		const srcH = bitmap.height;
		if (!srcW || !srcH) return file;

		const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
		const targetW = Math.max(1, Math.round(srcW * scale));
		const targetH = Math.max(1, Math.round(srcH * scale));

		const canvas: OffscreenCanvas | HTMLCanvasElement =
			typeof OffscreenCanvas !== "undefined"
				? new OffscreenCanvas(targetW, targetH)
				: Object.assign(document.createElement("canvas"), {
						width: targetW,
						height: targetH,
					});

		const ctx = canvas.getContext("2d");
		if (!ctx) return file;
		(ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, targetW, targetH);

		const toBlob = async (type: string, q: number) => {
			if ("convertToBlob" in canvas) {
				return (canvas as OffscreenCanvas).convertToBlob({ type, quality: q });
			}
			return await new Promise<Blob | null>((resolve) => {
				(canvas as HTMLCanvasElement).toBlob(resolve, type, q);
			});
		};

		const outType = "image/webp";
		const blob = await toBlob(outType, quality);
		if (!blob) return file;

		// Keep original when compression isn't beneficial.
		if (blob.size >= file.size * 0.95) return file;

		const baseName = file.name.replace(/\.[^.]+$/, "");
		return new File([blob], `${baseName}.webp`, { type: blob.type });
	} catch {
		return file;
	}
}

export async function uploadImages(opts: {
	files: File[];
	generateUploadUrl: () => Promise<string>;
}): Promise<Id<"_storage">[]> {
	const storageIds: Id<"_storage">[] = [];

	for (const file of opts.files) {
		const uploadFile = await compressImageForUpload(file);
		const uploadUrl = await opts.generateUploadUrl();
		const result = await fetch(uploadUrl, {
			method: "POST",
			headers: {
				"Content-Type": uploadFile.type || "application/octet-stream",
			},
			body: uploadFile,
		});

		if (!result.ok) throw new Error("Failed to upload image");

		const json = (await result.json()) as { storageId?: Id<"_storage"> };
		if (!json.storageId) throw new Error("Upload did not return storageId");
		storageIds.push(json.storageId);
	}

	return storageIds;
}

export async function uploadImage(opts: {
	file: File;
	generateUploadUrl: () => Promise<string>;
}): Promise<Id<"_storage">> {
	const uploadFile = await compressImageForUpload(opts.file);
	const uploadUrl = await opts.generateUploadUrl();
	const result = await fetch(uploadUrl, {
		method: "POST",
		headers: {
			"Content-Type": uploadFile.type || "application/octet-stream",
		},
		body: uploadFile,
	});

	if (!result.ok) throw new Error("Failed to upload image");

	const json = (await result.json()) as { storageId?: Id<"_storage"> };
	if (!json.storageId) throw new Error("Upload did not return storageId");
	return json.storageId;
}
