import { logError, logWarn } from "./logger.js";

type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const DEFAULT_RETRYABLE_STATUS_CODES = new Set([
  408, // Request Timeout
  409, // Conflict
  425, // Too early
  429, // Rate limit
  500, // Internal server error
  502, // Bad gateway
  503, // Service down
  504, // Gateway timeout
]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if (
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function shouldRetry(error: unknown): boolean {
  const status = getErrorStatus(error);

  if (status !== undefined) {
    return DEFAULT_RETRYABLE_STATUS_CODES.has(status);
  }

  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("econnreset") ||
    message.includes("rate limit")
  );
}

function getBackoffDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponentialDelay = baseDelayMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 250);

  return Math.min(exponentialDelay + jitter, maxDelayMs);
}

export async function withRetry<T>(
  operationName: string,
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 500;
  const maxDelayMs = options.maxDelayMs ?? 5000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const retryable = shouldRetry(error);
      const status = getErrorStatus(error);
      const message = getErrorMessage(error);

      if (!retryable || attempt === maxAttempts) {
        logError("operation_failed", {
          operationName,
          attempt,
          maxAttempts,
          retryable,
          status,
          message,
        });

        break;
      }

      const delayMs = getBackoffDelayMs(attempt, baseDelayMs, maxDelayMs);

      logWarn("operation_retrying", {
        operationName,
        attempt,
        maxAttempts,
        retryable,
        status,
        message,
        delayMs,
      });

      await sleep(delayMs);
    }
  }

  throw lastError;
}
