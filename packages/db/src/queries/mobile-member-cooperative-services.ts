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
import { getTenantInitialMigrationState } from "./migration"
import {
  findFoodPurchaseApplication,
  getActiveFoodPurchaseObligationCount,
  getFoodPurchaseApplicationSummary,
  listFoodPurchaseApplications,
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
  listProcurementRequests,
  listProcurementRequestPage,
  createProcurementRequest,
  type ProcurementRequestRow,
} from "./procurement"
import {
  createProjectFinancingRequest,
  findProjectFinancingRequest,
  getProjectFinancingSummary,
  listProjectFinancingRequests,
  listProjectFinancingRequestPage,
  type ProjectFinancingRequestRow,
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

function toMobileProcurementRequest(row: ProcurementRequestRow) {
  return {
    approvedCost: row.approvedCost,
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

async function getChargeOptions(input: {
  tenantId: string
  workflow: ChargeWorkflow
}): Promise<MobileWorkflowChargeOption[]> {
  const quotes = await quoteApplicableCharges({
    basisAmount: 100,
    tenantId: input.tenantId,
    trigger: "submission",
    workflow: input.workflow,
  })
  return quotes.map((quote) => ({
    amount: quote.effectiveAmount,
    chargeValueType: quote.chargeValueType,
    code: quote.code,
    collectionMode: quote.collectionMode,
    id: quote.chargeApplicabilityId ?? quote.chargeDefinitionId,
    name: quote.name,
  }))
}

async function getMobileMemberProcurement(input: {
  tenantId: string
  userId: string
}) {
  const prisma = createPrismaClient()
  if (!prisma) {
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
  const member = await getMemberByUserId(input, prisma)
  if (!member) return getMobileMemberProcurementUnavailable()
  const [requests, chargeOptions, profile] = await Promise.all([
    listProcurementRequests(
      { memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    getChargeOptions({
      tenantId: input.tenantId,
      workflow: "procurement_request",
    }),
    getTenantOperationProfile(input.tenantId, prisma),
  ])
  const rows = requests.map(toMobileProcurementRequest)
  return {
    canCreateRequest: profile.services.procurement.canMemberCreate,
    chargeOptions,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    requests: rows,
    summary: {
      activeRequests: rows.filter((item) =>
        ["active", "purchased"].includes(item.status)
      ).length,
      approvedRequests: rows.filter((item) =>
        ["approved", "purchased", "active", "completed"].includes(item.status)
      ).length,
      dueScheduleItems: rows.reduce(
        (total, item) =>
          total +
          item.scheduleItems.filter((entry) => entry.status === "due").length,
        0
      ),
      outstandingAmount: rows.reduce(
        (total, item) => total + item.outstandingAmount,
        0
      ),
      overdueScheduleItems: rows.reduce(
        (total, item) =>
          total +
          item.scheduleItems.filter((entry) => entry.status === "overdue")
            .length,
        0
      ),
      pendingRequests: rows.filter((item) =>
        ["submitted", "under_review"].includes(item.status)
      ).length,
      totalRequests: rows.length,
    },
  }
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

async function getMobileMemberProjectFinancing(input: {
  tenantId: string
  userId: string
}) {
  const prisma = createPrismaClient()
  const empty = {
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
  if (!prisma) return empty
  const member = await getMemberByUserId(input, prisma)
  if (!member) return empty
  const [requests, chargeOptions] = await Promise.all([
    listProjectFinancingRequests(
      { memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    getChargeOptions({
      tenantId: input.tenantId,
      workflow: "project_financing_request",
    }),
  ])
  const rows = requests.map(toMobileProjectFinancingRequest)
  return {
    chargeOptions,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    requests: rows,
    summary: {
      activeRequests: rows.filter((item) => item.status === "active").length,
      approvedRequests: rows.filter((item) =>
        ["approved", "active", "completed"].includes(item.status)
      ).length,
      outstandingAmount: rows.reduce(
        (total, item) =>
          ["approved", "active", "completed"].includes(item.status)
            ? total + Math.max((item.approvedAmount ?? 0) - item.paidAmount, 0)
            : total,
        0
      ),
      pendingRequests: rows.filter((item) =>
        ["submitted", "under_review"].includes(item.status)
      ).length,
      totalApprovedAmount: rows.reduce(
        (total, item) => total + (item.approvedAmount ?? 0),
        0
      ),
      totalRequestedAmount: rows.reduce(
        (total, item) => total + item.requestedAmount,
        0
      ),
      totalRequests: rows.length,
    },
  }
}

async function getMobileMemberFoodPurchase(input: {
  tenantId: string
  userId: string
}) {
  const prisma = createPrismaClient()
  const empty = {
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
  if (!prisma) return empty
  const member = await getMemberByUserId(input, prisma)
  if (!member) return empty
  const [cycles, applications, chargeOptions, profile] = await Promise.all([
    listFoodPurchaseCycles({ tenantId: input.tenantId }, prisma),
    listFoodPurchaseApplications(
      { memberId: member.id, tenantId: input.tenantId },
      prisma
    ),
    getChargeOptions({
      tenantId: input.tenantId,
      workflow: "food_purchase_application",
    }),
    getTenantOperationProfile(input.tenantId, prisma),
  ])
  const mobileCycles = cycles.map(toMobileFoodPurchaseCycle)
  const rows = applications.map(toMobileFoodPurchaseApplication)
  return {
    applications: rows,
    canCreateApplication: profile.services.food_purchase.canMemberCreate,
    chargeOptions,
    cycles: mobileCycles,
    generatedAt: new Date().toISOString(),
    member: {
      id: member.id,
      memberNumber: member.memberNumber,
      name: member.fullName,
    },
    summary: {
      approvedApplications: rows.filter((item) => item.status === "approved")
        .length,
      openCycles: mobileCycles.filter((item) => item.status === "open").length,
      pendingApplications: rows.filter((item) =>
        ["submitted", "under_review"].includes(item.status)
      ).length,
      totalApplications: rows.length,
    },
  }
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

const activeFinancingStatuses = ["active", "disbursed"] as const
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

export async function getMobileMemberProcurementRequestPage(
  input: {
    cursor?: string | null
    pageSize?: number
    tenantId: string
    userId: string
  },
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
  input: {
    cursor?: string | null
    pageSize?: number
    tenantId: string
    userId: string
  },
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
  input: {
    cursor?: string | null
    pageSize?: number
    tenantId: string
    userId: string
  },
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

export async function getMobileMemberProcurementService(input: {
  tenantId: string
  userId: string
}) {
  const snapshot = await getMobileMemberProcurement(input)
  const prisma = createPrismaClient()
  if (!prisma) {
    return {
      ...snapshot,
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

  const [profile, policy, activeFinancingCount, requestPage, summary, readiness] =
    await Promise.all([
      getTenantOperationProfile(input.tenantId, prisma),
      getTenantFinancingPolicySnapshot(input.tenantId, prisma),
      snapshot.member
        ? prisma.loan.count({
            where: {
              memberId: snapshot.member.id,
              status: { in: [...activeFinancingStatuses] },
              tenantId: input.tenantId,
            },
          })
        : Promise.resolve(0),
      snapshot.member
        ? listProcurementRequestPage(
            {
              memberId: snapshot.member.id,
              pageSize: 20,
              tenantId: input.tenantId,
            },
            prisma
          )
        : Promise.resolve(null),
      snapshot.member
        ? getProcurementSummary(input.tenantId, prisma, snapshot.member.id)
        : Promise.resolve(null),
      snapshot.member
        ? getMemberOperationalReadiness(
            { memberId: snapshot.member.id, tenantId: input.tenantId },
            prisma
          )
        : Promise.resolve(null),
    ])
  const capability = profile.services.procurement
  const availability = deriveMobileProcurementAvailability({
    accessMode: capability.accessMode,
    activeFinancingBlocksProcurement: policy.activeFinancingBlocksProcurement,
    activeFinancingCount,
    activeObligationCount: summary?.activeRequests ?? 0,
    hasMember: snapshot.member !== null,
    memberOperationalReady: readiness?.isReady === true,
    maximumActiveObligationsPerMember:
      profile.policy.procurementMaximumActiveObligationsPerMember,
  })

  return {
    ...snapshot,
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
    state: snapshot.member
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

export async function getMobileMemberFoodPurchaseService(input: {
  tenantId: string
  userId: string
}) {
  const snapshot = await getMobileMemberFoodPurchase(input)
  const prisma = createPrismaClient()
  if (!prisma) {
    return {
      ...snapshot,
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

  const [
    profile,
    policy,
    applicationPage,
    applicationSummary,
    activeObligationCount,
    openCycleCount,
  ] = await Promise.all([
    getTenantOperationProfile(input.tenantId, prisma),
    getTenantFinancingPolicySnapshot(input.tenantId, prisma),
    snapshot.member
      ? listFoodPurchaseApplicationPage(
          {
            memberId: snapshot.member.id,
            pageSize: 20,
            tenantId: input.tenantId,
          },
          prisma
        )
      : Promise.resolve(null),
    snapshot.member
      ? getFoodPurchaseApplicationSummary(
          { memberId: snapshot.member.id, tenantId: input.tenantId },
          prisma
        )
      : Promise.resolve(null),
    snapshot.member
      ? getActiveFoodPurchaseObligationCount(
          { memberId: snapshot.member.id, tenantId: input.tenantId },
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
    hasMember: snapshot.member !== null,
    hasOpenCycle:
      !profile.policy.foodPurchaseRequiresOpenCycle || openCycleCount > 0,
    maximumActiveObligationsPerMember:
      profile.policy.foodPurchaseMaximumActiveObligationsPerMember,
  })

  return {
    ...snapshot,
    applicationNextCursor: applicationPage?.meta.cursor ?? null,
    applications:
      applicationPage?.data.map(toMobileFoodPurchaseApplication) ??
      snapshot.applications,
    canCreateApplication: availability.canCreateApplication,
    capability,
    policy: {
      allowsCommitmentReductionDuringPayback:
        policy.foodPurchaseAllowsCommitmentReductionDuringPayback,
      maximumActiveObligationsPerMember:
        profile.policy.foodPurchaseMaximumActiveObligationsPerMember,
      maximumPaybackMonths: policy.foodPurchaseMaximumPaybackMonths,
      requiresOpenCycle: profile.policy.foodPurchaseRequiresOpenCycle,
    },
    restrictionReasons: availability.restrictionReasons,
    state: snapshot.member
      ? ("available" as const)
      : ("member_profile_missing" as const),
    summary: applicationSummary
      ? { ...applicationSummary, openCycles: openCycleCount }
      : snapshot.summary,
  }
}

export async function getMobileMemberProjectFinancingService(input: {
  tenantId: string
  userId: string
}) {
  const snapshot = await getMobileMemberProjectFinancing(input)
  const prisma = createPrismaClient()
  if (!prisma) {
    return {
      ...snapshot,
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

  const migration = await getTenantInitialMigrationState(input.tenantId, prisma)
  const canUseLiveFinancialWrites = migration.snapshot.canUseLiveFinancialWrites
  const [requestPage, summary] = snapshot.member
    ? await Promise.all([
        listProjectFinancingRequestPage(
          {
            memberId: snapshot.member.id,
            pageSize: 20,
            tenantId: input.tenantId,
          },
          prisma
        ),
        getProjectFinancingSummary(input.tenantId, prisma, snapshot.member.id),
      ])
    : [null, null]
  return {
    ...snapshot,
    canCreateRequest: snapshot.member !== null && canUseLiveFinancialWrites,
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
    state: snapshot.member
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
