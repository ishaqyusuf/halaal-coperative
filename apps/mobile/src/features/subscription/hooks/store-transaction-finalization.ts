/** Google acknowledgment is owned by server verification after entitlement application. */
export function shouldFinishNativeStoreTransaction(
  store: "apple" | "google",
  applied: boolean
): boolean {
  return store === "apple" && applied
}
