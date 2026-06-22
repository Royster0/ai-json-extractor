import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const ORDER_EXTRACTION_SYSTEM_PROMPT = `
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
      `.trim();

export function buildOrderExtractionMessages(
  rawText: string,
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: ORDER_EXTRACTION_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `
            Extract order data from the following message:
            ${rawText}
            `.trim(),
    },
  ];
}
