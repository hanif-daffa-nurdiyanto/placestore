import { Link } from "@tanstack/react-router";

interface CategoryItemProps {
	category: {
		_id: string;
		name: string;
		imageUrl?: string | null;
	};
}

export const CategoryItem = ({ category }: CategoryItemProps) => {
	return (
		<Link
			to="/explore"
			search={{ categoryId: category._id }}
			className="flex flex-col items-center gap-y-2 hover:scale-95 transition-all duration-1000 ease-in-out"
		>
			<div className="rounded-full border-[2.5px] p-0.5">
				{category.imageUrl ? (
					<img
						src={category.imageUrl}
						alt={category.name}
						className="object-cover rounded-full w-32 h-32"
						loading="lazy"
					/>
				) : (
					<span
						className="text-xs"
						style={{
							color: "var(--sea-ink-soft)",
						}}
					>
						{category.name.charAt(0)}
					</span>
				)}
			</div>
			<span className="font-bold">{category.name}</span>
		</Link>
	);
};

export const CategoryItemSkeleton = () => {
  return (
    <div className="flex flex-col items-center gap-y-2">
      <div className="rounded-full border-[2.5px] p-0.5">
        <div className="h-32 w-32 rounded-full bg-slate-100" />
      </div>
      <div className="h-4 w-24 rounded bg-slate-100" />
    </div>
  );
};
