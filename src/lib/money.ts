const idr = new Intl.NumberFormat("id-ID", {
	style: "currency",
	currency: "IDR",
	maximumFractionDigits: 0,
});

export function formatIDR(amount: number) {
	return idr.format(amount);
}

export function formatIDRMaybe(amount: number | null | undefined) {
	if (amount === null || amount === undefined || !Number.isFinite(amount)) return null;
	return formatIDR(amount);
}

export function formatIDRRange(min: number | null | undefined, max: number | null | undefined) {
	if (
		min === null ||
		min === undefined ||
		!Number.isFinite(min) ||
		max === null ||
		max === undefined ||
		!Number.isFinite(max)
	) {
		return null;
	}
	if (min === max) return formatIDR(min);
	return `${formatIDR(min)} - ${formatIDR(max)}`;
}

