type MobileSessionInvalidationHandler = () => Promise<void> | void

type MobileSessionStateClearer = () => Promise<void> | void

let invalidationHandler: MobileSessionInvalidationHandler | null = null
let localSecurityClearer: MobileSessionStateClearer | null = null
let invalidationScheduled = false

export async function clearInvalidatedMobileSessionState(input: {
  clearDrafts: MobileSessionStateClearer
  clearFiles: MobileSessionStateClearer
  clearReads: MobileSessionStateClearer
  clearSession: MobileSessionStateClearer
  clearDeviceId: MobileSessionStateClearer
}) {
  // Launcher cooperative shortcuts belong to the phone, not the session, so
  // invalidation leaves them alone (ADR-20261118).
  await Promise.all([
    input.clearSession(),
    input.clearDrafts(),
    input.clearFiles(),
    input.clearReads(),
    localSecurityClearer?.(),
    input.clearDeviceId(),
  ])
}

export function registerMobileLocalSecurityClearer(
  clearer: MobileSessionStateClearer
) {
  localSecurityClearer = clearer

  return () => {
    if (localSecurityClearer === clearer) localSecurityClearer = null
  }
}

export function shouldInvalidateUnauthorizedMobileSession(input: {
  currentToken: string | null
  requestToken: string | null
  responseStatus: number
}) {
  return Boolean(
    input.responseStatus === 401 &&
    input.requestToken &&
    input.currentToken === input.requestToken
  )
}

export function registerMobileSessionInvalidationHandler(
  handler: MobileSessionInvalidationHandler
) {
  invalidationHandler = handler

  return () => {
    if (invalidationHandler === handler) invalidationHandler = null
  }
}

export function notifyMobileSessionUnauthorized() {
  if (!invalidationHandler || invalidationScheduled) return

  invalidationScheduled = true
  queueMicrotask(() => {
    invalidationScheduled = false
    void invalidationHandler?.()
  })
}
