import { isRestrictiveOperationProfileChange } from "./operation-profile-policy"
import type {
  MobileOperationProfileSnapshot,
  OperationProfileAccessMode,
  OperationProfileServiceKey,
} from "./operation-profile-types"

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return null

  const candidate = error as {
    code?: string
    data?: { code?: string }
    shape?: { data?: { code?: string } }
  }

  return (
    candidate.data?.code ??
    candidate.shape?.data?.code ??
    candidate.code ??
    null
  )
}

export function isOperationProfileConflictError(error: unknown) {
  return getErrorCode(error) === "CONFLICT"
}

export type OperationProfileConflictRefreshResolution =
  | {
      expectedAccessMode: OperationProfileAccessMode
      status: "already_current"
    }
  | {
      expectedAccessMode: OperationProfileAccessMode
      status: "ready_to_review" | "reason_required"
    }
  | { status: "service_missing" }

export function resolveOperationProfileConflictRefresh(input: {
  changeReason: string
  nextAccessMode: OperationProfileAccessMode
  serviceKey: OperationProfileServiceKey
  snapshot: MobileOperationProfileSnapshot
}): OperationProfileConflictRefreshResolution {
  const refreshedService = input.snapshot.services.find(
    (service) => service.serviceKey === input.serviceKey
  )

  if (!refreshedService) return { status: "service_missing" }

  const previous = refreshedService.accessMode
  const next = input.nextAccessMode
  if (previous === next) {
    return { expectedAccessMode: previous, status: "already_current" }
  }

  return {
    expectedAccessMode: previous,
    status:
      !input.changeReason.trim() &&
      isRestrictiveOperationProfileChange({ previous, next })
        ? "reason_required"
        : "ready_to_review",
  }
}
