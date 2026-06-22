import { logWarn } from "./logger.js";

type HeaderLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined;

let nextAllowedRequestAt = 0;

function getHeadersFromError(error: unknown): HeaderLike {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("headers" in error) {
    return error.headers as HeaderLike;
  }

  if (
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "headers" in error.response
  ) {
    return error.response.headers as HeaderLike;
  }

  return undefined;
}

function getHeaderValue(headers: HeaderLike, name: string): string | undefined {
  if (!headers) return undefined;

  const lowerName = name.toLowerCase();

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lowerName) continue;

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }

  return undefined;
}

function parseRetryAfterMs(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const dateMs = Date.parse(value);

  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

export function getRetryAfterDelayMs(error: unknown): number | undefined {
  const headers = getHeadersFromError(error);
  const retryAfter = getHeaderValue(headers, "retry-after");

  return parseRetryAfterMs(retryAfter);
}

export function getRateLimitMetadata(error: unknown) {
  const headers = getHeadersFromError(error);

  return {
    retryAfter: getHeaderValue(headers, "retry-after"),
    rateLimitLimit: getHeaderValue(headers, "x-ratelimit-limit"),
    rateLimitRemaining: getHeaderValue(headers, "x-ratelimit-remaining"),
    rateLimitReset: getHeaderValue(headers, "x-ratelimit-reset"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMinRequestIntervalMs(): number {
  const rawValue = process.env.OPENROUTER_MIN_REQUEST_INTERVAL_MS;
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

export async function waitForOpenRouterRateLimitSlot(
  operationName: string,
): Promise<void> {
  const minIntervalMs = getMinRequestIntervalMs();

  if (minIntervalMs <= 0) {
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(0, nextAllowedRequestAt - now);

  if (waitMs > 0) {
    logWarn("client_rate_limit_waiting", {
      operationName,
      waitMs,
      minIntervalMs,
    });

    await sleep(waitMs);
  }

  nextAllowedRequestAt = Date.now() + minIntervalMs;
}
