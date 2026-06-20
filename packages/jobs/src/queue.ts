export type JobStatus = "pending" | "running" | "completed" | "failed"

export type JobHandler<TPayload = unknown> = (
  payload: TPayload,
  attempt: number,
) => Promise<void>

export type RetryOptions = {
  baseDelayMs?: number
  maxAttempts?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function exponentialBackoff(attempt: number, baseDelayMs = 1500) {
  return baseDelayMs * 2 ** (attempt - 1)
}

export async function runWithRetry<TPayload>(
  handler: JobHandler<TPayload>,
  payload: TPayload,
  options: RetryOptions = {},
) {
  const maxAttempts = options.maxAttempts ?? 4
  const baseDelayMs = options.baseDelayMs ?? 1500

  let lastError: Error | undefined
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await handler(payload, attempt)
      return { attempts: attempt, success: true as const }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxAttempts) {
        await sleep(exponentialBackoff(attempt, baseDelayMs))
      }
    }
  }

  return {
    attempts: maxAttempts,
    error: lastError?.message ?? "Unknown job error",
    success: false as const,
  }
}

export async function runInBackground<TPayload>(
  handler: JobHandler<TPayload>,
  payload: TPayload,
  options: RetryOptions & {
    onComplete?: (result: { attempts: number; error?: string; success: boolean }) => void
  } = {},
) {
  setImmediate(async () => {
    const result = await runWithRetry(handler, payload, options)
    options.onComplete?.(result)
  })
}
