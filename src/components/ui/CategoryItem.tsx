import { Link } from "@tanstack/react-router";

interface CategoryItemProps {
	category: { _id: string; name: string; imageUrl?: string | null };
}

export const CategoryItem = ({ category }: CategoryItemProps) => (
	<Link
		to="/explore"
		search={{ categoryId: category._id }}
		className="category-chip"
	>
		<span className="category-chip__icon">
			{category.imageUrl ? (
				<img src={category.imageUrl} alt="" loading="lazy" />
			) : (
				<span className="category-placeholder" aria-hidden="true">
					{category.name.charAt(0)}
				</span>
			)}
		</span>
		<span className="category-chip__label">{category.name}</span>
	</Link>
);

export const CategoryItemSkeleton = () => (
	<div className="category-chip" aria-hidden="true">
		<div className="category-chip__icon animate-pulse bg-slate-100" />
		<div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
	</div>
);
