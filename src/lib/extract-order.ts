import "dotenv/config";
import OpenAI from "openai";
import {
  OrderFieldsSchema,
  type OrderFields,
} from "../schemas/order-fields.js";
import {
  postProcessOrderFields,
  type ProcessedOrderFields,
} from "./post-process.js";
import { buildOrderExtractionMessages } from "./prompts/order-extraction-prompt.js";
import { logInfo } from "./logger.js";
import { withRetry } from "./retry.js";
import { waitForOpenRouterRateLimitSlot } from "./rate-limit.js";
import { getUsageSnapshot } from "./usage.js";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
    "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME ?? "JSON Extractor",
  },
});

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Model did not return a JSON object");
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function validateExtraction(json: unknown): OrderFields {
  const parsed = OrderFieldsSchema.safeParse(json);

  if (!parsed.success) {
    throw new Error(
      "Model returned invalid extraction:\n" + parsed.error.message,
    );
  }

  return parsed.data;
}

export async function extractOrder(
  rawText: string,
): Promise<ProcessedOrderFields> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("Missing OpenRouter API Key in .env");
  }

  const model = process.env.OPENROUTER_MODEL ?? "openrouter/owl-alpha";
  const startedAt = Date.now();

  logInfo("order_extraction_started", {
    model,
    inputCharacters: rawText.length,
  });

  const messages = buildOrderExtractionMessages(rawText);

  const completion = await withRetry(
    "openrouter.chat.completions.create",
    async () => {
      await waitForOpenRouterRateLimitSlot(
        "openrouter.chat.completions.create",
      );

      return client.chat.completions.create({
        model,
        temperature: 0.1,
        max_tokens: 500,
        response_format: {
          type: "json_object",
        },
        messages,
      });
    },
    {
      maxAttempts: 4,
      baseDelayMs: 750,
      maxDelayMs: 8000,
      maxRetryAfterMs: 60_000,
    },
  );

  const usage = getUsageSnapshot(completion.usage);

  logInfo("openrouter_usage", {
    model,
    ...usage,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from model");
  }

  const json = parseJsonContent(content);
  const extraction = validateExtraction(json);
  const processed = postProcessOrderFields(extraction);

  logInfo("order_extraction_completed", {
    model,
    durationMs: Date.now() - startedAt,
    confidence: processed.confidence,
    missingFields: processed.missingFields,
    uploadType: processed.uploadType,
    totalTokens: usage.totalTokens,
    costCredits: usage.costCredits,
  });

  return processed;
}
