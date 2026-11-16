export class RequestTimeoutError extends Error {
  constructor() {
    super("The request timed out.")
    this.name = "RequestTimeoutError"
  }
}

/**
 * Runs `request` with an abort signal and rejects with RequestTimeoutError
 * (aborting the request) when it outlives `ms`. Sign-in and recovery use it
 * so a stalled network never leaves the member on an endless spinner.
 */
export function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
  ms = 20_000
): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new RequestTimeoutError())
    }, ms)
  })
  return Promise.race([request(controller.signal), timeout]).finally(() =>
    clearTimeout(timer)
  )
}
