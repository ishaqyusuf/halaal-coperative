import {
  createCooperativeServiceStaleCache,
  getCooperativeServiceQaAccessMode,
  getCooperativeServiceRestriction,
  type MobileMemberCooperativeServiceQaState,
} from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import type { MobileMemberProcurement } from "./member-procurement-types"

export function presentMemberProcurementForQa(
  procurement: MobileMemberProcurement,
  qaState: MobileMemberCooperativeServiceQaState | null
): MobileMemberProcurement {
  if (qaState === "empty") {
    return {
      ...procurement,
      canCreateRequest: true,
      capability: {
        ...procurement.capability,
        accessMode: "member_self_service",
        canMemberCreate: true,
        canViewExisting: true,
      },
      requestNextCursor: null,
      requests: [],
      restrictionReasons: [],
      summary: {
        activeRequests: 0,
        approvedRequests: 0,
        dueScheduleItems: 0,
        outstandingAmount: 0,
        overdueScheduleItems: 0,
        pendingRequests: 0,
        totalRequests: 0,
      },
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...procurement,
      cache: createCooperativeServiceStaleCache({
        existing: procurement.cache,
        generatedAt: procurement.generatedAt,
        reason: qaState,
        scope: "ticket-06-procurement-qa",
      }),
    }
  }

  if (qaState === "blocked") {
    return {
      ...procurement,
      canCreateRequest: false,
      restrictionReasons: [
        "Clear the active cooperative obligation before starting another procurement request.",
      ],
    }
  }

  const accessMode = getCooperativeServiceQaAccessMode(qaState)
  if (accessMode) {
    return {
      ...procurement,
      canCreateRequest: false,
      capability: {
        ...procurement.capability,
        accessMode,
        canMemberCreate: false,
        canViewExisting: true,
      },
      restrictionReasons: [
        getCooperativeServiceRestriction(
          qaState as "disabled" | "office-only" | "read-only",
          "procurement"
        ),
      ],
    }
  }

  return procurement
}
