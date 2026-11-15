import type { PrismaClient } from "../../generated/prisma/client"
import type { ProductionQaHarnessPlan } from "@halaalvest/domain"
import { QueryInfrastructureError } from "../query-error"
import { applyCharge } from "./charges"
import { createFoodPurchaseCycle } from "./food-purchase"
import { ensureTenantLedgerAccounts } from "./ledger"
import { getMemberOperationalReadiness } from "./member-readiness"
import {
  applyMemberOpeningBalance,
  createMemberOpeningBalance,
  reviewMemberOpeningBalance,
} from "./opening-balances"

/**
 * The member-ready QA cooperative (`standard-ready`): a live, member
 * self-service tenant whose QA member can ask for procurement, project
 * financing and foodstuff and send receipts today, with charges on those
 * requests and one pay-separately charge waiting for Record payment.
 */
export const PRODUCTION_QA_MEMBER_READY_FIXTURE = {
  foodCycleReleasedAmount: 500_000,
  openingCommitmentSavings: 250_000,
  openingDate: new Date("2026-01-01T00:00:00.000Z"),
  openingNotes: "QA ONLY — brought-forward savings for the ready member.",
  separateCharge: {
    amount: 2_000,
    code: "QA-PASSBOOK-FEE",
    name: "Passbook fee",
    notes: "QA ONLY — pay-separately charge awaiting Record payment.",
  },
  workflowCharges: [
    {
      amount: 1_000,
      code: "QA-REQUEST-FORM-FEE",
      collectionMode: "deduct_from_savings",
      name: "Request form fee",
      trigger: "submission",
    },
    {
      amount: 2_500,
      code: "QA-REQUEST-APPROVAL-FEE",
      collectionMode: "pay_separately",
      name: "Approval fee",
      trigger: "approval",
    },
  ],
  workflows: [
    "procurement_request",
    "project_financing_request",
    "food_purchase_application",
  ],
} as const

const CHARGE_EFFECTIVE_FROM = new Date("2026-01-01T00:00:00.000Z")

export type ProductionQaMemberReadyFixtureResult = {
  foodCycle: "existing" | "provisioned" | "not_open"
  memberReady: boolean
  openingBalance: "existing" | "provisioned"
  pendingChargeApplicationId: string
  recordId: string
  recordType: "ChargeApplication"
  /** True when the cached savings snapshot had drifted and was corrected. */
  savingsSnapshotAligned: boolean
  scenarioKey: string
  separateCharge: "existing" | "provisioned"
  state: "member_ready"
  status: "existing" | "provisioned"
  workflowChargeRuleCount: number
}

type Dependencies = {
  applyCharge?: typeof applyCharge
  applyMemberOpeningBalance?: typeof applyMemberOpeningBalance
  createFoodPurchaseCycle?: typeof createFoodPurchaseCycle
  createMemberOpeningBalance?: typeof createMemberOpeningBalance
  ensureTenantLedgerAccounts?: typeof ensureTenantLedgerAccounts
  getMemberOperationalReadiness?: typeof getMemberOperationalReadiness
  reviewMemberOpeningBalance?: typeof reviewMemberOpeningBalance
}

export async function ensureProductionQaHarnessMemberReadyFixture(
  input: {
    now: Date
    plan: ProductionQaHarnessPlan
    prisma: PrismaClient
  },
  dependencies: Dependencies = {}
): Promise<ProductionQaMemberReadyFixtureResult> {
  const deps = {
    applyCharge,
    applyMemberOpeningBalance,
    createFoodPurchaseCycle,
    createMemberOpeningBalance,
    ensureTenantLedgerAccounts,
    getMemberOperationalReadiness,
    reviewMemberOpeningBalance,
    ...dependencies,
  }
  const fixture = PRODUCTION_QA_MEMBER_READY_FIXTURE
  const scenario = input.plan.scenarios.find(
    ({ state }) => state === "member_ready"
  )
  if (!scenario) {
    throw new QueryInfrastructureError(
      "Member-ready QA harness scenario is missing."
    )
  }
  const emailFor = (role: string) =>
    scenario.identities.find((identity) => identity.role === role)?.email

  const tenant = await input.prisma.tenant.findFirst({
    select: { id: true },
    where: {
      dataClassification: "qa",
      qaSourceDomain: input.plan.qaDomain,
      slug: scenario.slug,
    },
  })
  if (!tenant) {
    throw new QueryInfrastructureError(
      "Member-ready QA harness tenant is missing."
    )
  }

  const users = await input.prisma.user.findMany({
    select: {
      email: true,
      id: true,
      memberProfile: { select: { id: true } },
    },
    where: {
      email: {
        in: ["tenant_admin", "finance_officer", "member"]
          .map(emailFor)
          .filter((email): email is string => Boolean(email)),
      },
      tenantId: tenant.id,
    },
  })
  const userFor = (role: string) =>
    users.find(({ email }) => email === emailFor(role))
  const admin = userFor("tenant_admin")
  const financeOfficer = userFor("finance_officer")
  const memberId = userFor("member")?.memberProfile?.id
  if (!admin || !financeOfficer || !memberId) {
    throw new QueryInfrastructureError(
      "Member-ready QA harness identities are missing."
    )
  }

  await deps.ensureTenantLedgerAccounts(tenant.id, input.prisma)

  // 1. Migration done: a brought-forward opening balance, through the same
  // create → approve → apply path staff use.
  const appliedOpeningBalance =
    await input.prisma.memberOpeningBalance.findFirst({
      select: { id: true },
      where: { memberId, status: "applied", tenantId: tenant.id },
    })
  let openingBalance: "existing" | "provisioned" = "existing"
  if (!appliedOpeningBalance) {
    const staged = await input.prisma.memberOpeningBalance.findFirst({
      select: { id: true, status: true },
      where: {
        memberId,
        openingDate: fixture.openingDate,
        status: { in: ["pending_review", "approved"] },
        tenantId: tenant.id,
      },
    })
    let openingBalanceId = staged?.id
    let status = staged?.status
    if (!openingBalanceId) {
      const created = await deps.createMemberOpeningBalance(
        {
          actorUserId: financeOfficer.id,
          commitmentSavingsBalance: fixture.openingCommitmentSavings,
          memberId,
          notes: fixture.openingNotes,
          openingDate: fixture.openingDate,
          tenantId: tenant.id,
        },
        input.prisma
      )
      openingBalanceId = created.id
      status = "pending_review"
    }
    if (status === "pending_review") {
      await deps.reviewMemberOpeningBalance(
        {
          actorUserId: admin.id,
          decision: "approved",
          openingBalanceId,
          reviewNotes: "QA ONLY — harness approval.",
          tenantId: tenant.id,
        },
        input.prisma
      )
    }
    await deps.applyMemberOpeningBalance(
      { actorUserId: admin.id, openingBalanceId, tenantId: tenant.id },
      input.prisma
    )
    openingBalance = "provisioned"
  }

  // 2. Submission and approval charges on the three member request workflows.
  let workflowChargeRuleCount = 0
  for (const charge of fixture.workflowCharges) {
    const definitionId = await upsertFixedChargeDefinition(input.prisma, {
      amount: charge.amount,
      code: charge.code,
      name: charge.name,
      tenantId: tenant.id,
    })
    for (const workflow of fixture.workflows) {
      await input.prisma.chargeApplicability.upsert({
        create: {
          chargeDefinitionId: definitionId,
          collectionMode: charge.collectionMode,
          isActive: true,
          isRequired: true,
          tenantId: tenant.id,
          trigger: charge.trigger,
          workflow,
        },
        update: {
          collectionMode: charge.collectionMode,
          isActive: true,
          isRequired: true,
        },
        where: {
          chargeDefinitionId_workflow_trigger: {
            chargeDefinitionId: definitionId,
            trigger: charge.trigger,
            workflow,
          },
        },
      })
      workflowChargeRuleCount += 1
    }
  }

  // 3. One pending pay-separately charge for the Record payment dialog. A
  // settled, waived or reversed one is replaced on the next run.
  const separateDefinitionId = await upsertFixedChargeDefinition(input.prisma, {
    amount: fixture.separateCharge.amount,
    code: fixture.separateCharge.code,
    name: fixture.separateCharge.name,
    tenantId: tenant.id,
  })
  const pending = await input.prisma.chargeApplication.findFirst({
    orderBy: { assessedAt: "desc" },
    select: { id: true },
    where: {
      chargeDefinitionId: separateDefinitionId,
      collectionMode: "pay_separately",
      memberId,
      status: "pending",
      tenantId: tenant.id,
    },
  })
  const pendingChargeApplicationId =
    pending?.id ??
    (
      await deps.applyCharge(
        {
          actorUserId: financeOfficer.id,
          amount: fixture.separateCharge.amount,
          assessedAt: input.now,
          chargeDefinitionId: separateDefinitionId,
          collectionMode: "pay_separately",
          memberId,
          notes: fixture.separateCharge.notes,
          tenantId: tenant.id,
        },
        input.prisma
      )
    ).id

  // 4. An open foodstuff month, so the foodstuff form has a month to pick.
  const periodMonth = new Date(
    Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth(), 1)
  )
  const cycle = await input.prisma.foodPurchaseCycle.findFirst({
    select: { status: true },
    where: { periodMonth, tenantId: tenant.id },
  })
  let foodCycle: ProductionQaMemberReadyFixtureResult["foodCycle"] = "existing"
  if (!cycle) {
    await deps.createFoodPurchaseCycle(
      {
        actorUserId: admin.id,
        periodMonth,
        releasedAmount: fixture.foodCycleReleasedAmount,
        releaseNotes: "QA ONLY — open foodstuff month.",
        tenantId: tenant.id,
      },
      input.prisma
    )
    foodCycle = "provisioned"
  } else if (cycle.status !== "open") {
    // A tester closed this month; the product allows one cycle per month.
    foodCycle = "not_open"
  }

  // The member's cached savings snapshot follows their savings ledger
  // (account 1000), which the opening balance and any charges posted to.
  const savingsSnapshotAligned = await alignMemberSavingsSnapshot(
    input.prisma,
    { memberId, tenantId: tenant.id }
  )

  const readiness = await deps.getMemberOperationalReadiness(
    { memberId, tenantId: tenant.id },
    input.prisma
  )

  const separateCharge = pending ? "existing" : "provisioned"
  return {
    foodCycle,
    memberReady: Boolean(readiness?.isReady),
    openingBalance,
    pendingChargeApplicationId,
    recordId: pendingChargeApplicationId,
    savingsSnapshotAligned,
    recordType: "ChargeApplication",
    scenarioKey: scenario.key,
    separateCharge,
    state: "member_ready",
    status:
      openingBalance === "existing" &&
      separateCharge === "existing" &&
      foodCycle !== "provisioned"
        ? "existing"
        : "provisioned",
    workflowChargeRuleCount,
  }
}

async function alignMemberSavingsSnapshot(
  prisma: PrismaClient,
  input: { memberId: string; tenantId: string }
) {
  const [member, entries] = await Promise.all([
    prisma.member.findFirst({
      select: { totalSavingsSnapshot: true },
      where: { id: input.memberId, tenantId: input.tenantId },
    }),
    prisma.ledgerEntry.groupBy({
      _sum: { amount: true },
      by: ["direction"],
      where: {
        ledgerAccount: { code: "1000" },
        ledgerTransaction: { memberId: input.memberId },
        tenantId: input.tenantId,
      },
    }),
  ])
  const total = (direction: "credit" | "debit") =>
    Number(
      entries.find((entry) => entry.direction === direction)?._sum.amount ?? 0
    )
  const ledgerSavings = total("credit") - total("debit")
  if (!member || Number(member.totalSavingsSnapshot) === ledgerSavings)
    return false
  await prisma.member.update({
    data: { totalSavingsSnapshot: ledgerSavings },
    where: { id: input.memberId, tenantId: input.tenantId },
  })
  return true
}

async function upsertFixedChargeDefinition(
  prisma: PrismaClient,
  input: { amount: number; code: string; name: string; tenantId: string }
) {
  const definition = await prisma.chargeDefinition.upsert({
    create: {
      amount: input.amount,
      appliesToMembers: true,
      chargeFrequency: "manual",
      chargeValueType: "fixed_amount",
      code: input.code,
      isActive: true,
      isMonthlyLevy: false,
      kind: "fixed",
      name: input.name,
      purpose: "general",
      tenantId: input.tenantId,
    },
    select: { id: true },
    update: {
      amount: input.amount,
      chargeValueType: "fixed_amount",
      isActive: true,
      isMonthlyLevy: false,
      kind: "fixed",
      name: input.name,
    },
    where: { tenantId_code: { code: input.code, tenantId: input.tenantId } },
  })
  await prisma.chargeDefinitionVersion.upsert({
    create: {
      amount: input.amount,
      chargeDefinitionId: definition.id,
      chargeValueType: "fixed_amount",
      effectiveFrom: CHARGE_EFFECTIVE_FROM,
      kind: "fixed",
      tenantId: input.tenantId,
    },
    update: { amount: input.amount },
    where: {
      chargeDefinitionId_effectiveFrom: {
        chargeDefinitionId: definition.id,
        effectiveFrom: CHARGE_EFFECTIVE_FROM,
      },
    },
  })
  return definition.id
}
