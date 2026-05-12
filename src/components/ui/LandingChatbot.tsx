import { MessageSquare, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { type ChatMessage, chat } from "#/lib/groq";

type UiMessage = ChatMessage & { id: string };

function uid() {
	return `${Date.now().toString(16)}:${Math.random().toString(16).slice(2)}`;
}

export default function LandingChatbot() {
	const [open, setOpen] = useState(false);
	const [input, setInput] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [messages, setMessages] = useState<UiMessage[]>(() => [
		{
			id: uid(),
			role: "assistant",
			content:
				"Hello! I am Place Store's assistant. What can I help you with?",
		},
	]);

	const listRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		if (!open) return;
		listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
	}, [open]);

	const system: ChatMessage = useMemo(
		() => ({
			role: "system",
			content:
				"Kamu adalah asisten belanja untuk Place Store. Jawab singkat, jelas, ramahJika user belum jelas, tanya 1-2 pertanyaan klarifikasi. Jangan mengarang info stok/harga; sarankan user membuka detail produk untuk memastikan.",
		}),
		[],
	);

	const send = async () => {
		const text = input.trim();
		if (!text || isSending) return;
		setInput("");

		const userMsg: UiMessage = { id: uid(), role: "user", content: text };
		setMessages((prev) => [...prev, userMsg]);

		try {
			setIsSending(true);
			const recent = [...messages, userMsg]
				.filter((m) => m.role !== "system")
				.slice(-12)
				.map(({ role, content }) => ({ role, content }) as ChatMessage);

			const res = await chat([system, ...recent]);
			const content =
				res.choices?.[0]?.message?.content?.trim() ||
				"Sorry, I'm having trouble understanding your message. Please try again.";

			setMessages((prev) => [
				...prev,
				{ id: uid(), role: "assistant", content },
			]);
		} catch (err) {
			console.error("Chatbot error:", err);
			setMessages((prev) => [
				...prev,
				{
					id: uid(),
					role: "assistant",
					content: "Sorry, I'm having trouble understanding your message. Please try again.",
				},
			]);
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="fixed bottom-6 right-4 z-50 flex flex-col items-end">
			{open && (
				<div className="mb-3 w-[92vw] max-w-sm overflow-hidden rounded-2xl border bg-white shadow-xl dark:bg-slate-950">
					<div className="flex items-center justify-between border-b px-4 py-3">
						<p className="text-sm font-semibold">Chatbot</p>
						<button
							type="button"
							className="text-xs text-slate-600 hover:underline dark:text-slate-300"
							onClick={() => setOpen(false)}
						>
							Tutup
						</button>
					</div>

					<div
						ref={listRef}
						className="h-[50vh] space-y-2 overflow-auto px-3 py-3"
					>
						{messages.map((m) => (
							<div
								key={m.id}
								className={
									m.role === "user" ? "flex justify-end" : "flex justify-start"
								}
							>
								<div
									className={
										m.role === "user"
											? "max-w-[85%] rounded-2xl bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900"
											: "max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100"
									}
								>
									{m.content}
								</div>
							</div>
						))}
					</div>

					<form
						className="flex items-center gap-2 border-t p-3"
						onSubmit={(e) => {
							e.preventDefault();
							void send();
						}}
					>
						<input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							placeholder="Tanya sesuatu..."
							className="h-10 flex-1 rounded-xl border px-3 text-sm dark:bg-slate-950"
							maxLength={600}
						/>
						<button
							type="submit"
							disabled={!input.trim() || isSending}
							className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900"
						>
							{isSending ? "..." : "Send"}
						</button>
					</form>
				</div>
			)}

			<button
				type="button"
				className="rounded-full bg-slate-900 p-3 w-fit text-sm font-semibold text-white shadow-lg dark:bg-slate-100 dark:text-slate-900 cursor-pointer"
				onClick={() => setOpen((v) => !v)}
				aria-label="Open chatbot"
			>
				{open ? <X /> : <MessageSquare />}
			</button>
		</div>
	);
}
