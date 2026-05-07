const STORAGE_KEY = "tanplace:checkout:selectedIds:v1";

export function saveCheckoutSelection(ids: string[]) {
	if (typeof window === "undefined") return;
	window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function loadCheckoutSelection(): string[] {
	if (typeof window === "undefined") return [];
	const raw = window.sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((x) => typeof x === "string");
	} catch {
		return [];
	}
}

export function clearCheckoutSelection() {
	if (typeof window === "undefined") return;
	window.sessionStorage.removeItem(STORAGE_KEY);
}

