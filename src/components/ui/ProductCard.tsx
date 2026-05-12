import { Link } from "@tanstack/react-router";
import { formatIDRMaybe } from "#/lib/money";
import type { PublicProduct } from "#/section/ProductsHome";

const ProductCard = ({ product }: { product: PublicProduct }) => {
	const base = typeof product.basePrice === "number" ? product.basePrice : null;
	const minSku =
		typeof product.minSkuPrice === "number" ? product.minSkuPrice : null;
	const showStrike =
		base !== null && minSku !== null && Number.isFinite(base) && base > minSku;

	return (
		<Link
			to={`/product/$id`}
			params={{ id: product._id }}
			className="border rounded-2xl py-2 cursor-pointer"
		>
			<div className="flex flex-col items-end">
				<div className="w-12 h-12  rounded-md mr-2"></div>
				{product.imageUrl ? (
					<img
						src={product.imageUrl}
						className="aspect-square w-full mb-8  object-cover"
						loading="lazy"
						alt={product.name}
					/>
				) : (
					<div className="aspect-square w-full mb-8 object-cover bg-slate-200 justify-center flex items-center">
						No image
					</div>
				)}
			</div>
			<div className="flex flex-col items-center px-4">
				<p className="w-full text-center font-semibold text-sm truncate">
					{product.name}
				</p>
				<p className="border-b w-full text-center font-semibold text-xs pb-3 truncate">
					{product.description}
				</p>
				<span className="font-bold text-center my-4 text-md">
					{formatIDRMaybe(product.basePrice)}
				</span>
			</div>
		</Link>
	);
};

export default ProductCard;

// return (
// 		<div className="rounded-xl border overflow-hidden product-card-hover bg-white">
// 			<div className="aspect-square bg-slate-100 overflow-hidden">
// 				{product.imageUrl ? (
// 					// biome-ignore lint/a11y/useAltText: marketplace card
// 					<img src={product.imageUrl} className="h-full w-full object-cover" />
// 				) : (
// 					<div className="h-full w-full flex items-center justify-center text-xs text-slate-400">
// 						No image
// 					</div>
// 				)}
// 			</div>

// 			<div className="p-3 space-y-1">
// 				<Link to="/product/$id" params={{ id: product._id }}>
// 					<p className="font-medium line-clamp-1">{product.name}</p>
// 				</Link>

// 				{typeof product.reviewCount === "number" && product.reviewCount > 0 && (
// 					<div className="flex items-center gap-1 text-xs text-slate-600">
// 						<Star className="h-3.5 w-3.5 fill-current" />
// 						<span className="font-medium">{product.avgRating ?? "-"}</span>
// 						<span className="text-slate-500">({product.reviewCount})</span>
// 					</div>
// 				)}

// 				{minSku !== null ? (
// 					<div className="flex items-baseline gap-2">
// 						<p className="text-sm font-semibold">{formatIDRMaybe(minSku)}</p>
// 						{showStrike && (
// 							<p className="text-xs text-slate-500 line-through">
// 								{formatIDRMaybe(base)}
// 							</p>
// 						)}
// 					</div>
// 				) : (
// 					<p className="text-xs text-slate-500">Price not set</p>
// 				)}

// 				{product.shop ? (
// 					<Link to="/shop/$slug" params={{ slug: product.shop.slug }}>
// 						<p className="text-xs text-slate-500 line-clamp-1">
// 							{product.shop.name}
// 						</p>
// 					</Link>
// 				) : (
// 					<p className="text-xs text-slate-500">Unknown shop</p>
// 				)}

// 				{product.description && (
// 					<p className="text-sm text-slate-600 line-clamp-2">
// 						{product.description}
// 					</p>
// 				)}
// 			</div>
// 		</div>
// 	);
