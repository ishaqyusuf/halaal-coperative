import { createHash } from "node:crypto"

export const mobileAdminFinanceSupportQueueKeys = [
  "receipts",
  "financing",
  "procurement",
  "foodPurchase",
  "projectFinancing",
  "shares",
  "collections",
  "support",
] as const

export type MobileAdminFinanceSupportQueueKey =
  (typeof mobileAdminFinanceSupportQueueKeys)[number]

export type MobileAdminFinanceSupportCapabilities = {
  approveMoneyImpactSupport: boolean
  manageSupport: boolean
  recordCollectionFollowUp: boolean
  reviewFinancing: boolean
  reviewFoodPurchase: boolean
  reviewProcurement: boolean
  reviewProjectFinancing: boolean
  reviewReceipts: boolean
  reviewShares: boolean
}

export type MobileAdminFinanceSupportActionKey =
  | "approve"
  | "mark_under_review"
  | "reject"
  | "reply"
  | "review_financial_adjustment"
  | "record_follow_up"
  | "request_correction"
  | "update_support_status"

export type MobileAdminFinanceSupportAction = {
  destructive: boolean
  governanceOnly: boolean
  key: MobileAdminFinanceSupportActionKey
  label: string
  requiresConfirmation: boolean
  requiresEvidence: boolean
}

const reviewActions: MobileAdminFinanceSupportAction[] = [
  {
    destructive: false,
    governanceOnly: false,
    key: "mark_under_review",
    label: "Start review",
    requiresConfirmation: true,
    requiresEvidence: false,
  },
  {
    destructive: false,
    governanceOnly: false,
    key: "approve",
    label: "Approve",
    requiresConfirmation: true,
    requiresEvidence: true,
  },
  {
    destructive: true,
    governanceOnly: false,
    key: "reject",
    label: "Reject",
    requiresConfirmation: true,
    requiresEvidence: true,
  },
]

export function buildMobileAdminFinanceSupportActions(input: {
  capabilities: MobileAdminFinanceSupportCapabilities
  financialAdjustmentApprovalStatus: string | null
  queueKey: MobileAdminFinanceSupportQueueKey
  requiresFinancialAdjustment: boolean
  state: string
}): MobileAdminFinanceSupportAction[] {
  if (input.queueKey === "collections") {
    return input.capabilities.recordCollectionFollowUp
      ? [
          {
            destructive: false,
            governanceOnly: true,
            key: "record_follow_up",
            label: "Record follow-up",
            requiresConfirmation: true,
            requiresEvidence: true,
          },
        ]
      : []
  }

  if (input.queueKey === "support") {
    if (["closed"].includes(input.state)) return []

    const actions: MobileAdminFinanceSupportAction[] = input.capabilities
      .manageSupport
      ? [
          {
            destructive: false,
            governanceOnly: true,
            key: "reply",
            label: "Reply",
            requiresConfirmation: false,
            requiresEvidence: true,
          },
          {
            destructive: false,
            governanceOnly: true,
            key: "update_support_status",
            label: "Update status",
            requiresConfirmation: true,
            requiresEvidence: true,
          },
        ]
      : []

    if (
      input.capabilities.approveMoneyImpactSupport &&
      input.requiresFinancialAdjustment &&
      input.financialAdjustmentApprovalStatus === "pending"
    ) {
      actions.push({
        destructive: false,
        governanceOnly: true,
        key: "review_financial_adjustment",
        label: "Review adjustment evidence",
        requiresConfirmation: true,
        requiresEvidence: true,
      })
    }

    return actions
  }

  const hasReviewPermission = {
    financing: input.capabilities.reviewFinancing,
    foodPurchase: input.capabilities.reviewFoodPurchase,
    procurement: input.capabilities.reviewProcurement,
    projectFinancing: input.capabilities.reviewProjectFinancing,
    receipts: input.capabilities.reviewReceipts,
    shares: input.capabilities.reviewShares,
  }[input.queueKey]

  if (!hasReviewPermission) return []

  if (input.queueKey === "shares") {
    return input.state === "pending" ? reviewActions.slice(1) : []
  }

  if (!["submitted", "under_review"].includes(input.state)) return []

  const actions = reviewActions.filter(
    (action) =>
      !(input.state === "under_review" && action.key === "mark_under_review")
  )

  if (input.queueKey === "receipts") {
    actions.splice(actions.length - 1, 0, {
      destructive: false,
      governanceOnly: false,
      key: "request_correction",
      label: "Request correction",
      requiresConfirmation: true,
      requiresEvidence: true,
    })
  }

  return actions
}

/**
 * AuditLog IDs are UUIDs. A deterministic v5-shaped ID gives every mobile
 * command one tenant-scoped receipt without adding a second command table.
 */
export function deriveMobileAdminCommandAuditId(
  tenantId: string,
  commandId: string
) {
  const bytes = Buffer.from(
    createHash("sha1")
      .update(`halaalvest:mobile-admin:${tenantId}:${commandId}`)
      .digest()
      .subarray(0, 16)
  )
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = bytes.toString("hex")

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
