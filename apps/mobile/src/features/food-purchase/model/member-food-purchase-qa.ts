import {
  createCooperativeServiceStaleCache,
  getCooperativeServiceQaAccessMode,
  getCooperativeServiceRestriction,
  type MobileMemberCooperativeServiceQaState,
} from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import type { MobileMemberFoodPurchase } from "./member-food-purchase-types"

export function presentMemberFoodPurchaseForQa(
  foodPurchase: MobileMemberFoodPurchase,
  qaState: MobileMemberCooperativeServiceQaState | null
): MobileMemberFoodPurchase {
  if (qaState === "empty") {
    return {
      ...foodPurchase,
      applicationNextCursor: null,
      applications: [],
      canCreateApplication: true,
      capability: {
        ...foodPurchase.capability,
        accessMode: "member_self_service",
        canMemberCreate: true,
        canViewExisting: true,
      },
      restrictionReasons: [],
      summary: {
        ...foodPurchase.summary,
        approvedApplications: 0,
        pendingApplications: 0,
        totalApplications: 0,
      },
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return {
      ...foodPurchase,
      cache: createCooperativeServiceStaleCache({
        existing: foodPurchase.cache,
        generatedAt: foodPurchase.generatedAt,
        reason: qaState,
        scope: "ticket-06-food-purchase-qa",
      }),
    }
  }

  if (qaState === "blocked") {
    return {
      ...foodPurchase,
      canCreateApplication: false,
      restrictionReasons: [
        "Clear the active cooperative obligation before starting another Foodstuff Purchase application.",
      ],
    }
  }

  const accessMode = getCooperativeServiceQaAccessMode(qaState)
  if (accessMode) {
    return {
      ...foodPurchase,
      canCreateApplication: false,
      capability: {
        ...foodPurchase.capability,
        accessMode,
        canMemberCreate: false,
        canViewExisting: true,
      },
      restrictionReasons: [
        getCooperativeServiceRestriction(
          qaState as "disabled" | "office-only" | "read-only",
          "Foodstuff Purchase"
        ),
      ],
    }
  }

  return foodPurchase
}
