import {
  APP_LOCK_HYDRATION_TIMEOUT_MS,
  type AppLockReadResult,
} from "@/features/app-lock/model/app-lock-types"

export async function loadAppLockState(
  read: () => Promise<AppLockReadResult>,
  timeoutMs = APP_LOCK_HYDRATION_TIMEOUT_MS
): Promise<AppLockReadResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      read().catch(
        () =>
          ({
            config: null,
            reason: "storage_unavailable",
            status: "error",
          }) as const
      ),
      new Promise<AppLockReadResult>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve({
              config: null,
              reason: "timeout",
              status: "error",
            }),
          timeoutMs
        )
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
