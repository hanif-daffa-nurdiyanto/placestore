import { useEffect, useMemo, useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";

export const ACTIVE_SHOP_KEY = "active_shop_slug" as const;

export function useActiveShop(shops: Doc<"shops">[] | undefined) {
	const [activeShopSlug, setActiveShopSlug] = useState(() => {
		if (typeof window === "undefined") return "";
		return localStorage.getItem(ACTIVE_SHOP_KEY) ?? "";
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!activeShopSlug) return;
		localStorage.setItem(ACTIVE_SHOP_KEY, activeShopSlug);
	}, [activeShopSlug]);

	useEffect(() => {
		if (!shops || shops.length === 0) return;

		if (activeShopSlug && shops.some((s) => s.slug === activeShopSlug)) return;

		const next = shops[0]?.slug ?? "";
		if (next) setActiveShopSlug(next);
	}, [shops, activeShopSlug]);

	const activeShop = useMemo(() => {
		return shops?.find((s) => s.slug === activeShopSlug) ?? null;
	}, [shops, activeShopSlug]);

	return { shops, activeShop, activeShopSlug, setActiveShopSlug };
}

