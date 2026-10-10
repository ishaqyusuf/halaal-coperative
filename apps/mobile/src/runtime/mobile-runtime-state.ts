export type MobileSessionState =
  | "cold"
  | "hydrating"
  | "unauthenticated"
  | "authenticated"
  | "fatal"

export type MobileConnectivityState = "unknown" | "online" | "offline"
export type MobileLifecycleState = "active" | "background" | "inactive"
export type MobileRecoveryState = "idle" | "retrying"
export type MobileFreshnessState = "fresh" | "stale"

export type MobileRuntimeState = {
  connectivity: MobileConnectivityState
  freshness: MobileFreshnessState
  lastOnlineAt: string | null
  lifecycle: MobileLifecycleState
  recovery: MobileRecoveryState
  session: MobileSessionState
}

export type MobileRuntimeAction =
  | { type: "auth"; error: boolean; hasProfile: boolean; hydrating: boolean }
  | { type: "connectivity"; online: boolean | null; occurredAt: string }
  | { type: "lifecycle"; lifecycle: MobileLifecycleState }
  | { type: "recovery"; recovery: MobileRecoveryState }

export const initialMobileRuntimeState: MobileRuntimeState = {
  connectivity: "unknown",
  freshness: "stale",
  lastOnlineAt: null,
  lifecycle: "active",
  recovery: "idle",
  session: "cold",
}

export function mobileRuntimeReducer(
  state: MobileRuntimeState,
  action: MobileRuntimeAction
): MobileRuntimeState {
  switch (action.type) {
    case "auth":
      return {
        ...state,
        session: action.hydrating
          ? "hydrating"
          : action.error && !action.hasProfile
            ? "fatal"
            : action.hasProfile
              ? "authenticated"
              : "unauthenticated",
      }
    case "connectivity": {
      const connectivity =
        action.online === null
          ? "unknown"
          : action.online
            ? "online"
            : "offline"
      return {
        ...state,
        connectivity,
        freshness: connectivity === "online" ? "fresh" : "stale",
        lastOnlineAt: action.online ? action.occurredAt : state.lastOnlineAt,
      }
    }
    case "lifecycle":
      return { ...state, lifecycle: action.lifecycle }
    case "recovery":
      return { ...state, recovery: action.recovery }
  }
}

export type MobileDeliveryKind =
  | "read"
  | "event"
  | "command"
  | "financial-command"

export function canDeliverMobileOperation(
  kind: MobileDeliveryKind,
  connectivity: MobileConnectivityState
) {
  if (kind === "read") return true
  return connectivity === "online"
}

export function resolveOnlineState(
  isConnected: boolean | null,
  isInternetReachable: boolean | null
) {
  if (isConnected === false || isInternetReachable === false) return false
  if (isConnected === null || isInternetReachable === null) return null
  return true
}

export function shouldRefreshMobileReads({
  becameActive,
  online,
  reconnected,
}: {
  becameActive: boolean
  online: boolean
  reconnected: boolean
}) {
  return online && (becameActive || reconnected)
}

export function isUnauthorizedMobileSessionError(error: unknown) {
  if (!error || typeof error !== "object") return false

  const candidate = error as {
    data?: { code?: string }
    shape?: { data?: { code?: string } }
  }
  return (
    candidate.data?.code === "UNAUTHORIZED" ||
    candidate.shape?.data?.code === "UNAUTHORIZED"
  )
}

export class MobileOfflineOperationError extends Error {
  readonly code = "MOBILE_ONLINE_REQUIRED"

  constructor(kind: MobileDeliveryKind) {
    super(
      kind === "financial-command"
        ? "Reconnect before submitting this financial action. Your draft is still saved."
        : "Reconnect before submitting this action."
    )
    this.name = "MobileOfflineOperationError"
  }
}
