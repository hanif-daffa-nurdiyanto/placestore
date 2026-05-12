import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { pageTitle } from "#/lib/seo";
import { uploadImage } from "#/lib/convex";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: init?.credentials ?? "include" });

const authStateFn = createServerFn({ method: "GET" }).handler(async () => {
	const { isAuthenticated } = await auth();
	return { isAuthenticated };
});

export const Route = createFileRoute("/shop/new")({
	head: () => ({
		meta: [{ title: pageTitle("Create Shop") }],
	}),
	beforeLoad: async ({ location }) => {
		const { isAuthenticated } = await authStateFn({ fetch: fetchWithCredentials });
		if (!isAuthenticated) {
			throw redirect({
				to: "/sign-in",
				search: {
					redirect_url: `${location.pathname}${
						typeof location.search === "string" ? location.search : ""
					}`,
				},
			});
		}
	},
	component: CreateShopPage,
});

function toSlug(value: string) {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

function CreateShopPage() {
	const navigate = useNavigate();
	const createShop = useMutation(api.shops.createShop);
	const generateUploadUrl = useMutation(api.shops.generateUploadUrl);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [address, setAddress] = useState("");
	const [logo, setLogo] = useState<{ file: File; previewUrl: string } | null>(
		null,
	);
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const slug = toSlug(name);

	const logoRef = useRef(logo);
	useEffect(() => {
		logoRef.current = logo;
	}, [logo]);
	useEffect(() => {
		return () => {
			const current = logoRef.current;
			if (current) URL.revokeObjectURL(current.previewUrl);
		};
	}, []);

	const setLogoFile = (file: File | null) => {
		setLogo((prev) => {
			if (prev) URL.revokeObjectURL(prev.previewUrl);
			return file ? { file, previewUrl: URL.createObjectURL(file) } : null;
		});
	};

	async function uploadLogo(file: File): Promise<Id<"_storage">> {
		return uploadImage({ file, generateUploadUrl });
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!name.trim()) {
			setError("Shop name is required");
			return;
		}

		try {
			setIsLoading(true);

			const logoId = logo ? await uploadLogo(logo.file) : undefined;

			await createShop({
				name: name.trim(),
				slug,
				description: description.trim() ? description.trim() : undefined,
				address: address.trim() ? address.trim() : undefined,
				logoId,
			});

			navigate({ to: "/shop/admin/dashboard" });
		} catch (err) {
			console.error("Create shop error:", err);
			setError(err instanceof Error ? err.message : "Failed to create shop");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<form
				onSubmit={handleSubmit}
				className="w-full max-w-md space-y-4 border rounded-xl p-6"
			>
				<div>
					<h1 className="text-xl font-semibold">Create your shop</h1>
					<p className="text-sm text-gray-500">
						Set up your shop to continue.
					</p>
				</div>
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<input
							id="logo"
							type="file"
							accept="image/*"
							className="sr-only"
							onChange={(e) => {
								const file = e.target.files?.[0] ?? null;
								setLogoFile(file);
								e.target.value = "";
							}}
						/>
					</div>
					<div className="w-full flex justify-center flex-col items-center gap-y-4">
						{logo ? (
							<label
								htmlFor="logo"
								className="block relative h-36 overflow-hidden aspect-square border rounded-full"
							>
								{/* biome-ignore lint/a11y/useAltText: local preview */}
								<img
									src={logo.previewUrl}
									className="w-full aspect-square object-cover"
								/>
							</label>
						) : (
							<label
								htmlFor="logo"
								className="block relative h-36 overflow-hidden aspect-square border rounded-full"
							>
								<div className="h-full w-full animate-pulse bg-slate-200/70" />
							</label>
						)}
						<label className="text-sm font-medium" htmlFor="logo">
							Logo (optional)
						</label>
					</div>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="name">
						Shop name
					</label>
					<input
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="My Online Store"
						className="w-full rounded-md border px-3 py-2"
					/>
				</div>

				{slug && (
					<p className="text-sm text-gray-500">
						Slug: <span className="font-medium">{slug}</span>
					</p>
				)}

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="description">
						Description
					</label>
					<textarea
						id="description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Tell customers what your shop is about (optional)"
						className="w-full min-h-24 rounded-md border px-3 py-2"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="address">
						Address (optional)
					</label>
						<textarea
							id="address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="Shop address"
							className="w-full min-h-20 rounded-md border px-3 py-2"
						/>
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<button
					type="submit"
					disabled={isLoading}
					className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
				>
					{isLoading ? "Creating..." : "Create Shop"}
				</button>
			</form>
		</div>
	);
}
