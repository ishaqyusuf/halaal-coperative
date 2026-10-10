import type { MobileReadCacheState } from "@/lib/read-cache"

export type MobileMemberCooperativeServiceQaState =
  | "blocked"
  | "disabled"
  | "empty"
  | "error"
  | "loading"
  | "office-only"
  | "offline"
  | "read-only"
  | "stale"

const qaStates = new Set<MobileMemberCooperativeServiceQaState>([
  "blocked",
  "disabled",
  "empty",
  "error",
  "loading",
  "office-only",
  "offline",
  "read-only",
  "stale",
])

export function getMemberCooperativeServiceQaState(
  value: string | string[] | undefined
) {
  if (!__DEV__ || typeof value !== "string") return null

  return qaStates.has(value as MobileMemberCooperativeServiceQaState)
    ? (value as MobileMemberCooperativeServiceQaState)
    : null
}

export function createCooperativeServiceStaleCache({
  existing,
  generatedAt,
  reason,
  scope,
}: {
  existing: MobileReadCacheState | null | undefined
  generatedAt: string
  reason: "offline" | "stale"
  scope: string
}): MobileReadCacheState {
  return {
    ageMs: existing?.ageMs ?? 15 * 60 * 1000,
    cachedAt: existing?.cachedAt ?? generatedAt,
    reason,
    scope: existing?.scope ?? scope,
    status: "stale",
  }
}

export function getCooperativeServiceQaAccessMode(
  qaState: MobileMemberCooperativeServiceQaState | null
) {
  if (qaState === "disabled") return "disabled" as const
  if (qaState === "office-only") return "office_only" as const
  if (qaState === "read-only") return "read_only" as const
  return null
}

export function getCooperativeServiceRestriction(
  qaState: "disabled" | "office-only" | "read-only",
  serviceName: string
) {
  const sentenceServiceName = `${serviceName.charAt(0).toUpperCase()}${serviceName.slice(1)}`

  if (qaState === "disabled") {
    return `${sentenceServiceName} is currently disabled by the cooperative.`
  }

  if (qaState === "office-only") {
    return `New ${serviceName} requests must be started at the cooperative office.`
  }

  return `${sentenceServiceName} is currently available for viewing only.`
}
