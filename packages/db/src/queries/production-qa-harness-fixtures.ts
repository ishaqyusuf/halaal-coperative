import { QueryInfrastructureError } from "../query-error"
import type { PrismaClient } from "../../generated/prisma/client"
import type { ProductionQaHarnessPlan } from "@halaalvest/domain"
import { ExpectedQueryError } from "../query-error"
import {
  approveMobileAdminProfitEntry,
  publishMobileAdminProfitEntry,
} from "./mobile-admin-share-profit-governance"
import { createMobileMemberReceiptForSession } from "./mobile-member-receipts"
import { updateTenantOperationProfileService } from "./operation-profile"
import { ensureTenantLedgerAccounts } from "./ledger"
import { recordContribution, setMemberContributionPlan } from "./contributions"
import {
  openMonthlyFinancingCycle,
  updateLoanProductSettings,
} from "./financing-cycles"
import {
  disburseLoan,
  refreshCollectionsStatuses,
  reviewLoanRequest,
  submitLoanRequest,
} from "./loans"
import {
  createMemberShareLedgerEntry,
  createShareBusiness,
  generateShareProfitAllocations,
} from "./tenant-finance"
import { createProcurementRequest } from "./procurement"
import { createProjectFinancingRequest } from "./project-financing"

const PENDING_REVIEW_REFERENCE_PREFIX = "QA-T30-STANDARD-REVIEW"
const PUBLISHED_PROFIT_BUSINESS_NAME =
  "QA ONLY — Published profit cooperative business"
const PUBLISHED_PROFIT_SHARE_SOURCE_ID = "0de2edc0-d134-4e15-9f43-30c39b54a301"
const PUBLISHED_PROFIT_APPROVE_COMMAND_ID =
  "a3c2ca67-1f55-4a9d-9d3b-4a5d4030e201"
const PUBLISHED_PROFIT_PUBLISH_COMMAND_ID =
  "5d95000c-3d70-48c0-bc99-ddc11cd5849d"
const STALE_STATE_AUDIT_ID = "612e318b-b529-49fc-9973-89efff5fb401"
const STALE_STATE_AUDIT_ACTION =
  "qa.production_contract.operation_profile.stale_state_rejected"
const STALE_STATE_SERVICE_KEY = "procurement"
const OVERDUE_CONTRIBUTION_AMOUNT = 600_000
const OVERDUE_CONTRIBUTION_PLAN_NAME = "QA ONLY — overdue financing capacity"
const OVERDUE_CONTRIBUTION_REFERENCE = "QA-T30-OVERDUE-CONTRIBUTION-01"
const OVERDUE_LOAN_PRODUCT_CODE = "QA30-OVERDUE"
const OVERDUE_LOAN_PRODUCT_NAME = "QA ONLY — overdue normal financing"
const OVERDUE_LOAN_PURPOSE = "QA ONLY — overdue financing lifecycle."
const OVERDUE_REQUEST_AMOUNT = 100_000
const OFFLINE_PROCUREMENT_ITEM_NAME = "Industrial sewing machine"
const OFFLINE_PROCUREMENT_SUBMISSION_KEY =
  "ba2f4fa9-257e-5dab-a301-4221807ef201"

export const PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE = {
  itemDescription:
    "QA ONLY — Existing procurement history for offline read verification.",
  itemName: OFFLINE_PROCUREMENT_ITEM_NAME,
  requestedCost: 180_000,
  requestedRepaymentMonths: 6,
  submissionKey: OFFLINE_PROCUREMENT_SUBMISSION_KEY,
  vendorName: "QA ONLY — Cooperative equipment desk",
} as const

export const PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE = {
  businessDescription:
    "QA ONLY — Cross-tenant project-financing isolation evidence.",
  businessName: "Barakah Solar Cold Storage",
  projectPurpose: "Cold-chain storage for cooperative produce.",
  proposedStructure: "repayable_facility" as const,
  requestedAmount: 260_000,
  requestedPaybackMonths: 12,
  submissionKey: "293d03f4-18ce-5ff0-a80d-d01bb310e812",
} as const

export const PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE = {
  businessDescription:
    "QA ONLY — Visible signed-tenant project-financing queue evidence.",
  businessName: "Ameenah Cooperative Bakery",
  projectPurpose: "Expand cooperative bread production.",
  proposedStructure: "repayable_facility" as const,
  requestedAmount: 185_000,
  requestedPaybackMonths: 10,
  submissionKey: "ab61f53c-f4dd-5346-a526-320dbc972db9",
} as const

export const PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE = {
  amount: 5_000,
  code: "QA30-RETRY",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  name: "Retry-safe levy",
  notes: "QA ONLY — verify one charge and one ledger effect after retry.",
} as const

export type ProductionQaDuplicateChargeFixtureResult = {
  actorUserId: string
  chargeDefinitionId: string
  member: {
    fullName: string
    id: string
    memberNumber: string
  }
  scenarioKey: "starter-healthy"
  status: "existing" | "provisioned"
  tenantId: string
}

export async function ensureProductionQaDuplicateChargeFixture(input: {
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
}): Promise<ProductionQaDuplicateChargeFixtureResult> {
  const scenario = input.plan.scenarios.find(
    ({ key }) => key === "starter-healthy"
  )
  const financeOfficer = scenario?.identities.find(
    ({ role }) => role === "finance_officer"
  )
  if (!scenario || !financeOfficer) {
    throw new QueryInfrastructureError("Duplicate-charge QA identity is missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) throw new QueryInfrastructureError("Duplicate-charge QA tenant is missing.")

  const actor = await input.prisma.user.findUnique({
    select: {
      id: true,
      memberProfile: {
        select: { fullName: true, id: true, memberNumber: true },
      },
    },
    where: {
      tenantId_email: {
        email: financeOfficer.email,
        tenantId: tenant.id,
      },
    },
  })
  const member =
    actor?.memberProfile ??
    (await input.prisma.member.findFirst({
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      select: { fullName: true, id: true, memberNumber: true },
      where: { status: "active", tenantId: tenant.id },
    }))
  if (!actor || !member) {
    throw new QueryInfrastructureError("Duplicate-charge QA actor or member is missing.")
  }

  await ensureTenantLedgerAccounts(tenant.id, input.prisma)

  const result = await input.prisma.$transaction(async (transaction) => {
    const existing = await transaction.chargeDefinition.findUnique({
      where: {
        tenantId_code: {
          code: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.code,
          tenantId: tenant.id,
        },
      },
    })
    const definition = existing
      ? await transaction.chargeDefinition.update({
          data: {
            amount: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount,
            appliesToMembers: true,
            chargeFrequency: "manual",
            chargeValueType: "fixed_amount",
            isActive: true,
            isMonthlyLevy: false,
            kind: "fixed",
            name: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.name,
            purpose: "general",
          },
          where: { id: existing.id, tenantId: tenant.id },
        })
      : await transaction.chargeDefinition.create({
          data: {
            amount: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount,
            appliesToMembers: true,
            chargeFrequency: "manual",
            chargeValueType: "fixed_amount",
            code: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.code,
            isActive: true,
            isMonthlyLevy: false,
            kind: "fixed",
            name: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.name,
            purpose: "general",
            tenantId: tenant.id,
          },
        })

    const version = await transaction.chargeDefinitionVersion.findFirst({
      where: {
        chargeDefinitionId: definition.id,
        effectiveFrom: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.effectiveFrom,
        tenantId: tenant.id,
      },
    })
    if (version) {
      await transaction.chargeDefinitionVersion.update({
        data: {
          amount: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount,
          chargeValueType: "fixed_amount",
          kind: "fixed",
        },
        where: { id: version.id, tenantId: tenant.id },
      })
    } else {
      await transaction.chargeDefinitionVersion.create({
        data: {
          amount: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.amount,
          chargeDefinitionId: definition.id,
          chargeValueType: "fixed_amount",
          effectiveFrom: PRODUCTION_QA_DUPLICATE_CHARGE_FIXTURE.effectiveFrom,
          kind: "fixed",
          tenantId: tenant.id,
        },
      })
    }

    const applicability = await transaction.chargeApplicability.findFirst({
      where: {
        chargeDefinitionId: definition.id,
        trigger: "manual",
        workflow: "commitment_collection",
      },
    })
    if (applicability) {
      await transaction.chargeApplicability.update({
        data: {
          collectionMode: "deduct_from_savings",
          isActive: true,
          isRequired: false,
        },
        where: { id: applicability.id },
      })
    } else {
      await transaction.chargeApplicability.create({
        data: {
          chargeDefinitionId: definition.id,
          collectionMode: "deduct_from_savings",
          isActive: true,
          isRequired: false,
          tenantId: tenant.id,
          trigger: "manual",
          workflow: "commitment_collection",
        },
      })
    }

    return {
      chargeDefinitionId: definition.id,
      status: existing ? ("existing" as const) : ("provisioned" as const),
    }
  })

  return {
    actorUserId: actor.id,
    chargeDefinitionId: result.chargeDefinitionId,
    member,
    scenarioKey: "starter-healthy",
    status: result.status,
    tenantId: tenant.id,
  }
}

type CreateMemberReceipt = typeof createMobileMemberReceiptForSession
type UpdateOperationProfileService = typeof updateTenantOperationProfileService

function addUtcDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000)
}

function getUtcMonthStart(value: Date, monthOffset = 0) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + monthOffset, 1)
  )
}

function getUtcMonthEnd(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0))
}

async function prepareProductionQaHarnessProfitPeriod(input: {
  actorUserId: string
  businessId: string
  occurredAt: Date
  profitEntryId: string
  qaDomain: string
  tenantId: string
  prisma: PrismaClient
}) {
  return input.prisma.$transaction(async (transaction) => {
    const tenant = await transaction.tenant.findFirst({
      select: { id: true },
      where: {
        dataClassification: "qa",
        id: input.tenantId,
        qaSourceDomain: input.qaDomain,
      },
    })
    if (!tenant) {
      throw new QueryInfrastructureError("Published-profit fixture tenant is not QA-owned.")
    }

    const fixtureEntry = await transaction.shareBusinessProfitEntry.findFirst({
      include: {
        linkedDividendPeriod: {
          select: { id: true, status: true },
        },
        shareBusiness: { select: { id: true, name: true } },
      },
      where: {
        id: input.profitEntryId,
        shareBusinessId: input.businessId,
        tenantId: input.tenantId,
      },
    })
    if (
      !fixtureEntry?.linkedDividendPeriod ||
      fixtureEntry.shareBusiness.name !== PUBLISHED_PROFIT_BUSINESS_NAME
    ) {
      throw new QueryInfrastructureError("Published-profit fixture period ownership is invalid.")
    }
    if (
      fixtureEntry.linkedDividendPeriod.status === "approved" ||
      fixtureEntry.linkedDividendPeriod.status === "published"
    ) {
      return fixtureEntry.linkedDividendPeriod.id
    }
    if (fixtureEntry.linkedDividendPeriod.status !== "draft") {
      throw new QueryInfrastructureError("Published-profit fixture period is not reviewable.")
    }

    const periodEntries = await transaction.shareBusinessProfitEntry.findMany({
      select: {
        expenseAmount: true,
        id: true,
        profitAmount: true,
        shareBusinessId: true,
      },
      where: {
        linkedDividendPeriodId: fixtureEntry.linkedDividendPeriod.id,
        status: { not: "archived" },
        tenantId: input.tenantId,
      },
    })
    if (
      periodEntries.length === 0 ||
      periodEntries.some(
        ({ shareBusinessId }) => shareBusinessId !== input.businessId
      )
    ) {
      throw new QueryInfrastructureError("Published-profit fixture period contains foreign rows.")
    }

    const totalProfitAmount = periodEntries.reduce(
      (total, entry) => total + Number(entry.profitAmount),
      0
    )
    const distributableAmount = periodEntries.reduce(
      (total, entry) =>
        total + Number(entry.profitAmount) - Number(entry.expenseAmount),
      0
    )
    if (
      !Number.isFinite(totalProfitAmount) ||
      !Number.isFinite(distributableAmount) ||
      distributableAmount <= 0
    ) {
      throw new QueryInfrastructureError("Published-profit fixture period totals are invalid.")
    }

    await transaction.dividendPeriod.update({
      data: {
        deductionAmount: 0,
        deductionReason: null,
        distributableAmount,
        status: "approved",
        totalProfitAmount,
      },
      where: {
        id: fixtureEntry.linkedDividendPeriod.id,
        tenantId: input.tenantId,
      },
    })
    for (const entry of periodEntries) {
      await transaction.shareBusinessProfitEntry.update({
        data: {
          allocatableProfitAmount:
            Number(entry.profitAmount) - Number(entry.expenseAmount),
          status: "reviewed",
        },
        where: { id: entry.id, tenantId: input.tenantId },
      })
    }
    await transaction.auditLog.create({
      data: {
        action: "qa.production_contract.profit_period.prepared",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: fixtureEntry.linkedDividendPeriod.id,
        entityType: "DividendPeriod",
        metadata: {
          businessId: input.businessId,
          fixture: "published_profit",
          profitEntryCount: periodEntries.length,
        },
        occurredAt: input.occurredAt,
        tenantId: input.tenantId,
      },
    })

    return fixtureEntry.linkedDividendPeriod.id
  })
}

export type ProductionQaHarnessFixtureResult = {
  recordId: string
  recordType:
    | "DividendPeriod"
    | "MemberPaymentReceipt"
    | "ProcurementRequest"
    | "ProjectFinancingRequest"
    | "RepaymentScheduleItem"
    | "TenantServiceSetting"
  scenarioKey: string
  state:
    | "offline_history"
    | "foreign_project_financing"
    | "local_project_financing"
    | "overdue"
    | "pending_review"
    | "published_profit"
    | "stale"
  status: "existing" | "provisioned"
}

async function ensureProductionQaProjectFinancingFixture(input: {
  fixture:
    | typeof PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE
    | typeof PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
  scenarioKey: "growth-overdue" | "standard-review"
  state: "foreign_project_financing" | "local_project_financing"
}): Promise<ProductionQaHarnessFixtureResult> {
  const scenario = input.plan.scenarios.find(
    ({ key }) => key === input.scenarioKey
  )
  const memberIdentity = scenario?.identities.find(
    ({ role }) => role === "member"
  )
  if (!scenario || !memberIdentity) {
    throw new QueryInfrastructureError("Project-financing QA identity is missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError("Project-financing QA tenant is missing.")
  }

  const memberUser = await input.prisma.user.findUnique({
    select: { id: true, memberProfile: { select: { id: true } } },
    where: {
      tenantId_email: {
        email: memberIdentity.email,
        tenantId: tenant.id,
      },
    },
  })
  if (!memberUser?.memberProfile) {
    throw new QueryInfrastructureError("Project-financing QA member is missing.")
  }

  const existing = await input.prisma.projectFinancingRequest.findFirst({
    where: {
      createdByUserId: memberUser.id,
      memberId: memberUser.memberProfile.id,
      submissionKey: input.fixture.submissionKey,
      tenantId: tenant.id,
    },
  })
  if (existing) {
    if (
      existing.businessName !== input.fixture.businessName ||
      Number(existing.requestedAmount) !== input.fixture.requestedAmount ||
      existing.requestedPaybackMonths !== input.fixture.requestedPaybackMonths
    ) {
      throw new QueryInfrastructureError("Project-financing QA fixture collided.")
    }
    return {
      recordId: existing.id,
      recordType: "ProjectFinancingRequest",
      scenarioKey: scenario.key,
      state: input.state,
      status: "existing",
    }
  }

  const request = await createProjectFinancingRequest(
    {
      actorUserId: memberUser.id,
      ...input.fixture,
      memberId: memberUser.memberProfile.id,
      tenantId: tenant.id,
    },
    input.prisma
  )

  return {
    recordId: request.id,
    recordType: "ProjectFinancingRequest",
    scenarioKey: scenario.key,
    state: input.state,
    status: "provisioned",
  }
}

export function ensureProductionQaForeignProjectFinancingFixture(input: {
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
}) {
  return ensureProductionQaProjectFinancingFixture({
    ...input,
    fixture: PRODUCTION_QA_FOREIGN_PROJECT_FINANCING_FIXTURE,
    scenarioKey: "growth-overdue",
    state: "foreign_project_financing",
  })
}

export function ensureProductionQaLocalProjectFinancingFixture(input: {
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
}) {
  return ensureProductionQaProjectFinancingFixture({
    ...input,
    fixture: PRODUCTION_QA_LOCAL_PROJECT_FINANCING_FIXTURE,
    scenarioKey: "standard-review",
    state: "local_project_financing",
  })
}

export async function ensureProductionQaOfflineProcurementFixture(input: {
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
}): Promise<ProductionQaHarnessFixtureResult> {
  const scenario = input.plan.scenarios.find(
    ({ key }) => key === "starter-healthy"
  )
  const memberIdentity = scenario?.identities.find(
    ({ role }) => role === "member"
  )
  const staffIdentity = scenario?.identities.find(
    ({ role }) => role === "tenant_admin"
  )
  if (!scenario || !memberIdentity || !staffIdentity) {
    throw new QueryInfrastructureError("Offline Procurement QA identities are missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError("Offline Procurement QA tenant is missing.")
  }

  const [memberUser, staffUser] = await Promise.all([
    input.prisma.user.findUnique({
      select: { memberProfile: { select: { id: true } } },
      where: {
        tenantId_email: {
          email: memberIdentity.email,
          tenantId: tenant.id,
        },
      },
    }),
    input.prisma.user.findUnique({
      select: { id: true },
      where: {
        tenantId_email: {
          email: staffIdentity.email,
          tenantId: tenant.id,
        },
      },
    }),
  ])
  if (!memberUser?.memberProfile || !staffUser) {
    throw new QueryInfrastructureError("Offline Procurement QA profiles are missing.")
  }

  const existing = await input.prisma.procurementRequest.findFirst({
    where: {
      createdByUserId: staffUser.id,
      memberId: memberUser.memberProfile.id,
      submissionKey: PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.submissionKey,
      tenantId: tenant.id,
    },
  })
  if (existing) {
    if (
      existing.itemName !==
        PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.itemName ||
      Number(existing.requestedCost) !==
        PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.requestedCost ||
      existing.requestedRepaymentMonths !==
        PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE.requestedRepaymentMonths
    ) {
      throw new QueryInfrastructureError("Offline Procurement QA fixture collided.")
    }
    return {
      recordId: existing.id,
      recordType: "ProcurementRequest",
      scenarioKey: scenario.key,
      state: "offline_history",
      status: "existing",
    }
  }

  const request = await createProcurementRequest(
    {
      actorUserId: staffUser.id,
      ...PRODUCTION_QA_OFFLINE_PROCUREMENT_FIXTURE,
      memberId: memberUser.memberProfile.id,
      requestSource: "staff",
      tenantId: tenant.id,
    },
    input.prisma
  )

  return {
    recordId: request.id,
    recordType: "ProcurementRequest",
    scenarioKey: scenario.key,
    state: "offline_history",
    status: "provisioned",
  }
}

export async function ensureProductionQaHarnessOverdueFixture(input: {
  now: Date
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
}): Promise<ProductionQaHarnessFixtureResult> {
  const scenario = input.plan.scenarios.find(({ state }) => state === "overdue")
  if (!scenario) {
    throw new QueryInfrastructureError("Overdue QA harness scenario is missing.")
  }
  const memberIdentity = scenario.identities.find(
    ({ role }) => role === "member"
  )
  const adminIdentity = scenario.identities.find(
    ({ role }) => role === "tenant_admin"
  )
  const financeIdentity = scenario.identities.find(
    ({ role }) => role === "finance_officer"
  )
  if (!memberIdentity || !adminIdentity || !financeIdentity) {
    throw new QueryInfrastructureError("Overdue QA harness identities are missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError("Overdue QA harness tenant is missing.")
  }

  const [memberUser, adminUser, financeUser] = await Promise.all([
    input.prisma.user.findUnique({
      select: {
        id: true,
        memberProfile: { select: { id: true, joinedAt: true } },
      },
      where: {
        tenantId_email: { email: memberIdentity.email, tenantId: tenant.id },
      },
    }),
    input.prisma.user.findUnique({
      select: { id: true },
      where: {
        tenantId_email: { email: adminIdentity.email, tenantId: tenant.id },
      },
    }),
    input.prisma.user.findUnique({
      select: { id: true },
      where: {
        tenantId_email: { email: financeIdentity.email, tenantId: tenant.id },
      },
    }),
  ])
  if (!memberUser?.memberProfile || !adminUser || !financeUser) {
    throw new QueryInfrastructureError("Overdue QA harness role profiles are missing.")
  }

  const loadRequest = () =>
    input.prisma.loanRequest.findFirst({
      include: {
        approvals: {
          select: { action: true, actorUserId: true },
        },
        loan: {
          include: {
            repaymentScheduleItems: {
              orderBy: { installmentNumber: "asc" },
            },
          },
        },
      },
      where: {
        memberId: memberUser.memberProfile!.id,
        purpose: OVERDUE_LOAN_PURPOSE,
        tenantId: tenant.id,
      },
    })

  let request = await loadRequest()
  const existingOverdue = request?.loan?.repaymentScheduleItems.find(
    ({ dueAt, status }) => status === "overdue" && dueAt < input.now
  )
  if (existingOverdue) {
    return {
      recordId: existingOverdue.id,
      recordType: "RepaymentScheduleItem",
      scenarioKey: scenario.key,
      state: "overdue",
      status: "existing",
    }
  }

  const periodStart = getUtcMonthStart(input.now, -3)
  const periodEnd = getUtcMonthEnd(periodStart)
  const contributionPostedAt = addUtcDays(periodStart, 1)
  const openedAt = addUtcDays(periodStart, 2)
  const requestedAt = addUtcDays(periodStart, 3)
  const firstReviewedAt = addUtcDays(periodStart, 4)
  const secondReviewedAt = addUtcDays(periodStart, 5)
  const disbursedAt = addUtcDays(periodStart, 6)
  const firstRepaymentDueAt = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 10)
  )
  if (firstRepaymentDueAt >= input.now) {
    throw new QueryInfrastructureError("Overdue QA harness clock cannot produce a past due date.")
  }

  await ensureTenantLedgerAccounts(tenant.id, input.prisma)

  let contributionPlan = await input.prisma.contributionPlan.findFirst({
    where: {
      memberId: memberUser.memberProfile.id,
      name: OVERDUE_CONTRIBUTION_PLAN_NAME,
      tenantId: tenant.id,
    },
  })
  if (contributionPlan) {
    if (
      !contributionPlan.isActive ||
      Number(contributionPlan.amount) !== OVERDUE_CONTRIBUTION_AMOUNT
    ) {
      throw new QueryInfrastructureError("Overdue QA harness contribution plan collided.")
    }
  } else {
    contributionPlan = await setMemberContributionPlan(
      {
        actorUserId: adminUser.id,
        amount: OVERDUE_CONTRIBUTION_AMOUNT,
        memberId: memberUser.memberProfile.id,
        name: OVERDUE_CONTRIBUTION_PLAN_NAME,
        startsAt: memberUser.memberProfile.joinedAt,
        tenantId: tenant.id,
      },
      input.prisma
    )
  }

  const existingContribution = await input.prisma.contribution.findFirst({
    where: { reference: OVERDUE_CONTRIBUTION_REFERENCE, tenantId: tenant.id },
  })
  if (existingContribution) {
    if (
      existingContribution.memberId !== memberUser.memberProfile.id ||
      existingContribution.contributionPlanId !== contributionPlan.id ||
      existingContribution.status !== "posted" ||
      Number(existingContribution.amount) !== OVERDUE_CONTRIBUTION_AMOUNT
    ) {
      throw new QueryInfrastructureError("Overdue QA harness contribution reference collided.")
    }
  } else {
    await recordContribution(
      {
        actorUserId: adminUser.id,
        amount: OVERDUE_CONTRIBUTION_AMOUNT,
        channel: "transfer",
        committedAmount: OVERDUE_CONTRIBUTION_AMOUNT,
        contributionPlanId: contributionPlan.id,
        memberId: memberUser.memberProfile.id,
        notes: "QA ONLY — funds the overdue financing contract state.",
        periodLabel: periodStart.toISOString().slice(0, 7),
        postedAt: contributionPostedAt,
        reference: OVERDUE_CONTRIBUTION_REFERENCE,
        tenantId: tenant.id,
      },
      input.prisma
    )
  }

  let product = await input.prisma.loanProduct.findFirst({
    where: { code: OVERDUE_LOAN_PRODUCT_CODE, tenantId: tenant.id },
  })
  if (
    !product ||
    !product.isActive ||
    product.loanType !== "normal" ||
    product.termMonths !== 3 ||
    Number(product.maxSavingsMultiple) !== 2 ||
    product.name !== OVERDUE_LOAN_PRODUCT_NAME
  ) {
    const existingNormalProduct =
      product ??
      (await input.prisma.loanProduct.findFirst({
        orderBy: { createdAt: "asc" },
        where: { loanType: "normal", tenantId: tenant.id },
      }))
    product = await updateLoanProductSettings(
      {
        actorUserId: adminUser.id,
        code: OVERDUE_LOAN_PRODUCT_CODE,
        isActive: true,
        loanProductId: existingNormalProduct?.id,
        loanType: "normal",
        maxSavingsMultiple: 2,
        name: OVERDUE_LOAN_PRODUCT_NAME,
        tenantId: tenant.id,
        termMonths: 3,
      },
      input.prisma
    )
  }

  const cycle = await input.prisma.financingCycle.findUnique({
    where: {
      tenantId_periodStart_periodEnd: {
        periodEnd,
        periodStart,
        tenantId: tenant.id,
      },
    },
  })
  if (cycle?.status === "closed") {
    throw new QueryInfrastructureError("Overdue QA harness financing cycle is closed.")
  }
  if (cycle?.status !== "open") {
    await openMonthlyFinancingCycle(
      {
        actorUserId: adminUser.id,
        openedAt,
        periodStart,
        statusNote: "QA ONLY — historical cycle for overdue state coverage.",
        tenantId: tenant.id,
      },
      input.prisma
    )
  }

  if (!request) {
    await submitLoanRequest(
      {
        actorUserId: memberUser.id,
        loanProductId: product.id,
        memberId: memberUser.memberProfile.id,
        purpose: OVERDUE_LOAN_PURPOSE,
        requestedAmount: OVERDUE_REQUEST_AMOUNT,
        requestedAt,
        requestedTermMonths: 3,
        tenantId: tenant.id,
      },
      input.prisma
    )
    request = await loadRequest()
  }
  if (!request) {
    throw new QueryInfrastructureError("Overdue QA harness financing request is missing.")
  }
  if (["cancelled", "expired", "rejected"].includes(request.status)) {
    throw new QueryInfrastructureError("Overdue QA harness financing request is terminal.")
  }

  const approveWith = async (actorUserId: string, reviewedAt: Date) => {
    if (!request || request.status === "approved") return
    await reviewLoanRequest(
      {
        actorUserId,
        expectedStatus: request.status,
        loanRequestId: request.id,
        notes: "QA ONLY — approved for overdue lifecycle evidence.",
        reviewedAt,
        status: "approved",
        tenantId: tenant.id,
      },
      input.prisma
    )
    request = await loadRequest()
    if (!request) {
      throw new QueryInfrastructureError("Overdue QA harness financing request disappeared.")
    }
  }

  const approvedActors = new Set(
    request.approvals
      .filter(({ action }) => action === "approved")
      .map(({ actorUserId }) => actorUserId)
  )
  if (!approvedActors.has(adminUser.id)) {
    await approveWith(adminUser.id, firstReviewedAt)
  }
  if (!approvedActors.has(financeUser.id)) {
    await approveWith(financeUser.id, secondReviewedAt)
  }
  if (request.status !== "approved" || !request.loan) {
    throw new QueryInfrastructureError("Overdue QA harness financing approval did not complete.")
  }

  if (request.loan.status === "approved") {
    await disburseLoan(
      {
        actorUserId: financeUser.id,
        disbursedAt,
        expectedStatus: "approved",
        firstRepaymentDueAt: firstRepaymentDueAt.toISOString().slice(0, 10),
        loanId: request.loan.id,
        tenantId: tenant.id,
      },
      input.prisma
    )
    request = await loadRequest()
  }
  if (
    !request?.loan ||
    !["active", "disbursed"].includes(request.loan.status)
  ) {
    throw new QueryInfrastructureError(
      "Overdue QA harness financing disbursement did not complete."
    )
  }

  const pastDueSchedule = request.loan.repaymentScheduleItems.find(
    ({ dueAt, status }) =>
      dueAt < input.now && ["due", "overdue", "partially_paid"].includes(status)
  )
  if (!pastDueSchedule) {
    throw new QueryInfrastructureError("Overdue QA harness repayment schedule is missing.")
  }
  if (pastDueSchedule.status !== "overdue") {
    await refreshCollectionsStatuses(
      { actorUserId: financeUser.id, asOf: input.now, tenantId: tenant.id },
      input.prisma
    )
    request = await loadRequest()
  }

  const overdueSchedule = request?.loan?.repaymentScheduleItems.find(
    ({ dueAt, status }) => status === "overdue" && dueAt < input.now
  )
  if (!overdueSchedule) {
    throw new QueryInfrastructureError("Overdue QA harness collection refresh did not complete.")
  }

  return {
    recordId: overdueSchedule.id,
    recordType: "RepaymentScheduleItem",
    scenarioKey: scenario.key,
    state: "overdue",
    status: "provisioned",
  }
}

export async function ensureProductionQaHarnessStaleStateFixture(
  input: {
    now: Date
    plan: ProductionQaHarnessPlan
    prisma: PrismaClient
  },
  dependencies?: { updateService?: UpdateOperationProfileService }
): Promise<ProductionQaHarnessFixtureResult> {
  const scenario = input.plan.scenarios.find(({ state }) => state === "stale")
  if (!scenario) {
    throw new QueryInfrastructureError("Stale-state QA harness scenario is missing.")
  }
  const adminIdentity = scenario.identities.find(
    ({ role }) => role === "tenant_admin"
  )
  if (!adminIdentity) {
    throw new QueryInfrastructureError("Stale-state QA harness administrator is missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError("Stale-state QA harness tenant is missing.")
  }
  const [adminUser, setting, existingAudit] = await Promise.all([
    input.prisma.user.findUnique({
      select: { id: true },
      where: {
        tenantId_email: { email: adminIdentity.email, tenantId: tenant.id },
      },
    }),
    input.prisma.tenantServiceSetting.findUnique({
      select: { accessMode: true, id: true },
      where: {
        tenantId_serviceKey: {
          serviceKey: STALE_STATE_SERVICE_KEY,
          tenantId: tenant.id,
        },
      },
    }),
    input.prisma.auditLog.findUnique({
      select: { action: true, entityId: true, id: true, tenantId: true },
      where: { id: STALE_STATE_AUDIT_ID },
    }),
  ])
  const expectedActualMode = scenario.serviceModes[STALE_STATE_SERVICE_KEY]
  if (!adminUser || !setting || setting.accessMode !== expectedActualMode) {
    throw new QueryInfrastructureError("Stale-state QA harness prerequisite is invalid.")
  }
  if (existingAudit) {
    if (
      existingAudit.action !== STALE_STATE_AUDIT_ACTION ||
      existingAudit.entityId !== setting.id ||
      existingAudit.tenantId !== tenant.id
    ) {
      throw new QueryInfrastructureError("Stale-state QA harness audit identity collided.")
    }
    return {
      recordId: setting.id,
      recordType: "TenantServiceSetting",
      scenarioKey: scenario.key,
      state: "stale",
      status: "existing",
    }
  }

  const updateService =
    dependencies?.updateService ?? updateTenantOperationProfileService
  try {
    await updateService(
      {
        actorUserId: adminUser.id,
        changeReason: "QA ONLY — stale expected-state rejection.",
        expectedAccessMode: "member_self_service",
        nextAccessMode: "office_only",
        serviceKey: STALE_STATE_SERVICE_KEY,
        tenantId: tenant.id,
      },
      input.prisma
    )
    throw new QueryInfrastructureError("Stale-state QA harness command was not rejected.")
  } catch (error) {
    if (!(error instanceof ExpectedQueryError) || error.code !== "CONFLICT") {
      throw error
    }
  }

  await input.prisma.$transaction(async (transaction) => {
    const unchanged = await transaction.tenantServiceSetting.findUnique({
      select: { accessMode: true, id: true },
      where: {
        tenantId_serviceKey: {
          serviceKey: STALE_STATE_SERVICE_KEY,
          tenantId: tenant.id,
        },
      },
    })
    if (
      !unchanged ||
      unchanged.id !== setting.id ||
      unchanged.accessMode !== expectedActualMode
    ) {
      throw new QueryInfrastructureError("Stale-state rejection changed the governed record.")
    }
    await transaction.auditLog.create({
      data: {
        action: STALE_STATE_AUDIT_ACTION,
        actorType: "user",
        actorUserId: adminUser.id,
        entityId: setting.id,
        entityType: "TenantServiceSetting",
        id: STALE_STATE_AUDIT_ID,
        metadata: {
          actualAccessMode: expectedActualMode,
          attemptedExpectedAccessMode: "member_self_service",
          fixture: "stale",
          serviceKey: STALE_STATE_SERVICE_KEY,
          status: "rejected",
        },
        occurredAt: input.now,
        tenantId: tenant.id,
      },
    })
  })

  return {
    recordId: setting.id,
    recordType: "TenantServiceSetting",
    scenarioKey: scenario.key,
    state: "stale",
    status: "provisioned",
  }
}

export async function ensureProductionQaHarnessPendingReviewFixture(
  input: {
    now: Date
    plan: ProductionQaHarnessPlan
    prisma: PrismaClient
  },
  dependencies?: { createMemberReceipt?: CreateMemberReceipt }
): Promise<ProductionQaHarnessFixtureResult> {
  const scenario = input.plan.scenarios.find(
    ({ state }) => state === "pending_review"
  )
  if (!scenario) {
    throw new QueryInfrastructureError("Pending-review QA harness scenario is missing.")
  }
  const memberIdentity = scenario.identities.find(
    ({ role }) => role === "member"
  )
  if (!memberIdentity) {
    throw new QueryInfrastructureError("Pending-review QA harness member identity is missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError("Pending-review QA harness tenant is missing.")
  }
  const user = await input.prisma.user.findUnique({
    select: { id: true, memberProfile: { select: { id: true } } },
    where: {
      tenantId_email: { email: memberIdentity.email, tenantId: tenant.id },
    },
  })
  if (!user?.memberProfile) {
    throw new QueryInfrastructureError("Pending-review QA harness member profile is missing.")
  }

  const existing = await input.prisma.memberPaymentReceipt.findFirst({
    orderBy: { submittedAt: "desc" },
    select: { id: true },
    where: {
      paymentReference: { startsWith: PENDING_REVIEW_REFERENCE_PREFIX },
      status: { in: ["submitted", "under_review"] },
      tenantId: tenant.id,
    },
  })
  if (existing) {
    return {
      recordId: existing.id,
      recordType: "MemberPaymentReceipt",
      scenarioKey: scenario.key,
      state: "pending_review",
      status: "existing",
    }
  }

  const priorFixtureCount = await input.prisma.memberPaymentReceipt.count({
    where: {
      paymentReference: { startsWith: PENDING_REVIEW_REFERENCE_PREFIX },
      tenantId: tenant.id,
    },
  })
  const paymentReference = `${PENDING_REVIEW_REFERENCE_PREFIX}-${String(priorFixtureCount + 1).padStart(2, "0")}`
  const paidAt = new Date(input.now.getTime() - 24 * 60 * 60 * 1000)
  const targetPeriodStart = new Date(
    Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1)
  )
  const createMemberReceipt =
    dependencies?.createMemberReceipt ?? createMobileMemberReceiptForSession
  const receipt = await createMemberReceipt(
    {
      allocations: [
        {
          amount: 30_000,
          category: "special_savings",
          periodIntent: "current_period",
          targetPeriodStart,
        },
      ],
      channel: "transfer",
      memberNotes: "QA ONLY — receipt awaiting review.",
      paidAt,
      paymentReference,
      tenantId: tenant.id,
      totalAmount: 30_000,
      userId: user.id,
    },
    input.prisma
  )

  return {
    recordId: receipt.id,
    recordType: "MemberPaymentReceipt",
    scenarioKey: scenario.key,
    state: "pending_review",
    status: "provisioned",
  }
}

export async function ensureProductionQaHarnessPublishedProfitFixture(input: {
  now: Date
  plan: ProductionQaHarnessPlan
  prisma: PrismaClient
}): Promise<ProductionQaHarnessFixtureResult> {
  const scenario = input.plan.scenarios.find(
    ({ state }) => state === "published_profit"
  )
  if (!scenario) {
    throw new QueryInfrastructureError("Published-profit QA harness scenario is missing.")
  }
  const memberIdentity = scenario.identities.find(
    ({ role }) => role === "member"
  )
  const adminIdentity = scenario.identities.find(
    ({ role }) => role === "tenant_admin"
  )
  if (!memberIdentity || !adminIdentity) {
    throw new QueryInfrastructureError("Published-profit QA harness identities are missing.")
  }

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError("Published-profit QA harness tenant is missing.")
  }

  const existingBusiness = await input.prisma.shareBusiness.findFirst({
    select: {
      id: true,
      profitEntries: {
        orderBy: { createdAt: "asc" },
        select: {
          linkedDividendPeriod: { select: { id: true, status: true } },
        },
      },
    },
    where: { name: PUBLISHED_PROFIT_BUSINESS_NAME, tenantId: tenant.id },
  })
  const existingPeriod = existingBusiness?.profitEntries.find(
    ({ linkedDividendPeriod }) => linkedDividendPeriod?.status === "published"
  )?.linkedDividendPeriod
  if (existingPeriod) {
    return {
      recordId: existingPeriod.id,
      recordType: "DividendPeriod",
      scenarioKey: scenario.key,
      state: "published_profit",
      status: "existing",
    }
  }

  const [memberUser, adminUser] = await Promise.all([
    input.prisma.user.findUnique({
      select: { id: true, memberProfile: { select: { id: true } } },
      where: {
        tenantId_email: { email: memberIdentity.email, tenantId: tenant.id },
      },
    }),
    input.prisma.user.findUnique({
      select: { id: true },
      where: {
        tenantId_email: { email: adminIdentity.email, tenantId: tenant.id },
      },
    }),
  ])
  if (!memberUser?.memberProfile || !adminUser) {
    throw new QueryInfrastructureError("Published-profit QA harness role profiles are missing.")
  }

  const shareEntry = await input.prisma.memberShareLedgerEntry.findFirst({
    select: { id: true },
    where: {
      memberId: memberUser.memberProfile.id,
      sourceId: PUBLISHED_PROFIT_SHARE_SOURCE_ID,
      sourceType: "manual_adjustment",
      tenantId: tenant.id,
    },
  })
  if (!shareEntry) {
    await createMemberShareLedgerEntry(
      {
        amount: 100_000,
        createdByUserId: adminUser.id,
        effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
        memberId: memberUser.memberProfile.id,
        notes: "QA ONLY — published-profit allocation basis.",
        sourceId: PUBLISHED_PROFIT_SHARE_SOURCE_ID,
        sourceType: "manual_adjustment",
        tenantId: tenant.id,
      },
      input.prisma
    )
  }

  let business = existingBusiness ? { id: existingBusiness.id } : null
  if (!business) {
    const created = await createShareBusiness(
      {
        capitalAmount: 100_000,
        createdByUserId: adminUser.id,
        endDate: new Date("2026-06-30T00:00:00.000Z"),
        name: PUBLISHED_PROFIT_BUSINESS_NAME,
        notes: "QA ONLY — publication workflow baseline.",
        profitAmount: 20_000,
        profitEntries: [
          {
            allocatableProfitAmount: 20_000,
            expenseAmount: 0,
            profitAmount: 20_000,
            profitDate: new Date("2026-06-30T00:00:00.000Z"),
            reason: "QA ONLY — verified cooperative business result.",
            status: "reviewed",
          },
        ],
        referenceDate: input.now,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        status: "completed",
        tenantId: tenant.id,
      },
      input.prisma
    )
    business = { id: created.id }
  }

  let profitEntry = await input.prisma.shareBusinessProfitEntry.findFirst({
    include: {
      allocations: { select: { id: true } },
      linkedDividendPeriod: { select: { id: true, status: true } },
    },
    where: { shareBusinessId: business.id, tenantId: tenant.id },
  })
  if (!profitEntry) {
    throw new QueryInfrastructureError("Published-profit QA harness profit entry is missing.")
  }

  if (profitEntry.linkedDividendPeriod?.status !== "approved") {
    await prepareProductionQaHarnessProfitPeriod({
      actorUserId: adminUser.id,
      businessId: business.id,
      occurredAt: input.now,
      profitEntryId: profitEntry.id,
      qaDomain: input.plan.qaDomain,
      tenantId: tenant.id,
      prisma: input.prisma,
    })
    profitEntry = await input.prisma.shareBusinessProfitEntry.findFirst({
      include: {
        allocations: { select: { id: true } },
        linkedDividendPeriod: { select: { id: true, status: true } },
      },
      where: { id: profitEntry.id, tenantId: tenant.id },
    })
    if (!profitEntry) {
      throw new QueryInfrastructureError("Published-profit QA harness review state is missing.")
    }
  }

  if (profitEntry.allocations.length === 0) {
    await generateShareProfitAllocations(
      {
        actorUserId: adminUser.id,
        profitEntryId: profitEntry.id,
        tenantId: tenant.id,
      },
      input.prisma
    )
  }
  if (profitEntry.status === "reviewed") {
    await approveMobileAdminProfitEntry({
      actorUserId: adminUser.id,
      commandId: PUBLISHED_PROFIT_APPROVE_COMMAND_ID,
      expectedState: "reviewed",
      notes: "QA ONLY — reconciled publication approval.",
      profitEntryId: profitEntry.id,
      tenantId: tenant.id,
    })
  }

  const approvedEntry = await input.prisma.shareBusinessProfitEntry.findFirst({
    select: { id: true, linkedDividendPeriodId: true, status: true },
    where: { id: profitEntry.id, tenantId: tenant.id },
  })
  if (!approvedEntry?.linkedDividendPeriodId) {
    throw new QueryInfrastructureError("Published-profit QA harness period link is missing.")
  }
  if (approvedEntry.status === "approved") {
    await publishMobileAdminProfitEntry({
      actorUserId: adminUser.id,
      commandId: PUBLISHED_PROFIT_PUBLISH_COMMAND_ID,
      expectedState: "approved",
      profitEntryId: approvedEntry.id,
      tenantId: tenant.id,
    })
  }

  const publishedPeriod = await input.prisma.dividendPeriod.findFirst({
    select: { id: true },
    where: {
      id: approvedEntry.linkedDividendPeriodId,
      status: "published",
      tenantId: tenant.id,
    },
  })
  if (!publishedPeriod) {
    throw new QueryInfrastructureError("Published-profit QA harness publication did not complete.")
  }

  return {
    recordId: publishedPeriod.id,
    recordType: "DividendPeriod",
    scenarioKey: scenario.key,
    state: "published_profit",
    status: "provisioned",
  }
}
