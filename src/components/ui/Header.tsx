import { Show, UserButton } from "@clerk/tanstack-react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { CircleUserRound, Search, ShoppingCart, Store, Truck } from "lucide-react";
import { useState } from "react";
import { useCart } from "#/lib/cart";

export const Header = () => {
	const { totalItems } = useCart();
	const navigate = useNavigate();
	const [q, setQ] = useState("");
	return (
		<header className="flex flex-col border-b">
			<div className="container mx-auto flex justify-between items-center py-3">
				<div className="flex justify-between items-center flex-2">
					<Link to="/">
						<h1 className="text-xl font-semibold">Place Store</h1>
					</Link>

					<form
						className="hidden md:flex items-center gap-2 w-full max-w-xl px-4 bg-blue-50 rounded-full"
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
							className="w-full  px-4 py-4 text-sm outline-none "
							placeholder="Search products…"
						/>
						<button
							type="submit"
							className="cursor-pointer text-blue-500"
						>
							<Search className="w-6 h-6"/>
						</button>
					</form>
				</div>

				<div className="flex gap-4 items-center flex-1 justify-end">
					<Link to="/cart" className="relative cursor-pointer flex gap-3 rounded-full hover:bg-blue-200 px-4 py-2">
						<ShoppingCart />Cart
						{totalItems > 0 && (
							<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-400 text-white text-[10px] leading-5 text-center">
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
						{/* <Link
							to="/sign-in"
							search={{ redirect_url: undefined }}
							className="p-2"
						>
							<p className="text-sm cursor-pointer">Sign In</p>
						</Link> */}
						<Link
							to="/sign-up"
							search={{ redirect_url: undefined }}
							className="cursor-pointer flex gap-3 rounded-full hover:bg-blue-200 px-4 py-2"
						>
							<CircleUserRound/>JoinUs 
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
