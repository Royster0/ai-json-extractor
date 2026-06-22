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

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content: `
      You extract structured order data from operational messages.
      Return only valid JSON. Do not include markdown. Do not include explanations outside the JSON.
      The JSON object must have exactly these fields:
      {
        "orderNumber": string | null,
        "aep": string | null,
        "acres": number | null,
        "validationStatus": "Passed" | "Failed" | "Unknown",
        "submittedAt": string | null,
        "confidence": number,
        "missingFields": string[],
        "notes": string
      }
      
      Rules:
      - Order number should only be the numeric part. For example, "Order-12345 becomes 12345". 
      - Return only data supported by the input.
      - Do not invent missing fields.
      - If a field is missing, use null when allowed.
      - If validation status is unclear, use "Unknown".
      - submittedAt must be ISO 8601 only if a timestamp is explicitly present.
      - Confidence must be a number between 0 and 1.
      - missingFields should include any missing or unclear fields.
      - Keep notes brief and do not need to mention successes, only outliers.
      `.trim(),
      },
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from model");
  }

  const json = parseJsonContent(content);
  const extraction = validateExtraction(json);

  return postProcessOrderFields(extraction);
}
