const usd = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatUSD(amount: number) {
	return usd.format(amount);
}

export function formatUSDMaybe(amount: number | null | undefined) {
	if (amount === null || amount === undefined || !Number.isFinite(amount))
		return null;
	return formatUSD(amount);
}

export function formatUSDRange(
	min: number | null | undefined,
	max: number | null | undefined,
) {
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
	if (min === max) return formatUSD(min);
	return `${formatUSD(min)} - ${formatUSD(max)}`;
}
