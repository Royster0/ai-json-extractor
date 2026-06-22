import { z } from "zod";

// Every response should have the same shape, missing values should be explicit
export const OrderFieldsSchema = z.object({
  orderNumber: z
    .string()
    .nullable()
    .describe(
      "Numeric part of order number. Example: Order-12345 becomes 12345",
    ),

  aep: z
    .string()
    .nullable()
    .describe("The AEP number. Example aep02 or aep-2025-1"),

  acres: z
    .number()
    .nullable()
    .describe("The number of acres in the order, if present"),

  validationStatus: z
    .enum(["Passed", "Failed", "Unknown"])
    .describe("Validation result from the message"),

  submittedAt: z
    .string()
    .nullable()
    .describe(
      "Submitted timestamp in ISO 8601 format if explicitly present, otherwise null",
    ),

  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How confident the model is in the extraction"),

  missingFields: z
    .array(
      z.enum([
        "orderNumber",
        "aep",
        "acres",
        "validationStatus",
        "submittedAt",
      ]),
    )
    .describe("Fields that were missing or could not be confidently extracted"),

  notes: z
    .string()
    .describe("Brief explanation of ambiguity, missing values, or assumptions"),
});

export type OrderFields = z.infer<typeof OrderFieldsSchema>;
