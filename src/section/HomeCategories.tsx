/** biome-ignore-all lint/suspicious/noArrayIndexKey: static skeleton list */
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ArrowRight } from "lucide-react";
import {
	CategoryItem,
	CategoryItemSkeleton,
} from "#/components/ui/CategoryItem";
import { api } from "../../convex/_generated/api";

export const HomeCategories = () => {
	const categories = useQuery(api.categories.listAll);

	return (
		<section className="mega-section mega-container">
			<div className="mega-section-heading">
				<h2>
					Shop From <span>Top Categories</span>
				</h2>
				<Link to="/explore">
					View All <ArrowRight />
				</Link>
			</div>
			{categories === undefined ? (
				<div className="category-strip">
					{Array.from({ length: 7 }).map((_, i) => (
						<CategoryItemSkeleton key={i} />
					))}
				</div>
			) : categories.length === 0 ? (
				<div className="mega-empty-state">
					Categories will appear here once they are added.
				</div>
			) : (
				<div className="category-strip">
					{categories.slice(0, 8).map((category) => (
						<CategoryItem key={category._id} category={category} />
					))}
				</div>
			)}
		</section>
	);
};
