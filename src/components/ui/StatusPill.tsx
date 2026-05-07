export const StatusPill = (props: { status: string }) => {
	const cls =
		props.status === "pending"
			? "bg-yellow-100 text-yellow-800"
			: props.status === "processing"
				? "bg-blue-100 text-blue-800"
				: props.status === "shipping"
					? "bg-purple-100 text-purple-800"
					: props.status === "received"
						? "bg-green-100 text-green-800"
						: props.status === "canceled"
							? "bg-red-100 text-red-800"
							: "bg-slate-100 text-slate-700";
	return (
		<span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>
			{props.status}
		</span>
	);
};
