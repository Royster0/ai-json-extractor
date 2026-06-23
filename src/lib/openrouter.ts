import OpenAI from "openai";

export const openRouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME ?? "JSON Extractor",
  },
});

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL ?? "openrouter/owl-alpha";
}
