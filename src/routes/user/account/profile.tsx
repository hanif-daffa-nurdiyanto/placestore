import { useUser } from "@clerk/tanstack-react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ShopLocationMap, {
	type LatLng,
} from "#/components/maps/ShopLocationMap";
import OrderItem from "#/components/ui/OrderItem";
import { pageTitle } from "#/lib/seo";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type ProfileTab = "orders" | "addresses";

const fetchWithCredentials: typeof fetch = (input, init) =>
	fetch(input, { ...init, credentials: init?.credentials ?? "include" });

const authStateFn = createServerFn({ method: "GET" }).handler(async () => {
	const { isAuthenticated } = await auth();
	return { isAuthenticated };
});

export const Route = createFileRoute("/user/account/profile")({
	head: () => ({
		meta: [{ title: pageTitle("My Orders") }],
	}),
	validateSearch: (search: Record<string, unknown>) => {
		const tabRaw = typeof search.tab === "string" ? search.tab : undefined;
		const tab: ProfileTab =
			tabRaw === "addresses" || tabRaw === "orders" ? tabRaw : "orders";
		return { tab };
	},
	beforeLoad: async ({ location }) => {
		const { isAuthenticated } = await authStateFn({
			fetch: fetchWithCredentials,
		});
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
	component: ProfilePage,
});

function ProfilePage() {
	const { user, isLoaded } = useUser();
	const { tab } = Route.useSearch();

	return (
		<div className="mega-container mx-auto py-8 space-y-6">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h1 className="text-2xl font-semibold">Account</h1>
					<p className="text-sm text-slate-600">Manage your account</p>
				</div>
				<Link to="/" className="text-sm underline text-slate-600">
					Back
				</Link>
			</div>

			{!isLoaded ? (
				<p className="text-sm text-slate-500">Loading...</p>
			) : !user ? (
				<p className="text-sm text-slate-500">No user.</p>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-12 gap-4">
					<aside className="md:col-span-3">
						<div className="rounded-xl border bg-white p-4 space-y-4">
							<div className="flex items-center gap-3">
								{/* biome-ignore lint/a11y/useAltText: avatar */}
								<img
									src={user.imageUrl}
									className="h-10 w-10 rounded-full object-cover bg-slate-100"
								/>
								<div className="min-w-0">
									<p className="text-sm font-medium truncate">
										{user.fullName ?? "—"}
									</p>
									<p className="text-xs text-slate-600 truncate">
										{user.primaryEmailAddress?.emailAddress ?? "—"}
									</p>
								</div>
							</div>

							<nav className="space-y-1">
								<TabLink tab="orders" activeTab={tab} label="My Orders" />
								<TabLink tab="addresses" activeTab={tab} label="My Addresses" />
							</nav>
						</div>
					</aside>

					<section className="md:col-span-9">
						<div className="rounded-xl border bg-white p-4">
							{tab === "orders" ? <OrdersTab /> : <AddressesTab />}
						</div>
					</section>
				</div>
			)}
		</div>
	);
}

const TabLink = (props: {
	tab: ProfileTab;
	activeTab: ProfileTab;
	label: string;
}) => {
	const isActive = props.tab === props.activeTab;
	return (
		<Link
			to="/user/account/profile"
			search={{ tab: props.tab }}
			className={[
				"block w-full rounded-lg px-3 py-2 text-sm text-slate-700",
				isActive
					? "bg-slate-100"
					: "hover:bg-slate-50",
			].join(" ")}
		>
			{props.label}
		</Link>
	);
}

	const OrdersTab = () => {
		const [activeTab, setActiveTab] = useState("pending");

		const txs = useQuery(api.transactions.listCurrentUser);
		const filtered = useMemo(() => {
			if (!txs) return txs;
			if (activeTab === "all") return txs;
			return txs.filter((t) => t.status === activeTab);
		}, [txs, activeTab]);

		return (
			<div className="space-y-2">
				<p className="text-lg font-semibold">My Orders</p>
				<div className="flex rounded-xl border p-2 w-fit mx-auto">
					{[
						"all",
						"pending",
						"processing",
						"shipping",
						"received",
						"canceled",
					].map((status) => (
						<button
						type="button"
						className={`flex items-center gap-1 cursor-pointer rounded capitalize px-2 ${
							status === activeTab
								? "bg-slate-100 text-slate-900"
								: "text-slate-500"
						}`}
						onClick={() => setActiveTab(status)}
						key={status}
					>
						{status}
					</button>
				))}
				</div>
				<ul className="space-y-3">
					{txs === undefined ? (
						<p className="text-sm text-slate-500">Loading...</p>
					) : txs.length === 0 ? (
						<p className="text-sm text-slate-500">No transactions yet.</p>
					) : filtered && filtered.length === 0 ? (
						<p className="text-sm text-slate-500">No orders in this status.</p>
					) : (
						filtered?.map((t) => <OrderItem key={t._id} transaction={t} />)
					)}
				</ul>
			</div>
		);
	}

const AddressesTab = () => {
	const addresses = useQuery(api.addresses.listCurrentUserAddresses);
	const createAddress = useMutation(api.addresses.createAddress);
	const updateAddress = useMutation(api.addresses.updateAddress);
	const deleteAddress = useMutation(api.addresses.deleteAddress);
	const setPrimaryAddress = useMutation(api.addresses.setPrimaryAddress);

	const [isClient, setIsClient] = useState(false);
	useEffect(() => setIsClient(true), []);

	const [isCreating, setIsCreating] = useState(false);
	const [editingId, setEditingId] = useState<Id<"addresses"> | null>(null);
	const editing = useMemo(
		() =>
			editingId ? (addresses?.find((a) => a._id === editingId) ?? null) : null,
		[addresses, editingId],
	);

	const [label, setLabel] = useState("");
	const [recipientName, setRecipientName] = useState("");
	const [phone, setPhone] = useState("");
	const [address, setAddress] = useState("");
	const [location, setLocation] = useState<LatLng | null>(null);
	const [setAsPrimary, setSetAsPrimary] = useState(false);

	const [mapQuery, setMapQuery] = useState("");
	const [mapResults, setMapResults] = useState<
		{ display_name: string; lat: string; lon: string }[]
	>([]);
	const [dismissedSearchQuery, setDismissedSearchQuery] = useState<
		string | null
	>(null);
	const [isSearchingMap, setIsSearchingMap] = useState(false);
	const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
	const [mapError, setMapError] = useState("");

	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const searchAbortRef = useRef<AbortController | null>(null);
	useEffect(() => {
		const q = mapQuery.trim();
		if (!q) {
			setMapResults([]);
			searchAbortRef.current?.abort();
			searchAbortRef.current = null;
			setIsSearchingMap(false);
			return;
		}

		const handle = window.setTimeout(async () => {
			if (q.length < 3) {
				setMapResults([]);
				return;
			}

			searchAbortRef.current?.abort();
			const controller = new AbortController();
			searchAbortRef.current = controller;
			setIsSearchingMap(true);
			setMapError("");
			try {
				const res = await fetch(
					`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
						q,
					)}&limit=6`,
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
				setMapResults(Array.isArray(json) ? json : []);
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

	const resetForm = () => {
		setLabel("");
		setRecipientName("");
		setPhone("");
		setAddress("");
		setLocation(null);
		setMapQuery("");
		setMapResults([]);
		setDismissedSearchQuery(null);
		setSetAsPrimary(false);
		setEditingId(null);
		setIsCreating(false);
		setError("");
		setMapError("");
	};

	useEffect(() => {
		if (!editing) return;
		setLabel(editing.label ?? "");
		setRecipientName(editing.recipientName ?? "");
		setPhone(editing.phone ?? "");
		setAddress(editing.address ?? "");
		setLocation(editing.location ?? null);
		setMapQuery(editing.address ?? "");
		setDismissedSearchQuery(editing.address ?? null);
		setSetAsPrimary(Boolean(editing.isPrimary));
	}, [editing]);

	const startCreate = () => {
		resetForm();
		setIsCreating(true);
		setSetAsPrimary(addresses ? addresses.length === 0 : false);
	};

	const startEdit = (id: Id<"addresses">) => {
		setIsCreating(false);
		setEditingId(id);
		setError("");
		setMapError("");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		if (!label.trim()) return setError("Address label is required");
		if (!recipientName.trim()) return setError("Recipient name is required");
		if (!phone.trim()) return setError("Phone number is required");
		if (!address.trim()) return setError("Address is required");

		try {
			setIsSaving(true);
			if (editingId) {
				await updateAddress({
					addressId: editingId,
					label: label.trim(),
					recipientName: recipientName.trim(),
					phone: phone.trim(),
					address: address.trim(),
					...(location ? { location } : {}),
					...(location ? {} : { clearLocation: true }),
					setAsPrimary,
				});
			} else {
				await createAddress({
					label: label.trim(),
					recipientName: recipientName.trim(),
					phone: phone.trim(),
					address: address.trim(),
					...(location ? { location } : {}),
					setAsPrimary,
				});
			}
			resetForm();
	} catch (err) {
		console.error(err);
		setError(err instanceof Error ? err.message : "Failed to save address");
	} finally {
		setIsSaving(false);
	}
};

	const isEditingOrCreating = Boolean(editingId) || isCreating;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="text-lg font-semibold">Addresses</p>
					<p className="text-sm text-slate-600">
						Keep your addresses up to date
					</p>
				</div>
				<button
					type="button"
					onClick={startCreate}
					className="rounded-md cursor-pointer bg-black px-3 py-2 text-sm text-white disabled:opacity-50 flex gap-2 items-center"
					disabled={addresses === undefined}
				>
					<Plus className="w-4 h-4" /> Add address
				</button>
			</div>

			{addresses === undefined ? (
				<p className="text-sm text-slate-500">Loading...</p>
			) : addresses.length === 0 ? (
				<p className="text-sm text-slate-500">No addresses.</p>
			) : (
				<ul className="space-y-3">
					{addresses.map((a) => (
						<li key={a._id} className="rounded-xl border p-4 space-y-2">
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<p className="font-medium truncate">{a.label}</p>
										{a.isPrimary && (
											<span className="text-xs rounded-full bg-slate-100 text-slate-700 px-2 py-0.5">
												Main
											</span>
										)}
									</div>
									<p className="text-sm text-slate-700">
										{a.recipientName} • {a.phone}
									</p>
									<p className="text-sm text-slate-600">{a.address}</p>
								</div>
								<div className="shrink-0 flex gap-2">
									<button
										type="button"
										onClick={() => startEdit(a._id as Id<"addresses">)}
										className="rounded-md border cursor-pointer p-2 text-sm hover:bg-slate-50"
									>
										<Pencil className="w-4 h-4" />
									</button>
									<button
										type="button"
										onClick={async () => {
											const ok = confirm("Delete this address?");
											if (!ok) return;
											await deleteAddress({
												addressId: a._id as Id<"addresses">,
											});
											if (editingId === (a._id as Id<"addresses">)) resetForm();
										}}
										className="rounded-md border cursor-pointer p-2 text-sm hover:bg-slate-50"
									>
										<Trash className="w-4 h-4" />
									</button>
								</div>
							</div>

							{!a.isPrimary && (
								<button
									type="button"
									onClick={() =>
										setPrimaryAddress({ addressId: a._id as Id<"addresses"> })
									}
									className="text-sm underline text-slate-600 cursor-pointer"
								>
									Set to main address
								</button>
							)}
						</li>
					))}
				</ul>
			)}

			{isEditingOrCreating && (
				<form
					onSubmit={handleSubmit}
					className="rounded-xl border p-4 space-y-4"
				>
					<div className="flex items-center justify-between gap-3">
							<p className="font-medium">
								{editingId ? "Edit address" : "Add address"}
							</p>
						<button
							type="button"
							onClick={resetForm}
							className="text-sm underline text-slate-600"
							>
								Cancel
							</button>
						</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1">
								<label className="text-sm font-medium" htmlFor="label">
									Address label
								</label>
							<input
								id="label"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
									placeholder="Home / Office / etc"
									className="w-full rounded-md border px-3 py-2"
								/>
						</div>
						<div className="space-y-1">
								<label className="text-sm font-medium" htmlFor="recipientName">
									Recipient name
								</label>
							<input
								id="recipientName"
								value={recipientName}
								onChange={(e) => setRecipientName(e.target.value)}
								className="w-full rounded-md border px-3 py-2"
							/>
						</div>
						<div className="space-y-1">
								<label className="text-sm font-medium" htmlFor="phone">
									Phone number
								</label>
							<input
								id="phone"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className="w-full rounded-md border px-3 py-2"
							/>
						</div>
						<div className="flex items-end">
							<label className="inline-flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={setAsPrimary}
									onChange={(e) => setSetAsPrimary(e.target.checked)}
								/>
									Set as primary address
								</label>
							</div>
						</div>

					<div className="space-y-1">
							<label className="text-sm font-medium" htmlFor="address">
								Address
							</label>
						<textarea
							id="address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
								placeholder="Full address"
								className="w-full min-h-20 rounded-md border px-3 py-2"
							/>
					</div>

					<div className="space-y-2">
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
								<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
									...
								</span>
							)}
						</div>

						{mapError && (
							<p className="text-sm text-red-600">{mapError}</p>
						)}
						{isReverseGeocoding && (
							<p className="text-sm text-slate-500">Updating address...</p>
						)}

						<div className="relative">
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
						disabled={isSaving}
						className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
					>
							{isSaving ? "Saving..." : "Save address"}
						</button>
				</form>
			)}
		</div>
	);
}
