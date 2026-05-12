/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
import { useQuery } from "convex/react";
import { CategoryItem, CategoryItemSkeleton } from "#/components/ui/CategoryItem";
import { api } from "../../convex/_generated/api";

export const HomeCategories = () => {
	const categories = useQuery(api.categories.listAll);
	return (
		<section className="container mx-auto">
			{categories === undefined ? (
				<div className="category-strip">
					{Array.from({ length: 8 }).map((_, i) => (
						<CategoryItemSkeleton key={i} />
					))}
				</div>
			) : categories.length === 0 ? (
				<p className="text-sm" style={{ color: "var(--sea-ink-soft)" }}>
					No categories yet.
				</p>
			) : (
				<div className="category-strip">
					{categories.map((category) => (
						<CategoryItem key={category._id} category={category} />
					))}
				</div>
			)}
		</section>
	);
};
