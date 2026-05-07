import Groq from "groq-sdk";

const groq = new Groq({
	apiKey: import.meta.env.VITE_GROQ_API_KEY,
	dangerouslyAllowBrowser: true,
});

export async function prompt(prompt: string) {
	return groq.chat.completions.create({
		messages: [
			{
				role: "user",
				content: prompt,
			},
		],

		model: "openai/gpt-oss-20b",
	});
}
