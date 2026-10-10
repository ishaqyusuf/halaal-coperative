import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  AdminFinanceSupportCommandBase,
  AdminFinanceSupportCommandResult,
  AdminFinanceSupportOverview,
  AdminFinanceSupportQueueKey,
} from "../model/admin-finance-support-types"

let devOverview: AdminFinanceSupportOverview = {
  capabilities: {
    approveMoneyImpactSupport: true,
    manageSupport: true,
    recordCollectionFollowUp: true,
    reviewFinancing: true,
    reviewFoodPurchase: true,
    reviewProcurement: true,
    reviewProjectFinancing: true,
    reviewReceipts: true,
    reviewShares: true,
  },
  generatedAt: new Date().toISOString(),
  items: [
    {
      ageMinutes: 95,
      allowedActions: [
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
          destructive: false,
          governanceOnly: false,
          key: "request_correction",
          label: "Request correction",
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
      ],
      amount: 85_000,
      blockers: [],
      details: [
        { label: "Submitted amount", value: "85000" },
        { label: "Allocations", value: "2" },
        { label: "Channel", value: "bank_transfer" },
      ],
      financialAdjustmentApprovalStatus: null,
      id: "receipt-dev-1",
      member: { id: "member-dev-1", name: "Yusuf Bello", number: "HV-1031" },
      policyEvidence: [
        "Payment evidence attached",
        "Allocation total matches the submitted amount.",
      ],
      queueKey: "receipts",
      requestedAt: new Date(Date.now() - 95 * 60_000).toISOString(),
      requiresFinancialAdjustment: false,
      state: "submitted",
      subtitle: "Reference HVC-DEV-260810",
      title: "Yusuf Bello",
    },
    {
      ageMinutes: 210,
      allowedActions: [
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
      ],
      amount: 450_000,
      blockers: ["1 guarantor response remains."],
      details: [
        { label: "Requested amount", value: "450000" },
        { label: "Term", value: "12 months" },
        { label: "Approvals", value: "0" },
      ],
      financialAdjustmentApprovalStatus: null,
      id: "loan-dev-1",
      member: { id: "member-dev-2", name: "Maryam Ibrahim", number: "HV-1048" },
      policyEvidence: [
        "Two distinct finance approvals are required.",
        "1 of 2 guarantor responses recorded.",
      ],
      queueKey: "financing",
      requestedAt: new Date(Date.now() - 210 * 60_000).toISOString(),
      requiresFinancialAdjustment: false,
      state: "submitted",
      subtitle: "Business equipment financing",
      title: "Maryam Ibrahim",
    },
    {
      ageMinutes: 265,
      allowedActions: [
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
          destructive: false,
          governanceOnly: false,
          key: "request_correction",
          label: "Request correction",
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
      ],
      amount: 380_000,
      blockers: [],
      details: [
        { label: "Asset", value: "Commercial refrigerator" },
        { label: "Requested term", value: "10 months" },
        { label: "Vendor quotes", value: "2 attached" },
      ],
      financialAdjustmentApprovalStatus: null,
      id: "procurement-dev-1",
      member: { id: "member-dev-5", name: "Fatima Musa", number: "HV-1054" },
      policyEvidence: [
        "Two vendor quotations are attached.",
        "Final amount and term remain subject to cooperative approval.",
      ],
      queueKey: "procurement",
      requestedAt: new Date(Date.now() - 265 * 60_000).toISOString(),
      requiresFinancialAdjustment: false,
      state: "submitted",
      subtitle: "Commercial refrigerator",
      title: "Fatima Musa",
    },
    {
      ageMinutes: 42,
      allowedActions: [
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
        {
          destructive: false,
          governanceOnly: true,
          key: "review_financial_adjustment",
          label: "Review adjustment evidence",
          requiresConfirmation: true,
          requiresEvidence: true,
        },
      ],
      amount: null,
      blockers: ["Financial adjustment evidence requires finance review."],
      details: [
        { label: "Priority", value: "high" },
        { label: "Category", value: "payment_issue" },
        { label: "Messages", value: "3" },
      ],
      financialAdjustmentApprovalStatus: "pending",
      id: "support-dev-1",
      member: { id: "member-dev-3", name: "Aisha Musa", number: "HV-1042" },
      policyEvidence: [
        "Adjustment evidence is pending.",
        "Support review cannot post or reverse finance records.",
      ],
      queueKey: "support",
      requestedAt: new Date(Date.now() - 42 * 60_000).toISOString(),
      requiresFinancialAdjustment: true,
      state: "in_progress",
      subtitle: "Contribution allocation exception",
      title: "Aisha Musa",
    },
    {
      ageMinutes: 1440,
      allowedActions: [
        {
          destructive: false,
          governanceOnly: true,
          key: "record_follow_up",
          label: "Record follow-up",
          requiresConfirmation: true,
          requiresEvidence: true,
        },
      ],
      amount: 32_500,
      blockers: [],
      details: [
        { label: "Outstanding", value: "32500" },
        {
          label: "Due date",
          value: new Date(Date.now() - 86_400_000).toISOString(),
        },
        { label: "Last follow-up", value: "reminded" },
      ],
      financialAdjustmentApprovalStatus: null,
      id: "schedule-dev-1",
      member: { id: "member-dev-4", name: "Suleiman Adamu", number: "HV-1027" },
      policyEvidence: [
        "This records contact evidence only.",
        "Repayment posting is a separate command.",
      ],
      queueKey: "collections",
      requestedAt: new Date(Date.now() - 86_400_000).toISOString(),
      requiresFinancialAdjustment: false,
      state: "overdue",
      subtitle: "Quick financing installment 5",
      title: "Suleiman Adamu",
    },
  ],
  queueCounts: [
    { count: 1, key: "receipts", label: "Receipts" },
    { count: 1, key: "financing", label: "Financing" },
    { count: 1, key: "procurement", label: "Procurement" },
    { count: 1, key: "support", label: "Support" },
    { count: 1, key: "collections", label: "Collections" },
  ],
  state: "ready",
  stats: [
    { format: "count", key: "visible-work", label: "Visible work", value: 5 },
    { format: "count", key: "blocked-work", label: "Blocked", value: 2 },
    {
      format: "currency",
      key: "deployable-funds",
      label: "Deployable funds",
      value: 4_820_000,
    },
  ],
}

function getDevOverview(input?: {
  queueKey?: AdminFinanceSupportQueueKey
  search?: string
}) {
  let items = devOverview.items
  if (input?.queueKey)
    items = items.filter((item) => item.queueKey === input.queueKey)
  const search = input?.search?.trim().toLowerCase()
  if (search) {
    items = items.filter((item) =>
      [item.title, item.subtitle, item.member?.number]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search))
    )
  }
  return Promise.resolve({
    ...devOverview,
    generatedAt: new Date().toISOString(),
    items,
  })
}

function completeDevCommand(
  input: AdminFinanceSupportCommandBase & { entityId: string; state: string }
) {
  const items = devOverview.items.filter((item) => item.id !== input.entityId)
  const queueCounts = devOverview.queueCounts
    .map((queue) => ({
      ...queue,
      count: items.filter((item) => item.queueKey === queue.key).length,
    }))
    .filter((queue) => queue.count > 0)
  devOverview = {
    ...devOverview,
    generatedAt: new Date().toISOString(),
    items,
    queueCounts,
    stats: devOverview.stats.map((stat) =>
      stat.key === "visible-work"
        ? { ...stat, value: items.length }
        : stat.key === "blocked-work"
          ? {
              ...stat,
              value: items.filter((item) => item.blockers.length > 0).length,
            }
          : stat
    ),
  }
  return Promise.resolve({
    commandId: input.commandId,
    entityId: input.entityId,
    replayed: false,
    state: input.state,
  } satisfies AdminFinanceSupportCommandResult)
}

export async function getAdminFinanceSupportOverview(input?: {
  limit?: number
  queueKey?: AdminFinanceSupportQueueKey
  search?: string
}) {
  if (isMobileDevFixtureSession()) return getDevOverview(input)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(
    `admin.finance-support.${JSON.stringify(input ?? {})}`,
    () => client.mobile.admin.finance.overview.query(input)
  ) as Promise<AdminFinanceSupportOverview>
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
