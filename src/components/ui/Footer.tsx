import { Link } from "@tanstack/react-router";
import { Github, Instagram, Mail } from "lucide-react";

export function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer className="border-t bg-white">
			<div className="container mx-auto grid gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
				<div className="space-y-3">
					<Link to="/" className="inline-flex items-center gap-2">
						<span className="text-lg font-semibold tracking-tight">
							Place Store
						</span>
					</Link>
					<p className="text-sm text-slate-600">
						Discover your favorite products, checkout fast, and manage your shop in
						one place.
					</p>
				</div>

				<div className="space-y-3">
					<p className="text-sm font-semibold">Explore</p>
					<ul className="space-y-2 text-sm text-slate-600">
						<li>
							<Link to="/" className="hover:underline hover:underline-offset-4">
								Home
							</Link>
						</li>
						<li>
							<Link
								to="/cart"
								className="hover:underline hover:underline-offset-4"
							>
								Cart
							</Link>
						</li>
						<li>
							<Link
								to="/user/account/profile"
								className="hover:underline hover:underline-offset-4"
							>
								My Orders
							</Link>
						</li>
					</ul>
				</div>

				<div className="space-y-3">
					<p className="text-sm font-semibold">Sellers</p>
					<ul className="space-y-2 text-sm text-slate-600">
						<li>
							<Link
								to="/shop/new"
								className="hover:underline hover:underline-offset-4"
							>
								Create Shop
							</Link>
						</li>
						<li>
							<Link
								to="/shop/admin/dashboard"
								className="hover:underline hover:underline-offset-4"
							>
								Shop Dashboard
							</Link>
						</li>
					</ul>
				</div>

				<div className="space-y-3">
					<p className="text-sm font-semibold">Contact</p>
					<ul className="space-y-2 text-sm text-slate-600">
						<li className="flex items-center gap-2">
							<Mail className="h-4 w-4" />
							<a
								href="mailto:hello@placestore.local"
								className="hover:underline hover:underline-offset-4"
							>
								hello@placestore.local
							</a>
						</li>
						<li className="flex items-center gap-2">
							<Instagram className="h-4 w-4" />
							<a
								href="#"
								className="hover:underline hover:underline-offset-4"
							>
								Instagram
							</a>
						</li>
						<li className="flex items-center gap-2">
							<Github className="h-4 w-4" />
							<a
								href="#"
								className="hover:underline hover:underline-offset-4"
							>
								GitHub
							</a>
						</li>
					</ul>
				</div>
			</div>

			<div className="border-t">
				<div className="container mx-auto flex flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
					<p>© {year} Place Store. All rights reserved.</p>
					<div className="flex gap-4">
						<a href="#" className="hover:underline hover:underline-offset-4">
							Privacy
						</a>
						<a href="#" className="hover:underline hover:underline-offset-4">
							Terms
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
