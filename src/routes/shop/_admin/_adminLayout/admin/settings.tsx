import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ShopLocationMap, {
	type LatLng,
} from "#/components/maps/ShopLocationMap";
import { uploadImage as uploadImageToStorage } from "#/lib/convex";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useActiveShop } from "../../../../../lib/useActiveShop";

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/settings",
)({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const shops = useQuery(api.shops.getCurrentUserShops);
	const { activeShop } = useActiveShop(shops);

	const shop = useQuery(
		api.shops.getById,
		activeShop ? { shopId: activeShop._id } : "skip",
	);

	const generateUploadUrl = useMutation(api.shops.generateUploadUrl);
	const updateShop = useMutation(api.shops.updateShop);
	const deleteShop = useMutation(api.shops.deleteShop);

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [address, setAddress] = useState("");
	const [location, setLocation] = useState<LatLng | null>(null);
	const [logo, setLogo] = useState<{ file: File; previewUrl: string } | null>(
		null,
	);
	const [removeCurrentLogo, setRemoveCurrentLogo] = useState(false);
	const [mapQuery, setMapQuery] = useState("");
	const [mapResults, setMapResults] = useState<
		{ display_name: string; lat: string; lon: string }[]
	>([]);
	const [isSearchingMap, setIsSearchingMap] = useState(false);
	const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
	const [mapError, setMapError] = useState("");
	const [isClient, setIsClient] = useState(false);
	const [dismissedSearchQuery, setDismissedSearchQuery] = useState<
		string | null
	>(null);

	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const didInit = useRef(false);
	useEffect(() => {
		if (!shop) return;
		if (didInit.current) return;
		didInit.current = true;
		setName(shop.name ?? "");
		setDescription(shop.description ?? "");
		setAddress(shop.address ?? "");
		setLocation(
			shop.location &&
				typeof shop.location.lat === "number" &&
				typeof shop.location.lng === "number"
				? { lat: shop.location.lat, lng: shop.location.lng }
				: null,
		);
		setRemoveCurrentLogo(false);
	}, [shop]);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const searchAbortRef = useRef<AbortController | null>(null);
	useEffect(() => {
		const q = mapQuery.trim();
		setMapError("");

		if (q.length < 3) {
			searchAbortRef.current?.abort();
			searchAbortRef.current = null;
			setIsSearchingMap(false);
			setMapResults([]);
			return;
		}

		const handle = window.setTimeout(async () => {
			searchAbortRef.current?.abort();
			const controller = new AbortController();
			searchAbortRef.current = controller;

			setIsSearchingMap(true);
			try {
				const res = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
						q,
					)}`,
					{
						headers: { Accept: "application/json" },
						signal: controller.signal,
					},
				);
				if (!res.ok) throw new Error("Failed to search location");
				const json = (await res.json()) as {
					display_name: string;
					lat: string;
					lon: string;
				}[];
				setMapResults(json);
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error(err);
				setMapError(err instanceof Error ? err.message : "Failed to search");
			} finally {
				if (searchAbortRef.current === controller) {
					searchAbortRef.current = null;
				}
				setIsSearchingMap(false);
			}
		}, 450);

		return () => window.clearTimeout(handle);
	}, [mapQuery]);

	const reverseGeocode = async (next: LatLng) => {
		setMapError("");
		setIsReverseGeocoding(true);
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
					String(next.lat),
				)}&lon=${encodeURIComponent(String(next.lng))}`,
				{ headers: { Accept: "application/json" } },
			);
			if (!res.ok) throw new Error("Failed to reverse geocode location");
			const json = (await res.json()) as { display_name?: string };
			if (json.display_name) setAddress(json.display_name);
		} catch (err) {
			console.error(err);
			setMapError(
				err instanceof Error ? err.message : "Failed to reverse geocode",
			);
		} finally {
			setIsReverseGeocoding(false);
		}
	};

	const pickLocation = (next: LatLng, opts?: { addressLabel?: string }) => {
		setLocation(next);
		if (opts?.addressLabel) setAddress(opts.addressLabel);
		void reverseGeocode(next);
	};

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
		return uploadImageToStorage({ file, generateUploadUrl });
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!activeShop) {
			setError("No active shop selected");
			return;
		}
		if (!name.trim()) {
			setError("Shop name is required");
			return;
		}

		try {
			setIsSaving(true);
			const logoId = logo ? await uploadLogo(logo.file) : undefined;

			await updateShop({
				shopId: activeShop._id,
				name: name.trim(),
				description: description.trim() ? description.trim() : "",
				address: address.trim(),
				location: location ?? undefined,
				...(logoId ? { logoId } : {}),
				...(removeCurrentLogo && !logoId ? { removeLogo: true } : {}),
			});

			setLogoFile(null);
			setRemoveCurrentLogo(false);
			didInit.current = false;

			toast.success("Settings saved");
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to save settings");
			toast.error("Failed to save settings");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!activeShop) return;
		const ok = confirm(
			"Delete this shop? This will also delete all products and images in this shop.",
		);
		if (!ok) return;

		setError("");
		try {
			setIsDeleting(true);
			await deleteShop({
				shopId: activeShop._id,
				deleteProducts: true,
				deleteProductImages: true,
				deleteLogo: true,
			});
			await navigate({ to: "/shop/new" });
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to delete shop");
		} finally {
			setIsDeleting(false);
		}
	};

	const currentLogoUrl =
		!removeCurrentLogo && !logo ? (shop ? (shop.logoUrl ?? null) : null) : null;

	return (
		<div className="space-y-6 py-6">
			<div>
				<h1 className="text-2xl font-semibold">Settings</h1>
				<p className="text-sm text-slate-600">
					Manage your active shop details.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="space-y-2">
					<div className="flex items-center justify-between gap-3">
						<label className="text-sm font-medium" htmlFor="logo">
							Logo
						</label>

						<input
							id="logo"
							type="file"
							accept="image/*"
							className="sr-only"
							onChange={(e) => {
								const file = e.target.files?.[0] ?? null;
								setLogoFile(file);
								setRemoveCurrentLogo(false);
								e.target.value = "";
							}}
						/>
					</div>

					{logo ? (
						<div className="relative w-40">
							<label
								htmlFor="logo"
								className="block relative h-40 aspect-square rounded-full overflow-hidden  border bg-slate-50"
							>
								{/* biome-ignore lint/a11y/useAltText: local preview */}
								<img
									src={logo.previewUrl}
									className="h-40 w-full object-contain"
								/>
							</label>
							<button
								type="button"
								onClick={() => setLogoFile(null)}
								className="cursor-pointer absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs border hover:bg-white"
								title="Remove new logo"
							>
								<Trash2 className="h-4 w-4 text-red-500" />
							</button>
							<label
								htmlFor="logo"
								className="cursor-pointer block absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-xs border hover:bg-white"
								title="Remove new logo"
							>
								<Pencil className="h-4 w-4 text-blue-500" />
							</label>
						</div>
					) : currentLogoUrl ? (
						<div className="relative w-40 h-40">
							<label
								htmlFor="logo"
								className="relative block h-40 aspect-square rounded-full overflow-hidden border bg-slate-50"
							>
								{/* biome-ignore lint/a11y/useAltText: current logo */}
								<img
									src={currentLogoUrl}
									className="h-40 w-full object-contain"
								/>
							</label>
							<button
								type="button"
								onClick={() => {
									setRemoveCurrentLogo(true);
									setLogoFile(null);
								}}
								className="cursor-pointer absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs border hover:bg-white"
								title="Remove current logo"
							>
								<Trash2 className="h-4 w-4 text-red-500" />
							</button>
							<label
								htmlFor="logo"
								className="cursor-pointer block absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-xs border hover:bg-white"
								title="Edit logo"
							>
								<Pencil className="h-4 w-4 text-blue-500" />
							</label>
						</div>
					) : (
						<div className="relative w-40">
							<label
								htmlFor="logo"
								className="block h-40 aspect-square rounded-full border bg-slate-50 overflow-hidden"
							>
								<div className="h-fullanimate-pulse bg-slate-200/70" />
							</label>
							<label
								htmlFor="logo"
								className="cursor-pointer block absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-xs border hover:bg-white"
								title="Edit logo"
							>
								<Pencil className="h-4 w-4 text-blue-500" />
							</label>
						</div>
					)}
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="name">
						Shop name
					</label>
					<input
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-full rounded-md border px-3 py-2"
						placeholder="My Online Store"
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
						className="w-full min-h-24 rounded-md border px-3 py-2"
						placeholder="Optional"
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-medium" htmlFor="address">
						Address
					</label>
						<textarea
							id="address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							className="w-full min-h-20 rounded-md border px-3 py-2"
							placeholder="Shop address (optional)"
						/>
				</div>

				<div className="rounded-xl border p-4 space-y-4 relative">
					<div>
							<p className="font-medium">Location</p>
							<p className="text-sm text-slate-500">
								Search for an address or click the map to set a location.
							</p>
						</div>

					<div className="relative">
						<input
							value={mapQuery}
							onChange={(e) => {
								setDismissedSearchQuery(null);
								setMapQuery(e.target.value);
							}}
							className="w-full rounded-md border px-3 py-2 pr-10"
							placeholder="Search location (OpenStreetMap)"
						/>
						{isSearchingMap && (
							<Loader2 className="h-4 w-4 animate-spin text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
						)}
					</div>

					{mapError && <p className="text-sm text-red-600">{mapError}</p>}

					{isReverseGeocoding && (
						<p className="text-sm text-slate-500">Updating address...</p>
					)}

					<div className="relative">
						<div>
							{mapResults.length &&
							mapQuery.trim().length >= 3 &&
							dismissedSearchQuery !== mapQuery.trim() && (
								<div className="absolute z-10 left-0 right-0 top-0 p-2">
									<div className="max-h-64 overflow-auto rounded-xl border bg-white shadow-sm">
										<ul className="divide-y">
											{mapResults.map((r) => (
												<li key={`${r.lat}:${r.lon}:${r.display_name}`}>
													<button
														type="button"
														onClick={() => {
															const lat = Number(r.lat);
															const lng = Number(r.lon);
															if (
																!Number.isFinite(lat) ||
																!Number.isFinite(lng)
															)
																return;
															setDismissedSearchQuery(mapQuery.trim());
															setMapQuery(r.display_name);
															pickLocation(
																{ lat, lng },
																{ addressLabel: r.display_name },
															);
														}}
														className="w-full text-left px-3 py-2 hover:bg-slate-50"
													>
														<p className="text-sm font-medium line-clamp-2">
															{r.display_name}
														</p>
														<p className="text-xs text-slate-500">
															Lat: {r.lat}, Lng: {r.lon}
														</p>
													</button>
												</li>
											))}
										</ul>
									</div>
								</div>
							)}
						</div>

						<div className="relative z-0">
							{isClient ? (
								<ShopLocationMap
									value={location}
									onChange={(next) => pickLocation(next)}
								/>
							) : (
								<div className="h-80 w-full rounded-xl border bg-slate-50 flex items-center justify-center text-sm text-slate-500">
									Loading map...
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<p className="text-xs text-slate-500">Latitude</p>
							<p className="text-sm">{location ? location.lat : "-"}</p>
						</div>
						<div>
							<p className="text-xs text-slate-500">Longitude</p>
							<p className="text-sm">{location ? location.lng : "-"}</p>
						</div>
						<div className="sm:justify-self-end">
							<button
								type="button"
								onClick={() => setLocation(null)}
								className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
							>
								Clear location
							</button>
						</div>
					</div>
				</div>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<button
					type="submit"
					disabled={!activeShop || isSaving || isDeleting}
					className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50 cursor-pointer"
				>
					{isSaving ? "Saving..." : "Save changes"}
				</button>

				<div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
					<p className="text-sm font-medium text-red-700">Danger zone</p>
					<p className="text-xs text-red-700/80">
						Delete shop permanently. This cannot be undone.
					</p>
					<button
						type="button"
						disabled={!activeShop || isSaving || isDeleting}
						onClick={handleDelete}
						className="w-full rounded-md bg-red-600 px-4 py-2 text-white disabled:opacity-50"
					>
						{isDeleting ? "Deleting..." : "Delete shop"}
					</button>
				</div>
			</form>
		</div>
	);
}
