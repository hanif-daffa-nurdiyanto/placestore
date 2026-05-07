/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Pencil, Plus, Trash, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../../convex/_generated/dataModel";

type VariantDef = { name: string; values: string[] };
type VariantRow = {
	id: string;
	name: string;
	values: string[];
	isDeleted?: boolean;
};

export const Route = createFileRoute(
	"/shop/_admin/_adminLayout/admin/product/variant/$id",
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

function makeLocalId() {
	return `${Date.now().toString(16)}:${Math.random().toString(16).slice(2)}`;
}

function RouteComponent() {
	const { id } = Route.useParams();
	const productId = id as Id<"products">;

	const product = useQuery(api.products.getById, { productId });
	const save = useMutation(api.products.setProductVariants);

	const [rows, setRows] = useState<VariantRow[]>([]);
	const rowsRef = useRef<VariantRow[]>([]);
	useEffect(() => {
		rowsRef.current = rows;
	}, [rows]);

	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [error, setError] = useState("");
	const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
	const [dirtyById, setDirtyById] = useState<Map<string, VariantRow | null>>(
		() => new Map(),
	);

	const didInit = useRef(false);
	useEffect(() => {
		if (!product) return;
		if (didInit.current) return;
		didInit.current = true;

		const initial = (product.variants as VariantDef[] | undefined) ?? [];
		setRows(
			initial.map((v) => ({
				id: makeLocalId(),
				name: v.name ?? "",
				values: (v.values?.length ? v.values : [""]) as string[],
			})),
		);
	}, [product]);

	const visibleRowCount = useMemo(
		() => rows.filter((r) => !r.isDeleted).length,
		[rows],
	);

	const markDirty = (rowId: string) => {
		setDirtyById((prevDirty) => {
			if (prevDirty.has(rowId)) return prevDirty;
			const row = rowsRef.current.find((r) => r.id === rowId);
			if (!row) return prevDirty;
			const next = new Map(prevDirty);
			next.set(rowId, { ...row, values: [...row.values] });
			return next;
		});
	};

	const buildRowsForCommit = (targetId: string) => {
		const next: VariantRow[] = [];
		for (const row of rowsRef.current) {
			if (row.id === targetId) {
				next.push(row);
				continue;
			}

			const snapshot = dirtyById.get(row.id);
			if (snapshot === null) continue; // new & unsaved -> don't include
			if (snapshot) {
				next.push(snapshot); // revert other dirty rows
				continue;
			}

			next.push(row);
		}
		return next.filter((r) => !r.isDeleted);
	};

	const validateVariants = (variants: VariantDef[]) => {
		const seen = new Set<string>();
		for (const v of variants) {
			if (seen.has(v.name))
				throw new Error(`Duplicate variant name: ${v.name}`);
			seen.add(v.name);

			const values = new Set(v.values);
			if (values.size !== v.values.length) {
				throw new Error(`Duplicate values in variant: ${v.name}`);
			}
		}
	};

	const commitSave = async (targetId: string) => {
		setError("");
		setSavingIds((prev) => new Set(prev).add(targetId));
		let ok = true;
		try {
			const committingRows = buildRowsForCommit(targetId);
			const cleaned = cleanVariants(
				committingRows.map((r) => ({ name: r.name, values: r.values })),
			);
			validateVariants(cleaned);
			await save({ productId, variants: cleaned });
		} catch (err) {
			ok = false;
			console.error(err);
			setError(err instanceof Error ? err.message : "Failed to save");
		} finally {
			setSavingIds((prev) => {
				const next = new Set(prev);
				next.delete(targetId);
				return next;
			});
		}

		if (!ok) return;

		setDirtyById((prev) => {
			const next = new Map(prev);
			next.delete(targetId);
			return next;
		});

		setRows((prev) => prev.filter((r) => !(r.id === targetId && r.isDeleted)));
		if (expandedId === targetId) setExpandedId(null);
	};

	const cancelChanges = (targetId: string) => {
		const snapshot = dirtyById.get(targetId);
		setDirtyById((prev) => {
			const next = new Map(prev);
			next.delete(targetId);
			return next;
		});

		if (snapshot === null) {
			setRows((prev) => prev.filter((r) => r.id !== targetId));
			if (expandedId === targetId) setExpandedId(null);
			return;
		}

		if (!snapshot) return;
		setRows((prev) => prev.map((r) => (r.id === targetId ? snapshot : r)));

		if (expandedId === targetId) setExpandedId(null);
	};

	const addVariant = () => {
		const id = makeLocalId();
		const next: VariantRow = { id, name: "", values: [""] };
		setRows((prev) => [...prev, next]);
		setDirtyById((prev) => {
			const nextDirty = new Map(prev);
			nextDirty.set(id, null);
			return nextDirty;
		});
		setExpandedId(id);
	};

	const toggleDelete = (rowId: string) => {
		markDirty(rowId);
		setRows((prev) =>
			prev.map((r) => (r.id === rowId ? { ...r, isDeleted: !r.isDeleted } : r)),
		);
	};

	const updateName = (rowId: string, name: string) => {
		markDirty(rowId);
		setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, name } : r)));
	};

	const addValue = (rowId: string) => {
		markDirty(rowId);
		setRows((prev) =>
			prev.map((r) =>
				r.id === rowId ? { ...r, values: [...r.values, ""] } : r,
			),
		);
	};

	const removeValue = (rowId: string, index: number) => {
		markDirty(rowId);
		setRows((prev) =>
			prev.map((r) =>
				r.id === rowId
					? { ...r, values: r.values.filter((_, i) => i !== index) }
					: r,
			),
		);
	};

	const updateValue = (rowId: string, index: number, value: string) => {
		markDirty(rowId);
		setRows((prev) =>
			prev.map((r) =>
				r.id === rowId
					? {
							...r,
							values: r.values.map((v, i) => (i === index ? value : v)),
						}
					: r,
			),
		);
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

	return (
		<div className="space-y-6 py-6">
			<div className="flex items-start justify-between gap-4">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold">Variants</h1>
					<p className="text-sm text-slate-600">{product.name}</p>
					<p className="text-xs text-slate-500">
						Adding values won’t delete SKUs. Removing/renaming variants may
						clear SKUs.
					</p>
				</div>

				<div className="flex gap-2">
					<Link
						to="/shop/admin/product/stok/$id"
						params={{ id: `${productId}` }}
						className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
					>
						Back to stock
					</Link>
					{savingIds.size && (
						<span className="text-sm text-slate-500">Saving...</span>
					)}
				</div>
			</div>

			{error && <p className="text-sm text-red-600">{error}</p>}

			<div className="rounded-xl border p-4 space-y-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="font-medium">Add Variant</p>
						<p className="text-sm text-slate-500">Create variants as a list.</p>
					</div>

					<button
						type="button"
						onClick={addVariant}
						className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
					>
						Add variant
					</button>
				</div>
			</div>

			<div className="rounded-xl border p-4 space-y-4">
				<div>
					<p className="font-medium">Variant List</p>
					<p className="text-sm text-slate-500">Click edit to manage values.</p>
				</div>

				{rows.length === 0 ? (
					<p className="text-sm text-slate-500">No variants yet.</p>
				) : (
					<div className="overflow-auto">
						<table className="min-w-full text-sm">
							<thead className="text-left text-slate-500">
								<tr>
									<th className="py-2 pr-4 font-medium">Name</th>
									<th className="py-2 pr-4 font-medium">Values</th>
									<th className="py-2 pr-4 font-medium"></th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => {
									const isExpanded = expandedId === row.id;
									const isDirty = dirtyById.has(row.id);
									const isSaving = savingIds.has(row.id);

									return (
										<Fragment key={row.id}>
											<tr className="border-t">
												<td className="py-2 pr-4">
													<input
														value={row.name}
														onChange={(e) => updateName(row.id, e.target.value)}
														placeholder="e.g. Size"
														disabled={Boolean(row.isDeleted)}
														className="w-56 rounded-md border px-3 py-2 text-sm disabled:opacity-50"
													/>
												</td>
												<td className="py-2 pr-4 text-slate-600">
													{row.isDeleted ? (
														<span className="text-red-600">Confirm Delete</span>
													) : row.values.filter(Boolean).length === 0 ? (
														"-"
													) : (
														row.values.filter(Boolean).join(", ")
													)}
												</td>
												<td className="py-2 pr-4">
													<div className="flex items-center gap-2 justify-end">
														{isDirty && (
															<>
																<button
																	type="button"
																	aria-label="Save"
																	disabled={isSaving}
																	onClick={() => void commitSave(row.id)}
																	className="rounded-md border px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
																>
																	<Check className="h-4 w-4" />
																</button>
																<button
																	type="button"
																	aria-label="Cancel"
																	disabled={isSaving}
																	onClick={() => cancelChanges(row.id)}
																	className="rounded-md border px-2 py-2 text-xs hover:bg-slate-50 disabled:opacity-50"
																>
																	<X className="h-4 w-4" />
																</button>
															</>
														)}
														{!isDirty && (
															<button
																type="button"
																onClick={() =>
																	setExpandedId((prev) =>
																		prev === row.id ? null : row.id,
																	)
																}
																disabled={Boolean(row.isDeleted)}
																className="rounded-md border px-2 py-2 text-xs cursor-pointer hover:bg-slate-50 disabled:opacity-50"
															>
																{isExpanded ? (
																	<X className="h-4 w-4" />
																) : (
																	<Pencil className="h-4 w-4" />
																)}
															</button>
														)}{" "}
														{!row.isDeleted && (
															<button
																type="button"
																onClick={() => toggleDelete(row.id)}
																disabled={isSaving}
																className="rounded-md cursor-pointer border px-2 py-2 text-xs hover:bg-red-400 disabled:opacity-50"
															>
																<Trash className="h-4 w-4" />
															</button>
														)}
													</div>
												</td>
											</tr>

											{isExpanded && !row.isDeleted && (
												<tr>
													<td colSpan={3} className="pb-4">
														<div className="mt-3 rounded-xl border p-3 space-y-3">
															<div className="flex items-center justify-between">
																<p className="text-xs text-slate-500">Values</p>
															</div>

															<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
																{row.values.map((value, j) => (
																	<div key={j} className="flex">
																		<input
																			value={value}
																			onChange={(e) =>
																				updateValue(row.id, j, e.target.value)
																			}
																			placeholder="e.g. XL"
																			className="w-full rounded-l-md border px-3 py-2 text-sm border-r-0 pr-0"
																		/>
																		<button
																			type="button"
																			onClick={() => removeValue(row.id, j)}
																			className="rounded-r-md border px-2 py-2 cursor-pointer text-sm hover:bg-red-400"
																		>
																			<X className="h-4 w-4" />
																		</button>
																	</div>
																))}
																<button
																	type="button"
																	onClick={() => addValue(row.id)}
																	className="rounded-md border p-2 cursor-pointer text-sm hover:bg-slate-50 w-fit"
																>
																	<Plus className="h-4 w-4" /> 
																</button>
															</div>
														</div>
													</td>
												</tr>
											)}
										</Fragment>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
