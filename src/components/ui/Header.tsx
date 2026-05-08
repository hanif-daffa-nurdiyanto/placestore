import { Show, UserButton } from "@clerk/tanstack-react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingCart, Store, Truck } from "lucide-react";
import { useState } from "react";
import { useCart } from "#/lib/cart";

export const Header = () => {
	const { totalItems } = useCart();
	const navigate = useNavigate();
	const [q, setQ] = useState("");
	return (
		<header className="flex flex-col">
			<div className="container mx-auto flex justify-between items-center py-6">
				<Link to="/">
					<h1 className="text-xl font-semibold">Place Store</h1>
				</Link>

				<form
					className="hidden md:flex items-center gap-2 w-full max-w-xl px-4"
					onSubmit={(e) => {
						e.preventDefault();
						const query = q.trim();
						void navigate({
							to: "/explore",
							search: query ? { q: query } : {},
						});
					}}
				>
					<input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="w-full rounded-l-xl border px-4 py-2 text-sm"
						placeholder="Search products…"
					/>
					<button
						type="submit"
						className="cursor-pointer rounded-r-xl bg-black px-4 py-2 text-sm text-white"
					>
						<Search />
					</button>
				</form>

				<div className="flex gap-4 items-center">
					<Link to="/explore" className="hidden sm:inline text-sm text-slate-700">
						Explore
					</Link>
					<Link to="/cart" className="relative p-2">
						<ShoppingCart />
						{totalItems > 0 && (
							<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[10px] leading-5 text-center">
								{totalItems > 99 ? "99+" : totalItems}
							</span>
						)}
					</Link>
					<Show when="signed-in">
						<Link to="/shop/admin/dashboard" className="p-2 text-black!">
							<Store />
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
							to="/sign-in"
							search={{ redirect_url: undefined }}
							className="p-2"
						>
							<p className="text-sm cursor-pointer">Sign In</p>
						</Link>
						<Link
							to="/sign-up"
							search={{ redirect_url: undefined }}
							className="cursor-pointer rounded-md bg-black px-4 py-2 text-sm text-white hover:text-white!"
						>
							Join Us
						</Link>
					</Show>
				</div>
			</div>
			<form
					className="flex md:hidden items-center gap-2 w-full px-8 mb-4"
					onSubmit={(e) => {
						e.preventDefault();
						const query = q.trim();
						void navigate({
							to: "/explore",
							search: query ? { q: query } : {},
						});
					}}
				>
					<input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="w-full rounded-l-xl border px-4 py-2 text-sm"
						placeholder="Search products…"
					/>
					<button
						type="submit"
						className="cursor-pointer rounded-r-xl bg-black px-4 py-2 text-sm text-white"
					>
						<Search />
					</button>
				</form>
		</header>
	);
};
