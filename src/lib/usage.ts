export type UsageSnapshot = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  reasoningTokens: number | null;
  cachedPromptTokens: number | null;
  cacheWriteTokens: number | null;
  costCredits: number | null;
  upstreamInferenceCost: number | null;
};

type UsageLike = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
  cost_details?: {
    upstream_inference_cost?: number | null;
  };
};

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getUsageSnapshot(usage: unknown): UsageSnapshot {
  const usageLike = usage as UsageLike | undefined;

  return {
    promptTokens: asNumberOrNull(usageLike?.prompt_tokens),
    completionTokens: asNumberOrNull(usageLike?.completion_tokens),
    totalTokens: asNumberOrNull(usageLike?.total_tokens),
    reasoningTokens: asNumberOrNull(
      usageLike?.completion_tokens_details?.reasoning_tokens,
    ),
    cachedPromptTokens: asNumberOrNull(
      usageLike?.prompt_tokens_details?.cached_tokens,
    ),
    cacheWriteTokens: asNumberOrNull(
      usageLike?.prompt_tokens_details?.cache_write_tokens,
    ),
    costCredits: asNumberOrNull(usageLike?.cost),
    upstreamInferenceCost: asNumberOrNull(
      usageLike?.cost_details?.upstream_inference_cost,
    ),
  };
}
