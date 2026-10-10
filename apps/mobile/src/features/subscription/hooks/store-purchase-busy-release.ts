export function createStorePurchaseBusyReleaseGate() {
  let restoring = false
  return {
    beginRestore() {
      restoring = true
    },
    endRestore() {
      restoring = false
    },
    canRelease(verificationInFlight: boolean, callbackPending: boolean) {
      return !restoring && !verificationInFlight && !callbackPending
    },
  }
}
