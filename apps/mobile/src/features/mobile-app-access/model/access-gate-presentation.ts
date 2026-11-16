import type { MobileAppAccessSnapshot } from "@/features/mobile-app-access/api/mobile-app-access-api"

export type AccessGateTone = "neutral" | "warm" | "danger" | "ok"

export type AccessGateState =
  | "checking"
  | "error"
  | "pending"
  | "not_requested"
  | "expired"
  | "revoked"
  | "rejected"
  | "staff_off"

export type AccessGatePresentation = {
  body: string
  chip: { busy?: boolean; icon: string; label: string; tone: AccessGateTone }
  state: AccessGateState
  title: string
}

export const ACCESS_GATE_PREVIEW_STATES: readonly AccessGateState[] = [
  "checking",
  "error",
  "pending",
  "not_requested",
  "expired",
  "revoked",
  "rejected",
  "staff_off",
]

/**
 * Which access gate a signed-in user without app access sees (T03, 02 Brand
 * hero). Staff (admin workspace) are allowed only when the cooperative has the
 * app on, so a refused staff snapshot means the cooperative's app is off.
 * A failed check never shows a status it cannot know.
 */
export function resolveAccessGateState(input: {
  checking: boolean
  error: boolean
  role: "member" | "admin" | null
  status: MobileAppAccessSnapshot["status"] | null
}): AccessGateState {
  if (input.checking && !input.status) return "checking"
  if (input.error || !input.status) return "error"
  if (input.role === "admin") return "staff_off"
  if (input.status === "active") return "not_requested"
  return input.status
}

/**
 * Gate copy. Owner rule (ADR-20261116-mobile-no-subscription-copy): the app is
 * a free companion. It never mentions a price, plan, term, renewal or
 * subscription, and never says where access is bought or turned on. Access is
 * the cooperative's decision; the app only reports the state and offers Refresh.
 */
export function projectAccessGate(
  state: AccessGateState,
  cooperativeName: string
): AccessGatePresentation {
  // The hero already names the cooperative; the body says "your cooperative" so long names aren't repeated.
  const manages = "Your cooperative manages who can use the HalaalVest app."
  switch (state) {
    case "checking":
      return {
        body: "Confirming your access with your cooperative.",
        chip: { busy: true, icon: "RefreshCw", label: "Checking", tone: "neutral" },
        state,
        title: "Checking your access…",
      }
    case "error":
      return {
        body: "Try again when you’re online. Your saved session stays locked until your access is confirmed.",
        chip: { icon: "WifiOff", label: "Offline", tone: "warm" },
        state,
        title: "We couldn’t check your access",
      }
    case "pending":
      return {
        body: "Your cooperative is reviewing your access. HalaalVest opens here as soon as it’s approved.",
        chip: { icon: "Clock", label: "Pending review", tone: "warm" },
        state,
        title: "Your access is being reviewed",
      }
    case "not_requested":
      return {
        body: `${manages} Once your access is on, tap Refresh access.`,
        chip: { icon: "Smartphone", label: "Not on yet", tone: "neutral" },
        state,
        title: "The app isn’t on for your account",
      }
    case "expired":
      return {
        body: `${manages} When your access is active again, tap Refresh access.`,
        chip: { icon: "Smartphone", label: "Not active", tone: "neutral" },
        state,
        title: "Your app access isn’t active",
      }
    case "revoked":
      return {
        body: `App access is off for your account. ${manages} When it’s back on, tap Refresh access.`,
        chip: { icon: "Ban", label: "Turned off", tone: "danger" },
        state,
        title: "App access is turned off",
      }
    case "rejected":
      return {
        body: `Your cooperative didn’t approve app access for your account. Contact ${cooperativeName} for details.`,
        chip: { icon: "CircleX", label: "Not approved", tone: "danger" },
        state,
        title: "Your access wasn’t approved",
      }
    case "staff_off":
      return {
        body: "The HalaalVest app isn’t on for your cooperative yet, so members and staff can’t use it. Ask one of its owners about app access.",
        chip: { icon: "Ban", label: "App off", tone: "neutral" },
        state,
        title: "Your cooperative hasn’t turned on the app",
      }
  }
}

export function resolveAccessGatePreview(
  value: string | string[] | undefined,
  isDevelopment: boolean
): AccessGateState | null {
  if (!isDevelopment || typeof value !== "string") return null
  return (ACCESS_GATE_PREVIEW_STATES as readonly string[]).includes(value)
    ? (value as AccessGateState)
    : null
}
