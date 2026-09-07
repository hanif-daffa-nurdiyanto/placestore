import { Link } from "@tanstack/react-router";
import { formatUSDMaybe } from "#/lib/money";
import type { PublicProduct } from "#/section/ProductsHome";

const ProductCard = ({ product }: { product: PublicProduct }) => {
	const currentPrice =
		typeof product.minSkuPrice === "number"
			? product.minSkuPrice
			: product.basePrice;
	const originalPrice =
		typeof product.basePrice === "number" ? product.basePrice : null;
	const hasDiscount =
		currentPrice != null &&
		originalPrice != null &&
		originalPrice > currentPrice;
	const discount = hasDiscount
		? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
		: null;

	return (
		<Link to="/product/$id" params={{ id: product._id }} className="deal-card">
			<div className="deal-card__image">
				{product.imageUrl ? (
					<img src={product.imageUrl} alt={product.name} loading="lazy" />
				) : (
					<div className="deal-card__placeholder" aria-hidden="true">
						PS
					</div>
				)}
				{discount != null && (
					<span className="deal-badge">
						{discount}%<br />
						OFF
					</span>
				)}
			</div>
			<div className="deal-card__body">
				<h3>{product.name}</h3>
				<div className="deal-price">
					<strong>{formatUSDMaybe(currentPrice)}</strong>
					{hasDiscount && <del>{formatUSDMaybe(originalPrice)}</del>}
				</div>
				<p>
					{hasDiscount
						? `Save - ${formatUSDMaybe(originalPrice - currentPrice)}`
						: (product.shop?.name ?? "Place Store")}
				</p>
			</div>
		</Link>
	);
};

export default ProductCard;
