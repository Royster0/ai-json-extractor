import type { OrderFields } from "../schemas/order-fields.js";

export type UploadType = "Field" | "Issaquah" | "Unknown";

export type ProcessedOrderFields = OrderFields & {
  uploadType: UploadType;
};

export function deriveUploadType(aep: string | null): UploadType {
  if (!aep) {
    return "Unknown";
  }

  const formatted = aep.trim().toLowerCase();

  if (formatted.startsWith("aep-2025")) {
    return "Issaquah";
  }

  // regex: must start with aep*some num 0-9*
  if (/^aep\d+/.test(formatted)) {
    return "Field";
  }

  return "Unknown";
}

export function postProcessOrderFields(
  fields: OrderFields,
): ProcessedOrderFields {
  return {
    ...fields,
    uploadType: deriveUploadType(fields.aep),
  };
}
