import type {
  AdminFinanceSupportActionKey,
  AdminFinanceSupportItem,
} from "./admin-finance-support-types"

export type AdminFinanceSupportReviewIntent = {
  action: AdminFinanceSupportItem["allowedActions"][number]
  item: AdminFinanceSupportItem
}

export function parseAdminFinancePositiveNumber(value: string) {
  if (!value.trim()) return undefined
  const parsed = Number(value.replace(/,/g, ""))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function getAdminFinanceActionDecision(
  actionKey: AdminFinanceSupportActionKey
) {
  if (actionKey === "mark_under_review") return "under_review" as const
  if (actionKey === "request_correction") {
    return "correction_requested" as const
  }
  if (actionKey === "reject") return "rejected" as const
  return "approved" as const
}

export function adminFinanceActionNeedsLongForm(
  intent: AdminFinanceSupportReviewIntent
) {
  return (
    intent.action.key === "approve" &&
    ["procurement", "foodPurchase", "projectFinancing", "shares"].includes(
      intent.item.queueKey
    )
  )
}
