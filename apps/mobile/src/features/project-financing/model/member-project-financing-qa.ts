import {
  createCooperativeServiceStaleCache,
  type MobileMemberCooperativeServiceQaState,
} from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import type { MobileMemberProjectFinancing } from "./member-project-financing-types"

export function presentMemberProjectFinancingForQa(
  projectFinancing: MobileMemberProjectFinancing,
  qaState: MobileMemberCooperativeServiceQaState | null
): MobileMemberProjectFinancing {
  if (qaState === "empty") {
    return {
      ...projectFinancing,
      canCreateRequest: true,
      requestNextCursor: null,
      requests: [],
      restrictionReasons: [],
      summary: {
        activeRequests: 0,
        approvedRequests: 0,
        outstandingAmount: 0,
        pendingRequests: 0,
        totalApprovedAmount: 0,
        totalRequestedAmount: 0,
        totalRequests: 0,
      },
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...projectFinancing,
      cache: createCooperativeServiceStaleCache({
        existing: projectFinancing.cache,
        generatedAt: projectFinancing.generatedAt,
        reason: qaState,
        scope: "ticket-06-project-financing-qa",
      }),
    }
  }

  if (qaState === "blocked") {
    return {
      ...projectFinancing,
      canCreateRequest: false,
      restrictionReasons: [
        "Complete the current eligibility requirement before starting another project financing request.",
      ],
    }
  }

  if (
    qaState === "disabled" ||
    qaState === "office-only" ||
    qaState === "read-only"
  ) {
    const description =
      qaState === "disabled"
        ? "Project financing is currently disabled by the cooperative."
        : qaState === "office-only"
          ? "New project financing requests must be started at the cooperative office."
          : "Project financing is currently available for viewing only."

    return {
      ...projectFinancing,
      canCreateRequest: false,
      restrictionReasons: [description],
    }
  }

  return projectFinancing
}
