import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { ExpectedQueryError } from "../query-error"
import {
  getApplicableChargeQuoteHash,
  quoteApplicableCharges,
  type ChargeWorkflow,
} from "./charges"
import {
  DEFAULT_FINANCING_POLICY,
  getTenantFinancingPolicySnapshot,
} from "./financing-cycles"
import { getTenantMigrationWriteAccess } from "./migration"
import {
  findFoodPurchaseApplication,
  getActiveFoodPurchaseObligationCount,
  getFoodPurchaseApplicationSummary,
  listFoodPurchaseApplicationPage,
  listFoodPurchaseCycles,
  submitFoodPurchaseApplication,
  type FoodPurchaseApplicationRow,
  type FoodPurchaseCycleRow,
} from "./food-purchase"
import { getMemberByUserId } from "./members"
import { getMemberOperationalReadiness } from "./member-readiness"
import { getTenantOperationProfile } from "./operation-profile"
import {
  getProcurementSummary,
  getProcurementRequest,
  listProcurementRequestPage,
  createProcurementRequest,
  type ProcurementRequestRow,
  type ProcurementRequestStatus,
} from "./procurement"
import { financingBlockingLoanStatuses } from "./loan-statuses"
import { isLateScheduleItem, startOfUtcDay } from "./repayments"
import {
  createProjectFinancingRequest,
  findProjectFinancingRequest,
  getProjectFinancingSummary,
  listProjectFinancingRequestPage,
  type ProjectFinancingRequestRow,
  type ProjectFinancingRequestStatus,
  type ProjectFinancingStructure,
} from "./project-financing"

export const mobileProjectFinancingStructureKeys = [
  "investment_partnership",
  "profit_sharing",
  "repayable_facility",
  "undecided",
] as const satisfies readonly ProjectFinancingStructure[]

type MobileWorkflowChargeOption = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

type MobileCooperativeServiceState =
  | "available"
  | "database_unavailable"
  | "member_profile_missing"

/**
 * Late is read, not stored (ADR-20261114, Phase 1.4): an installment is late
 * when it is unpaid and its due date is before today, whatever status was
 * saved on it.
 */
export function countLateProcurementScheduleItems(
  requests: ReadonlyArray<{
    scheduleItems: ReadonlyArray<{ dueDate: Date | string; status: string }>
  }>,
  asOf = startOfUtcDay()
) {
  return requests.reduce(
    (total, request) =>
      total +
      request.scheduleItems.filter((entry) =>
        isLateScheduleItem({ dueAt: entry.dueDate, status: entry.status }, asOf)
      ).length,
    0
  )
}

function toMobileProcurementRequest(row: ProcurementRequestRow) {
  return {
    approvedCost: row.approvedCost,
    approvedMarkup: row.approvedMarkup,
    approvedMonthlyRepayment: row.approvedMonthlyRepayment,
    approvedRepaymentMonths: row.approvedRepaymentMonths,
    estimatedMonthlyRepayment: row.estimatedMonthlyRepayment,
    id: row.id,
    itemDescription: row.itemDescription,
    itemName: row.itemName,
    outstandingAmount: row.outstandingAmount,
    purchasedAt: row.purchasedAt?.toISOString() ?? null,
    purchaseReference: row.purchaseReference,
    requestedAt: row.requestedAt.toISOString(),
    requestedCost: row.requestedCost,
    requestedRepaymentMonths: row.requestedRepaymentMonths,
    reviewNotes: row.reviewNotes,
    scheduleItems: row.repaymentScheduleItems.map((item) => ({
      amount: item.amount,
      dueDate: item.dueDate.toISOString(),
      id: item.id,
      installmentNumber: item.installmentNumber,
      paidAmount: item.paidAmount,
      status: item.status,
    })),
    status: row.status,
    vendorName: row.vendorName,
  }
}

function toMobileProjectFinancingRequest(row: ProjectFinancingRequestRow) {
  return {
    approvedAmount: row.approvedAmount,
    approvedMonthlyPayback: row.approvedMonthlyPayback,
    approvedPaybackMonths: row.approvedPaybackMonths,
    approvedStructure: row.approvedStructure,
    businessDescription: row.businessDescription,
    businessName: row.businessName,
    disbursedAt: row.disbursedAt?.toISOString() ?? null,
    disbursementNotes: row.disbursementNotes,
    disbursementReference: row.disbursementReference,
    estimatedMonthlyPayback: row.estimatedMonthlyPayback,
    id: row.id,
    paidAmount: row.paidAmount,
    paidAt: row.paidAt?.toISOString() ?? null,
    projectPurpose: row.projectPurpose,
    proposedStructure: row.proposedStructure,
    requestedAmount: row.requestedAmount,
    requestedAt: row.requestedAt.toISOString(),
    requestedPaybackMonths: row.requestedPaybackMonths,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNotes: row.reviewNotes,
    status: row.status,
  }
}

function toMobileFoodPurchaseCycle(row: FoodPurchaseCycleRow) {
  return {
    id: row.id,
    periodMonth: row.periodMonth.toISOString(),
    releasedAmount: row.releasedAmount,
    releasedAt: row.releasedAt.toISOString(),
    releaseNotes: row.releaseNotes,
    status: row.status,
  }
}

function toMobileFoodPurchaseApplication(row: FoodPurchaseApplicationRow) {
  return {
    approvedAmount: row.approvedAmount,
    approvedPaybackMonths: row.approvedPaybackMonths,
    cycle: {
      id: row.cycle.id,
      periodMonth: row.cycle.periodMonth.toISOString(),
      releasedAmount: row.cycle.releasedAmount,
      status: row.cycle.status,
    },
    goodsReleasedAt: row.goodsReleasedAt?.toISOString() ?? null,
    id: row.id,
    itemDescription: row.itemDescription,
    paidAmount: row.paidAmount,
    paidAt: row.paidAt?.toISOString() ?? null,
    requestedAmount: row.requestedAmount,
    requestedAt: row.requestedAt.toISOString(),
    requestedPaybackMonths: row.requestedPaybackMonths,
    requestNotes: row.requestNotes,
    reviewNotes: row.reviewNotes,
    status: row.status,
  }
}

async function getChargeOptions(
  input: {
    tenantId: string
    workflow: ChargeWorkflow
  },
  prisma: PrismaClient
): Promise<MobileWorkflowChargeOption[]> {
  const quotes = await quoteApplicableCharges(
    {
      basisAmount: 100,
      tenantId: input.tenantId,
      trigger: "submission",
      workflow: input.workflow,
    },
    prisma
  )
  return quotes.map((quote) => ({
    amount: quote.effectiveAmount,
    chargeValueType: quote.chargeValueType,
    code: quote.code,
    collectionMode: quote.collectionMode,
    id: quote.chargeApplicabilityId ?? quote.chargeDefinitionId,
    name: quote.name,
  }))
}

function getMobileMemberProcurementUnavailable() {
  return {
    canCreateRequest: false,
    chargeOptions: [] as MobileWorkflowChargeOption[],
    generatedAt: new Date().toISOString(),
    member: null,
    requests: [] as ReturnType<typeof toMobileProcurementRequest>[],
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

function getMobileMemberProjectFinancingUnavailable() {
  return {
    chargeOptions: [] as MobileWorkflowChargeOption[],
    generatedAt: new Date().toISOString(),
    member: null,
    requests: [] as ReturnType<typeof toMobileProjectFinancingRequest>[],
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

function getMobileMemberFoodPurchaseUnavailable() {
  return {
    applications: [] as ReturnType<typeof toMobileFoodPurchaseApplication>[],
    canCreateApplication: false,
    chargeOptions: [] as MobileWorkflowChargeOption[],
    cycles: [] as ReturnType<typeof toMobileFoodPurchaseCycle>[],
    generatedAt: new Date().toISOString(),
    member: null,
    summary: {
      approvedApplications: 0,
      openCycles: 0,
      pendingApplications: 0,
      totalApplications: 0,
    },
  }
}

function toMobileServiceMember(
  member: Awaited<ReturnType<typeof getMemberByUserId>>
) {
  return (
    member && {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    }
  )
}

export type MobileProcurementRequestPage = {
  data: ReturnType<typeof toMobileProcurementRequest>[]
  nextCursor: string | null
  state: MobileCooperativeServiceState
}

export type MobileFoodPurchaseApplicationPage = {
  data: ReturnType<typeof toMobileFoodPurchaseApplication>[]
  nextCursor: string | null
  state: MobileCooperativeServiceState
}

export type MobileProjectFinancingRequestPage = {
  data: ReturnType<typeof toMobileProjectFinancingRequest>[]
  nextCursor: string | null
  state: MobileCooperativeServiceState
}

async function resolveMobileMember(
  input: { tenantId: string; userId: string },
  prisma: NonNullable<ReturnType<typeof createPrismaClient>>
) {
  return getMemberByUserId(input, prisma)
}

function boundedPageSize(pageSize?: number) {
  return Math.min(Math.max(pageSize ?? 20, 1), 50)
}

// Same list as the server-side procurement check, approved loans included.
const activeFinancingStatuses = financingBlockingLoanStatuses
type MobileServiceAccessMode =
  | "disabled"
  | "member_self_service"
  | "office_only"
  | "read_only"

function accessRestriction(
  accessMode: MobileServiceAccessMode,
  service: "Foodstuff Purchase" | "procurement"
) {
  if (accessMode === "member_self_service") return null
  if (accessMode === "office_only") {
    return `New ${service} ${service === "procurement" ? "requests" : "applications"} are recorded by the cooperative office.`
  }
  if (accessMode === "read_only") {
    return `${service === "procurement" ? "Procurement" : service} is currently read-only. Existing ${service === "procurement" ? "requests" : "applications"} remain available.`
  }
  return `${service === "procurement" ? "Procurement requests" : `${service} applications`} are not currently offered.`
}

export function deriveMobileProcurementAvailability(input: {
  accessMode: MobileServiceAccessMode
  activeFinancingBlocksProcurement: boolean
  activeFinancingCount: number
  activeObligationCount: number
  hasMember: boolean
  memberOperationalReady: boolean
  maximumActiveObligationsPerMember: number
}) {
  const restrictionReasons: string[] = []
  if (input.hasMember && !input.memberOperationalReady) {
    restrictionReasons.push(
      "Member verification is required before financial or operational actions can continue."
    )
  }
  const accessReason = accessRestriction(input.accessMode, "procurement")
  if (accessReason) restrictionReasons.push(accessReason)
  if (input.activeObligationCount >= input.maximumActiveObligationsPerMember) {
    restrictionReasons.push(
      `Settle an active procurement obligation before creating another request. Limit: ${input.maximumActiveObligationsPerMember}.`
    )
  }
  if (
    input.activeFinancingBlocksProcurement &&
    input.activeFinancingCount > 0
  ) {
    restrictionReasons.push(
      "An active financing obligation must be settled before requesting procurement."
    )
  }
  return {
    canCreateRequest: input.hasMember && restrictionReasons.length === 0,
    restrictionReasons,
  }
}

export function deriveMobileFoodPurchaseAvailability(input: {
  accessMode: MobileServiceAccessMode
  activeObligationCount: number
  hasMember: boolean
  hasOpenCycle: boolean
  maximumActiveObligationsPerMember: number
}) {
  const restrictionReasons: string[] = []
  const accessReason = accessRestriction(input.accessMode, "Foodstuff Purchase")
  if (accessReason) restrictionReasons.push(accessReason)
  if (input.activeObligationCount >= input.maximumActiveObligationsPerMember) {
    restrictionReasons.push(
      `Settle an active Foodstuff Purchase obligation before applying again. Limit: ${input.maximumActiveObligationsPerMember}.`
    )
  }
  if (!input.hasOpenCycle) {
    restrictionReasons.push(
      "Applications reopen when the cooperative starts a new Foodstuff Purchase cycle."
    )
  }
  return {
    canCreateApplication: input.hasMember && restrictionReasons.length === 0,
    restrictionReasons,
  }
}

function unavailableCapability(serviceKey: "food_purchase" | "procurement") {
  return {
    accessMode: "disabled" as const,
    canMemberCreate: false,
    canSettleExisting: true,
    canStaffCreate: false,
    canViewExisting: true,
    serviceKey,
    shouldShowInMemberNav: false,
    shouldShowInStaffNav: false,
  }
}

type MemberRequestPageInput = {
  cursor?: string | null
  filter?: "all" | "active" | "pending" | "closed"
  pageSize?: number
  search?: string
  tenantId: string
  userId: string
}

const procurementLanes: Record<
  Exclude<NonNullable<MemberRequestPageInput["filter"]>, "all">,
  ProcurementRequestStatus[]
> = {
  active: ["active", "purchased"],
  pending: ["submitted", "under_review"],
  closed: ["completed", "rejected", "cancelled"],
}

const projectLanes: Record<
  Exclude<NonNullable<MemberRequestPageInput["filter"]>, "all">,
  ProjectFinancingRequestStatus[]
> = {
  active: ["active"],
  pending: ["submitted", "under_review"],
  closed: ["completed", "rejected", "cancelled"],
}

export async function getMobileMemberProcurementRequestPage(
  input: MemberRequestPageInput,
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileProcurementRequestPage> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return { data: [], nextCursor: null, state: "database_unavailable" }
  }
  const member = await resolveMobileMember(input, prisma)
  if (!member) {
    return { data: [], nextCursor: null, state: "member_profile_missing" }
  }
  const page = await listProcurementRequestPage(
    {
      cursor: input.cursor,
      memberId: member.id,
      pageSize: boundedPageSize(input.pageSize),
      search: input.search,
      statuses:
        input.filter && input.filter !== "all"
          ? procurementLanes[input.filter]
          : undefined,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    data: page.data.map(toMobileProcurementRequest),
    nextCursor: page.meta.cursor ?? null,
    state: "available",
  }
}

export async function getMobileMemberProcurementRequestDetail(
  input: {
    procurementRequestId: string
    tenantId: string
    userId: string
  },
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return null
  const member = await resolveMobileMember(input, prisma)
  if (!member) return null
  const request = await getProcurementRequest(
    {
      memberId: member.id,
      procurementRequestId: input.procurementRequestId,
      tenantId: input.tenantId,
    },
    prisma
  )
  return request ? toMobileProcurementRequest(request) : null
}

export async function getMobileMemberFoodPurchaseApplicationPage(
  input: MemberRequestPageInput,
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileFoodPurchaseApplicationPage> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return { data: [], nextCursor: null, state: "database_unavailable" }
  }
  const member = await resolveMobileMember(input, prisma)
  if (!member) {
    return { data: [], nextCursor: null, state: "member_profile_missing" }
  }
  const page = await listFoodPurchaseApplicationPage(
    {
      cursor: input.cursor,
      memberId: member.id,
      pageSize: boundedPageSize(input.pageSize),
      search: input.search,
      memberLane: input.filter === "all" ? undefined : input.filter,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    data: page.data.map(toMobileFoodPurchaseApplication),
    nextCursor: page.meta.cursor ?? null,
    state: "available",
  }
}

export async function getMobileMemberFoodPurchaseApplicationDetail(
  input: {
    foodPurchaseApplicationId: string
    tenantId: string
    userId: string
  },
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return null
  const member = await resolveMobileMember(input, prisma)
  if (!member) return null
  const application = await findFoodPurchaseApplication(
    {
      applicationId: input.foodPurchaseApplicationId,
      memberId: member.id,
      tenantId: input.tenantId,
    },
    prisma
  )
  return application ? toMobileFoodPurchaseApplication(application) : null
}

export async function getMobileMemberProjectFinancingRequestPage(
  input: MemberRequestPageInput,
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
): Promise<MobileProjectFinancingRequestPage> {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return { data: [], nextCursor: null, state: "database_unavailable" }
  }
  const member = await resolveMobileMember(input, prisma)
  if (!member) {
    return { data: [], nextCursor: null, state: "member_profile_missing" }
  }
  const page = await listProjectFinancingRequestPage(
    {
      cursor: input.cursor,
      memberId: member.id,
      pageSize: boundedPageSize(input.pageSize),
      search: input.search,
      statuses:
        input.filter && input.filter !== "all"
          ? projectLanes[input.filter]
          : undefined,
      tenantId: input.tenantId,
    },
    prisma
  )

  return {
    data: page.data.map(toMobileProjectFinancingRequest),
    nextCursor: page.meta.cursor ?? null,
    state: "available",
  }
}

export async function getMobileMemberProjectFinancingRequestDetail(
  input: {
    projectFinancingRequestId: string
    tenantId: string
    userId: string
  },
  prismaOverride?: NonNullable<ReturnType<typeof createPrismaClient>>
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) return null
  const member = await resolveMobileMember(input, prisma)
  if (!member) return null
  const request = await findProjectFinancingRequest(
    {
      memberId: member.id,
      projectFinancingRequestId: input.projectFinancingRequestId,
      tenantId: input.tenantId,
    },
    prisma
  )
  return request ? toMobileProjectFinancingRequest(request) : null
}

export async function getMobileMemberProcurementService(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const snapshot = getMobileMemberProcurementUnavailable()
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return {
      ...snapshot,
      activeRequest: null,
      capability: unavailableCapability("procurement"),
      policy: {
        activeFinancingBlocksProcurement:
          DEFAULT_FINANCING_POLICY.activeFinancingBlocksProcurement,
        allowsCommitmentReductionDuringPayback:
          DEFAULT_FINANCING_POLICY.procurementAllowsCommitmentReductionDuringPayback,
        maximumActiveObligationsPerMember: 1,
        maximumPaybackMonths:
          DEFAULT_FINANCING_POLICY.procurementMaximumPaybackMonths,
      },
      requestNextCursor: null,
      restrictionReasons: ["Procurement is temporarily unavailable."],
      state: "database_unavailable" as const,
    }
  }

  const [member, profile, policy] = await Promise.all([
    getMemberByUserId(input, prisma),
    getTenantOperationProfile(input.tenantId, prisma),
    getTenantFinancingPolicySnapshot(input.tenantId, prisma),
  ])
  const [activeFinancingCount, requestPage, summary, readiness, chargeOptions] =
    await Promise.all([
      member && policy.activeFinancingBlocksProcurement
        ? prisma.loan.count({
            where: {
              memberId: member.id,
              status: { in: [...activeFinancingStatuses] },
              tenantId: input.tenantId,
            },
          })
        : Promise.resolve(0),
      member
        ? listProcurementRequestPage(
            {
              memberId: member.id,
              pageSize: 20,
              tenantId: input.tenantId,
            },
            prisma
          )
        : Promise.resolve(null),
      member
        ? getProcurementSummary(input.tenantId, prisma, member.id)
        : Promise.resolve(null),
      member
        ? getMemberOperationalReadiness(
            { memberId: member.id, tenantId: input.tenantId },
            prisma
          )
        : Promise.resolve(null),
      member
        ? getChargeOptions(
            { tenantId: input.tenantId, workflow: "procurement_request" },
            prisma
          )
        : Promise.resolve([]),
    ])
  const capability = profile.services.procurement
  const availability = deriveMobileProcurementAvailability({
    accessMode: capability.accessMode,
    activeFinancingBlocksProcurement: policy.activeFinancingBlocksProcurement,
    activeFinancingCount,
    activeObligationCount: summary?.activeRequests ?? 0,
    hasMember: member !== null,
    memberOperationalReady: readiness?.isReady === true,
    maximumActiveObligationsPerMember:
      profile.policy.procurementMaximumActiveObligationsPerMember,
  })

  const inPage = requestPage?.data.find((row: ProcurementRequestRow) =>
    procurementLanes.active.includes(row.status)
  )
  const active =
    inPage ??
    (member && summary?.activeRequests
      ? (
          await listProcurementRequestPage(
            {
              memberId: member.id,
              pageSize: 1,
              tenantId: input.tenantId,
              statuses: procurementLanes.active,
            },
            prisma
          )
        ).data[0]
      : undefined)
  return {
    ...snapshot,
    activeRequest: active ? toMobileProcurementRequest(active) : null,
    chargeOptions,
    member: toMobileServiceMember(member),
    canCreateRequest: availability.canCreateRequest,
    capability,
    policy: {
      activeFinancingBlocksProcurement: policy.activeFinancingBlocksProcurement,
      allowsCommitmentReductionDuringPayback:
        policy.procurementAllowsCommitmentReductionDuringPayback,
      maximumActiveObligationsPerMember:
        profile.policy.procurementMaximumActiveObligationsPerMember,
      maximumPaybackMonths: policy.procurementMaximumPaybackMonths,
    },
    requestNextCursor: requestPage?.meta.cursor ?? null,
    requests:
      requestPage?.data.map(toMobileProcurementRequest) ?? snapshot.requests,
    restrictionReasons: availability.restrictionReasons,
    state: member
      ? ("available" as const)
      : ("member_profile_missing" as const),
    summary: summary
      ? {
          activeRequests: summary.activeRequests,
          approvedRequests: summary.approvedRequests,
          dueScheduleItems: summary.dueScheduleItems,
          outstandingAmount: summary.outstandingAmount,
          overdueScheduleItems: summary.overdueScheduleItems,
          pendingRequests: summary.pendingRequests,
          totalRequests: summary.totalRequests,
        }
      : snapshot.summary,
  }
}

export async function getMobileMemberFoodPurchaseService(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const snapshot = getMobileMemberFoodPurchaseUnavailable()
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return {
      ...snapshot,
      activeRequest: null,
      capability: unavailableCapability("food_purchase"),
      policy: {
        allowsCommitmentReductionDuringPayback:
          DEFAULT_FINANCING_POLICY.foodPurchaseAllowsCommitmentReductionDuringPayback,
        maximumActiveObligationsPerMember: 1,
        maximumPaybackMonths:
          DEFAULT_FINANCING_POLICY.foodPurchaseMaximumPaybackMonths,
        requiresOpenCycle: true,
      },
      applicationNextCursor: null,
      restrictionReasons: ["Foodstuff Purchase is temporarily unavailable."],
      state: "database_unavailable" as const,
    }
  }

  const [member, profile, policy] = await Promise.all([
    getMemberByUserId(input, prisma),
    getTenantOperationProfile(input.tenantId, prisma),
    getTenantFinancingPolicySnapshot(input.tenantId, prisma),
  ])
  const [
    cycles,
    chargeOptions,
    applicationPage,
    applicationSummary,
    activeObligationCount,
    openCycleCount,
  ] = await Promise.all([
    member
      ? listFoodPurchaseCycles({ tenantId: input.tenantId }, prisma)
      : Promise.resolve([]),
    member
      ? getChargeOptions(
          { tenantId: input.tenantId, workflow: "food_purchase_application" },
          prisma
        )
      : Promise.resolve([]),
    member
      ? listFoodPurchaseApplicationPage(
          {
            memberId: member.id,
            pageSize: 20,
            tenantId: input.tenantId,
          },
          prisma
        )
      : Promise.resolve(null),
    member
      ? getFoodPurchaseApplicationSummary(
          { memberId: member.id, tenantId: input.tenantId },
          prisma
        )
      : Promise.resolve(null),
    member
      ? getActiveFoodPurchaseObligationCount(
          { memberId: member.id, tenantId: input.tenantId },
          prisma
        )
      : Promise.resolve(0),
    prisma.foodPurchaseCycle.count({
      where: { status: "open", tenantId: input.tenantId },
    }),
  ])
  const capability = profile.services.food_purchase
  const availability = deriveMobileFoodPurchaseAvailability({
    accessMode: capability.accessMode,
    activeObligationCount,
    hasMember: member !== null,
    hasOpenCycle:
      !profile.policy.foodPurchaseRequiresOpenCycle || openCycleCount > 0,
    maximumActiveObligationsPerMember:
      profile.policy.foodPurchaseMaximumActiveObligationsPerMember,
  })

  const inPage = applicationPage?.data.find(
    (row: FoodPurchaseApplicationRow) =>
      row.status === "approved" &&
      row.approvedAmount !== null &&
      row.approvedAmount > row.paidAmount &&
      (row.goodsReleasedAt ||
        row.paidAmount > 0 ||
        ["accounting_approved", "completed", "closed"].includes(
          row.cycle.status
        ))
  )
  const active =
    inPage ??
    (member && activeObligationCount
      ? (
          await listFoodPurchaseApplicationPage(
            {
              memberId: member.id,
              pageSize: 1,
              tenantId: input.tenantId,
              memberLane: "active",
            },
            prisma
          )
        ).data[0]
      : undefined)
  return {
    ...snapshot,
    activeRequest: active ? toMobileFoodPurchaseApplication(active) : null,
    chargeOptions,
    member: toMobileServiceMember(member),
    applicationNextCursor: applicationPage?.meta.cursor ?? null,
    applications:
      applicationPage?.data.map(toMobileFoodPurchaseApplication) ??
      snapshot.applications,
    canCreateApplication: availability.canCreateApplication,
    capability,
    cycles: cycles.map(toMobileFoodPurchaseCycle),
    policy: {
      allowsCommitmentReductionDuringPayback:
        policy.foodPurchaseAllowsCommitmentReductionDuringPayback,
      maximumActiveObligationsPerMember:
        profile.policy.foodPurchaseMaximumActiveObligationsPerMember,
      maximumPaybackMonths: policy.foodPurchaseMaximumPaybackMonths,
      requiresOpenCycle: profile.policy.foodPurchaseRequiresOpenCycle,
    },
    restrictionReasons: availability.restrictionReasons,
    state: member
      ? ("available" as const)
      : ("member_profile_missing" as const),
    summary: applicationSummary
      ? { ...applicationSummary, openCycles: openCycleCount }
      : snapshot.summary,
  }
}

export async function getMobileMemberProjectFinancingService(
  input: {
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const snapshot = getMobileMemberProjectFinancingUnavailable()
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    return {
      ...snapshot,
      activeRequest: null,
      canCreateRequest: false,
      eligibleStructures: mobileProjectFinancingStructureKeys.map((value) => ({
        requiresPaybackMonths: value === "repayable_facility",
        value,
      })),
      requestNextCursor: null,
      restrictionReasons: ["Project financing is temporarily unavailable."],
      state: "database_unavailable" as const,
    }
  }

  const [member, migration] = await Promise.all([
    getMemberByUserId(input, prisma),
    getTenantMigrationWriteAccess(input.tenantId, prisma),
  ])
  const canUseLiveFinancialWrites = migration.canUseLiveFinancialWrites
  const [requestPage, summary, chargeOptions] = member
    ? await Promise.all([
        listProjectFinancingRequestPage(
          {
            memberId: member.id,
            pageSize: 20,
            tenantId: input.tenantId,
          },
          prisma
        ),
        getProjectFinancingSummary(input.tenantId, prisma, member.id),
        getChargeOptions(
          { tenantId: input.tenantId, workflow: "project_financing_request" },
          prisma
        ),
      ])
    : [null, null, []]
  const inPage = requestPage?.data.find(
    (row: ProjectFinancingRequestRow) => row.status === "active"
  )
  const active =
    inPage ??
    (member && summary?.activeRequests
      ? (
          await listProjectFinancingRequestPage(
            {
              memberId: member.id,
              pageSize: 1,
              tenantId: input.tenantId,
              statuses: projectLanes.active,
            },
            prisma
          )
        ).data[0]
      : undefined)
  return {
    ...snapshot,
    activeRequest: active ? toMobileProjectFinancingRequest(active) : null,
    chargeOptions,
    member: toMobileServiceMember(member),
    canCreateRequest: member !== null && canUseLiveFinancialWrites,
    eligibleStructures: mobileProjectFinancingStructureKeys.map((value) => ({
      requiresPaybackMonths: value === "repayable_facility",
      value,
    })),
    requestNextCursor: requestPage?.meta.cursor ?? null,
    requests:
      requestPage?.data.map(toMobileProjectFinancingRequest) ??
      snapshot.requests,
    restrictionReasons: canUseLiveFinancialWrites
      ? []
      : [
          "New project financing requests open after the cooperative finalizes its initial migration.",
        ],
    state: member
      ? ("available" as const)
      : ("member_profile_missing" as const),
    summary: summary ?? snapshot.summary,
  }
}

export async function quoteMobileMemberProjectFinancingCharges(
  input: {
    requestedAmount: number
    tenantId: string
    userId: string
  },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) {
    throw ExpectedQueryError.precondition(
      "Project financing is unavailable without database configuration."
    )
  }
  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before reviewing project financing charges."
    )
  }
  const charges = await quoteApplicableCharges(
    {
      basisAmount: input.requestedAmount,
      tenantId: input.tenantId,
      trigger: "submission",
      workflow: "project_financing_request",
    },
    prisma
  )
  return {
    chargeQuoteHash: getApplicableChargeQuoteHash(
      charges,
      input.requestedAmount
    ),
    charges: charges.map((charge) => ({
      amount: charge.amount,
      collectionMode: charge.collectionMode,
      id: charge.chargeApplicabilityId ?? charge.chargeDefinitionId,
      name: charge.name,
    })),
    feeTotal: charges.reduce((sum, charge) => sum + charge.amount, 0),
    generatedAt: new Date().toISOString(),
    requestedAmount: input.requestedAmount,
  }
}

export const createMobileMemberProcurementServiceRequest = async (input: {
  itemDescription?: string | null
  itemName: string
  requestedCost: number
  requestedRepaymentMonths: number
  submissionKey?: string | null
  tenantId: string
  userId: string
  vendorName?: string | null
}) => {
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Procurement requests are unavailable without database configuration."
    )
  }
  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting procurement requests."
    )
  }
  return toMobileProcurementRequest(
    await createProcurementRequest(
      {
        actorUserId: input.userId,
        itemDescription: input.itemDescription ?? undefined,
        itemName: input.itemName,
        memberId: member.id,
        requestSource: "member_self_service",
        requestedCost: input.requestedCost,
        requestedRepaymentMonths: input.requestedRepaymentMonths,
        submissionKey: input.submissionKey,
        tenantId: input.tenantId,
        vendorName: input.vendorName ?? undefined,
      },
      prisma
    )
  )
}
export const createMobileMemberFoodPurchaseServiceApplication = async (input: {
  cycleId: string
  itemDescription?: string | null
  requestedAmount: number
  requestedPaybackMonths: number
  submissionKey?: string | null
  requestNotes?: string | null
  tenantId: string
  userId: string
}) => {
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Foodstuff Purchase applications are unavailable without database configuration."
    )
  }
  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting Foodstuff Purchase applications."
    )
  }
  return toMobileFoodPurchaseApplication(
    await submitFoodPurchaseApplication(
      {
        actorUserId: input.userId,
        cycleId: input.cycleId,
        itemDescription: input.itemDescription ?? undefined,
        memberId: member.id,
        requestSource: "member_self_service",
        requestedAmount: input.requestedAmount,
        requestedPaybackMonths: input.requestedPaybackMonths,
        submissionKey: input.submissionKey,
        requestNotes: input.requestNotes ?? undefined,
        tenantId: input.tenantId,
      },
      prisma
    )
  )
}
export const createMobileMemberProjectFinancingServiceRequest = async (input: {
  businessDescription?: string | null
  businessName: string
  chargeQuoteHash: string
  projectPurpose?: string | null
  proposedStructure?: ProjectFinancingStructure | null
  requestedAmount: number
  requestedPaybackMonths?: number | null
  submissionKey?: string | null
  tenantId: string
  userId: string
}) => {
  const prisma = createPrismaClient()
  if (!prisma) {
    throw new Error(
      "Project financing requests are unavailable without database configuration."
    )
  }
  const member = await getMemberByUserId(input, prisma)
  if (!member) {
    throw ExpectedQueryError.precondition(
      "Member profile needs linking before submitting project financing requests."
    )
  }
  return toMobileProjectFinancingRequest(
    await createProjectFinancingRequest(
      {
        actorUserId: input.userId,
        businessDescription: input.businessDescription ?? undefined,
        businessName: input.businessName,
        expectedChargeQuoteHash: input.chargeQuoteHash,
        memberId: member.id,
        projectPurpose: input.projectPurpose ?? undefined,
        proposedStructure: input.proposedStructure ?? undefined,
        requestedAmount: input.requestedAmount,
        requestedPaybackMonths: input.requestedPaybackMonths ?? undefined,
        submissionKey: input.submissionKey,
        tenantId: input.tenantId,
      },
      prisma
    )
  )
}
