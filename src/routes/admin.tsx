import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isAdminAuthed, setAdminAuthed } from "#/lib/adminAuth";
import { pageTitle } from "#/lib/seo";

export const Route = createFileRoute("/admin")({
	head: () => ({
		meta: [{ title: pageTitle("Admin") }],
	}),
	component: AdminRoute,
});

function AdminRoute() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isIndex = pathname === "/admin" || pathname === "/admin/";

	if (!isIndex) return <Outlet />;
	return <AdminLoginPage />;
}

function AdminLoginPage() {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (isAdminAuthed()) void navigate({ to: "/admin/dashboard" });
	}, [navigate]);

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		const ok = username === "Admin" && password === "Admin123";
		if (!ok) {
			setError("Incorrect username or password");
			return;
		}
		setAdminAuthed(true);
		await navigate({ to: "/admin/dashboard" });
	};

	return (
		<div className="min-h-screen bg-white flex items-center justify-center px-4">
			<div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
				<h1 className="text-xl font-semibold">Admin Login</h1>
				<p className="mt-1 text-sm text-slate-500">
					Login for accessing admin dashboard
				</p>

				<form onSubmit={onSubmit} className="mt-6 space-y-4">
					<div>
						<label className="block text-sm font-medium">Username</label>
						<input
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="mt-1 w-full rounded-xl border px-4 py-3"
							placeholder="Admin"
							autoComplete="username"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium">Password</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="mt-1 w-full rounded-xl border px-4 py-3"
							placeholder="••••••••"
							autoComplete="current-password"
						/>
					</div>

					{error && (
						<p className="text-sm text-red-600" role="alert">
							{error}
						</p>
					)}

					<button
						type="submit"
						className="w-full rounded-xl bg-black px-4 py-3 text-white"
					>
						Login
					</button>

					<button
						type="button"
						className="w-full rounded-xl border px-4 py-3"
						onClick={() => {
							setUsername("Admin");
							setPassword("Admin123");
						}}
					>
						Autofill
					</button>
				</form>
			</div>
		</div>
	);
}
