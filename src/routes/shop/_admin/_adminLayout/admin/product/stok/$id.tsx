import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Trash, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

type VariantDef = { name: string; values: string[] };
type SkuRow = {
	key: string;
	options: { name: string; value: string }[];
	price: string;
	stock: string;
};

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/product/stok/$id",
)({
	component: RouteComponent,
});

function cleanVariants(input: VariantDef[]) {
	return input
		.map((v) => ({
			name: v.name.trim(),
			values: v.values.map((x) => x.trim()).filter(Boolean),
		}))
		.filter((v) => v.name && v.values.length > 0);
}

function skuKey(options: { name: string; value: string }[]) {
	if (!options.length) return "base";
	return options.map((o) => `${o.name}=${o.value}`).join("|");
}

function RouteComponent() {
	const { id } = Route.useParams();
	const productId = id as Id<"products">;

	const product = useQuery(api.products.getById, { productId });
	const existingSkus = useQuery(
		api.products.listSkusByProduct,
		product ? { productId } : "skip",
	);
	const save = useMutation(api.products.replaceSkusForProduct);

	const [rows, setRows] = useState<SkuRow[]>([]);
	const [draftOptions, setDraftOptions] = useState<Record<string, string>>({});
	const [draftPrice, setDraftPrice] = useState("0");
	const [draftStock, setDraftStock] = useState("0");
	const [error, setError] = useState("");
	const [savingKeys, setSavingKeys] = useState<Set<string>>(() => new Set());
	const [dirtyByKey, setDirtyByKey] = useState<
		Map<string, { price: string; stock: string } | null>
	>(() => new Map());

	const didInit = useRef(false);
	useEffect(() => {
		if (!product) return;
		if (existingSkus === undefined) return;
		if (didInit.current) return;
		didInit.current = true;

		setRows(
			existingSkus.map((s) => ({
				key: s.key,
				options: (s.options as { name: string; value: string }[]) ?? [],
				price: String(s.price ?? 0),
				stock: String(s.stock ?? 0),
			})),
		);
	}, [product, existingSkus]);

	const variants = useMemo(() => {
		const current = (product?.variants as VariantDef[] | undefined) ?? [];
		return cleanVariants(current);
	}, [product]);
	const variantNames = useMemo(() => variants.map((v) => v.name), [variants]);

	const buildRowsForCommit = (targetKey?: string, removedKey?: string) => {
		const next: SkuRow[] = [];

		for (const row of rows) {
			if (removedKey && row.key === removedKey) continue;

			if (targetKey && row.key === targetKey) {
				next.push(row);
				continue;
			}

			const snapshot = dirtyByKey.get(row.key);
			if (snapshot === null) {
				// New unsaved row: don't include unless it's the target being saved.
				continue;
			}
			if (snapshot) {
				// Dirty edit: commit the last-saved values.
				next.push({ ...row, price: snapshot.price, stock: snapshot.stock });
				continue;
			}

			next.push(row);
		}

		return next;
	};

	const commitSave = async (nextRows: SkuRow[], key?: string) => {
		setError("");
		if (key) {
			setSavingKeys((prev) => new Set(prev).add(key));
		}
		let ok = true;
		try {
			const payloadSkus = nextRows.map((r) => {
				const price = Number(r.price);
				const stock = Number(r.stock);
				if (!Number.isFinite(price) || price < 0) {
					throw new Error(`Invalid price for ${r.key}`);
				}
				if (!Number.isFinite(stock) || stock < 0) {
					throw new Error(`Invalid stock for ${r.key}`);
				}
				return { options: r.options, price, stock };
			});

			await save({ productId, skus: payloadSkus });
		} catch (err) {
			ok = false;
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			if (key) {
				setSavingKeys((prev) => {
					const next = new Set(prev);
					next.delete(key);
					return next;
				});
			}
		}

		return ok;
	};

	const updateRow = (key: string, patch: Partial<Pick<SkuRow, "price" | "stock">>) => {
		setRows((prev) => {
			const current = prev.find((r) => r.key === key);
			const next = prev.map((r) => (r.key === key ? { ...r, ...patch } : r));
			if (!current) return next;

			setDirtyByKey((prevDirty) => {
				if (prevDirty.has(key)) return prevDirty;
				const nextDirty = new Map(prevDirty);
				nextDirty.set(key, { price: current.price, stock: current.stock });
				return nextDirty;
			});

			return next;
		});
	};

	const removeSku = (key: string) => {
		const nextUiRows = rows.filter((r) => r.key !== key);
		setRows(nextUiRows);
		setDirtyByKey((prevDirty) => {
			const nextDirty = new Map(prevDirty);
			nextDirty.delete(key);
			return nextDirty;
		});

		// If it was never saved, don't hit the backend.
		if (dirtyByKey.get(key) === null) return;

		void commitSave(buildRowsForCommit(undefined, key));
	};

	const addSku = () => {
		setError("");

		if (variants.length === 0) {
			const key = "base";
			if (rows.some((r) => r.key === key)) {
				setError("Base SKU already exists.");
				return;
			}

			const next: SkuRow[] = [
				...rows,
				{ key, options: [], price: draftPrice, stock: draftStock },
			];
			setRows(next);
			setDirtyByKey((prevDirty) => {
				const nextDirty = new Map(prevDirty);
				nextDirty.set(key, null);
				return nextDirty;
			});

			void commitSave(next, key).then((ok) => {
				if (!ok) return;
				setDirtyByKey((prevDirty) => {
					const nextDirty = new Map(prevDirty);
					nextDirty.delete(key);
					return nextDirty;
				});
			});
			return;
		}

		const options = variants.map((v) => {
			const value = draftOptions[v.name] ?? "";
			return { name: v.name, value };
		});

		if (options.some((o) => !o.value)) {
			setError("Please select all variant values.");
			return;
		}

		const key = skuKey(options);
		if (rows.some((r) => r.key === key)) {
			setError("SKU already exists.");
			return;
		}

		const next: SkuRow[] = [
			...rows,
			{ key, options, price: draftPrice, stock: draftStock },
		];
		setRows(next);
		setDirtyByKey((prevDirty) => {
			const nextDirty = new Map(prevDirty);
			nextDirty.set(key, null);
			return nextDirty;
		});

		void commitSave(next, key).then((ok) => {
			if (!ok) return;
			setDirtyByKey((prevDirty) => {
				const nextDirty = new Map(prevDirty);
				nextDirty.delete(key);
				return nextDirty;
			});
		});
	};

	if (product === undefined) {
		return (
			<div className="space-y-4 py-6">
				<p className="text-sm text-slate-500">Loading...</p>
			</div>
		);
	}

	if (product === null) {
		return (
			<div className="space-y-4 py-6">
				<p className="text-sm text-slate-500">Product not found.</p>
				<Link to="/shop/admin/product" className="underline text-sm">
					Back
				</Link>
			</div>
		);
	}

	if (existingSkus === undefined) {
		return (
			<div className="space-y-4 py-6">
				<p className="text-sm text-slate-500">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 py-6">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold">Stock</h1>
					<p className="text-sm text-slate-600">{product.name}</p>
				</div>

				<div className="flex gap-2">
					<Link
						to="/shop/admin/product"
						className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
					>
						Back
					</Link>
					<Link
						to="/shop/admin/product/variant/$id"
						params={{ id: `${productId}` }}
						className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
					>
						Edit variants
					</Link>
					{savingKeys.size && (
						<span className="text-sm text-slate-500">Saving...</span>
					)}
				</div>
			</div>

			{error && <p className="text-sm text-red-600">{error}</p>}

			<div className="rounded-xl border p-4 space-y-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="font-medium">Add SKU</p>
						<p className="text-sm text-slate-500">
							Create only the combinations you actually sell.
						</p>
					</div>

					<button
						type="button"
						onClick={addSku}
						className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
					>
						Add SKU
					</button>
				</div>

				{variants.length ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{variants.map((variant) => (
							<div key={variant.name}>
								<label className="text-xs text-slate-500">{variant.name}</label>
								<select
									value={draftOptions[variant.name] ?? ""}
									onChange={(e) =>
										setDraftOptions((prev) => ({
											...prev,
											[variant.name]: e.target.value,
										}))
									}
									className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
								>
									<option value="">Select...</option>
									{variant.values.map((v) => (
										<option key={v} value={v}>
											{v}
										</option>
									))}
								</select>
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-slate-500">
						No variants. You can create a single base SKU.
					</p>
				)}

				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<label className="text-xs text-slate-500">Price</label>
						<input
							inputMode="decimal"
							type="number"
							min={0}
							step="0.01"
							value={draftPrice}
							onChange={(e) => setDraftPrice(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label className="text-xs text-slate-500">Stock</label>
						<input
							inputMode="numeric"
							type="number"
							min={0}
							step="1"
							value={draftStock}
							onChange={(e) => setDraftStock(e.target.value)}
							className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
						/>
					</div>
				</div>
			</div>

			<div className="rounded-xl border p-4 space-y-4">
				<div>
					<p className="font-medium">SKU List</p>
					<p className="text-sm text-slate-500">
						Manage price and stock per SKU.
					</p>
				</div>

				<div className="overflow-auto">
					<table className="min-w-full text-sm">
						<thead className="text-left text-slate-500">
							<tr>
								{variantNames.map((name) => (
									<th key={name} className="py-2 pr-4 font-medium">
										{name}
									</th>
								))}
								<th className="py-2 pr-4 font-medium">Price</th>
								<th className="py-2 pr-4 font-medium">Stock</th>
								<th className="py-2 pr-4 font-medium">Action</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={row.key} className="border-t">
									{variantNames.map((name) => {
										const v = row.options.find((o) => o.name === name)?.value ?? "-";
										return (
											<td key={`${row.key}:${name}`} className="py-2 pr-4">
												{v}
											</td>
										);
									})}
									<td className="py-2 pr-4">
										<input
											inputMode="decimal"
											type="number"
											min={0}
											step="0.01"
											value={row.price}
											onChange={(e) => updateRow(row.key, { price: e.target.value })}
											className="w-32 rounded-md border px-3 py-2"
										/>
									</td>
									<td className="py-2 pr-4">
										<input
											inputMode="numeric"
											type="number"
											min={0}
											step="1"
											value={row.stock}
											onChange={(e) => updateRow(row.key, { stock: e.target.value })}
											className="w-28 rounded-md border px-3 py-2"
										/>
									</td>
									<td className="py-2 pr-4">
										<div className="flex items-center justify-end gap-2">
											{dirtyByKey.has(row.key) && (
												<>
													<button
														type="button"
														aria-label="Save SKU"
														disabled={savingKeys.has(row.key)}
														onClick={() => {
															const nextRows = buildRowsForCommit(row.key);
															void commitSave(nextRows, row.key).then((ok) => {
																if (!ok) return;
																setDirtyByKey((prevDirty) => {
																	const nextDirty = new Map(prevDirty);
																	nextDirty.delete(row.key);
																	return nextDirty;
																});
															});
														}}
														className="rounded-md border px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
													>
														<Check className="h-4 w-4" />
													</button>
													<button
														type="button"
														aria-label="Cancel changes"
														disabled={savingKeys.has(row.key)}
														onClick={() => {
															const snapshot = dirtyByKey.get(row.key) ?? null;
															setDirtyByKey((prevDirty) => {
																const nextDirty = new Map(prevDirty);
																nextDirty.delete(row.key);
																return nextDirty;
															});
															setRows((prev) => {
																if (snapshot === null) {
																	return prev.filter((r) => r.key !== row.key);
																}
																return prev.map((r) =>
																	r.key === row.key
																		? { ...r, price: snapshot.price, stock: snapshot.stock }
																		: r,
																);
															});
														}}
														className="rounded-md border px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
													>
														<X className="h-4 w-4" />
													</button>
												</>
											)}

											<button
												type="button"
												onClick={() => removeSku(row.key)}
												disabled={savingKeys.has(row.key)}
												className="rounded-md border p-2 cursor-pointer text-xs hover:bg-slate-50 disabled:opacity-50"
											>
												<Trash className="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
