import {
  classifyError,
  toPublicError,
  type PublicError,
} from "@halaalvest/errors"

export type JobStatus = "pending" | "running" | "completed" | "failed"

export type JobHandler<TPayload = unknown> = (
  payload: TPayload,
  attempt: number
) => Promise<void>

export type RetryOptions = {
  baseDelayMs?: number
  maxAttempts?: number
}

export type JobResult =
  | { attempts: number; success: true }
  | { attempts: number; error: PublicError; success: false }

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function exponentialBackoff(attempt: number, baseDelayMs = 1500) {
  return baseDelayMs * 2 ** (attempt - 1)
}

export async function runWithRetry<TPayload>(
  handler: JobHandler<TPayload>,
  payload: TPayload,
  options: RetryOptions = {}
) {
  const maxAttempts = options.maxAttempts ?? 4
  const baseDelayMs = options.baseDelayMs ?? 1500

  let lastError: unknown
  let attempts = 0
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    attempts = attempt
    try {
      await handler(payload, attempt)
      return { attempts: attempt, success: true as const }
    } catch (error) {
      lastError = error
      const classified = classifyError(error, { operation: "job.run" })
      if (attempt < maxAttempts && classified.retryable) {
        await sleep(exponentialBackoff(attempt, baseDelayMs))
        continue
      }

      break
    }
  }

  return {
    attempts,
    error: toPublicError(lastError, { operation: "job.run" }),
    success: false as const,
  }
}

export async function runInBackground<TPayload>(
  handler: JobHandler<TPayload>,
  payload: TPayload,
  options: RetryOptions & {
    onComplete?: (result: JobResult) => void
  } = {}
) {
  setImmediate(async () => {
    const result = await runWithRetry(handler, payload, options)
    options.onComplete?.(result)
  })
}
