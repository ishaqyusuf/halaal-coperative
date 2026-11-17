import { isUnrecoverableQueryError } from "@/lib/app-query-policy"
import { matchesFinanceDeskSearch } from "../model/admin-finance-support-presentation"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { isPersistableReadInput, readCachedMobileQuery } from "@/lib/read-cache"
import type {
  AdminFinanceSupportCommandBase,
  AdminFinanceSupportCommandResult,
  AdminFinanceSupportAction,
  AdminFinanceSupportActionKey,
  AdminFinanceSupportItem,
  AdminFinanceSupportQueueKey,
  FinanceDeskCursor,
  FinanceDeskPage,
} from "../model/admin-finance-support-types"

const fixtureAction = (
  key: AdminFinanceSupportActionKey,
  label: string
): AdminFinanceSupportAction => ({
  key,
  label,
  destructive: key === "reject",
  governanceOnly:
    key === "review_financial_adjustment" || key === "record_follow_up",
  requiresConfirmation: true,
  requiresEvidence: key !== "mark_under_review",
})

const start = fixtureAction("mark_under_review", "Start review")
const approval = fixtureAction("approve", "Approve")
const reject = fixtureAction("reject", "Reject")
const correct = fixtureAction("request_correction", "Request correction")
const review = [start, approval, reject]
const receipt = [start, approval, correct, reject]
const followUp = [fixtureAction("record_follow_up", "Record follow-up")]

function fixtureItem(
  key: AdminFinanceSupportQueueKey,
  id: string,
  title: string,
  number: string,
  subtitle: string,
  amount: number | null,
  ageMinutes: number,
  state: string,
  allowedActions: AdminFinanceSupportAction[],
  extra: Partial<AdminFinanceSupportItem> = {}
): AdminFinanceSupportItem {
  return {
    ageMinutes,
    allowedActions,
    amount,
    blockers: [],
    details: [],
    financialAdjustmentApprovalStatus: null,
    id,
    member: { id: number, name: title, number: `QHC-${number}` },
    policyEvidence: [],
    queueKey: key,
    requestedAt: new Date(Date.now() - ageMinutes * 60_000).toISOString(),
    requiresFinancialAdjustment: false,
    state,
    subtitle,
    title,
    ...extra,
  }
}

const receiptEvidence = [
  "Payment proof attached",
  "Allocation total matches the submitted amount",
]

let devItems = [
  fixtureItem(
    "receipts",
    "receipt-dev-1",
    "Yusuf Bello",
    "0031",
    "Ref HVC-260810 · Bank transfer",
    85_000,
    95,
    "submitted",
    receipt,
    {
      details: [
        { label: "Submitted amount", value: "85000" },
        { label: "Allocations", value: "2 · Contribution, Charges" },
        { label: "Channel", value: "Bank transfer" },
        { label: "Paid on", value: "14 Nov 2026" },
      ],
      policyEvidence: receiptEvidence,
    }
  ),
  fixtureItem(
    "financing",
    "loan-dev-1",
    "Maryam Ibrahim",
    "0048",
    "Murabaha · 12 months",
    450_000,
    190,
    "submitted",
    [start, reject],
    {
      blockers: ["1 guarantor response remains"],
      details: [
        { label: "Requested amount", value: "450000" },
        { label: "Term", value: "12 months" },
        { label: "Guarantors", value: "1 of 2 confirmed" },
        { label: "Approvals", value: "0 of 2" },
      ],
      policyEvidence: [
        "Savings cover 3× the monthly installment",
        "No overdue installments on record",
      ],
    }
  ),
  fixtureItem(
    "procurement",
    "procurement-dev-1",
    "Aisha Bello",
    "0042",
    "Deep freezer · Sahad Stores",
    180_000,
    360,
    "submitted",
    review,
    {
      details: [
        { label: "Item cost", value: "180000" },
        { label: "Repayment", value: "6 months requested" },
        { label: "Vendor", value: "Sahad Stores, Kano" },
        { label: "Quote", value: "Valid to 30 Nov 2026" },
      ],
      policyEvidence: [
        "Vendor quote attached",
        "Within the member’s procurement limit",
      ],
    }
  ),
  fixtureItem(
    "foodPurchase",
    "food-dev-1",
    "Zainab Musa",
    "0063",
    "Rice and oil bundle · 3 months",
    60_000,
    240,
    "submitted",
    [approval, reject]
  ),
  fixtureItem(
    "collections",
    "schedule-dev-1",
    "Bashir Yakubu",
    "0035",
    "Murabaha installment 4 of 12",
    37_500,
    12_960,
    "overdue",
    followUp,
    {
      details: [
        { label: "Outstanding", value: "37500" },
        { label: "Due date", value: "7 Nov 2026" },
        { label: "Last follow-up", value: "Reminded · 10 Nov" },
      ],
      policyEvidence: [
        "A follow-up records contact evidence only.",
        "Post repayments from the Repayments desk.",
      ],
    }
  ),
  fixtureItem(
    "projectFinancing",
    "project-dev-1",
    "Umar Faruk",
    "0024",
    "Poultry expansion · 18 months",
    1_200_000,
    2880,
    "under_review",
    [approval, reject]
  ),
  fixtureItem(
    "receipts",
    "receipt-dev-2",
    "Hauwa Garba",
    "0058",
    "Ref HVC-260822 · POS deposit",
    40_000,
    300,
    "under_review",
    [approval, correct, reject],
    { policyEvidence: receiptEvidence }
  ),
  fixtureItem(
    "shares",
    "share-dev-1",
    "Khadija Aliyu",
    "0081",
    "4 units requested · ₦10,000 each",
    40_000,
    720,
    "pending",
    [approval, reject]
  ),
  fixtureItem(
    "receipts",
    "receipt-dev-3",
    "Musa Danjuma",
    "0112",
    "Ref HVC-260791 · Bank transfer",
    120_000,
    1500,
    "submitted",
    [correct, reject],
    { blockers: ["Proof image is missing"] }
  ),
  fixtureItem(
    "support",
    "support-dev-1",
    "Halima Usman",
    "0054",
    "Contribution posted twice",
    null,
    420,
    "open",
    [
      fixtureAction("reply", "Reply"),
      fixtureAction("update_support_status", "Update status"),
      fixtureAction("review_financial_adjustment", "Review adjustment"),
    ],
    {
      details: [
        { label: "Category", value: "Contribution" },
        { label: "Priority", value: "High" },
        { label: "Messages", value: "3" },
        { label: "Adjustment", value: "Pending approval" },
      ],
      financialAdjustmentApprovalStatus: "pending",
      requiresFinancialAdjustment: true,
    }
  ),
  fixtureItem(
    "financing",
    "loan-dev-2",
    "Abdullahi Sule",
    "0090",
    "Qard hasan · 6 months",
    300_000,
    2900,
    "under_review",
    [approval, reject]
  ),
  fixtureItem(
    "procurement",
    "procurement-dev-2",
    "Sani Kabir",
    "0019",
    "Laptop · Kano Computer Village",
    95_000,
    1700,
    "under_review",
    [approval, reject]
  ),
  fixtureItem(
    "collections",
    "schedule-dev-2",
    "Ruqayya Ahmed",
    "0070",
    "Qard installment 2 of 6",
    22_000,
    2880,
    "due",
    followUp
  ),
  fixtureItem(
    "receipts",
    "receipt-dev-4",
    "Fatima Lawal",
    "0077",
    "Ref HVC-260830 · Bank transfer",
    25_000,
    22,
    "submitted",
    receipt,
    { policyEvidence: receiptEvidence }
  ),
].sort((left, right) => right.ageMinutes - left.ageMinutes)

type FinanceDeskInput = {
  cursor?: FinanceDeskCursor
  entityId?: string
  limit: number
  queueKey?: AdminFinanceSupportQueueKey
  search?: string
}

function getDevDesk(input: FinanceDeskInput): FinanceDeskPage {
  const allItems = devItems
  const items = allItems.filter(
    (item) =>
      (!input.entityId || item.id === input.entityId) &&
      (!input.queueKey || item.queueKey === input.queueKey) &&
      matchesFinanceDeskSearch(item, input.search ?? "")
  )
  const counts = (key: AdminFinanceSupportQueueKey) =>
    allItems.filter((item) => item.queueKey === key).length
  return {
    generatedAt: new Date().toISOString(),
    items,
    nextCursor: null,
    summary:
      input.cursor || input.queueKey || input.entityId || input.search
        ? null
        : {
            total: allItems.length,
            blocked: allItems.filter((item) => item.blockers.length).length,
            queueCounts: [
              ...new Set(allItems.map((item) => item.queueKey)),
            ].map((key) => ({
              key,
              count: counts(key),
              blocked: allItems.filter(
                (item) => item.queueKey === key && item.blockers.length > 0
              ).length,
            })),
            deskCounts: {
              charges: 2,
              contributions: 6,
              financing: counts("financing") + 2,
              repayments: allItems.filter(
                (item) =>
                  item.queueKey === "collections" && item.state === "overdue"
              ).length,
              procurement: counts("procurement") + 1,
              projectFinancing: counts("projectFinancing"),
              foodPurchase: counts("foodPurchase"),
              shares: counts("shares"),
            },
          },
  }
}

function completeDevCommand(
  input: AdminFinanceSupportCommandBase & {
    actionKey: string
    entityId: string
    state: string
  }
): AdminFinanceSupportCommandResult {
  devItems = devItems.flatMap((item) => {
    if (item.id !== input.entityId) return [item]
    if (input.actionKey === "mark_under_review")
      return [
        {
          ...item,
          state: "under_review",
          allowedActions: item.allowedActions.filter(
            (action) => action !== start
          ),
        },
      ]
    if (input.actionKey === "record_follow_up" || input.actionKey === "reply")
      return [item]
    if (input.actionKey === "review_financial_adjustment")
      return [
        {
          ...item,
          financialAdjustmentApprovalStatus: input.state,
          allowedActions: item.allowedActions.filter(
            (action) => action.key !== input.actionKey
          ),
        },
      ]
    if (input.actionKey === "update_support_status" && input.state !== "closed")
      return [{ ...item, state: input.state }]
    return []
  })
  return {
    commandId: input.commandId,
    entityId: input.entityId,
    replayed: false,
    state: input.state,
  }
}

export async function getAdminFinanceDesk(
  input: FinanceDeskInput
): Promise<FinanceDeskPage> {
  if (isMobileDevFixtureSession()) return getDevDesk(input)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(
    `admin.finance-desk.${JSON.stringify(input)}`,
    () => client.mobile.admin.finance.desk.query(input),
    {
      persist: !input.entityId && isPersistableReadInput(input),
      shouldFallback: (error) => !isUnrecoverableQueryError(error),
    }
  )
}

export async function runAdminFinanceSupportCommand(input: {
  actionKey: string
  approvedAmount?: number
  approvedMonths?: number
  approvedStructure?:
    | "investment_partnership"
    | "profit_sharing"
    | "repayable_facility"
    | "undecided"
  approvedUnits?: number
  commandId: string
  decision:
    | "approved"
    | "rejected"
    | "under_review"
    | "correction_requested"
    | "reminded"
    | "promise_to_pay"
    | "settled"
    | "unreachable"
    | "open"
    | "in_progress"
    | "waiting_on_member"
    | "resolved"
    | "closed"
  expectedApprovalStatus?: "not_required" | "pending" | "approved" | "rejected"
  expectedState: string
  itemId: string
  nextActionAt?: string
  note?: string
  priority?: "low" | "normal" | "high" | "urgent"
  queueKey: AdminFinanceSupportQueueKey
}) {
  if (isMobileDevFixtureSession()) {
    return completeDevCommand({
      actionKey: input.actionKey,
      commandId: input.commandId,
      entityId: input.itemId,
      expectedState: input.expectedState,
      state: input.decision,
    })
  }

  const client = createMobileTrpcClient()
  const base = {
    commandId: input.commandId,
    expectedState: input.expectedState,
  }
  const notes = input.note?.trim() || undefined

  if (input.queueKey === "receipts") {
    return client.mobile.admin.finance.reviewReceipt.mutate({
      ...base,
      decision: input.decision as
        | "approved"
        | "rejected"
        | "under_review"
        | "correction_requested",
      receiptId: input.itemId,
      reviewNotes: notes,
    })
  }
  if (input.queueKey === "financing") {
    return client.mobile.admin.finance.reviewFinancingRequest.mutate({
      ...base,
      loanRequestId: input.itemId,
      notes,
      status: input.decision as "approved" | "rejected" | "under_review",
    })
  }
  if (input.queueKey === "procurement") {
    return client.mobile.admin.finance.reviewProcurementRequest.mutate({
      ...base,
      approvedCost: input.approvedAmount,
      approvedRepaymentMonths: input.approvedMonths,
      notes,
      procurementRequestId: input.itemId,
      status: input.decision as "approved" | "rejected" | "under_review",
    })
  }
  if (input.queueKey === "foodPurchase") {
    return client.mobile.admin.finance.reviewFoodPurchaseApplication.mutate({
      ...base,
      applicationId: input.itemId,
      approvedAmount: input.approvedAmount,
      approvedPaybackMonths: input.approvedMonths,
      notes,
      status: input.decision as "approved" | "rejected" | "under_review",
    })
  }
  if (input.queueKey === "projectFinancing") {
    return client.mobile.admin.finance.reviewProjectFinancingRequest.mutate({
      ...base,
      approvedAmount: input.approvedAmount,
      approvedPaybackMonths: input.approvedMonths,
      approvedStructure: input.approvedStructure,
      notes,
      projectFinancingRequestId: input.itemId,
      status: input.decision as "approved" | "rejected" | "under_review",
    })
  }
  if (input.queueKey === "shares") {
    return client.mobile.admin.finance.reviewShareApplication.mutate({
      ...base,
      applicationId: input.itemId,
      approvedUnits: input.approvedUnits,
      decision: input.decision as "approved" | "rejected",
      reviewNotes: notes,
    })
  }
  if (input.queueKey === "collections") {
    return client.mobile.admin.finance.recordCollectionFollowUp.mutate({
      ...base,
      nextActionAt: input.nextActionAt,
      note: notes,
      priority: input.priority,
      repaymentScheduleItemId: input.itemId,
      status: input.decision as
        | "promise_to_pay"
        | "reminded"
        | "settled"
        | "unreachable",
    })
  }
  if (input.actionKey === "review_financial_adjustment") {
    return client.mobile.admin.support.reviewFinancialAdjustment.mutate({
      ...base,
      approvalNotes: notes,
      approvalStatus: input.decision as "approved" | "rejected",
      expectedApprovalStatus: input.expectedApprovalStatus,
      supportCaseId: input.itemId,
    })
  }
  if (input.actionKey === "reply") {
    return client.mobile.admin.support.reply.mutate({
      ...base,
      message: notes,
      supportCaseId: input.itemId,
    })
  }
  return client.mobile.admin.support.updateStatus.mutate({
    ...base,
    priority: input.priority,
    resolutionSummary: notes,
    status: input.decision as
      | "open"
      | "in_progress"
      | "waiting_on_member"
      | "resolved"
      | "closed",
    supportCaseId: input.itemId,
  })
}
