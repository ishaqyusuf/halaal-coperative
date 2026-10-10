type CheckoutRecord = {
  id: string
  requestedPlanCode:
    | "free_beta"
    | "starter"
    | "standard"
    | "growth"
    | "enterprise"
  status: "pending" | "ready" | "completed" | "expired" | "cancelled" | "failed"
  checkoutUrl: string | null
  expiresAt: Date | null
  requestState?: unknown
}

/** URLs are provider-issued, but still require an explicit deployment allowlist. */
function safeCheckoutUrl(
  value: string | null,
  allowedHosts: readonly string[]
) {
  if (!value || value.length > 4096 || /[\u0000-\u0020]/.test(value))
    return null
  try {
    const url = new URL(value)
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      !allowedHosts.some(
        (host) => host.trim().toLowerCase() === url.hostname.toLowerCase()
      )
    )
      return null
    return url.href
  } catch {
    return null
  }
}

export function presentSubscriptionCheckout(
  intent: CheckoutRecord,
  allowedHosts: readonly string[],
  now = new Date()
) {
  const mobileIntent =
    typeof intent.requestState === "object" &&
    intent.requestState !== null &&
    !Array.isArray(intent.requestState) &&
    "channel" in intent.requestState &&
    intent.requestState.channel === "mobile"
  const isExpired = intent.expiresAt !== null && intent.expiresAt <= now
  const status =
    isExpired && (intent.status === "ready" || intent.status === "pending")
      ? ("expired" as const)
      : intent.status
  const checkoutUrl =
    status === "ready" && !isExpired && !mobileIntent
      ? safeCheckoutUrl(intent.checkoutUrl, allowedHosts)
      : null
  const messages = {
    cancelled: "Checkout was cancelled. No plan change is confirmed.",
    completed: "Checkout is confirmed. Refresh to see the current plan.",
    expired: "This checkout has expired. Request a new checkout to continue.",
    failed:
      "Checkout was not completed. Contact billing support before retrying.",
    pending:
      "Your plan request is recorded. Billing support will contact your cooperative admin.",
    ready: "Checkout is not available. Contact billing support.",
  }
  return {
    checkoutAvailable: checkoutUrl !== null,
    checkoutUrl,
    expiresAt: intent.expiresAt?.toISOString() ?? null,
    intentId: intent.id,
    requestedPlanCode: intent.requestedPlanCode,
    status,
    supportMessage: checkoutUrl
      ? null
      : mobileIntent && status === "ready"
        ? "Manage software plans through the app's Apple or Google subscription screen."
        : messages[status],
  }
}

export function billingCheckoutHosts() {
  return (process.env.HALAALVEST_BILLING_CHECKOUT_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
}
