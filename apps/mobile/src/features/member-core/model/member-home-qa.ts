import type { MobileMemberHome } from "./member-core-types"

/**
 * Development-only QA states for member home device screenshots:
 * `halaalvest-dev:///?qaState=loading|error|offline|stale|refresh-error|new|noprofile|attention`.
 * The route controller applies them only in `__DEV__` builds.
 */
export const memberHomeQaStates = [
  "attention",
  "error",
  "loading",
  "new",
  "noprofile",
  "offline",
  "refresh-error",
  "stale",
] as const

export type MemberHomeQaState = (typeof memberHomeQaStates)[number]

export function parseMemberHomeQaState(value: unknown): MemberHomeQaState | null {
  return typeof value === "string" &&
    (memberHomeQaStates as readonly string[]).includes(value)
    ? (value as MemberHomeQaState)
    : null
}

export type MemberHomeQaView = {
  home: MobileMemberHome | null
  isError: boolean
  isOffline: boolean
  isPending: boolean
}

function staleCache(home: MobileMemberHome): MobileMemberHome["cache"] {
  const cachedAt = new Date(Date.now() - 42 * 60_000).toISOString()
  return {
    ageMs: 42 * 60_000,
    cachedAt,
    scope: home.cache?.scope ?? "qa",
    status: "stale",
  }
}

const zeroDetails: Record<string, string> = {
  commitment: "No monthly saving set",
  financing: "No active financing",
  savings: "No contributions posted yet",
  "share-capital": "No share capital posted",
  "special-savings": "No special savings posted",
}

/** Applies a QA state to the live read (or to nothing for load states). */
export function applyMemberHomeQaState(
  state: MemberHomeQaState,
  live: MemberHomeQaView
): MemberHomeQaView {
  const home = live.home
  switch (state) {
    case "loading":
      return { home: null, isError: false, isOffline: false, isPending: true }
    case "error":
      return { home: null, isError: true, isOffline: false, isPending: false }
    case "offline":
      return {
        home: home ? { ...home, cache: staleCache(home) } : null,
        isError: false,
        isOffline: true,
        isPending: false,
      }
    case "stale":
      return {
        home: home ? { ...home, cache: staleCache(home) } : null,
        isError: false,
        isOffline: false,
        isPending: false,
      }
    case "refresh-error":
      return { ...live, isError: true, isOffline: false, isPending: false }
    case "attention":
      return {
        ...live,
        home: home
          ? {
              ...home,
              actionItems: [
                {
                  detail: "KYC is still pending or not started.",
                  key: "kyc-readiness",
                  label: "Profile readiness",
                  severity: "warning",
                },
                ...home.actionItems.filter((item) => item.key !== "kyc-readiness"),
              ],
              notifications: { unread: 3 },
              readiness: {
                detail: "KYC is still pending or not started.",
                percentage: 72,
                status: "needs_attention",
              },
            }
          : null,
      }
    case "new":
      return {
        ...live,
        home: home
          ? {
              ...home,
              actionItems: [
                {
                  detail: "No monthly saving has been set up.",
                  key: "commitment",
                  label: "Monthly saving setup",
                  severity: "neutral",
                },
              ],
              notifications: { unread: 0 },
              stats: home.stats.map((stat) => ({
                ...stat,
                detail: zeroDetails[stat.key] ?? stat.detail,
                value: 0,
              })),
            }
          : null,
      }
    case "noprofile":
      return {
        ...live,
        home: home
          ? {
              ...home,
              actionItems: [
                {
                  detail: "No linked member profile was found for this mobile session.",
                  key: "member-profile",
                  label: "Member profile needs linking",
                  severity: "warning",
                },
              ],
              member: null,
              notifications: { unread: 0 },
              readiness: {
                detail: "Your cooperative profile is not linked to this account yet.",
                percentage: 0,
                status: "missing_profile",
              },
              stats: [
                { detail: "No monthly saving set", format: "currency", key: "commitment", label: "Monthly saving", value: 0 },
                { detail: "No posted savings available", format: "currency", key: "savings", label: "Savings", value: 0 },
                { detail: "No active financing available", format: "currency", key: "financing", label: "Financing", value: 0 },
              ],
            }
          : null,
      }
  }
}
