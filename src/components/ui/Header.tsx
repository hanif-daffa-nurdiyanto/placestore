import { Show, UserButton } from "@clerk/tanstack-react-start";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	BadgePercent,
	ChevronDown,
	CircleUserRound,
	MapPin,
	Menu,
	Search,
	ShoppingCart,
	Store,
	Truck,
} from "lucide-react";
import { useState } from "react";
import { useCart } from "#/lib/cart";
import { api } from "../../../convex/_generated/api";

export const Header = () => {
	const { totalItems } = useCart();
	const navigate = useNavigate();
	const location = useLocation();
	const categories = useQuery(api.categories.listAll);
	const [q, setQ] = useState("");
	const locationSearch = location.search as { categoryId?: unknown };
	const activeCategoryId =
		location.pathname === "/explore" &&
		typeof locationSearch.categoryId === "string"
			? locationSearch.categoryId
			: null;

	const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const query = q.trim();
		void navigate({ to: "/explore", search: query ? { q: query } : {} });
	};

	return (
		<header className="mega-header">
			<div className="mega-topbar">
				<div className="mega-container flex items-center justify-between">
					<p>Welcome to worldwide Place Store!</p>
					<div className="hidden items-center divide-x divide-slate-200 sm:flex">
						<span>
							<MapPin /> Deliver to <strong>423651</strong>
						</span>
						<span>
							<Truck /> Track your order
						</span>
						<span>
							<BadgePercent /> All Offers
						</span>
					</div>
				</div>
			</div>

			<div className="mega-container mega-mainnav">
				<Link to="/" className="mega-brand" aria-label="Place Store home">
					<span className="mega-menu-mark">
						<Menu />
					</span>
					<span>
						Place<span>Store</span>
					</span>
				</Link>

				<form className="mega-search" onSubmit={submitSearch}>
					<Search aria-hidden="true" />
					<input
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder="Search essentials, groceries and more..."
						aria-label="Search products"
					/>
					<button type="submit" aria-label="Submit search">
						<Menu />
					</button>
				</form>

				<nav className="mega-actions" aria-label="Account navigation">
					<Show when="signed-in">
						<Link
							to="/shop/admin/dashboard"
							className="mega-action"
							aria-label="Shop dashboard"
						>
							<Store /> <span className="hidden xl:inline">My Shop</span>
						</Link>
						<UserButton>
							<UserButton.MenuItems>
								<UserButton.Link
									href="/user/account/profile"
									label="My Orders"
									labelIcon={<Truck className="h-4 w-4" />}
								/>
							</UserButton.MenuItems>
						</UserButton>
					</Show>
					<Show when="signed-out">
						<Link
							to="/sign-up"
							search={{ redirect_url: undefined }}
							className="mega-action"
						>
							<CircleUserRound /> <span>Sign Up/Sign In</span>
						</Link>
					</Show>
					<Link to="/cart" className="mega-action mega-cart">
						<ShoppingCart /> <span>Cart</span>
						{totalItems > 0 && <b>{totalItems > 99 ? "99+" : totalItems}</b>}
					</Link>
				</nav>
			</div>

			<div className="mega-mobile-search">
				<form className="mega-search" onSubmit={submitSearch}>
					<Search aria-hidden="true" />
					<input
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder="Search products..."
						aria-label="Search products"
					/>
					<button type="submit" aria-label="Submit search">
						<Menu />
					</button>
				</form>
			</div>

			{categories && categories.length > 0 && (
				<nav className="mega-category-nav" aria-label="Product categories">
					<div className="mega-container mega-category-row">
						<Link
							to="/explore"
							className={`mega-category-pill${activeCategoryId ? "" : " is-active"}`}
						>
							All Categories <ChevronDown />
						</Link>
						{categories.slice(0, 8).map((category) => (
							<Link
								key={category._id}
								to="/explore"
								search={{ categoryId: category._id }}
								className={`mega-category-pill${
									activeCategoryId === String(category._id) ? " is-active" : ""
								}`}
							>
								{category.name}
								<ChevronDown />
							</Link>
						))}
					</div>
				</nav>
			)}
		</header>
	);
};
