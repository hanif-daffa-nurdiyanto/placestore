// src/lib/convex.ts
import { ConvexReactClient } from "convex/react"
import type { Id } from "../../convex/_generated/dataModel";

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL
)

export async function uploadImages(opts: {
  files: File[];
  generateUploadUrl: () => Promise<string>;
}): Promise<Id<"_storage">[]> {
  const storageIds: Id<"_storage">[] = [];

  for (const file of opts.files) {
    const uploadUrl = await opts.generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!result.ok) throw new Error("Failed to upload image");

    const json = (await result.json()) as { storageId?: Id<"_storage"> };
    if (!json.storageId) throw new Error("Upload did not return storageId");
    storageIds.push(json.storageId);
  }

  return storageIds;
}