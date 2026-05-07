import { useAuth } from "@clerk/tanstack-react-start";
import { useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { createContext, useContext, useMemo, useState } from "react";

export type CartItem = {
	id: string;
	productId: string;
	productName: string;
	imageUrl: string | null;
	shopId: string | null;
	shopName: string | null;
	shopSlug: string | null;
	shopLogoUrl?: string | null;
	skuKey: string;
	options: { name: string; value: string }[];
	price: number;
	stock: number;
	quantity: number;
};

type CartState = {
	items: CartItem[];
	addItem: (input: Omit<CartItem, "id">) => void;
	setQuantity: (id: string, quantity: number) => void;
	removeItem: (id: string) => void;
	syncSku: (
		key: { productId: string; skuKey: string },
		patch: Partial<
			Pick<
				CartItem,
				| "price"
				| "stock"
				| "productName"
				| "imageUrl"
				| "shopId"
				| "shopName"
				| "shopSlug"
				| "shopLogoUrl"
			>
		>,
	) => void;
	clear: () => void;
	totalItems: number;
	totalPrice: number;
};

const CartContext = createContext<CartState | null>(null);

export function CartProvider(props: { children: React.ReactNode }) {
	const { isLoaded, isSignedIn } = useAuth();
	const [guestItems, setGuestItems] = useState<CartItem[]>([]);

	const dbItems = useQuery(anyApi.cart.getMyCart) as CartItem[] | undefined;
	const addItemDb = useMutation(anyApi.cart.addItem);
	const setQuantityDb = useMutation(anyApi.cart.setQuantity);
	const removeItemDb = useMutation(anyApi.cart.removeItem);
	const clearDb = useMutation(anyApi.cart.clear);
	const syncSkuDb = useMutation(anyApi.cart.syncSku);

	const items = isLoaded && isSignedIn ? (dbItems ?? []) : guestItems;

	const totalItems = useMemo(
		() => items.reduce((sum, it) => sum + Math.max(0, it.quantity), 0),
		[items],
	);

	const totalPrice = useMemo(
		() =>
			items.reduce(
				(sum, it) =>
					sum + Math.max(0, it.quantity) * Math.max(0, Number(it.price) || 0),
				0,
			),
		[items],
	);

	const value = useMemo<CartState>(() => {
		return {
			items,
			addItem: (input) => {
				if (isLoaded && isSignedIn) {
					void addItemDb({ item: input });
					return;
				}
				setGuestItems((prev) => {
					if (!Number.isFinite(input.stock) || input.stock <= 0) return prev;
					const id = `${input.productId}:${input.skuKey}`;
					const existing = prev.find((p) => p.id === id);
					if (existing) {
						const nextStock = Math.max(0, Math.floor(input.stock));
						const requested = Math.max(1, input.quantity);
						return prev.map((p) =>
							p.id === id
								? {
										...p,
										...input,
										id,
										stock: nextStock,
										quantity: Math.min(
											nextStock || 999,
											p.quantity + Math.min(nextStock || 999, requested),
										),
									}
								: p,
						);
					}
					const nextStock = Math.max(0, Math.floor(input.stock));
					const nextQty = Math.min(
						nextStock || 999,
						Math.max(1, input.quantity),
					);
					return [...prev, { ...input, id, stock: nextStock, quantity: nextQty }];
				});
			},
			setQuantity: (id, quantity) => {
				if (isLoaded && isSignedIn) {
					void setQuantityDb({ id, quantity });
					return;
				}
				setGuestItems((prev) =>
					prev
						.map((p) =>
							p.id === id
								? {
										...p,
										quantity: Math.max(
											1,
											Math.min(
												Number.isFinite(p.stock) && p.stock > 0 ? p.stock : 999,
												Math.floor(quantity),
											),
										),
									}
								: p,
						)
						.filter((p) => p.quantity > 0),
				);
			},
			removeItem: (id) => {
				if (isLoaded && isSignedIn) {
					void removeItemDb({ id });
					return;
				}
				setGuestItems((prev) => prev.filter((p) => p.id !== id));
			},
			syncSku: (key, patch) => {
				if (isLoaded && isSignedIn) {
					void syncSkuDb({
						key,
						patch: {
							...(patch.price !== undefined ? { price: patch.price } : {}),
							...(patch.stock !== undefined ? { stock: patch.stock } : {}),
							...(patch.productName !== undefined
								? { productName: patch.productName }
								: {}),
							...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
							shopId: patch.shopId ?? null,
							shopName: patch.shopName ?? null,
							shopSlug: patch.shopSlug ?? null,
							shopLogoUrl: patch.shopLogoUrl ?? null,
						},
					});
					return;
				}
				setGuestItems((prev) =>
					prev.map((p) => {
						if (p.productId !== key.productId || p.skuKey !== key.skuKey) return p;
						const nextStockRaw = patch.stock ?? p.stock;
						const nextStock =
							typeof nextStockRaw === "number" && Number.isFinite(nextStockRaw)
								? Math.max(0, Math.floor(nextStockRaw))
								: p.stock;
						const nextPriceRaw = patch.price ?? p.price;
						const nextPrice =
							typeof nextPriceRaw === "number" && Number.isFinite(nextPriceRaw)
								? Math.max(0, nextPriceRaw)
								: p.price;
						const nextQty = Math.min(
							nextStock > 0 ? nextStock : 999,
							Math.max(1, p.quantity),
						);
						return {
							...p,
							productName: patch.productName ?? p.productName,
							imageUrl: patch.imageUrl ?? p.imageUrl,
							shopId: patch.shopId ?? p.shopId,
							shopName: patch.shopName ?? p.shopName,
							shopSlug: patch.shopSlug ?? p.shopSlug,
							shopLogoUrl: patch.shopLogoUrl ?? p.shopLogoUrl,
							stock: nextStock,
							price: nextPrice,
							quantity: nextQty,
						};
					}),
				);
			},
			clear: () => {
				if (isLoaded && isSignedIn) {
					void clearDb({});
					return;
				}
				setGuestItems([]);
			},
			totalItems,
			totalPrice,
		};
	}, [
		addItemDb,
		clearDb,
		isLoaded,
		isSignedIn,
		items,
		removeItemDb,
		setQuantityDb,
		syncSkuDb,
		totalItems,
		totalPrice,
	]);

	return <CartContext.Provider value={value}>{props.children}</CartContext.Provider>;
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used within CartProvider");
	return ctx;
}
