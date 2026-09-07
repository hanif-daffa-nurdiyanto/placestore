/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */

import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { uploadImages } from "#/lib/convex";
import { formatUSD, formatUSDMaybe } from "#/lib/money";
import { formatDateTime } from "#/lib/utils";
import type { TransactionWithShop } from "#/types/transactions";
import { StatusPill } from "./StatusPill";

interface OrderItemProps {
	transaction: TransactionWithShop;
}

const OrderItem = ({ transaction: t }: OrderItemProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const cancelMyOrder = useMutation(api.transactions.cancelMyOrder);
	const markMyOrderReceived = useMutation(api.transactions.markMyOrderReceived);
	const generateReviewUploadUrl = useMutation(api.reviews.generateUploadUrl);
	const createReview = useMutation(api.reviews.create);
	const myReviews = useQuery(
		api.reviews.listMyByTransaction,
		t.status === "received" ? { transactionId: t._id } : "skip",
	);
	const reviewedProductIds = useMemo(() => {
		if (!myReviews) return new Set<string>();
		return new Set(myReviews.map((r) => String(r.productId)));
	}, [myReviews]);

	const [reviewingProductId, setReviewingProductId] = useState<string | null>(
		null,
	);
	const [rating, setRating] = useState(5);
	const [reviewText, setReviewText] = useState("");
	const [reviewImages, setReviewImages] = useState<
		{ file: File; previewUrl: string }[]
	>([]);
	const [isSubmittingReview, setIsSubmittingReview] = useState(false);
	const imagesRef = useRef(reviewImages);
	useEffect(() => {
		imagesRef.current = reviewImages;
	}, [reviewImages]);
	useEffect(() => {
		return () => {
			for (const img of imagesRef.current) URL.revokeObjectURL(img.previewUrl);
		};
	}, []);

	const resetReviewForm = () => {
		setRating(5);
		setReviewText("");
		setReviewImages((prev) => {
			for (const img of prev) URL.revokeObjectURL(img.previewUrl);
			return [];
		});
	};

	const reviewingItem = useMemo(() => {
		if (!reviewingProductId) return null;
		return t.items.find((it) => String(it.productId) === reviewingProductId) ?? null;
	}, [reviewingProductId, t.items]);

	useEffect(() => {
		if (!reviewingProductId) return;
		if (reviewedProductIds.has(reviewingProductId)) {
			setReviewingProductId(null);
			resetReviewForm();
		}
	}, [reviewingProductId, reviewedProductIds]);

	return (
		<li key={t._id} className="rounded-xl border p-4 space-y-3">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<div className="flex items-center gap-2">
						<p className="font-medium">Order-{t._id.slice(0, 8)}</p>
						<StatusPill status={t.status} />
						<button
							type="button"
							className="ml-1 py-1 flex items-center px-2 gap-1 border rounded cursor-pointer hover:bg-slate-100"
							onClick={() => setIsOpen((prev) => !prev)}
						>
							{isOpen ? (
								<ChevronUp className="w-4 h-4" />
							) : (
								<ChevronDown className="w-4 h-4" />
							)}
							<span className="text-xs">{isOpen ? "hide" : "show"} detail</span>
						</button>
					</div>
					<p className="text-xs text-slate-500">
						{formatDateTime(t.createdAt)} • {t.shippingMethod} •{" "}
						{t.paymentMethod}
					</p>
				</div>
					<p className="font-semibold">{formatUSDMaybe(t.total) ?? "-"}</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{(t.status === "pending" || t.status === "processing") && (
						<button
							type="button"
							className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
							onClick={() => {
								const ok = confirm("Cancel this order?");
								if (!ok) return;
								void cancelMyOrder({ transactionId: t._id });
							}}
						>
							Cancel order
						</button>
					)}
					{t.status === "shipping" && (
						<button
							type="button"
							className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
							onClick={() => {
								const ok = confirm("Mark this order as received?");
								if (!ok) return;
								void markMyOrderReceived({ transactionId: t._id });
							}}
						>
							Order received
						</button>
					)}
				</div>
				{isOpen && (
					<>
					<div className="text-sm text-slate-700 space-y-1">
						<p className="text-xs text-slate-500">Sender</p>
						<Link to="/shop/$slug" params={{ slug: t.shop.slug ?? "" }}>
							<div className="flex gap-2">
								<img
									src={t.shop.imageUrl ?? ""}
									alt={t.shop.name}
									className="w-12 h-12 rounded-full overflow-clip object-cover border"
								/>
								<div>
									<p className="font-medium">{t.shop.name}</p>
									<p className="text-slate-600">{t.shop.address}</p>
								</div>
							</div>
						</Link>
					</div>

					<div className="text-sm text-slate-700 space-y-1">
						<p className="text-xs text-slate-500">Shipping address</p>
						<p className="font-medium">
							{t.addressSnapshot.recipientName} • {t.addressSnapshot.phone}
						</p>
						<p className="text-slate-600">{t.addressSnapshot.address}</p>
					</div>
				</>
			)}

				<div className="space-y-2">
					<p className="text-xs text-slate-500">Items</p>
					<div className="flex flex-col gap-y-2">
						{t.items.map((it, i) => (
							<Link
								key={`${t._id}:${i}`}
								to="/product/$id"
								params={{ id: it.productId }}
							>
								<div className="flex items-start justify-between gap-3 text-sm">
									<p className="line-clamp-2 flex gap-3">
										<img
											src={it.imageUrl}
											alt={it.productName}
										className="w-16 h-16 object-contain border rounded"
									/>
									<div className="flex flex-col">
										<span className="font-bold">{it.productName}</span>
										<span>
											{it.skuOptions
												.map((o) => `${o.name}: ${o.value}`)
												.join(" / ")}
										</span>
										<span className="font-semibold">
											{it.quantity > 1 &&
												`${it.lineTotal > 0 && formatUSD(it.lineTotal)} x ${it.quantity}`}
										</span>
									</div>
								</p>
									<p className="font-medium shrink-0">
										{formatUSDMaybe(it.lineTotal) ?? "-"}
									</p>
								</div>
							</Link>
						))}
					</div>
				</div>

				{t.status === "received" && (
					<div className="space-y-2">
						<div className="flex flex-wrap gap-2 justify-end">
							{t.items.map((it) => (
								<button
									key={`${t._id}:${String(it.productId)}`}
									type="button"
									disabled={reviewedProductIds.has(String(it.productId))}
									className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
									onClick={() => {
										if (reviewedProductIds.has(String(it.productId))) return;
										const next = String(it.productId);
										setReviewingProductId((prev) =>
											prev === next ? null : next,
										);
										resetReviewForm();
									}}
								>
									{reviewedProductIds.has(String(it.productId))
										? `Reviewed`
										: `Review`}
								</button>
							))}
						</div>

						{reviewingItem && (
							<form
								className="rounded-xl border p-4 space-y-3"
								onSubmit={async (e) => {
									e.preventDefault();
									if (isSubmittingReview) return;
									try {
										setIsSubmittingReview(true);
										const imageIds =
											reviewImages.length > 0
												? await uploadImages({
														files: reviewImages.map((x) => x.file),
														generateUploadUrl: generateReviewUploadUrl,
													})
												: [];

										await createReview({
											transactionId: t._id,
											productId: reviewingItem.productId,
											rating,
											reviewText: reviewText.trim() ? reviewText.trim() : undefined,
											imageIds,
										});
										setReviewingProductId(null);
										resetReviewForm();
									} catch (err) {
										console.error(err);
										alert(err instanceof Error ? err.message : "Failed to submit review");
									} finally {
										setIsSubmittingReview(false);
									}
								}}
							>
								<div className="flex items-center justify-between gap-3">
									<p className="font-medium">Write a review</p>
									<button
										type="button"
										className="text-sm underline text-slate-600"
										onClick={() => {
											setReviewingProductId(null);
											resetReviewForm();
										}}
									>
										Cancel
									</button>
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									<label className="text-sm">
										<span className="block text-sm font-medium">Rating</span>
										<select
											value={rating}
											onChange={(e) => setRating(Number(e.target.value))}
											className="mt-1 w-full rounded-md border px-3 py-2"
										>
											{[5, 4, 3, 2, 1].map((n) => (
												<option key={n} value={n}>
													{n}
												</option>
											))}
										</select>
									</label>

									<label className="text-sm">
										<span className="block text-sm font-medium">Images</span>
										<input
											type="file"
											accept="image/*"
											multiple
											className="mt-1 w-full"
											onChange={(e) => {
												const files = Array.from(e.target.files ?? []);
												setReviewImages((prev) => {
													const next = [...prev];
													for (const f of files.slice(0, 8 - next.length)) {
														next.push({
															file: f,
															previewUrl: URL.createObjectURL(f),
														});
													}
													return next;
												});
												e.currentTarget.value = "";
											}}
										/>
									</label>
								</div>

								{reviewImages.length > 0 && (
									<div className="flex flex-wrap gap-2">
										{reviewImages.map((img) => (
											// biome-ignore lint/a11y/useAltText: review image preview
											<img
												key={img.previewUrl}
												src={img.previewUrl}
												className="h-16 w-16 rounded-lg border object-cover"
											/>
										))}
									</div>
								)}

								<div>
									<label className="block text-sm font-medium" htmlFor={`review-${t._id}`}>
										Review
									</label>
									<textarea
										id={`review-${t._id}`}
										value={reviewText}
										onChange={(e) => setReviewText(e.target.value)}
										className="mt-1 w-full min-h-20 rounded-md border px-3 py-2"
										placeholder="Share your experience (optional)"
									/>
								</div>

								<button
									type="submit"
									disabled={isSubmittingReview}
									className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
								>
									{isSubmittingReview ? "Submitting..." : "Submit review"}
								</button>
							</form>
						)}
					</div>
				)}

				{isOpen && (
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
					<div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
						<span className="text-slate-600">Subtotal</span>
						<span className="font-medium">
							{formatUSDMaybe(t.subtotal) ?? "-"}
						</span>
					</div>
					<div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
						<span className="text-slate-600">Shipping</span>
						<span className="font-medium">
							{formatUSDMaybe(t.shippingFee) ?? "-"}
						</span>
					</div>
					<div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
						<span className="text-slate-600">Service fee</span>
						<span className="font-medium">
							{formatUSDMaybe(t.serviceFee) ?? "-"}
						</span>
					</div>
				</div>
			)}
		</li>
	);
};

export default OrderItem;
