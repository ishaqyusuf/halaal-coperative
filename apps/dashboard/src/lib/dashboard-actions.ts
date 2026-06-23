"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { buildBackfillDraft } from "@halaalvest/backfill"
import {
  buildBackfillDraftInputForMember,
  approveMemberOnboardingRequest,
  applyCharge,
  applyImportBatch,
  closeContributionPlan,
  createTenantCustomDomain,
  createTenantShareStructureVersion,
  createChargeDefinition,
  createChargeDefinitionVersion,
  createImportBatch,
  createLegacyLoanMigrationDraft,
  deleteMemberActivityEvent,
  createMember,
  createMemberDocument,
  createMemberSignupLink,
  createNotificationOutboxEntry,
  createShareBusiness,
  createShareBusinessProfitEntry,
  finalizeTenantInitialMigration,
  generateShareProfitAllocations,
  disburseLoan,
  getImportBatchKind,
  getImportReferenceData,
  getTenantInitialMigrationState,
  importCharges,
  importContributions,
  importDeductionSources,
  importLoanMigrations,
  importLoanProducts,
  importMembers,
  importRepaymentMigrations,
  getInitialMigrationMemberReview,
  markTenantBusinessProfitPoolsReviewed,
  markTenantLegacyLoansReviewed,
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
  ensureMonthlyRecord,
  updateMonthlyRecordSettings,
  recordCollectionFollowUp,
  provisionTenantUserRole,
  rotateMemberSignupLinkToken,
  refreshCollectionsStatuses,
  recordMemberPayment,
  saveBusinessProfitMigrationWorksheet,
  upsertMigrationProfitAdjustment,
  recordContribution,
  reverseChargeApplication,
  reviewLoanRequest,
  runTenantDomainVerificationCheck,
  setTenantInitialMigrationEmergencyUnlock,
  setTenantDomainPrimary,
  updateTenantDomainVerificationStatus,
  updateTenantShareStructureVersion,
  updateShareBusinessProfitEntry,
  setMemberContributionPlan,
  setMemberSignupLinkEnabled,
  submitLoanRequest,
  postRepayment,
  publishShareProfitAllocations,
  queueTenantRoleNotifications,
  setMigrationBackfillDefaultingMonths,
  upsertNotificationPreference,
  rejectMemberOnboardingRequest,
  updateContributionPlan,
  updateMemberPaymentAllocationPreference,
  updateTenantProfile,
  updateChargeDefinition,
  updateChargeDefinitionVersion,
  updateShareBusiness,
  updateMemberKyc,
  updateMemberDocumentReview,
  updateMemberStatus,
  updateMemberSignupLink,
  updateTenantMemberSignupSettings,
  updateLegacyLoanMigrationDraft,
  upsertMemberActivityEvent,
  upsertMigrationBackfillAdjustment,
  waiveChargeApplication,
  upsertMemberAmountLog,
} from "@halaalvest/db"
import {
  backfillApplyHandler,
  backfillApplyTask,
  backfillInitializeHandler,
  backfillInitializeTask,
  monthlyRecordGenerateHandler,
  monthlyRecordGenerateTask,
  triggerJob,
} from "@halaalvest/jobs"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
  memberManagementRoles,
  workspaceAdminRoles,
  workspaceConfigurationRoles,
} from "@/lib/workspace-access"
import {
  type DashboardImportKind,
  getDashboardImportExistingMatches,
  getDashboardImportPrimaryValue,
  parseDashboardImportCsv,
} from "@/lib/import-csv"
import {
  composeMemberNumber,
  normalizeMemberNumberPrefix,
} from "@/lib/member-number"

type DashboardMemberType = "civil_servant" | "individual" | "business"
type DashboardMemberStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "exited"
type DashboardContributionChannel = "payroll" | "transfer" | "cash" | "manual"
type DashboardChargeFrequency =
  | "recurring_monthly"
  | "per_contribution"
  | "one_time"
  | "manual"
type DashboardChargeKind = "fixed" | "percentage"

function getOptionalTrimmedString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") return null

  return value.trim() || null
}
type DashboardChargeValueType = "fixed_amount" | "percentage"
type DashboardPaymentAllocationPreference =
  | "manual_split"
  | "savings_first"
  | "loan_first"
type DashboardKycStatus = "not_started" | "pending" | "verified" | "rejected"
type MemberDataImportKind = Extract<
  DashboardImportKind,
  | "members"
  | "charges"
  | "contributions"
  | "loan_migrations"
  | "repayment_migrations"
>

const memberDataImportKinds = new Set<DashboardImportKind>([
  "members",
  "charges",
  "contributions",
  "loan_migrations",
  "repayment_migrations",
])

function isMemberDataImportKind(
  importKind: DashboardImportKind
): importKind is MemberDataImportKind {
  return memberDataImportKinds.has(importKind)
}

async function requireDashboardActor(
  allowedRoles: Parameters<typeof hasAnyRole>[1]
) {
  const context = await getDashboardServerContext()
  const tenant = context.tenant
  const membership = context.auth.membership
  const user = context.auth.user

  if (
    !tenant ||
    !membership ||
    !user ||
    !hasAnyRole(membership.role, allowedRoles)
  ) {
    throw new Error("You do not have access to perform this workspace action.")
  }

  return {
    membership,
    tenant,
    user,
  }
}

async function requireInitialMigrationToolsOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await getTenantInitialMigrationState(actor.tenant.id)

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Initial migration tools are locked for this tenant. Use normal live adjustment or reversal workflows instead."
    )
  }

  return migrationState
}

async function requireLiveFinancialWritesOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await getTenantInitialMigrationState(actor.tenant.id)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live record creation and updates are locked until initial migration is finalized."
    )
  }

  return migrationState
}

async function requireInitialMigrationOrLiveWritesOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await getTenantInitialMigrationState(actor.tenant.id)

  if (
    !migrationState.snapshot.canUseMigrationTools &&
    !migrationState.snapshot.canUseLiveFinancialWrites
  ) {
    throw new Error(
      "This tenant is locked until initial migration is finalized or temporarily unlocked."
    )
  }

  return migrationState
}

function hasAppliedInitialMigrationBackfill(
  migrationState: Awaited<ReturnType<typeof getTenantInitialMigrationState>>
) {
  return (
    migrationState.counts.appliedBackfillBatches > 0 ||
    migrationState.counts.appliedBackfillMembers > 0 ||
    migrationState.counts.appliedBackfillMonths > 0
  )
}

async function requireHistoricalFinanceSetupMutable(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await requireInitialMigrationToolsOpen(actor)

  if (hasAppliedInitialMigrationBackfill(migrationState)) {
    throw new Error(
      "Historical finance setup is locked because member ledger backfill has already started. Use member corrections or emergency remediation workflows instead."
    )
  }

  return migrationState
}

async function requireImportWindowOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await requireInitialMigrationToolsOpen(actor)

  if (hasAppliedInitialMigrationBackfill(migrationState)) {
    throw new Error(
      "Historical imports are locked because member ledger backfill has already started. Finish migration or use live correction workflows after go-live."
    )
  }

  return migrationState
}

async function requireMemberDataImportPrerequisitesComplete(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>,
  importKind: MemberDataImportKind
) {
  const migrationState = await requireImportWindowOpen(actor)
  const requiredStepKeys = new Set([
    "finance_start_date",
    "charge_schedules",
    "business_profit_pools",
    "share_capital_plan",
  ])

  if (importKind !== "members") {
    requiredStepKeys.add("member_profiles")
  }

  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => requiredStepKeys.has(stepKey)
  )

  if (blockingSteps.length > 0) {
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingSteps.includes(step.key))
      .map((step) => step.label)

    throw new Error(
      `Member data imports cannot start until these setup steps are complete: ${labels.join(", ")}.`
    )
  }

  return migrationState
}

async function requireChargeDefinitionWritesOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await requireInitialMigrationOrLiveWritesOpen(actor)

  if (
    migrationState.snapshot.canUseMigrationTools &&
    !migrationState.snapshot.canUseLiveFinancialWrites &&
    hasAppliedInitialMigrationBackfill(migrationState)
  ) {
    throw new Error(
      "Historical charge schedules are locked because member ledger backfill has already started. Finish migration or use live charge management after go-live."
    )
  }

  return migrationState
}

async function requireMemberProfileWritesOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await requireInitialMigrationOrLiveWritesOpen(actor)

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    return migrationState
  }

  const setupStepKeys = new Set([
    "finance_start_date",
    "charge_schedules",
    "business_profit_pools",
    "share_capital_plan",
  ])
  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => setupStepKeys.has(stepKey)
  )

  if (blockingSteps.length > 0) {
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingSteps.includes(step.key))
      .map((step) => step.label)

    throw new Error(
      `Member profiles cannot be created until these setup steps are complete: ${labels.join(", ")}.`
    )
  }

  if (
    migrationState.snapshot.canUseMigrationTools &&
    hasAppliedInitialMigrationBackfill(migrationState)
  ) {
    throw new Error(
      "Member profiles are locked because member ledger backfill has already started. Finish migration or create new members after go-live."
    )
  }

  return migrationState
}

async function requireMemberContributionPlanWritesOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>,
  memberId: string
) {
  const migrationState = await requireInitialMigrationOrLiveWritesOpen(actor)

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    return migrationState
  }

  const memberReview = await getInitialMigrationMemberReview({
    memberId,
    tenantId: actor.tenant.id,
  })

  if (
    memberReview?.status === "backfill_applied" ||
    (memberReview?.appliedBackfillBatches ?? 0) > 0 ||
    (memberReview?.appliedBackfillMonths ?? 0) > 0
  ) {
    throw new Error(
      "This member's contribution plan is locked because historical ledger backfill has already been applied. Use correction workflows instead."
    )
  }

  return migrationState
}

async function requireMemberMigrationDraftMutable(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>,
  memberId: string
) {
  await requireInitialMigrationToolsOpen(actor)

  const memberReview = await getInitialMigrationMemberReview({
    memberId,
    tenantId: actor.tenant.id,
  })

  if (
    memberReview?.status === "backfill_applied" ||
    (memberReview?.appliedBackfillBatches ?? 0) > 0 ||
    (memberReview?.appliedBackfillMonths ?? 0) > 0
  ) {
    throw new Error(
      "This member's historical ledger has already been applied. Use correction workflows instead of migration draft edits."
    )
  }

  return memberReview
}

async function requireMemberBackfillPrerequisitesComplete(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const migrationState = await requireInitialMigrationToolsOpen(actor)
  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) =>
      stepKey === "finance_start_date" ||
      stepKey === "charge_schedules" ||
      stepKey === "business_profit_pools" ||
      stepKey === "share_capital_plan" ||
      stepKey === "legacy_loans" ||
      stepKey === "member_profiles"
  )

  if (blockingSteps.length > 0) {
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingSteps.includes(step.key))
      .map((step) => step.label)

    throw new Error(
      `Member ledger backfill cannot start until these setup steps are complete: ${labels.join(", ")}.`
    )
  }

  return migrationState
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required field: ${key}`)
  }

  return value.trim()
}

function tenantStartDateString(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const startDate = actor.tenant.startDate as Date | string | null | undefined

  if (!startDate) {
    return null
  }

  if (typeof startDate === "string") {
    return startDate.slice(0, 10)
  }

  return startDate.toISOString().slice(0, 10)
}

function dateOnlyString(value: Date | string | null | undefined) {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return value.slice(0, 10)
}

function requireDateOnOrAfterTenantStartDate(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>,
  value: Date | string | null | undefined,
  label: string
) {
  const minDate = tenantStartDateString(actor)
  const actualDate = dateOnlyString(value)

  if (!actualDate || !minDate || actualDate >= minDate) {
    return
  }

  throw new Error(
    `${label} cannot be before the cooperative start date (${minDate}).`
  )
}

function requireImportRowsOnOrAfterTenantStartDate(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>,
  importKind: DashboardImportKind,
  rows: Record<string, unknown>[]
) {
  const dateFieldsByKind: Partial<Record<DashboardImportKind, string[]>> = {
    charges: ["assessedAt"],
    contributions: ["postedAt"],
    loan_migrations: ["requestedAt", "disbursedAt", "firstRepaymentDueAt"],
    members: ["joinedAt"],
  }
  const fields = dateFieldsByKind[importKind]
  const minDate = tenantStartDateString(actor)

  if (!fields || !minDate) {
    return
  }

  const errors = rows.flatMap((row, index) =>
    fields.flatMap((field) => {
      const value = dateOnlyString(row[field] as Date | string | null)

      return value && value < minDate
        ? [
            `Row ${index + 2}: ${field} cannot be before the cooperative start date (${minDate}).`,
          ]
        : []
    })
  )

  if (errors.length > 0) {
    throw new Error(errors[0])
  }
}

function requireDirectImportConfirmation(formData: FormData) {
  const confirmation = getRequiredString(formData, "confirmation")

  if (confirmation !== "IMPORT NOW") {
    throw new Error("Type IMPORT NOW to run a direct import without staging.")
  }
}

function getOptionalNumber(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined
  }

  return Number(value.trim())
}

function getOptionalBoolean(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string") {
    return false
  }

  return value === "on" || value === "true"
}

function parseOptionalJsonArray(formData: FormData, key: string) {
  const value = formData.get(key)
  if (typeof value !== "string" || value.trim().length === 0) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) {
      throw new Error(`${key} must be an array.`)
    }

    return parsed as Record<string, unknown>[]
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be an array")) {
      throw error
    }

    throw new Error(`${key} is not valid JSON.`)
  }
}

function getRowString(
  row: Record<string, unknown>,
  key: string
): string | undefined {
  const value = row[key]
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined
  }

  const stringValue = String(value).trim()
  return stringValue.length > 0 ? stringValue : undefined
}

function getRowRequiredDate(
  row: Record<string, unknown>,
  key: string,
  label: string
) {
  const value = getRowString(row, key)
  if (!value) {
    throw new Error(`${label} date is required.`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} date is invalid.`)
  }

  return date
}

function getRowOptionalDate(row: Record<string, unknown>, key: string) {
  const value = getRowString(row, key)
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} date is invalid.`)
  }

  return date
}

function getRowRequiredNumber(
  row: Record<string, unknown>,
  key: string,
  label: string
) {
  const value = getRowString(row, key)
  if (!value) {
    throw new Error(`${label} is required.`)
  }

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw new Error(`${label} must be greater than 0.`)
  }

  return numberValue
}

function getRowOptionalNumber(row: Record<string, unknown>, key: string) {
  const value = getRowString(row, key)
  if (!value) {
    return null
  }

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${key} cannot be negative.`)
  }

  return numberValue
}

function requireDateOnOrAfterJoinedAt(
  value: Date,
  joinedAt: Date | undefined,
  label: string
) {
  if (!joinedAt) {
    return
  }

  const actualDate = value.toISOString().slice(0, 10)
  const minDate = joinedAt.toISOString().slice(0, 10)

  if (actualDate < minDate) {
    throw new Error(`${label} cannot be before the member joined date.`)
  }
}

function parseMemberCommitmentHistory(
  formData: FormData,
  joinedAt: Date | undefined
) {
  if (!joinedAt) {
    return []
  }

  return parseOptionalJsonArray(formData, "commitmentHistoryJson").map(
    (row, index) => {
      const effectiveFrom = getRowRequiredDate(
        row,
        "effectiveFrom",
        `Commitment row ${index + 1}`
      )
      requireDateOnOrAfterJoinedAt(
        effectiveFrom,
        joinedAt,
        `Commitment row ${index + 1}`
      )

      return {
        amount: getRowRequiredNumber(
          row,
          "amount",
          `Commitment row ${index + 1} amount`
        ),
        effectiveFrom,
        notes: getRowString(row, "notes") ?? null,
      }
    }
  )
}

function parseMemberLegacyLoanHistory(
  formData: FormData,
  joinedAt: Date | undefined
) {
  if (!joinedAt) {
    return []
  }

  return parseOptionalJsonArray(formData, "legacyLoanHistoryJson").map(
    (row, index) => {
      const openedAt = getRowRequiredDate(
        row,
        "openedAt",
        `Loan row ${index + 1}`
      )
      const closedAt = getRowOptionalDate(row, "closedAt")

      requireDateOnOrAfterJoinedAt(openedAt, joinedAt, `Loan row ${index + 1}`)

      if (closedAt) {
        requireDateOnOrAfterJoinedAt(
          closedAt,
          openedAt,
          `Loan row ${index + 1} closed date`
        )
      }

      return {
        closedAt,
        guarantorOneMemberId: getRowString(row, "guarantorOneMemberId") ?? null,
        guarantorTwoMemberId: getRowString(row, "guarantorTwoMemberId") ?? null,
        loanLabel: getRowString(row, "loanLabel") ?? null,
        openedAt,
        outstandingPrincipalBalance: getRowOptionalNumber(
          row,
          "outstandingPrincipalBalance"
        ),
        principalAmount: getRowRequiredNumber(
          row,
          "principalAmount",
          `Loan row ${index + 1} amount`
        ),
        savingsDuringLoan: getRowRequiredNumber(
          row,
          "savingsDuringLoan",
          `Loan row ${index + 1} commitment`
        ),
        scheduledMonthlyPrincipalRepayment: getRowRequiredNumber(
          row,
          "scheduledMonthlyPrincipalRepayment",
          `Loan row ${index + 1} repayment`
        ),
        notes: getRowString(row, "notes") ?? null,
      }
    }
  )
}

function getMemberStateFromFormData(formData: FormData, joinedAt?: Date) {
  const hasServingLoan = getOptionalBoolean(formData, "hasServingLoan")
  const currentSavingsBalance = getOptionalNumber(
    formData,
    "currentSavingsBalance"
  )
  const monthlyCommitment = getOptionalNumber(formData, "monthlyCommitment")
  const loanAmount = getOptionalNumber(formData, "loanAmount")
  const loanMonthlyCommitment = getOptionalNumber(
    formData,
    "loanMonthlyCommitment"
  )
  const loanPaymentMonths = getOptionalNumber(formData, "loanPaymentMonths")
  const loanTopupAmount = getOptionalNumber(formData, "loanTopupAmount") ?? 0
  const loanServed = getOptionalNumber(formData, "loanServed") ?? 0
  const loanStartDate =
    (formData.get("loanStartDate") as string | null)?.trim() || undefined

  if (hasServingLoan) {
    if (
      !loanStartDate ||
      !loanAmount ||
      !loanPaymentMonths ||
      !loanMonthlyCommitment
    ) {
      throw new Error(
        "Loan start date, amount, payment months, and monthly commitment are required when serving loan is enabled."
      )
    }

    if (loanServed < 0 || loanServed > loanAmount) {
      throw new Error(
        "Served amount must be between 0 and the total loan amount."
      )
    }

    if (!Number.isInteger(loanPaymentMonths) || loanPaymentMonths <= 0) {
      throw new Error("Payment months must be greater than 0.")
    }

    if (loanTopupAmount < 0) {
      throw new Error("Topup amount cannot be negative.")
    }

    const parsedLoanStartDate = new Date(`${loanStartDate}T00:00:00.000Z`)
    requireDateOnOrAfterJoinedAt(
      parsedLoanStartDate,
      joinedAt,
      "Serving loan start date"
    )
  }

  return {
    commitmentHistory: parseMemberCommitmentHistory(formData, joinedAt),
    currentSavingsBalance,
    legacyLoanHistory: parseMemberLegacyLoanHistory(formData, joinedAt),
    monthlyCommitment,
    servingLoan:
      hasServingLoan &&
      loanStartDate &&
      loanAmount &&
      loanPaymentMonths &&
      loanMonthlyCommitment
        ? {
            amountServed: loanServed,
            extraMonthlySavingsAmount: loanTopupAmount,
            monthlyCommitment: loanMonthlyCommitment,
            paymentMonths: loanPaymentMonths,
            principalAmount: loanAmount,
            startDate: new Date(`${loanStartDate}T00:00:00.000Z`),
          }
        : undefined,
  }
}

export async function createMemberAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireMemberProfileWritesOpen(actor)
  const joinedAtValue = getRequiredString(formData, "joinedAt")
  const joinedAt = new Date(`${joinedAtValue}T00:00:00.000Z`)
  requireDateOnOrAfterTenantStartDate(actor, joinedAt, "Joined date")
  const memberState = getMemberStateFromFormData(formData, joinedAt)

  await createMember({
    actorUserId: actor.user.id,
    address: getOptionalTrimmedString(formData, "address"),
    currentSavingsBalance: memberState.currentSavingsBalance,
    email: getOptionalTrimmedString(formData, "email")?.toLowerCase() ?? null,
    fullName: getRequiredString(formData, "fullName"),
    joinedAt,
    commitmentHistory: memberState.commitmentHistory,
    legacyLoanHistory: memberState.legacyLoanHistory,
    memberNumber: composeMemberNumber(
      actor.tenant.memberNumberPrefix,
      getRequiredString(formData, "memberNumber")
    ),
    memberType: getRequiredString(
      formData,
      "memberType"
    ) as DashboardMemberType,
    monthlyCommitment: memberState.monthlyCommitment,
    occupation: getOptionalTrimmedString(formData, "occupation"),
    phoneNumber: getOptionalTrimmedString(formData, "phoneNumber"),
    servingLoan: memberState.servingLoan,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function updateMemberStatusAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const member = await updateMemberStatus(
    actor.tenant.id,
    getRequiredString(formData, "memberId"),
    getRequiredString(formData, "status") as DashboardMemberStatus,
    actor.user.id
  )

  await queueTenantRoleNotifications({
    actionLabel: "Open members",
    actionUrl: "/members",
    bodyText: `${member.fullName} is now marked as ${member.status.replace(/_/g, " ")}.`,
    metadata: {
      memberId: member.id,
      memberNumber: member.memberNumber,
      status: member.status,
    },
    notificationType: "member.status_changed",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.members",
    subject: `${actor.tenant.name}: member status changed`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
}

export async function approveMemberOnboardingAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const memberState = getMemberStateFromFormData(formData)

  const approved = await approveMemberOnboardingRequest({
    actorUserId: actor.user.id,
    memberState,
    requestId: getRequiredString(formData, "requestId"),
    tenantId: actor.tenant.id,
  })

  await createNotificationOutboxEntry({
    actionLabel: "Open dashboard",
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, { pathname: "/" }),
    bodyText: [
      `Assalamu alaikum ${approved.user.fullName},`,
      "",
      `Your membership for ${actor.tenant.name} has been approved.`,
      "You can now sign in to your dashboard and continue with your cooperative account.",
    ].join("\n"),
    metadata: {
      memberId: approved.member.id,
      requestId: approved.request.id,
      userId: approved.user.id,
    },
    notificationType: "member.onboarding_approved",
    recipient: approved.user.email,
    source: "dashboard.membership_approvals",
    subject: `${actor.tenant.name}: your membership has been approved`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/membership-approvals")
  revalidatePath(`/membership-approvals/${approved.request.id}`)
  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function rejectMemberOnboardingAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const rejected = await rejectMemberOnboardingRequest({
    actorUserId: actor.user.id,
    reason: (formData.get("reason") as string | null)?.trim() || undefined,
    requestId: getRequiredString(formData, "requestId"),
    tenantId: actor.tenant.id,
  })

  await createNotificationOutboxEntry({
    actionLabel: "Contact support",
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
      pathname: "/login",
    }),
    bodyText: [
      `Assalamu alaikum ${rejected.user.fullName},`,
      "",
      `Your membership signup for ${actor.tenant.name} was not approved yet.`,
      rejected.request.rejectionReason
        ? `Reason: ${rejected.request.rejectionReason}`
        : "Please contact the cooperative team for the next steps.",
    ].join("\n"),
    metadata: {
      requestId: rejected.request.id,
      userId: rejected.user.id,
    },
    notificationType: "member.onboarding_rejected",
    recipient: rejected.user.email,
    source: "dashboard.membership_approvals",
    subject: `${actor.tenant.name}: membership signup update`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/membership-approvals")
  revalidatePath(`/membership-approvals/${rejected.request.id}`)
}

export async function updateMemberKycAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const member = await updateMemberKyc({
    actorUserId: actor.user.id,
    governmentIdNumber:
      (formData.get("governmentIdNumber") as string | null)?.trim() || null,
    kycDocumentType:
      (formData.get("kycDocumentType") as string | null)?.trim() || null,
    kycDocumentUrl:
      (formData.get("kycDocumentUrl") as string | null)?.trim() || null,
    kycReviewNotes:
      (formData.get("kycReviewNotes") as string | null)?.trim() || null,
    kycStatus: getRequiredString(formData, "kycStatus") as DashboardKycStatus,
    memberId: getRequiredString(formData, "memberId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open member profile",
    actionUrl: `/members/${member.id}`,
    bodyText: `${member.fullName} KYC is now ${member.kycStatus.replace(/_/g, " ")}.`,
    metadata: {
      kycStatus: member.kycStatus,
      memberId: member.id,
    },
    notificationType: "member.kyc_updated",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.members",
    subject: `${actor.tenant.name}: member KYC updated`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
  revalidatePath(`/members/${getRequiredString(formData, "memberId")}`)
}

export async function createMemberDocumentAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const document = await createMemberDocument({
    actorUserId: actor.user.id,
    documentType: getRequiredString(formData, "documentType"),
    documentUrl: getRequiredString(formData, "documentUrl"),
    memberId: getRequiredString(formData, "memberId"),
    reviewNotes: (formData.get("reviewNotes") as string | null)?.trim() || null,
    reviewStatus:
      (formData.get("reviewStatus") as string | null)?.trim() || "pending",
    tenantId: actor.tenant.id,
  })

  revalidatePath(`/members/${document.memberId}`)
  revalidatePath("/reports")
}

export async function updateMemberDocumentReviewAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const document = await updateMemberDocumentReview({
    actorUserId: actor.user.id,
    documentId: getRequiredString(formData, "documentId"),
    reviewNotes: (formData.get("reviewNotes") as string | null)?.trim() || null,
    reviewStatus: getRequiredString(formData, "reviewStatus"),
    tenantId: actor.tenant.id,
  })

  revalidatePath(`/members/${document.memberId}`)
  revalidatePath("/reports")
}

export async function recordContributionAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await recordContribution({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    channel: getRequiredString(
      formData,
      "channel"
    ) as DashboardContributionChannel,
    committedAmount: getOptionalNumber(formData, "committedAmount"),
    contributionPlanId:
      (formData.get("contributionPlanId") as string | null)?.trim() ||
      undefined,
    extraSavingsAmount: getOptionalNumber(formData, "extraSavingsAmount"),
    memberId: getRequiredString(formData, "memberId"),
    periodLabel:
      (formData.get("periodLabel") as string | null)?.trim() || undefined,
    postedAt: new Date(
      `${getRequiredString(formData, "postedAt")}T00:00:00.000Z`
    ),
    reference:
      (formData.get("reference") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
}

export async function setMemberContributionPlanAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberContributionPlanWritesOpen(actor, memberId)

  await setMemberContributionPlan({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    memberId,
    name: (formData.get("name") as string | null)?.trim() || undefined,
    startsAt: new Date(
      `${getRequiredString(formData, "startsAt")}T00:00:00.000Z`
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
  revalidatePath(`/members/${memberId}`)
}

export async function updateContributionPlanAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await updateContributionPlan({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    name: (formData.get("name") as string | null)?.trim() || undefined,
    planId: getRequiredString(formData, "planId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function closeContributionPlanAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await closeContributionPlan({
    actorUserId: actor.user.id,
    endsAt: new Date(`${getRequiredString(formData, "endsAt")}T00:00:00.000Z`),
    planId: getRequiredString(formData, "planId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function updateMemberPaymentAllocationPreferenceAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await updateMemberPaymentAllocationPreference({
    actorUserId: actor.user.id,
    memberId: getRequiredString(formData, "memberId"),
    preference: getRequiredString(
      formData,
      "preference"
    ) as DashboardPaymentAllocationPreference,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function recordMemberPaymentAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await recordMemberPayment({
    actorUserId: actor.user.id,
    channel: getRequiredString(
      formData,
      "channel"
    ) as DashboardContributionChannel,
    committedSavingsAmount: Number(
      getRequiredString(formData, "committedSavingsAmount")
    ),
    contributionPlanId:
      (formData.get("contributionPlanId") as string | null)?.trim() ||
      undefined,
    extraLoanPaymentAmount: getOptionalNumber(
      formData,
      "extraLoanPaymentAmount"
    ),
    extraSavingsAmount: getOptionalNumber(formData, "extraSavingsAmount"),
    loanId: (formData.get("loanId") as string | null)?.trim() || undefined,
    memberId: getRequiredString(formData, "memberId"),
    periodLabel:
      (formData.get("periodLabel") as string | null)?.trim() || undefined,
    postedAt: new Date(
      `${getRequiredString(formData, "postedAt")}T00:00:00.000Z`
    ),
    totalAmount: getOptionalNumber(formData, "totalAmount"),
    reference:
      (formData.get("reference") as string | null)?.trim() || undefined,
    scheduledLoanServicingAmount: getOptionalNumber(
      formData,
      "scheduledLoanServicingAmount"
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function createMonthlyRecordAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const record = await ensureMonthlyRecord({
    actorUserId: actor.user.id,
    month: Number(getRequiredString(formData, "month")),
    tenantId: actor.tenant.id,
    year: Number(getRequiredString(formData, "year")),
  })

  revalidatePath("/monthly-records")
  redirect(`/monthly-records?recordId=${record.id}`)
}

export async function updateMonthlyRecordSettingsAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await updateMonthlyRecordSettings({
    autoGenerateEnabled: formData.get("autoGenerateEnabled") === "on",
    generationDayOfMonth: Number(
      getRequiredString(formData, "generationDayOfMonth")
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/monthly-records")
}

export async function generateMonthlyRecordsNowAction() {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await triggerJob(
    monthlyRecordGenerateTask,
    async (payload) => monthlyRecordGenerateHandler(payload),
    {
      actorUserId: actor.user.id,
      tenantId: actor.tenant.id,
    },
    { baseDelayMs: 1000, maxAttempts: 3 }
  )

  revalidatePath("/monthly-records")
}

export async function applyMonthlyRecordMemberAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const row = await applyMonthlyRecordMember({
    actorUserId: actor.user.id,
    monthlyRecordMemberId: getRequiredString(formData, "monthlyRecordMemberId"),
    tenantId: actor.tenant.id,
    totalPaidAmount: Number(getRequiredString(formData, "totalPaidAmount")),
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open monthly records",
    actionUrl: "/monthly-records",
    bodyText: `A monthly record payment of ${Number(row.totalPaidAmount)} was applied.`,
    metadata: {
      contributionId: row.contributionId,
      memberId: row.memberId,
      monthlyRecordId: row.monthlyRecordId,
      monthlyRecordMemberId: row.id,
      repaymentId: row.repaymentId,
      status: row.status,
      totalPaidAmount: Number(row.totalPaidAmount),
    },
    notificationType: "monthly_record.member_applied",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.monthly_records",
    subject: `${actor.tenant.name}: monthly record applied`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/monthly-records")
  revalidatePath("/contributions")
  revalidatePath("/repayments")
  revalidatePath("/loans")
  revalidatePath("/members")
  revalidatePath("/notifications")
}

export async function cancelMonthlyRecordMemberAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const row = await cancelMonthlyRecordMember({
    actorUserId: actor.user.id,
    monthlyRecordMemberId: getRequiredString(formData, "monthlyRecordMemberId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open monthly records",
    actionUrl: "/monthly-records",
    bodyText: `A monthly record row was cancelled. Linked contribution and repayment records were reversed when present.`,
    metadata: {
      contributionId: row.contributionId,
      memberId: row.memberId,
      monthlyRecordId: row.monthlyRecordId,
      monthlyRecordMemberId: row.id,
      repaymentId: row.repaymentId,
      status: row.status,
      totalPaidAmount: Number(row.totalPaidAmount),
    },
    notificationType: "monthly_record.member_cancelled",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.monthly_records",
    subject: `${actor.tenant.name}: monthly record cancelled`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/monthly-records")
  revalidatePath("/contributions")
  revalidatePath("/repayments")
  revalidatePath("/loans")
  revalidatePath("/members")
  revalidatePath("/notifications")
}

export async function createChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireChargeDefinitionWritesOpen(actor)
  const kind = getRequiredString(formData, "kind") as DashboardChargeKind
  const effectiveFrom = getRequiredString(formData, "effectiveFrom")
  const chargeValueType = ((
    formData.get("chargeValueType") as string | null
  )?.trim() ||
    (kind === "percentage"
      ? "percentage"
      : "fixed_amount")) as DashboardChargeValueType

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Start date")

  await createChargeDefinition({
    amount: Number(getRequiredString(formData, "amount")),
    effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
    appliesToLoanRequests: formData.get("appliesToLoanRequests") === "on",
    appliesToLoans: formData.get("appliesToLoans") === "on",
    appliesToMembers: formData.get("appliesToMembers") === "on",
    code: getRequiredString(formData, "code"),
    chargeFrequency: ((
      formData.get("chargeFrequency") as string | null
    )?.trim() || "recurring_monthly") as DashboardChargeFrequency,
    chargeValueType,
    isMonthlyLevy: formData.get("isMonthlyLevy") === "on",
    kind: chargeValueType === "percentage" ? "percentage" : kind,
    name: getRequiredString(formData, "name"),
    purpose: ((formData.get("purpose") as string | null)?.trim() ||
      "general") as
      | "general"
      | "member_share"
      | "loan_fee"
      | "membership_fee"
      | "penalty",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
}

export async function createTenantShareStructureVersionAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const effectiveFrom = getRequiredString(formData, "effectiveFrom")

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Effective date")

  await createTenantShareStructureVersion({
    amount: Number(getRequiredString(formData, "amount")),
    basis: "after_charge_deductions",
    createdByUserId: actor.user.id,
    effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
    valueType: getRequiredString(formData, "valueType") as
      | "fixed_amount"
      | "percentage",
  })

  revalidatePath("/settings/finance")
}

export async function updateTenantShareStructureVersionAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const effectiveFrom = getRequiredString(formData, "effectiveFrom")

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Effective date")

  await updateTenantShareStructureVersion({
    amount: Number(getRequiredString(formData, "amount")),
    basis: "after_charge_deductions",
    effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    shareStructureVersionId: getRequiredString(
      formData,
      "shareStructureVersionId"
    ),
    tenantId: actor.tenant.id,
    valueType: getRequiredString(formData, "valueType") as
      | "fixed_amount"
      | "percentage",
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/migration")
}

export async function createChargeDefinitionVersionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const effectiveFrom = getRequiredString(formData, "effectiveFrom")
  const chargeValueType = getRequiredString(
    formData,
    "chargeValueType"
  ) as DashboardChargeValueType

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Effective date")

  await createChargeDefinitionVersion({
    amount: Number(getRequiredString(formData, "amount")),
    chargeDefinitionId: getRequiredString(formData, "chargeDefinitionId"),
    chargeValueType,
    createdByUserId: actor.user.id,
    effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
    kind: chargeValueType === "percentage" ? "percentage" : "fixed",
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function updateChargeDefinitionVersionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const effectiveFrom = getRequiredString(formData, "effectiveFrom")
  const chargeValueType = getRequiredString(
    formData,
    "chargeValueType"
  ) as DashboardChargeValueType

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Effective date")

  await updateChargeDefinitionVersion({
    amount: Number(getRequiredString(formData, "amount")),
    chargeDefinitionVersionId: getRequiredString(
      formData,
      "chargeDefinitionVersionId"
    ),
    chargeValueType,
    effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function createShareBusinessAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const endDate = (formData.get("endDate") as string | null)?.trim()
  const startDate = getRequiredString(formData, "startDate")

  requireDateOnOrAfterTenantStartDate(actor, startDate, "Start date")
  requireDateOnOrAfterTenantStartDate(actor, endDate, "End date")

  await createShareBusiness({
    capitalAmount: Number(getRequiredString(formData, "capitalAmount")),
    createdByUserId: actor.user.id,
    endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : undefined,
    linkedDividendPeriodId:
      (formData.get("linkedDividendPeriodId") as string | null)?.trim() ||
      undefined,
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    profitAmount: Number(getRequiredString(formData, "profitAmount")),
    startDate: new Date(`${startDate}T00:00:00.000Z`),
    status: getRequiredString(formData, "status") as
      | "planned"
      | "active"
      | "completed"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function updateShareBusinessAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const endDate = (formData.get("endDate") as string | null)?.trim()
  const startDate = getRequiredString(formData, "startDate")

  requireDateOnOrAfterTenantStartDate(actor, startDate, "Start date")
  requireDateOnOrAfterTenantStartDate(actor, endDate, "End date")

  await updateShareBusiness({
    capitalAmount: Number(getRequiredString(formData, "capitalAmount")),
    endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : null,
    linkedDividendPeriodId:
      (formData.get("linkedDividendPeriodId") as string | null)?.trim() || null,
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    profitAmount: Number(getRequiredString(formData, "profitAmount")),
    shareBusinessId: getRequiredString(formData, "shareBusinessId"),
    startDate: new Date(`${startDate}T00:00:00.000Z`),
    status: getRequiredString(formData, "status") as
      | "planned"
      | "active"
      | "completed"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function createShareBusinessProfitEntryAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const profitDate = getRequiredString(formData, "profitDate")

  requireDateOnOrAfterTenantStartDate(actor, profitDate, "Profit date")

  await createShareBusinessProfitEntry({
    allocatableProfitAmount: Number(
      getRequiredString(formData, "allocatableProfitAmount")
    ),
    createdByUserId: actor.user.id,
    expenseAmount: getOptionalNumber(formData, "expenseAmount") ?? 0,
    linkedDividendPeriodId:
      (formData.get("linkedDividendPeriodId") as string | null)?.trim() ||
      undefined,
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    profitAmount: Number(getRequiredString(formData, "profitAmount")),
    profitDate: new Date(`${profitDate}T00:00:00.000Z`),
    reason: (formData.get("reason") as string | null)?.trim() || undefined,
    shareBusinessId: getRequiredString(formData, "shareBusinessId"),
    sourceType: getRequiredString(formData, "sourceType") as
      | "manual"
      | "backfill"
      | "import",
    status: getRequiredString(formData, "status") as
      | "draft"
      | "reviewed"
      | "approved"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function updateShareBusinessProfitEntryAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const profitDate = getRequiredString(formData, "profitDate")

  requireDateOnOrAfterTenantStartDate(actor, profitDate, "Profit date")

  await updateShareBusinessProfitEntry({
    allocatableProfitAmount: Number(
      getRequiredString(formData, "allocatableProfitAmount")
    ),
    expenseAmount: getOptionalNumber(formData, "expenseAmount") ?? 0,
    linkedDividendPeriodId:
      (formData.get("linkedDividendPeriodId") as string | null)?.trim() || null,
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    profitAmount: Number(getRequiredString(formData, "profitAmount")),
    profitDate: new Date(`${profitDate}T00:00:00.000Z`),
    profitEntryId: getRequiredString(formData, "profitEntryId"),
    reason: (formData.get("reason") as string | null)?.trim() || undefined,
    sourceType: getRequiredString(formData, "sourceType") as
      | "manual"
      | "backfill"
      | "import",
    status: getRequiredString(formData, "status") as
      | "draft"
      | "reviewed"
      | "approved"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function generateShareProfitAllocationsAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)

  await generateShareProfitAllocations({
    profitEntryId: getRequiredString(formData, "profitEntryId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function publishShareProfitAllocationsAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const profitEntryId = getRequiredString(formData, "profitEntryId")

  await publishShareProfitAllocations({
    profitEntryId,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath(
    `/settings/finance/business/profits/${profitEntryId}/migration`
  )
}

export async function saveBusinessProfitMigrationWorksheetAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const profitDate = getRequiredString(formData, "profitDate")
  const profitEntryId = getRequiredString(formData, "profitEntryId")
  const allocationMode = getRequiredString(formData, "allocationMode") as
    | "percentage"
    | "value"

  requireDateOnOrAfterTenantStartDate(actor, profitDate, "Profit date")

  if (allocationMode !== "percentage" && allocationMode !== "value") {
    throw new Error("Allocation mode must be value or percentage.")
  }

  const profitAmount = Number(getRequiredString(formData, "profitAmount"))

  if (!Number.isFinite(profitAmount) || profitAmount < 0) {
    throw new Error("Profit amount must be a valid positive number.")
  }

  const expenseIndexes = Array.from(
    new Set(
      Array.from(formData.keys()).flatMap((key) => {
        const match = key.match(/^expenseReason-(\d+)$/)
        return match?.[1] ? [match[1]] : []
      })
    )
  )
  const memberIds = Array.from(
    new Set(
      Array.from(formData.keys()).flatMap((key) => {
        const match = key.match(/^allocation(?:Value|Percent)-(.+)$/)
        return match?.[1] ? [match[1]] : []
      })
    )
  )

  await saveBusinessProfitMigrationWorksheet({
    allocationMode,
    allocations: memberIds.map((memberId) => ({
      allocatedProfitAmount:
        getOptionalNumber(formData, `allocationValue-${memberId}`) ?? null,
      memberId,
      sharePercentage:
        getOptionalNumber(formData, `allocationPercent-${memberId}`) ?? null,
    })),
    expenseLines: expenseIndexes.map((index) => ({
      amount: getOptionalNumber(formData, `expenseAmount-${index}`) ?? 0,
      reason:
        (formData.get(`expenseReason-${index}`) as string | null)?.trim() || "",
    })),
    profitAmount,
    profitDate: new Date(`${profitDate}T00:00:00.000Z`),
    profitEntryId,
    tenantId: actor.tenant.id,
  })

  revalidatePath(
    `/settings/finance/business/profits/${profitEntryId}/migration`
  )
  revalidatePath("/settings/finance/business")
}

export async function updateChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const isActive = (formData.get("isActive") as string | null)?.trim()
  const amount = (formData.get("amount") as string | null)?.trim()
  const effectiveFrom = (formData.get("effectiveFrom") as string | null)?.trim()
  const kind = (formData.get("kind") as string | null)?.trim()
  const chargeValueType = (
    formData.get("chargeValueType") as string | null
  )?.trim()
  const notes = (formData.get("notes") as string | null)?.trim()

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Effective date")

  await updateChargeDefinition(
    actor.tenant.id,
    getRequiredString(formData, "chargeDefinitionId"),
    {
      ...(isActive ? { isActive: isActive === "true" } : {}),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(effectiveFrom
        ? { effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`) }
        : {}),
      ...(kind ? { kind: kind as DashboardChargeKind } : {}),
      ...(chargeValueType
        ? { chargeValueType: chargeValueType as DashboardChargeValueType }
        : {}),
      ...(notes ? { notes } : {}),
    }
  )

  revalidatePath("/charges")
}

export async function applyChargeAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const assessedAt = getRequiredString(formData, "assessedAt")

  requireDateOnOrAfterTenantStartDate(actor, assessedAt, "Charge date")

  const charge = await applyCharge({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    assessedAt: new Date(`${assessedAt}T00:00:00.000Z`),
    chargeDefinitionId: getRequiredString(formData, "chargeDefinitionId"),
    memberId: getRequiredString(formData, "memberId"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Review charges",
    actionUrl: "/charges",
    bodyText: `A charge application of ${Number(charge.amount)} was posted for member operations review.`,
    metadata: {
      chargeApplicationId: charge.id,
      memberId: charge.memberId,
    },
    notificationType: "charge.applied",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.charge",
    subject: `${actor.tenant.name}: charge applied`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function waiveChargeApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const charge = await waiveChargeApplication({
    actorUserId: actor.user.id,
    chargeApplicationId: getRequiredString(formData, "chargeApplicationId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Review charges",
    actionUrl: "/charges",
    bodyText: `A charge application was waived for member operations review.`,
    metadata: {
      chargeApplicationId: charge.id,
      memberId: charge.memberId,
      status: charge.status,
    },
    notificationType: "charge.waived",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.charge",
    subject: `${actor.tenant.name}: charge waived`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function reverseChargeApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const charge = await reverseChargeApplication({
    actorUserId: actor.user.id,
    chargeApplicationId: getRequiredString(formData, "chargeApplicationId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Review charges",
    actionUrl: "/charges",
    bodyText: `A charge application was reversed and savings were restored.`,
    metadata: {
      chargeApplicationId: charge.id,
      memberId: charge.memberId,
      status: charge.status,
    },
    notificationType: "charge.reversed",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.charge",
    subject: `${actor.tenant.name}: charge reversed`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function submitLoanRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await submitLoanRequest({
    actorUserId: actor.user.id,
    extraMonthlySavingsAmount: getOptionalNumber(
      formData,
      "extraMonthlySavingsAmount"
    ),
    loanProductId: getRequiredString(formData, "loanProductId"),
    memberId: getRequiredString(formData, "memberId"),
    purpose: (formData.get("purpose") as string | null)?.trim() || undefined,
    requestedAmount: Number(getRequiredString(formData, "requestedAmount")),
    requestedTermMonths: Number(
      getRequiredString(formData, "requestedTermMonths")
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/loans")
}

export async function reviewLoanRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const request = await reviewLoanRequest({
    actorUserId: actor.user.id,
    loanRequestId: getRequiredString(formData, "loanRequestId"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    status: getRequiredString(formData, "status") as
      | "approved"
      | "rejected"
      | "under_review",
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open loans",
    actionUrl: "/loans",
    bodyText: `Loan request ${request.id} is now ${request.status.replace(/_/g, " ")}.`,
    metadata: {
      loanRequestId: request.id,
      status: request.status,
    },
    notificationType: "loan.request_status_changed",
    roles: ["tenant_admin", "finance_officer", "operations_officer"],
    source: "dashboard.loans",
    subject: `${actor.tenant.name}: loan request ${request.status.replace(/_/g, " ")}`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/loans")
}

export async function disburseLoanAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const firstRepaymentDueAt = (
    formData.get("firstRepaymentDueAt") as string | null
  )?.trim()

  requireDateOnOrAfterTenantStartDate(
    actor,
    firstRepaymentDueAt,
    "First repayment date"
  )

  await disburseLoan({
    actorUserId: actor.user.id,
    firstRepaymentDueAt: firstRepaymentDueAt || undefined,
    loanId: getRequiredString(formData, "loanId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function postRepaymentAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await postRepayment({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    loanId: getRequiredString(formData, "loanId"),
    reference:
      (formData.get("reference") as string | null)?.trim() || undefined,
    repaymentScheduleItemId:
      (formData.get("repaymentScheduleItemId") as string | null)?.trim() ||
      undefined,
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open repayments",
    actionUrl: "/repayments",
    bodyText: `A repayment was posted for finance review and reconciliation.`,
    metadata: {
      loanId: getRequiredString(formData, "loanId"),
      repaymentScheduleItemId:
        (formData.get("repaymentScheduleItemId") as string | null)?.trim() ||
        null,
    },
    notificationType: "repayment.posted",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.repayments",
    subject: `${actor.tenant.name}: repayment posted`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function updateCooperativeProfileAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)

  await updateTenantProfile({
    actorUserId: actor.user.id,
    currentSize: (() => {
      const rawValue = (formData.get("currentSize") as string | null)?.trim()
      return rawValue ? Number(rawValue) : null
    })(),
    memberNumberPrefix: normalizeMemberNumberPrefix(
      (formData.get("memberNumberPrefix") as string | null) ?? null
    ),
    name: getRequiredString(formData, "name"),
    officeAddress:
      (formData.get("officeAddress") as string | null)?.trim() || null,
    region: (formData.get("region") as string | null)?.trim() || null,
    startDate: actor.tenant.startDate ?? null,
    tenantId: actor.tenant.id,
    timezone: getRequiredString(formData, "timezone"),
  })

  revalidatePath("/settings/profile")
  revalidatePath("/")
}

export async function updateTenantFinanceStartDateAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  await requireHistoricalFinanceSetupMutable(actor)

  await updateTenantProfile({
    actorUserId: actor.user.id,
    currentSize: actor.tenant.currentSize ?? null,
    memberNumberPrefix: normalizeMemberNumberPrefix(
      actor.tenant.memberNumberPrefix ?? null
    ),
    name: actor.tenant.name,
    officeAddress: actor.tenant.officeAddress ?? null,
    region: actor.tenant.region ?? null,
    startDate: (formData.get("startDate") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
    timezone: actor.tenant.timezone,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/profile")
  revalidatePath("/")
}

export async function finalizeInitialMigrationAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)
  const confirmation = getRequiredString(formData, "confirmation")

  if (confirmation !== "FINALIZE MIGRATION") {
    throw new Error(
      "Type FINALIZE MIGRATION to confirm the historical lock and go-live transition."
    )
  }

  const migrationState = await getTenantInitialMigrationState(actor.tenant.id)
  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => stepKey !== "finalization"
  )

  if (blockingSteps.length > 0) {
    throw new Error(
      "Initial migration cannot be finalized until every setup and member backfill step is complete."
    )
  }

  await finalizeTenantInitialMigration({
    actorUserId: actor.user.id,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/")
}

export async function unlockInitialMigrationAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)
  const unlockUntilValue = getRequiredString(formData, "unlockUntil")
  const unlockUntil = new Date(unlockUntilValue)

  if (
    Number.isNaN(unlockUntil.getTime()) ||
    unlockUntil.getTime() <= Date.now()
  ) {
    throw new Error("Emergency unlock expiry must be a future date and time.")
  }

  await setTenantInitialMigrationEmergencyUnlock({
    actorUserId: actor.user.id,
    reason: getRequiredString(formData, "reason"),
    tenantId: actor.tenant.id,
    unlockUntil,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/")
}

export async function createLegacyLoanMigrationDraftAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const closedAt = (formData.get("closedAt") as string | null)?.trim()

  await createLegacyLoanMigrationDraft({
    actorUserId: actor.user.id,
    closedAt: closedAt ? new Date(`${closedAt}T00:00:00.000Z`) : null,
    guarantorOneMemberId:
      (formData.get("guarantorOneMemberId") as string | null)?.trim() || null,
    guarantorTwoMemberId:
      (formData.get("guarantorTwoMemberId") as string | null)?.trim() || null,
    loanLabel: getRequiredString(formData, "loanLabel"),
    memberId,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    openedAt: new Date(
      `${getRequiredString(formData, "openedAt")}T00:00:00.000Z`
    ),
    principalAmount: Number(getRequiredString(formData, "principalAmount")),
    outstandingPrincipalBalance:
      getOptionalNumber(formData, "outstandingPrincipalBalance") ??
      Number(getRequiredString(formData, "principalAmount")),
    savingsDuringLoan: Number(getRequiredString(formData, "savingsDuringLoan")),
    scheduledMonthlyPrincipalRepayment: Number(
      getRequiredString(formData, "scheduledMonthlyPrincipalRepayment")
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidatePath("/settings/finance/loan")
}

export async function updateLegacyLoanMigrationDraftAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const closedAt = (formData.get("closedAt") as string | null)?.trim()

  await updateLegacyLoanMigrationDraft({
    actorUserId: actor.user.id,
    closedAt: closedAt ? new Date(`${closedAt}T00:00:00.000Z`) : null,
    draftId: getRequiredString(formData, "draftId"),
    guarantorOneMemberId:
      (formData.get("guarantorOneMemberId") as string | null)?.trim() || null,
    guarantorTwoMemberId:
      (formData.get("guarantorTwoMemberId") as string | null)?.trim() || null,
    loanLabel: getRequiredString(formData, "loanLabel"),
    memberId,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    openedAt: new Date(
      `${getRequiredString(formData, "openedAt")}T00:00:00.000Z`
    ),
    principalAmount: Number(getRequiredString(formData, "principalAmount")),
    outstandingPrincipalBalance:
      getOptionalNumber(formData, "outstandingPrincipalBalance") ??
      Number(getRequiredString(formData, "principalAmount")),
    savingsDuringLoan: Number(getRequiredString(formData, "savingsDuringLoan")),
    scheduledMonthlyPrincipalRepayment: Number(
      getRequiredString(formData, "scheduledMonthlyPrincipalRepayment")
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidatePath("/settings/finance/loan")
}

export async function upsertMemberAmountLogAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)

  await upsertMemberAmountLog({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    effectiveFrom: new Date(
      `${getRequiredString(formData, "effectiveFrom")}T00:00:00.000Z`
    ),
    memberId,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath(`/settings/finance/migration/${memberId}`)
}

export async function markLegacyLoansReviewedAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const confirmation = getRequiredString(formData, "confirmation")

  if (confirmation !== "NO LEGACY LOANS") {
    throw new Error(
      "Type NO LEGACY LOANS to confirm there are no historical loan balances to migrate."
    )
  }

  await markTenantLegacyLoansReviewed({
    actorUserId: actor.user.id,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function markBusinessProfitPoolsReviewedAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const confirmation = getRequiredString(formData, "confirmation")

  if (confirmation !== "NO BUSINESS PROFITS") {
    throw new Error(
      "Type NO BUSINESS PROFITS to confirm there are no historical business profit pools to migrate."
    )
  }

  await markTenantBusinessProfitPoolsReviewed({
    actorUserId: actor.user.id,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

export async function upsertMigrationBackfillAdjustmentAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const rawMonth = getRequiredString(formData, "month")

  await upsertMigrationBackfillAdjustment({
    actorUserId: actor.user.id,
    loanRepaymentOnTime:
      formData.get("loanRepaymentOnTime") === "on" ||
      formData.get("loanRepaymentOnTime") === "true"
        ? true
        : null,
    loanRepaymentAmount:
      getOptionalNumber(formData, "loanRepaymentAmount") ?? null,
    memberId,
    month: new Date(`${rawMonth}-01T00:00:00.000Z`),
    notes: (formData.get("notes") as string | null)?.trim() || null,
    rowStatus: (formData.get("rowStatus") as any) || null,
    savingsContribution:
      getOptionalNumber(formData, "savingsContribution") ?? null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
}

export async function setMigrationBackfillDefaultingMonthsAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const allMonthValues = formData
    .getAll("month")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0
    )
  const defaultingMonthValues = formData
    .getAll("defaultingMonth")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0
    )

  if (allMonthValues.length === 0) {
    throw new Error("Select at least one migration month.")
  }

  await setMigrationBackfillDefaultingMonths({
    actorUserId: actor.user.id,
    defaultingMonths: defaultingMonthValues.map(
      (month) => new Date(`${month}-01T00:00:00.000Z`)
    ),
    memberId,
    months: allMonthValues.map(
      (month) => new Date(`${month}-01T00:00:00.000Z`)
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
}

export async function upsertMemberActivityEventAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const rawEffectiveMonth = getRequiredString(formData, "effectiveMonth")
  const status = getRequiredString(formData, "status")

  if (status !== "active" && status !== "inactive") {
    throw new Error("Member activity status must be active or inactive.")
  }

  await upsertMemberActivityEvent({
    actorUserId: actor.user.id,
    effectiveMonth: new Date(`${rawEffectiveMonth}-01T00:00:00.000Z`),
    memberId,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    reason: (formData.get("reason") as string | null)?.trim() || null,
    status,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
}

export async function deleteMemberActivityEventAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)

  await deleteMemberActivityEvent({
    actorUserId: actor.user.id,
    eventId: getRequiredString(formData, "eventId"),
    memberId,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
}

export async function upsertMigrationProfitAdjustmentAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)

  await upsertMigrationProfitAdjustment({
    actorUserId: actor.user.id,
    allocatedProfitAmount:
      getOptionalNumber(formData, "allocatedProfitAmount") ?? null,
    memberId,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    profitEntryId: getRequiredString(formData, "profitEntryId"),
    sharePercentage: getOptionalNumber(formData, "sharePercentage") ?? null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
}

function getOptionalPositiveInteger(formData: FormData, key: string) {
  const rawValue = (formData.get(key) as string | null)?.trim()

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a whole number greater than 0.`)
  }

  return parsed
}

function getOptionalDateValue(formData: FormData, key: string) {
  const rawValue = (formData.get(key) as string | null)?.trim()

  if (!rawValue) {
    return null
  }

  const parsed = new Date(`${rawValue}T23:59:59.999Z`)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${key} must be a valid date.`)
  }

  return parsed
}

export async function updateMemberSignupAccessModeAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await updateTenantMemberSignupSettings({
    actorUserId: actor.user.id,
    memberSignupAccessMode: getRequiredString(
      formData,
      "memberSignupAccessMode"
    ) as "in_office" | "public",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/members")
  revalidatePath("/membership-approvals")
  revalidatePath("/signup/members")
  revalidatePath("/login")
  revalidatePath("/")
}

export async function createMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await createMemberSignupLink({
    actorUserId: actor.user.id,
    expiresAt: getOptionalDateValue(formData, "expiresAt"),
    maxSignups: getOptionalPositiveInteger(formData, "maxSignups"),
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/members")
  revalidatePath("/membership-approvals")
  revalidatePath("/signup/members")
}

export async function updateMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await updateMemberSignupLink({
    actorUserId: actor.user.id,
    expiresAt: getOptionalDateValue(formData, "expiresAt"),
    linkId: getRequiredString(formData, "linkId"),
    maxSignups: getOptionalPositiveInteger(formData, "maxSignups"),
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/signup/members")
}

export async function toggleMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await setMemberSignupLinkEnabled({
    actorUserId: actor.user.id,
    enabled: getRequiredString(formData, "enabled") === "true",
    linkId: getRequiredString(formData, "linkId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/signup/members")
}

export async function rotateMemberSignupLinkAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await rotateMemberSignupLinkToken({
    actorUserId: actor.user.id,
    linkId: getRequiredString(formData, "linkId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/member-signup-links")
  revalidatePath("/signup/members")
}

export async function createTenantDomainAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await createTenantCustomDomain({
    actorUserId: actor.user.id,
    hostname: getRequiredString(formData, "hostname"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
  revalidatePath("/")
}

export async function setTenantDomainPrimaryAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await setTenantDomainPrimary({
    actorUserId: actor.user.id,
    domainId: getRequiredString(formData, "domainId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
}

export async function updateTenantDomainVerificationStatusAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await updateTenantDomainVerificationStatus({
    actorUserId: actor.user.id,
    domainId: getRequiredString(formData, "domainId"),
    status: getRequiredString(formData, "status") as
      | "failed"
      | "pending_dns"
      | "verified",
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open domains",
    actionUrl: "/domains",
    bodyText: `A custom domain verification status was updated to ${getRequiredString(formData, "status").replace(/_/g, " ")}.`,
    metadata: {
      domainId: getRequiredString(formData, "domainId"),
      status: getRequiredString(formData, "status"),
    },
    notificationType: "domain.verification_changed",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.domains",
    subject: `${actor.tenant.name}: domain verification updated`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
}

export async function runTenantDomainVerificationCheckAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  const domain = await runTenantDomainVerificationCheck({
    actorUserId: actor.user.id,
    domainId: getRequiredString(formData, "domainId"),
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open domains",
    actionUrl: "/domains",
    bodyText: `A domain verification check completed with status ${domain.verificationStatus.replace(/_/g, " ")}.`,
    metadata: {
      domainId: domain.id,
      hostname: domain.hostname,
      status: domain.verificationStatus,
    },
    notificationType: "domain.verification_checked",
    roles: ["tenant_admin", "operations_officer"],
    source: "dashboard.domains",
    subject: `${actor.tenant.name}: domain verification check completed`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/domains")
}

export async function provisionTenantUserRoleAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await provisionTenantUserRole({
    actorUserId: actor.user.id,
    email: getRequiredString(formData, "email"),
    fullName: getRequiredString(formData, "fullName"),
    makeDefault: formData.get("makeDefault") === "on",
    role: getRequiredString(
      formData,
      "role"
    ) as import("@halaalvest/db").MembershipRole,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/roles")
}

export async function saveNotificationPreferenceAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await upsertNotificationPreference({
    actorUserId: actor.user.id,
    channel: getRequiredString(formData, "channel"),
    enabled: getRequiredString(formData, "enabled") === "true",
    notificationType: getRequiredString(formData, "notificationType"),
    role: (formData.get("role") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/notifications")
}

export async function refreshCollectionsStatusesAction() {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await refreshCollectionsStatuses({
    actorUserId: actor.user.id,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function recordCollectionFollowUpAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const followUpStatus = getRequiredString(formData, "status") as
    | "promise_to_pay"
    | "reminded"
    | "settled"
    | "unreachable"

  const followUp = await recordCollectionFollowUp({
    assignedToUserId:
      (formData.get("assignedToUserId") as string | null)?.trim() || undefined,
    actorUserId: actor.user.id,
    caseStage:
      (formData.get("caseStage") as string | null)?.trim() || undefined,
    note: getRequiredString(formData, "note"),
    nextActionAt:
      (formData.get("nextActionAt") as string | null)?.trim() || undefined,
    priority: (formData.get("priority") as string | null)?.trim() || undefined,
    promiseToPayAt:
      (formData.get("promiseToPayAt") as string | null)?.trim() || undefined,
    repaymentScheduleItemId: getRequiredString(
      formData,
      "repaymentScheduleItemId"
    ),
    resolutionStatus:
      (formData.get("resolutionStatus") as string | null)?.trim() || undefined,
    status: followUpStatus,
    tenantId: actor.tenant.id,
  })

  await queueTenantRoleNotifications({
    actionLabel: "Open repayments",
    actionUrl: "/repayments",
    bodyText: `A collections follow-up was recorded with status ${followUpStatus.replace(/_/g, " ")}.`,
    metadata: {
      assignedToUserId:
        (formData.get("assignedToUserId") as string | null)?.trim() || null,
      caseStage: (formData.get("caseStage") as string | null)?.trim() || null,
      nextActionAt:
        (formData.get("nextActionAt") as string | null)?.trim() || null,
      priority: (formData.get("priority") as string | null)?.trim() || null,
      promiseToPayAt:
        (formData.get("promiseToPayAt") as string | null)?.trim() || null,
      repaymentScheduleItemId: followUp.repaymentScheduleItemId,
      resolutionStatus:
        (formData.get("resolutionStatus") as string | null)?.trim() || null,
      status: followUpStatus,
    },
    notificationType: "collections.follow_up_recorded",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.collections",
    subject: `${actor.tenant.name}: collections follow-up recorded`,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/repayments")
}

const importSettingsPaths = [
  "/settings/imports",
  "/settings/imports/members",
  "/settings/imports/deduction-sources",
  "/settings/imports/loan-products",
  "/settings/imports/contributions",
  "/settings/imports/charges",
  "/settings/imports/loan-migrations",
  "/settings/imports/repayment-migrations",
  "/settings/imports/batches",
]

function revalidateImportSettingsPaths() {
  importSettingsPaths.forEach((path) => revalidatePath(path))
}

export async function importMembersCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  await requireMemberDataImportPrerequisitesComplete(actor, "members")
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importMembers>[0]["rows"][number]
  >("members", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }
  requireImportRowsOnOrAfterTenantStartDate(
    actor,
    "members",
    parsed.rows as unknown as Record<string, unknown>[]
  )

  await importMembers({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/members")
}

export async function importDeductionSourcesCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  await requireImportWindowOpen(actor)
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importDeductionSources>[0]["rows"][number]
  >("deduction_sources", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importDeductionSources({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/members")
}

export async function importLoanProductsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  await requireImportWindowOpen(actor)
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importLoanProducts>[0]["rows"][number]
  >("loan_products", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importLoanProducts({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/loans")
}

export async function importContributionsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireMemberDataImportPrerequisitesComplete(actor, "contributions")
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importContributions>[0]["rows"][number]
  >("contributions", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }
  requireImportRowsOnOrAfterTenantStartDate(
    actor,
    "contributions",
    parsed.rows as unknown as Record<string, unknown>[]
  )

  await importContributions({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/contributions")
  revalidatePath("/members")
}

export async function importChargesCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireMemberDataImportPrerequisitesComplete(actor, "charges")
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importCharges>[0]["rows"][number]
  >("charges", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }
  requireImportRowsOnOrAfterTenantStartDate(
    actor,
    "charges",
    parsed.rows as unknown as Record<string, unknown>[]
  )

  await importCharges({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/charges")
  revalidatePath("/members")
}

export async function importLoanMigrationsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireMemberDataImportPrerequisitesComplete(actor, "loan_migrations")
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importLoanMigrations>[0]["rows"][number]
  >("loan_migrations", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }
  requireImportRowsOnOrAfterTenantStartDate(
    actor,
    "loan_migrations",
    parsed.rows as unknown as Record<string, unknown>[]
  )

  await importLoanMigrations({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/loans")
  revalidatePath("/repayments")
  revalidatePath("/members")
}

export async function importRepaymentMigrationsCsvAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireMemberDataImportPrerequisitesComplete(
    actor,
    "repayment_migrations"
  )
  requireDirectImportConfirmation(formData)
  const parsed = parseDashboardImportCsv<
    Parameters<typeof importRepaymentMigrations>[0]["rows"][number]
  >("repayment_migrations", getRequiredString(formData, "csvText"))

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }

  await importRepaymentMigrations({
    actorUserId: actor.user.id,
    rows: parsed.rows,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/repayments")
  revalidatePath("/loans")
  revalidatePath("/members")
}

export async function stageImportBatchAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireImportWindowOpen(actor)
  const importKind = getRequiredString(formData, "importKind") as
    | "members"
    | "deduction_sources"
    | "loan_products"
    | "contributions"
    | "charges"
    | "loan_migrations"
    | "repayment_migrations"

  if (isMemberDataImportKind(importKind)) {
    await requireMemberDataImportPrerequisitesComplete(actor, importKind)
  }

  const csvText = getRequiredString(formData, "csvText")
  const parsed = parseDashboardImportCsv<Record<string, unknown>>(
    importKind,
    csvText
  )

  if (!parsed.ok) {
    throw new Error(parsed.errors[0] ?? "CSV import validation failed.")
  }
  requireImportRowsOnOrAfterTenantStartDate(actor, importKind, parsed.rows)

  const referenceData = await getImportReferenceData(actor.tenant.id)
  const seen = new Set<string>()
  const duplicateKeys = new Set<string>()

  parsed.rows.forEach((row) => {
    const primaryValue = getDashboardImportPrimaryValue(importKind, row)
    if (!primaryValue) {
      return
    }

    if (seen.has(primaryValue)) {
      duplicateKeys.add(primaryValue)
      return
    }

    seen.add(primaryValue)
  })

  await createImportBatch({
    actorUserId: actor.user.id,
    duplicateRowCount: duplicateKeys.size,
    existingMatchCount: parsed.rows.filter((row) =>
      getDashboardImportExistingMatches(importKind, referenceData, row)
    ).length,
    importType: importKind,
    rows: parsed.rows.map((row, index) => {
      const primaryValue = getDashboardImportPrimaryValue(importKind, row)
      return {
        duplicateInFile: primaryValue ? duplicateKeys.has(primaryValue) : false,
        existingMatch: getDashboardImportExistingMatches(
          importKind,
          referenceData,
          row
        ),
        payload: row,
        primaryValue,
        rowIndex: index + 1,
      }
    }),
    sourceCsv: csvText,
    tenantId: actor.tenant.id,
    validRows: parsed.rows.length,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/members")
}

export async function applyImportBatchAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const batchId = getRequiredString(formData, "batchId")
  const confirmation = getRequiredString(formData, "confirmation")

  if (confirmation !== "APPLY IMPORT") {
    throw new Error("Type APPLY IMPORT to apply the staged import batch.")
  }

  const importKind = await getImportBatchKind({
    batchId,
    tenantId: actor.tenant.id,
  })

  if (isMemberDataImportKind(importKind)) {
    await requireMemberDataImportPrerequisitesComplete(actor, importKind)
  } else {
    await requireImportWindowOpen(actor)
  }

  await applyImportBatch({
    actorUserId: actor.user.id,
    batchId,
    tenantId: actor.tenant.id,
  })

  revalidateImportSettingsPaths()
  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/charges")
  revalidatePath("/loans")
  revalidatePath("/repayments")
}

export async function queueBackfillDraftAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  await requireMemberBackfillPrerequisitesComplete(actor)
  const startMonth =
    (formData.get("startMonth") as string | null)?.trim() || undefined
  const endMonth =
    (formData.get("endMonth") as string | null)?.trim() || undefined

  await triggerJob(
    backfillInitializeTask,
    async (payload) => backfillInitializeHandler(payload),
    {
      actorUserId: actor.user.id,
      endMonth,
      memberId,
      startMonth,
      tenantId: actor.tenant.id,
    },
    { baseDelayMs: 1000, maxAttempts: 3 }
  )

  revalidatePath("/members")
  revalidatePath(`/members/${memberId}`)
  revalidatePath("/settings/finance")
}

export async function getBackfillPreviewAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  await requireMemberBackfillPrerequisitesComplete(actor)

  const draftInput = await buildBackfillDraftInputForMember({
    tenantId: actor.tenant.id,
    memberId,
  })

  return {
    draft: buildBackfillDraft(draftInput),
    draftInput,
  }
}

export async function queueBackfillApplyAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  await requireMemberBackfillPrerequisitesComplete(actor)
  const confirmation = getRequiredString(formData, "confirmation")
  const startMonth =
    (formData.get("startMonth") as string | null)?.trim() || undefined
  const endMonth =
    (formData.get("endMonth") as string | null)?.trim() || undefined

  if (confirmation !== "APPLY BACKFILL") {
    throw new Error(
      "Type APPLY BACKFILL to post the selected member's historical ledger."
    )
  }

  await triggerJob(
    backfillApplyTask,
    async (payload) => backfillApplyHandler(payload),
    {
      actorUserId: actor.user.id,
      batchId: (formData.get("batchId") as string | null)?.trim() || undefined,
      endMonth,
      memberId,
      startMonth,
      tenantId: actor.tenant.id,
    },
    { baseDelayMs: 1000, maxAttempts: 3 }
  )

  revalidatePath("/members")
  revalidatePath(`/members/${memberId}`)
  revalidatePath("/settings/finance")
}
