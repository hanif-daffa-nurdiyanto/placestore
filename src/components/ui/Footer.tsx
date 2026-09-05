import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
	const year = new Date().getFullYear();
	return (
		<footer className="mega-footer">
			<div className="mega-container mega-footer-grid">
				<div className="mega-footer-brand">
					<Link to="/">
						Place<span>Store</span>
					</Link>
					<h3>Contact Us</h3>
					<p>
						<Phone />{" "}
						<span>
							Call Us
							<br />
							<strong>+62 812-3456-7890</strong>
						</span>
					</p>
					<p>
						<Mail />{" "}
						<span>
							Email Us
							<br />
							<strong>hello@placestore.local</strong>
						</span>
					</p>
				</div>
				<div>
					<h3>Most Popular Categories</h3>
					<ul>
						<li>
							<Link to="/explore">All Products</Link>
						</li>
						<li>
							<Link to="/explore">New Arrivals</Link>
						</li>
						<li>
							<Link to="/explore">Daily Essentials</Link>
						</li>
						<li>
							<Link to="/explore">Top Deals</Link>
						</li>
						<li>
							<Link to="/explore">Local Stores</Link>
						</li>
					</ul>
				</div>
				<div>
					<h3>Customer Services</h3>
					<ul>
						<li>
							<Link to="/">About Us</Link>
						</li>
						<li>
							<Link to="/cart">Your Cart</Link>
						</li>
						<li>
							<Link to="/user/account/profile" search={{ tab: "orders" }}>
								My Orders
							</Link>
						</li>
						<li>
							<Link to="/shop/new">Start Selling</Link>
						</li>
						<li>
							<a href="mailto:hello@placestore.local">Contact</a>
						</li>
					</ul>
				</div>
				<div className="mega-footer-note">
					<MapPin />
					<h3>
						Shop local,
						<br />
						from anywhere.
					</h3>
					<p>Everything you need in one simple marketplace.</p>
				</div>
			</div>
			<div className="mega-container mega-footer-bottom">
				<p>© {year} Place Store. All rights reserved.</p>
				<span>
					<a href="#privacy">Privacy Policy</a>
					<a href="#terms">Terms &amp; Conditions</a>
				</span>
			</div>
		</footer>
	);
}
