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
  /** Where to turn access on, shown as the web-path card. No price or link: the app never sells access. */
  web: { path: string; title: string } | null
}

const WEB_PATH = "Web dashboard › Mobile access"

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

export function projectAccessGate(
  state: AccessGateState,
  cooperativeName: string
): AccessGatePresentation {
  switch (state) {
    case "checking":
      return {
        body: `Confirming mobile access with ${cooperativeName}.`,
        chip: { busy: true, icon: "RefreshCw", label: "Checking", tone: "neutral" },
        state,
        title: "Checking your access…",
        web: null,
      }
    case "error":
      return {
        body: "Try again when you’re online. Your saved session stays locked until your access is confirmed.",
        chip: { icon: "WifiOff", label: "Offline", tone: "warm" },
        state,
        title: "We couldn’t check your access",
        web: null,
      }
    case "pending":
      return {
        body: "Your cooperative is reviewing your request. HalaalVest opens here as soon as it’s approved.",
        chip: { icon: "Clock", label: "Pending review", tone: "warm" },
        state,
        title: "Your request is being reviewed",
        web: null,
      }
    case "not_requested":
      return {
        body: "Mobile access isn’t on for your membership yet. Turn it on from your web dashboard, then refresh here.",
        chip: { icon: "Smartphone", label: "Not turned on", tone: "neutral" },
        state,
        title: "Turn on the HalaalVest app",
        web: { path: WEB_PATH, title: "Turn it on from the web" },
      }
    case "expired":
      return {
        body: "Your mobile access term has ended. Renew it from your web dashboard, then refresh here.",
        chip: { icon: "CalendarClock", label: "Expired", tone: "warm" },
        state,
        title: "Your app access has ended",
        web: { path: WEB_PATH, title: "Renew it from the web" },
      }
    case "revoked":
      return {
        body: `Mobile access is turned off for your membership. If you turned it off, turn it back on from your web dashboard. Otherwise contact ${cooperativeName}.`,
        chip: { icon: "Ban", label: "Turned off", tone: "danger" },
        state,
        title: "App access is turned off",
        web: { path: WEB_PATH, title: "Turn it back on from the web" },
      }
    case "rejected":
      return {
        body: `Your cooperative didn’t approve mobile access for your membership. Contact ${cooperativeName} for details, or turn it on again from your web dashboard.`,
        chip: { icon: "CircleX", label: "Not approved", tone: "danger" },
        state,
        title: "Your request wasn’t approved",
        web: { path: WEB_PATH, title: "Turn it on again from the web" },
      }
    case "staff_off":
      return {
        body: `Mobile access is off for ${cooperativeName}, so members and staff can’t use the app yet. An owner can turn it on from the web dashboard.`,
        chip: { icon: "Ban", label: "App off", tone: "neutral" },
        state,
        title: "Your cooperative hasn’t turned on the app",
        web: { path: WEB_PATH, title: "Owners turn it on from the web" },
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
