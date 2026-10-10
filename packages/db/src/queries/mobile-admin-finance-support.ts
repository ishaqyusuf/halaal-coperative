import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError, isUniqueConstraintError } from "../query-error"
import { getOverviewSummary } from "./dashboard"
import {
  listFoodPurchaseApplications,
  reviewFoodPurchaseApplication,
  type FoodPurchaseApplicationRow,
  type FoodPurchaseApplicationStatus,
} from "./food-purchase"
import {
  getLoanRequestDetail,
  listLoanRequests,
  listRepaymentScheduleItems,
  recordCollectionFollowUp,
  reviewLoanRequest,
} from "./loans"
import {
  getMemberPaymentReceipt,
  listMemberPaymentReceipts,
  reviewMemberPaymentReceipt,
  type MemberPaymentReceiptRow,
  type MemberPaymentReceiptStatus,
} from "./payment-receipts"
import {
  getProcurementRequest,
  listProcurementRequests,
  reviewProcurementRequest,
  type ProcurementRequestRow,
  type ProcurementRequestStatus,
} from "./procurement"
import {
  findProjectFinancingRequest,
  listProjectFinancingRequests,
  reviewProjectFinancingRequest,
  type ProjectFinancingRequestRow,
  type ProjectFinancingRequestStatus,
  type ProjectFinancingStructure,
} from "./project-financing"
import {
  addSupportCaseMessage,
  getSupportCase,
  listSupportCases,
  reviewSupportCaseFinancialAdjustment,
  updateSupportCaseStatus,
  type SupportCasePriority,
  type SupportCaseRow,
  type SupportCaseStatus,
  type SupportFinancialAdjustmentApprovalStatus,
} from "./support"
import {
  findMemberShareApplication,
  listMemberShareApplications,
  reviewMemberShareApplication,
  type MemberShareApplicationRow,
  type MemberShareApplicationStatus,
} from "./tenant-finance"
import {
  buildMobileAdminFinanceSupportActions,
  deriveMobileAdminCommandAuditId,
  type MobileAdminFinanceSupportAction,
  type MobileAdminFinanceSupportCapabilities,
  type MobileAdminFinanceSupportQueueKey,
} from "./mobile-admin-finance-support-policy"

export * from "./mobile-admin-finance-support-policy"

export type MobileAdminFinanceSupportDetail = {
  label: string
  value: string
}

export type MobileAdminFinanceSupportItem = {
  ageMinutes: number
  allowedActions: MobileAdminFinanceSupportAction[]
  amount: number | null
  blockers: string[]
  details: MobileAdminFinanceSupportDetail[]
  financialAdjustmentApprovalStatus: string | null
  id: string
  member: {
    id: string
    name: string
    number: string
  } | null
  policyEvidence: string[]
  queueKey: MobileAdminFinanceSupportQueueKey
  requestedAt: string
  requiresFinancialAdjustment: boolean
  state: string
  subtitle: string
  title: string
}

export type MobileAdminFinanceSupportOverview = {
  capabilities: MobileAdminFinanceSupportCapabilities
  generatedAt: string
  items: MobileAdminFinanceSupportItem[]
  queueCounts: Array<{
    count: number
    key: MobileAdminFinanceSupportQueueKey
    label: string
  }>
  state: "database_unavailable" | "ready"
  stats: Array<{
    format: "count" | "currency" | "percent"
    key: string
    label: string
    value: number
  }>
}

const queueLabels: Record<MobileAdminFinanceSupportQueueKey, string> = {
  collections: "Collections",
  financing: "Financing",
  foodPurchase: "Foodstuff Purchase",
  procurement: "Procurement",
  projectFinancing: "Project financing",
  receipts: "Receipts",
  shares: "Shares",
  support: "Support",
}

function ageMinutes(value: Date) {
  return Math.max(0, Math.floor((Date.now() - value.getTime()) / 60_000))
}

function currencyDetail(label: string, value: number | null | undefined) {
  return { label, value: String(value ?? 0) }
}

function memberContext(member: {
  fullName: string
  id: string
  memberNumber: string
}) {
  return {
    id: member.id,
    name: member.fullName,
    number: member.memberNumber,
  }
}

function itemActions(
  item: Omit<
    MobileAdminFinanceSupportItem,
    "ageMinutes" | "allowedActions" | "details" | "policyEvidence"
  >,
  capabilities: MobileAdminFinanceSupportCapabilities
) {
  return buildMobileAdminFinanceSupportActions({
    capabilities,
    financialAdjustmentApprovalStatus: item.financialAdjustmentApprovalStatus,
    queueKey: item.queueKey,
    requiresFinancialAdjustment: item.requiresFinancialAdjustment,
    state: item.state,
  })
}

function mapReceipt(
  row: MemberPaymentReceiptRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const base = {
    amount: row.totalAmount,
    blockers: row.proofDocumentUrl ? [] : ["Payment evidence is missing."],
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: memberContext(row.member),
    queueKey: "receipts" as const,
    requestedAt: row.submittedAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: row.paymentReference
      ? `Reference ${row.paymentReference}`
      : "No payment reference",
    title: row.member.fullName,
  }

  const allowedActions = itemActions(base, capabilities).filter(
    (action) => !(base.blockers.length && action.key === "approve")
  )

  return {
    ...base,
    ageMinutes: ageMinutes(row.submittedAt),
    allowedActions,
    details: [
      currencyDetail("Submitted amount", row.totalAmount),
      { label: "Allocations", value: String(row.allocations.length) },
      { label: "Channel", value: row.channel },
    ],
    policyEvidence: [
      row.proofDocumentUrl
        ? "Payment evidence attached"
        : "Payment evidence missing",
      "Approval posts only the submitted allocation evidence.",
    ],
  }
}

type LoanQueueRow = Awaited<ReturnType<typeof listLoanRequests>>[number]

function mapLoan(
  row: LoanQueueRow,
  capabilities: MobileAdminFinanceSupportCapabilities,
  requiresDualApproval: boolean
): MobileAdminFinanceSupportItem {
  const pendingGuarantors = row.guarantorApprovals.filter(
    (approval) => approval.status !== "approved"
  )
  const base = {
    amount: Number(row.requestedAmount),
    blockers: pendingGuarantors.length
      ? [`${pendingGuarantors.length} guarantor response(s) remain.`]
      : [],
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: memberContext(row.member),
    queueKey: "financing" as const,
    requestedAt: row.requestedAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: row.loanProduct.name,
    title: row.member.fullName,
  }

  const allowedActions = itemActions(base, capabilities).filter(
    (action) => !(base.blockers.length && action.key === "approve")
  )

  return {
    ...base,
    ageMinutes: ageMinutes(row.requestedAt),
    allowedActions,
    details: [
      currencyDetail("Requested amount", Number(row.requestedAmount)),
      { label: "Term", value: `${row.loanProduct.termMonths} months` },
      { label: "Approvals", value: String(row.approvals.length) },
    ],
    policyEvidence: [
      requiresDualApproval
        ? "Two distinct finance approvals are required."
        : "One finance approval is required.",
      `${row.guarantorApprovals.length} guarantor response(s) recorded.`,
    ],
  }
}

function mapProcurement(
  row: ProcurementRequestRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const base = {
    amount: row.requestedCost,
    blockers: [],
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: memberContext(row.member),
    queueKey: "procurement" as const,
    requestedAt: row.requestedAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: row.itemName,
    title: row.member.fullName,
  }

  return {
    ...base,
    ageMinutes: ageMinutes(row.requestedAt),
    allowedActions: itemActions(base, capabilities),
    details: [
      currencyDetail("Requested cost", row.requestedCost),
      {
        label: "Requested repayment",
        value: `${row.requestedRepaymentMonths} months`,
      },
      { label: "Vendor", value: row.vendorName ?? "Not recorded" },
    ],
    policyEvidence: [
      `Maximum payback: ${row.policyMaximumPaybackMonths} months.`,
      row.allowsCommitmentReductionDuringPayback
        ? "Commitment reduction is permitted during payback."
        : "Commitment reduction is blocked during payback.",
    ],
  }
}

function mapFoodPurchase(
  row: FoodPurchaseApplicationRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const blockers =
    row.cycle.status === "open"
      ? []
      : ["The Foodstuff Purchase cycle is closed."]
  const base = {
    amount: row.requestedAmount,
    blockers,
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: memberContext(row.member),
    queueKey: "foodPurchase" as const,
    requestedAt: row.requestedAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: row.itemDescription ?? "Foodstuff Purchase application",
    title: row.member.fullName,
  }

  return {
    ...base,
    ageMinutes: ageMinutes(row.requestedAt),
    allowedActions: blockers.length ? [] : itemActions(base, capabilities),
    details: [
      currencyDetail("Requested amount", row.requestedAmount),
      {
        label: "Requested payback",
        value: `${row.requestedPaybackMonths} months`,
      },
      { label: "Cycle", value: row.cycle.status },
    ],
    policyEvidence: [
      `Maximum payback: ${row.policyMaximumPaybackMonths} months.`,
      `Cycle released amount: ${row.cycle.releasedAmount}.`,
    ],
  }
}

function mapProject(
  row: ProjectFinancingRequestRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const blockers =
    row.proposedStructure === "undecided"
      ? ["A financing structure is required before approval."]
      : []
  const base = {
    amount: row.requestedAmount,
    blockers,
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: memberContext(row.member),
    queueKey: "projectFinancing" as const,
    requestedAt: row.requestedAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: row.businessName,
    title: row.member.fullName,
  }

  return {
    ...base,
    ageMinutes: ageMinutes(row.requestedAt),
    allowedActions: itemActions(base, capabilities),
    details: [
      currencyDetail("Requested amount", row.requestedAmount),
      { label: "Structure", value: row.proposedStructure },
      {
        label: "Requested payback",
        value: row.requestedPaybackMonths
          ? `${row.requestedPaybackMonths} months`
          : "Not applicable",
      },
    ],
    policyEvidence: [
      "Approval must preserve a Shariah-compliant financing structure.",
      row.proposedStructure === "repayable_facility"
        ? "A positive payback term is required."
        : "No repayment schedule is created for partnership structures.",
    ],
  }
}

function mapShare(
  row: MemberShareApplicationRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const base = {
    amount: row.shareValueSnapshot,
    blockers: [],
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: {
      id: row.memberId,
      name: row.memberName,
      number: row.memberNumber,
    },
    queueKey: "shares" as const,
    requestedAt: row.createdAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: `${row.requestedUnits} optional unit(s)`,
    title: row.memberName,
  }

  return {
    ...base,
    ageMinutes: ageMinutes(row.createdAt),
    allowedActions: itemActions(base, capabilities),
    details: [
      { label: "Requested units", value: String(row.requestedUnits) },
      currencyDetail("Unit amount", row.unitAmountSnapshot),
      currencyDetail("Snapshot value", row.shareValueSnapshot),
    ],
    policyEvidence: [
      "The request is valued using the captured unit-price snapshot.",
      "Approval cannot exceed the requested unit count or member share cap.",
    ],
  }
}

function mapSupport(
  row: SupportCaseRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const base = {
    amount: row.specialSavingsWithdrawal?.amount ?? null,
    blockers:
      row.requiresFinancialAdjustment &&
      row.financialAdjustmentApprovalStatus !== "approved"
        ? ["Financial adjustment evidence requires finance review."]
        : [],
    financialAdjustmentApprovalStatus: row.financialAdjustmentApprovalStatus,
    id: row.id,
    member: row.member ? memberContext(row.member) : null,
    queueKey: "support" as const,
    requestedAt: row.updatedAt.toISOString(),
    requiresFinancialAdjustment: row.requiresFinancialAdjustment,
    state: row.status,
    subtitle: row.subject,
    title: row.member?.fullName ?? "Workspace support case",
  }

  return {
    ...base,
    ageMinutes: ageMinutes(row.updatedAt),
    allowedActions: itemActions(base, capabilities),
    details: [
      { label: "Priority", value: row.priority },
      { label: "Category", value: row.category },
      { label: "Messages", value: String(row.messages.length) },
    ],
    policyEvidence: [
      row.requiresFinancialAdjustment
        ? `Adjustment evidence is ${row.financialAdjustmentApprovalStatus}.`
        : "No financial adjustment is requested.",
      "Support review cannot post, reverse, waive, or rewrite finance records.",
    ],
  }
}

type CollectionQueueRow = Awaited<
  ReturnType<typeof listRepaymentScheduleItems>
>[number]

function mapCollection(
  row: CollectionQueueRow,
  capabilities: MobileAdminFinanceSupportCapabilities
): MobileAdminFinanceSupportItem {
  const outstanding = Number(row.totalDue) - Number(row.amountPaid)
  const base = {
    amount: outstanding,
    blockers: [],
    financialAdjustmentApprovalStatus: null,
    id: row.id,
    member: memberContext(row.loan.member),
    queueKey: "collections" as const,
    requestedAt: row.dueAt.toISOString(),
    requiresFinancialAdjustment: false,
    state: row.status,
    subtitle: `${row.loan.loanProduct.name} installment ${row.installmentNumber}`,
    title: row.loan.member.fullName,
  }

  return {
    ...base,
    ageMinutes: ageMinutes(row.dueAt),
    allowedActions: itemActions(base, capabilities),
    details: [
      currencyDetail("Outstanding", outstanding),
      { label: "Due date", value: row.dueAt.toISOString() },
      {
        label: "Last follow-up",
        value: row.collectionFollowUps[0]?.status ?? "None recorded",
      },
    ],
    policyEvidence: [
      "A collection follow-up records contact evidence only.",
      "Repayment posting remains a separate finance command.",
    ],
  }
}

function queueEnabled(
  selected: MobileAdminFinanceSupportQueueKey | undefined,
  key: MobileAdminFinanceSupportQueueKey
) {
  return !selected || selected === key
}

export async function getMobileAdminFinanceSupportOverview(input: {
  capabilities: MobileAdminFinanceSupportCapabilities
  limit?: number
  queueKey?: MobileAdminFinanceSupportQueueKey
  search?: string
  tenantId: string
}): Promise<MobileAdminFinanceSupportOverview> {
  const prisma = createPrismaClient()
  const generatedAt = new Date().toISOString()
  if (!prisma) {
    return {
      capabilities: input.capabilities,
      generatedAt,
      items: [],
      queueCounts: [],
      state: "database_unavailable",
      stats: [
        {
          format: "count",
          key: "visible-work",
          label: "Visible work",
          value: 0,
        },
      ],
    }
  }

  const perQueueLimit = Math.min(Math.max(input.limit ?? 12, 1), 50)
  const [
    summary,
    policy,
    loans,
    procurements,
    foodApplications,
    projects,
    receipts,
    shares,
    supportCases,
    dueCollections,
    overdueCollections,
  ] = await Promise.all([
    getOverviewSummary(input.tenantId, prisma),
    prisma.tenantPolicy.findUnique({ where: { tenantId: input.tenantId } }),
    queueEnabled(input.queueKey, "financing")
      ? listLoanRequests(input.tenantId, prisma)
      : [],
    queueEnabled(input.queueKey, "procurement")
      ? listProcurementRequests(
          { limit: perQueueLimit * 3, tenantId: input.tenantId },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "foodPurchase")
      ? listFoodPurchaseApplications(
          { limit: perQueueLimit * 3, tenantId: input.tenantId },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "projectFinancing")
      ? listProjectFinancingRequests(
          { limit: perQueueLimit * 3, tenantId: input.tenantId },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "receipts")
      ? listMemberPaymentReceipts(
          input.tenantId,
          { limit: perQueueLimit * 3 },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "shares")
      ? listMemberShareApplications(
          { status: "pending", tenantId: input.tenantId },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "support")
      ? listSupportCases(
          { limit: perQueueLimit * 3, tenantId: input.tenantId },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "collections")
      ? listRepaymentScheduleItems(
          input.tenantId,
          { limit: perQueueLimit, status: "due" },
          prisma
        )
      : [],
    queueEnabled(input.queueKey, "collections")
      ? listRepaymentScheduleItems(
          input.tenantId,
          { limit: perQueueLimit, status: "overdue" },
          prisma
        )
      : [],
  ])

  const pending = new Set(["submitted", "under_review"])
  let items: MobileAdminFinanceSupportItem[] = [
    ...loans
      .filter((row) => pending.has(row.status))
      .slice(0, perQueueLimit)
      .map((row) =>
        mapLoan(
          row,
          input.capabilities,
          Boolean(policy?.requiresDualLoanApproval)
        )
      ),
    ...procurements
      .filter((row) => pending.has(row.status))
      .slice(0, perQueueLimit)
      .map((row) => mapProcurement(row, input.capabilities)),
    ...foodApplications
      .filter((row) => pending.has(row.status))
      .slice(0, perQueueLimit)
      .map((row) => mapFoodPurchase(row, input.capabilities)),
    ...projects
      .filter((row) => pending.has(row.status))
      .slice(0, perQueueLimit)
      .map((row) => mapProject(row, input.capabilities)),
    ...receipts
      .filter((row) => pending.has(row.status))
      .slice(0, perQueueLimit)
      .map((row) => mapReceipt(row, input.capabilities)),
    ...shares
      .slice(0, perQueueLimit)
      .map((row) => mapShare(row, input.capabilities)),
    ...supportCases
      .filter((row) => row.status !== "closed")
      .slice(0, perQueueLimit)
      .map((row) => mapSupport(row, input.capabilities)),
    ...[...overdueCollections, ...dueCollections]
      .slice(0, perQueueLimit)
      .map((row) => mapCollection(row, input.capabilities)),
  ]

  const normalizedSearch = input.search?.trim().toLowerCase()
  if (normalizedSearch) {
    items = items.filter((item) =>
      [item.title, item.subtitle, item.member?.number, item.state]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch))
    )
  }

  items.sort((left, right) => right.ageMinutes - left.ageMinutes)
  const queueCounts = Object.entries(
    items.reduce<Record<string, number>>((counts, item) => {
      counts[item.queueKey] = (counts[item.queueKey] ?? 0) + 1
      return counts
    }, {})
  ).map(([key, count]) => ({
    count,
    key: key as MobileAdminFinanceSupportQueueKey,
    label: queueLabels[key as MobileAdminFinanceSupportQueueKey],
  }))

  return {
    capabilities: input.capabilities,
    generatedAt: summary.workspace.generatedAt,
    items,
    queueCounts,
    state: "ready",
    stats: [
      {
        format: "count",
        key: "visible-work",
        label: "Visible work",
        value: items.length,
      },
      {
        format: "count",
        key: "blocked-work",
        label: "Blocked",
        value: items.filter((item) => item.blockers.length > 0).length,
      },
      {
        format: "currency",
        key: "deployable-funds",
        label: "Deployable funds",
        value: summary.primaryMetrics.deployableFunds,
      },
    ],
  }
}

type CommandResult = {
  commandId: string
  entityId: string
  replayed: boolean
  state: string
}

export async function runMobileAdminCommand(
  input: {
    actorUserId: string
    commandId: string
    commandFingerprint?: string
    commandType: string
    entityId: string
    expectedState: string
    execute: (prisma: PrismaClient) => Promise<{ id: string; state: string }>
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<CommandResult> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const auditId = deriveMobileAdminCommandAuditId(
    input.tenantId,
    input.commandId
  )

  try {
    await prisma.auditLog.create({
      data: {
        action: "mobile_admin_command.processing",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: input.entityId,
        entityType: "MobileAdminCommand",
        id: auditId,
        metadata: {
          commandId: input.commandId,
          commandFingerprint: input.commandFingerprint ?? null,
          commandType: input.commandType,
          expectedState: input.expectedState,
          status: "processing",
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error
    const existing = await prisma.auditLog.findFirst({
      where: { id: auditId, tenantId: input.tenantId },
    })
    const metadata = existing?.metadata as Record<string, unknown> | null
    if (
      !existing ||
      metadata?.commandId !== input.commandId ||
      metadata?.commandType !== input.commandType ||
      (metadata?.commandFingerprint ?? null) !==
        (input.commandFingerprint ?? null)
    ) {
      throw ExpectedQueryError.conflict(
        "This mobile command ID was already used for different work. Refresh and try again."
      )
    }
    if (metadata.status !== "completed") {
      throw ExpectedQueryError.conflict(
        "This mobile command is still processing. Refresh before retrying."
      )
    }

    return {
      commandId: input.commandId,
      entityId: String(metadata.resultEntityId),
      replayed: true,
      state: String(metadata.resultState),
    }
  }

  let result: { id: string; state: string }
  try {
    result = await input.execute(prisma)
  } catch (error) {
    await prisma.auditLog.deleteMany({
      where: { action: "mobile_admin_command.processing", id: auditId },
    })
    throw error
  }

  try {
    await prisma.auditLog.update({
      data: {
        action: "mobile_admin_command.completed",
        metadata: {
          commandId: input.commandId,
          commandFingerprint: input.commandFingerprint ?? null,
          commandType: input.commandType,
          expectedState: input.expectedState,
          resultEntityId: result.id,
          resultState: result.state,
          status: "completed",
        },
      },
      where: { id: auditId },
    })

    return {
      commandId: input.commandId,
      entityId: result.id,
      replayed: false,
      state: result.state,
    }
  } catch (error) {
    throw ExpectedQueryError.conflict(
      "The command completed but its final receipt could not be confirmed. Refresh before taking any further action."
    )
  }
}

type CommandBase = {
  actorUserId: string
  commandId: string
  expectedState: string
  tenantId: string
}

export function reviewMobileAdminFinanceReceipt(
  input: CommandBase & {
    adjustmentReason?: string | null
    decision: MemberPaymentReceiptStatus
    receiptId: string
    reviewNotes?: string | null
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `receipt.${input.decision}`,
    entityId: input.receiptId,
    execute: async (prisma) => {
      const receipt = await reviewMemberPaymentReceipt(
        {
          ...input,
          expectedStatus: input.expectedState as MemberPaymentReceiptStatus,
        },
        prisma
      )
      return { id: receipt.id, state: receipt.status }
    },
  })
}

export function reviewMobileAdminFinanceLoan(
  input: CommandBase & {
    loanRequestId: string
    notes?: string | null
    status: "approved" | "rejected" | "under_review"
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `financing.${input.status}`,
    entityId: input.loanRequestId,
    execute: async (prisma) => {
      const request = await reviewLoanRequest(
        {
          ...input,
          expectedStatus: input.expectedState,
          notes: input.notes ?? undefined,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function reviewMobileAdminFinanceProcurement(
  input: CommandBase & {
    approvedCost?: number | null
    approvedRepaymentMonths?: number | null
    notes?: string | null
    procurementRequestId: string
    status: "approved" | "rejected" | "under_review"
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `procurement.${input.status}`,
    entityId: input.procurementRequestId,
    execute: async (prisma) => {
      const request = await reviewProcurementRequest(
        {
          ...input,
          expectedStatus: input.expectedState as ProcurementRequestStatus,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function reviewMobileAdminFinanceFoodPurchase(
  input: CommandBase & {
    applicationId: string
    approvedAmount?: number | null
    approvedPaybackMonths?: number | null
    notes?: string | null
    status: "approved" | "rejected" | "under_review"
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `food_purchase.${input.status}`,
    entityId: input.applicationId,
    execute: async (prisma) => {
      const application = await reviewFoodPurchaseApplication(
        {
          ...input,
          expectedStatus: input.expectedState as FoodPurchaseApplicationStatus,
        },
        prisma
      )
      return { id: application.id, state: application.status }
    },
  })
}

export function reviewMobileAdminFinanceProject(
  input: CommandBase & {
    approvedAmount?: number | null
    approvedPaybackMonths?: number | null
    approvedStructure?: ProjectFinancingStructure | null
    notes?: string | null
    projectFinancingRequestId: string
    status: "approved" | "rejected" | "under_review"
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `project_financing.${input.status}`,
    entityId: input.projectFinancingRequestId,
    execute: async (prisma) => {
      const request = await reviewProjectFinancingRequest(
        {
          ...input,
          expectedStatus: input.expectedState as ProjectFinancingRequestStatus,
        },
        prisma
      )
      return { id: request.id, state: request.status }
    },
  })
}

export function reviewMobileAdminFinanceShare(
  input: CommandBase & {
    applicationId: string
    approvedUnits?: number | null
    decision: "approved" | "rejected"
    effectiveDate?: Date
    reviewNotes?: string | null
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `share.${input.decision}`,
    entityId: input.applicationId,
    execute: async (prisma) => {
      const application = await reviewMemberShareApplication(
        {
          ...input,
          approvedUnits: input.approvedUnits ?? undefined,
          expectedStatus: input.expectedState as MemberShareApplicationStatus,
        },
        prisma
      )
      return { id: application.id, state: application.status }
    },
  })
}

export function replyMobileAdminSupportCase(
  input: CommandBase & {
    attachmentUrl?: string | null
    message: string
    supportCaseId: string
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: "support.reply",
    entityId: input.supportCaseId,
    execute: async (prisma) => {
      await addSupportCaseMessage(
        {
          ...input,
          authorType: "staff",
          authorUserId: input.actorUserId,
          expectedStatus: input.expectedState as SupportCaseStatus,
        },
        prisma
      )
      const supportCase = await getSupportCase(
        { supportCaseId: input.supportCaseId, tenantId: input.tenantId },
        prisma
      )
      return { id: supportCase.id, state: supportCase.status }
    },
  })
}

export function updateMobileAdminSupportCase(
  input: CommandBase & {
    assignedToUserId?: string | null
    priority?: SupportCasePriority
    requiresFinancialAdjustment?: boolean
    resolutionSummary?: string | null
    status: SupportCaseStatus
    supportCaseId: string
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `support.status.${input.status}`,
    entityId: input.supportCaseId,
    execute: async (prisma) => {
      const supportCase = await updateSupportCaseStatus(
        {
          ...input,
          expectedStatus: input.expectedState as SupportCaseStatus,
        },
        prisma
      )
      return { id: supportCase.id, state: supportCase.status }
    },
  })
}

export function reviewMobileAdminSupportAdjustment(
  input: CommandBase & {
    approvalNotes: string
    approvalStatus: "approved" | "rejected"
    expectedApprovalStatus: SupportFinancialAdjustmentApprovalStatus
    supportCaseId: string
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `support.adjustment.${input.approvalStatus}`,
    entityId: input.supportCaseId,
    execute: async (prisma) => {
      const supportCase = await reviewSupportCaseFinancialAdjustment(
        {
          ...input,
          expectedStatus: input.expectedState as SupportCaseStatus,
        },
        prisma
      )
      return {
        id: supportCase.id,
        state: supportCase.financialAdjustmentApprovalStatus,
      }
    },
  })
}

export function recordMobileAdminFinanceCollectionFollowUp(
  input: CommandBase & {
    assignedToUserId?: string
    caseStage?: string
    nextActionAt?: string
    note: string
    priority?: string
    promiseToPayAt?: string
    repaymentScheduleItemId: string
    resolutionStatus?: string
    status: "promise_to_pay" | "reminded" | "settled" | "unreachable"
  }
) {
  return runMobileAdminCommand({
    ...input,
    commandType: `collection.${input.status}`,
    entityId: input.repaymentScheduleItemId,
    execute: async (prisma) => {
      const followUp = await recordCollectionFollowUp(
        {
          ...input,
          expectedScheduleStatus: input.expectedState as never,
        },
        prisma
      )
      return { id: followUp.id, state: followUp.status }
    },
  })
}

// Exported detail loaders keep command preflight tenant-scoped and reusable.
export const mobileAdminFinanceSupportDetails = {
  financing: getLoanRequestDetail,
  foodPurchase: (input: { id: string; tenantId: string }) =>
    listFoodPurchaseApplications({ tenantId: input.tenantId }).then(
      (rows) => rows.find((row) => row.id === input.id) ?? null
    ),
  procurement: (input: { id: string; tenantId: string }) =>
    getProcurementRequest({
      procurementRequestId: input.id,
      tenantId: input.tenantId,
    }),
  projectFinancing: (input: { id: string; tenantId: string }) =>
    findProjectFinancingRequest({
      projectFinancingRequestId: input.id,
      tenantId: input.tenantId,
    }),
  receipt: (input: { id: string; tenantId: string }) =>
    getMemberPaymentReceipt(input.tenantId, input.id),
  share: (input: { id: string; tenantId: string }) =>
    findMemberShareApplication({
      memberShareApplicationId: input.id,
      tenantId: input.tenantId,
    }),
  support: (input: { id: string; tenantId: string }) =>
    getSupportCase({ supportCaseId: input.id, tenantId: input.tenantId }),
}
