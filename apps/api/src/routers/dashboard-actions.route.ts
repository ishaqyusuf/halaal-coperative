import { AsyncLocalStorage } from "node:async_hooks"
import { createHash, createHmac } from "node:crypto"
import { z } from "zod"
import type { TRPCContext } from "../context"
import { authenticatedProcedure, createTRPCRouter } from "../lib.trpc"
import { buildBackfillDraft } from "@halaalvest/backfill"
import {
  assertMemberOperationalReadiness,
  addMemberSupportCaseMessage,
  applyMemberOpeningBalance,
  cancelMemberOpeningBalance,
  postCollectionSourceContributionBatchRows,
  buildBackfillDraftInputForMember,
  addSupportCaseMessage,
  chargeApplicabilityTriggerKeys,
  chargeCollectionModeKeys,
  chargeWorkflowKeys,
  approveMemberOnboardingRequest,
  applyCharge,
  applyImportBatch,
  closeContributionPlan,
  createSupportCase,
  createTenantCustomDomain,
  createChargeDefinition,
  createChargeDefinitionVersion,
  deleteChargeDefinition,
  deleteChargeDefinitionVersion,
  createImportBatch,
  createHistoricalMemberSharePurchase,
  createLegacyLoanMigrationDraft,
  createMemberOpeningBalance,
  createMemberPaymentReceipt,
  createProjectFinancingRequest,
  stageCollectionSourceContributionBatch,
  deleteMemberActivityEvent,
  createMember,
  createMemberDocument,
  createMemberSignupLink,
  createMemberShareApplication,
  createMemberSupportCase,
  createFoodPurchaseCycle,
  createProcurementRequest,
  createShareBusiness,
  createShareBusinessProfitEntry,
  finalizeTenantInitialMigration,
  generateShareProfitAllocations,
  disburseLoan,
  openMonthlyFinancingCycle,
  getImportBatchKind,
  getImportReferenceData,
  getTenantInitialMigrationState,
  getMemberByUserId,
  getSupportCase,
  importCharges,
  importContributions,
  importDeductionSources,
  importLoanMigrations,
  importLoanProducts,
  importMembers,
  importRepaymentMigrations,
  getInitialMigrationMemberReview,
  getTenantOperationProfile,
  generateHistoricalBackfillShareProfitAllocations,
  markTenantBusinessProfitPoolsReviewed,
  markTenantLegacyLoansReviewed,
  applyMonthlyRecordMember,
  cancelMonthlyRecordMember,
  ensureMonthlyRecord,
  ensureMemberPortalAccess,
  updateMonthlyRecordSettings,
  updateCollectionSourceContributionBatchRows,
  recordCollectionFollowUp,
  provisionTenantUserRole,
  rotateMemberSignupLinkToken,
  refreshCollectionsStatuses,
  recordFoodPurchaseAccounting,
  recordMemberPayment,
  recordProjectFinancingDisbursement,
  recordProcurementPurchase,
  saveBusinessProfitMigrationWorksheet,
  saveBusinessProfitSeasonReviews,
  saveMigrationProfitSeasonAdjustments,
  upsertMigrationProfitAdjustment,
  recordContribution,
  reviewMemberPaymentReceipt,
  reviewMemberOpeningBalance,
  reverseMemberOpeningBalance,
  reviewFoodPurchaseAccounting,
  reviewSupportCaseFinancialAdjustment,
  reviewProjectFinancingRequest,
  reverseChargeApplication,
  reviewLoanGuarantorApproval,
  respondMemberLoanGuarantorApproval,
  reviewMemberShareApplication,
  reviewLoanRequest,
  reviewFoodPurchaseApplication,
  reviewProcurementRequest,
  runTenantDomainVerificationCheck,
  setTenantInitialMigrationEmergencyUnlock,
  setTenantDomainPrimary,
  updateTenantDomainVerificationStatus,
  updateTenantShareStructureVersion,
  updateTenantSharePolicy,
  updateTenantBusinessProfitPolicy,
  updateShareBusinessProfitEntry,
  setMemberContributionPlan,
  settleSupportCaseSpecialSavingsRefund,
  setMemberSignupLinkEnabled,
  submitFoodPurchaseApplication,
  submitLoanRequest,
  postRepayment,
  publishShareProfitAllocations,
  setMigrationBackfillDefaultingMonths,
  upsertNotificationPreference,
  rejectMemberOnboardingRequest,
  updateContributionPlan,
  updateMemberPaymentAllocationPreference,
  updateTenantProfile,
  updateTenantTrustProfile,
  updateChargeDefinition,
  updateChargeDefinitionVersion,
  updateTenantMigrationSetup,
  upsertTenantBroughtForwardSnapshot,
  updateShareBusiness,
  updateSupportCaseStatus,
  updateMemberKyc,
  updateMember,
  updateMemberDocumentReview,
  updateMemberSignupLink,
  updateLoanProductSettings,
  updateMonthlyFinancingCycleStatus,
  updateTenantFinancingCyclePolicy,
  updateTenantMemberSignupSettings,
  updateLegacyLoanMigrationDraft,
  upsertTenantShareStructureVersion,
  upsertMemberActivityEvent,
  upsertMigrationBackfillAdjustment,
  updateMemberStatus,
  updateTenantOperationProfile,
  waiveChargeApplication,
  upsertMemberAmountLog,
  type FoodPurchaseApplicationRow,
  type ChargeApplicabilityInput,
  type FoodPurchaseCycleRow,
  type MembershipRole,
  type MemberPaymentReceiptRow,
  type MemberShareApplicationRow,
  type ProcurementRequestRow,
  type ProjectFinancingRequestRow,
  type SupportCaseMessageAuthorType,
  type SupportCaseRow,
  tenantServiceAccessModes,
  tenantServiceKeys,
  type TenantServiceAccessMode,
  type TenantServiceKey,
} from "@halaalvest/db"
import {
  createEmailDraftFromType,
  createNotificationEmailDraft,
} from "@halaalvest/notifications"
import {
  isCooperativeCountry,
  parseCooperativeSizeRangeValue,
} from "@halaalvest/domain"
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
import {
  type DashboardImportKind,
  getDashboardImportExistingMatches,
  getDashboardImportPrimaryValue,
  parseDashboardImportCsv,
} from "../lib/import-csv"
import {
  composeMemberNumber,
  normalizeMemberNumberPrefix,
} from "../lib/member-number"
import {
  sendEmailDraftWithAudit as sendEmailDraftWithAuditBase,
  sendTenantRoleNotificationEmails as sendTenantRoleNotificationEmailsBase,
} from "../lib/server-notifications"
import {
  createQaNotificationPreviews,
  type QaNotificationPreview,
} from "@halaalvest/notifications"

type DashboardActionState = {
  context: TRPCContext
  qaPreviews: QaNotificationPreview[]
  revalidatePaths: string[]
}

const dashboardActionState = new AsyncLocalStorage<DashboardActionState>()

function revalidatePath(path: string) {
  const state = dashboardActionState.getStore()

  if (!state) {
    return
  }

  state.revalidatePaths.push(path)
}

function collectQaPreviews(previews: readonly QaNotificationPreview[]) {
  const state = dashboardActionState.getStore()

  if (!state || previews.length === 0) return

  state.qaPreviews.push(...previews)
}

async function sendEmailDraftWithAudit(
  input: Parameters<typeof sendEmailDraftWithAuditBase>[0]
) {
  const delivery = await sendEmailDraftWithAuditBase(input)
  collectQaPreviews(createQaNotificationPreviews([delivery]))

  return delivery
}

async function sendTenantRoleNotificationEmails(
  input: Parameters<typeof sendTenantRoleNotificationEmailsBase>[0]
) {
  const deliveries = await sendTenantRoleNotificationEmailsBase(input)
  collectQaPreviews(createQaNotificationPreviews(deliveries))

  return deliveries
}

function getPasswordSetupSecret() {
  const configuredSecret = process.env.AUTH_SECRET?.trim()

  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-password-reset-secret"
  }

  throw new Error("AUTH_SECRET must be configured in production.")
}

function signPasswordSetupToken(body: string) {
  return createHmac("sha256", getPasswordSetupSecret())
    .update(body)
    .digest("base64url")
}

function getPasswordState(passwordHash: string | null | undefined) {
  return createHash("sha256")
    .update(passwordHash?.trim() || "password-unset")
    .digest("base64url")
}

function createPasswordSetupToken(user: {
  email: string
  id: string
  passwordHash: string | null
  tenantId: string
}) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString()
  const payload = {
    email: user.email,
    expiresAt,
    passwordState: getPasswordState(user.passwordHash),
    tenantId: user.tenantId,
    userId: user.id,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")

  return {
    expiresAt,
    token: `${body}.${signPasswordSetupToken(body)}`,
  }
}

function revalidateMemberBackfillPaths(memberId: string) {
  revalidatePath("/members")
  revalidatePath(`/members/${memberId}`)
  revalidatePath(`/members/${memberId}/backfill`)
}

export type DashboardActionResult<TResult = unknown> = {
  data: TResult
  qaPreviews: QaNotificationPreview[]
  revalidatePaths: string[]
}

async function runDashboardActionWithContext<TResult>(
  context: TRPCContext,
  handler: () => Promise<TResult>
): Promise<DashboardActionResult<TResult>> {
  const state: DashboardActionState = {
    context,
    qaPreviews: [],
    revalidatePaths: [],
  }
  const data = await dashboardActionState.run(state, handler)

  return {
    data,
    qaPreviews: state.qaPreviews,
    revalidatePaths: Array.from(new Set(state.revalidatePaths)),
  }
}

export const memberManagementRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "operations_officer",
]

export const financeManagementRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
]

export const allStaffRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
]

export const memberSelfServiceRoles: MembershipRole[] = ["member"]

export const workspaceConfigurationRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
  "operations_officer",
]

export const workspaceAdminRoles: MembershipRole[] = [
  "super_admin",
  "tenant_admin",
]

export function hasAnyRole(
  role: MembershipRole | null | undefined,
  allowedRoles: MembershipRole[]
) {
  if (!role) {
    return false
  }

  return allowedRoles.includes(role)
}

type DashboardMemberType = "civil_servant" | "individual" | "business"
type DashboardMemberStatus =
  | "pending"
  | "active"
  | "inactive"
  | "suspended"
  | "exited"
type DashboardContributionChannel = "payroll" | "transfer" | "cash" | "manual"
type DashboardPaymentReceiptAllocationCategory =
  | "commitment"
  | "special_savings"
  | "loan_servicing"
  | "loan_extra_payment"
  | "shares"
  | "procurement"
  | "project_financing"
  | "food_purchase"
  | "other"
type DashboardPaymentReceiptPeriodIntent =
  | "current_period"
  | "future_period"
  | "back_period"
  | "unspecified"
type DashboardPaymentReceiptStatus =
  | "under_review"
  | "correction_requested"
  | "approved"
  | "rejected"
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

function normalizeCollectionSourceFormValue(value: string | null) {
  if (!value || value === "none") {
    return null
  }

  return value
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

async function requireDashboardActor(allowedRoles: MembershipRole[]) {
  const state = dashboardActionState.getStore()
  const context = state?.context
  const tenant = context?.tenant.current ?? null
  const membership = context?.auth.activeMembership ?? null
  const user = context?.auth.session?.user ?? null

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

async function requireActorMember(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const member = await getMemberByUserId({
    tenantId: actor.tenant.id,
    userId: actor.user.id,
  })

  if (!member) {
    throw new Error("Your user account is not linked to a member profile.")
  }

  return member
}

async function requireOperationalActorMember(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>
) {
  const member = await requireActorMember(actor)

  await assertMemberOperationalReadiness({
    memberId: member.id,
    tenantId: actor.tenant.id,
  })

  return member
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

type BusinessProfitActionSourceType = "manual" | "backfill" | "import"

function isHistoricalBusinessProfitActionSource(
  sourceType: BusinessProfitActionSourceType | string | null | undefined
) {
  return sourceType === "backfill" || sourceType === "import"
}

async function requireBusinessProfitOperationOpen(
  actor: Awaited<ReturnType<typeof requireDashboardActor>>,
  sourceType: BusinessProfitActionSourceType | string | null = "manual"
) {
  const migrationState = await getTenantInitialMigrationState(actor.tenant.id)

  if (isHistoricalBusinessProfitActionSource(sourceType)) {
    if (!migrationState.snapshot.canUseMigrationTools) {
      throw new Error(
        "Historical business profit migration records are locked because initial migration is finalized."
      )
    }

    if (hasAppliedInitialMigrationBackfill(migrationState)) {
      throw new Error(
        "Historical business profit migration records are locked because member ledger backfill has already started."
      )
    }

    return migrationState
  }

  if (
    migrationState.snapshot.canUseLiveFinancialWrites ||
    migrationState.snapshot.status === "finalized"
  ) {
    return migrationState
  }

  if (!migrationState.snapshot.canUseMigrationTools) {
    throw new Error(
      "Business profit records are locked until live operations are available."
    )
  }

  if (hasAppliedInitialMigrationBackfill(migrationState)) {
    throw new Error(
      "Business profit records are locked because member ledger backfill has already started. Finish migration or create live business records after go-live."
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
  ])

  if (importKind !== "members") {
    requiredStepKeys.add("member_profiles")
  }

  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => requiredStepKeys.has(stepKey)
  )

  if (blockingSteps.length > 0) {
    const blockingStepKeys: ReadonlySet<string> = new Set(blockingSteps)
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingStepKeys.has(step.key))
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
  ])
  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) => setupStepKeys.has(stepKey)
  )

  if (blockingSteps.length > 0) {
    const blockingStepKeys: ReadonlySet<string> = new Set(blockingSteps)
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingStepKeys.has(step.key))
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
  await requireInitialMigrationOrLiveWritesOpen(actor)

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
  const migrationState = await requireInitialMigrationOrLiveWritesOpen(actor)
  const blockingSteps = migrationState.snapshot.missingStepKeys.filter(
    (stepKey) =>
      stepKey === "finance_start_date" ||
      stepKey === "charge_schedules" ||
      stepKey === "business_profit_pools" ||
      stepKey === "business_profit_seasons" ||
      stepKey === "legacy_loans" ||
      stepKey === "member_profiles"
  )

  if (blockingSteps.length > 0) {
    const blockingStepKeys: ReadonlySet<string> = new Set(blockingSteps)
    const labels = migrationState.snapshot.steps
      .filter((step) => blockingStepKeys.has(step.key))
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

function getAllTrimmedStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
}

function indexedValue(values: string[], index: number) {
  return values[index] ?? ""
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

function getTenantServiceAccessMode(
  formData: FormData,
  key: string
): TenantServiceAccessMode {
  const value = getRequiredString(formData, key)

  if (!tenantServiceAccessModes.includes(value as TenantServiceAccessMode)) {
    throw new Error(`Invalid service access mode for ${key}.`)
  }

  return value as TenantServiceAccessMode
}

function getOptionalTenantServiceAccessMode(
  formData: FormData,
  key: string
): TenantServiceAccessMode | null {
  const value = (formData.get(key) as string | null)?.trim()

  if (!value) {
    return null
  }

  if (!tenantServiceAccessModes.includes(value as TenantServiceAccessMode)) {
    throw new Error(`Invalid service access mode for ${key}.`)
  }

  return value as TenantServiceAccessMode
}

function getGuidedServiceAccessMode(
  formData: FormData,
  serviceKey: string,
  fallback: TenantServiceAccessMode
): TenantServiceAccessMode {
  const offered = (
    formData.get(`${serviceKey}Offered`) as string | null
  )?.trim()

  if (!offered) {
    return fallback
  }

  if (offered === "no") {
    return fallback === "read_only" ? "read_only" : "disabled"
  }

  if (offered !== "yes") {
    throw new Error(`Invalid offered value for ${serviceKey}.`)
  }

  const channel = (
    formData.get(`${serviceKey}RequestChannel`) as string | null
  )?.trim()

  if (channel === "member") {
    return "member_self_service"
  }

  if (!channel || channel === "office") {
    return "office_only"
  }

  throw new Error(`Invalid request channel for ${serviceKey}.`)
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

function parsePaymentReceiptAllocations(
  formData: FormData,
  key = "allocationsJson"
) {
  return parseOptionalJsonArray(formData, key).map((row, index) => {
    const targetPeriodStartValue = getRowString(row, "targetPeriodStart")
    const targetPeriodStart = targetPeriodStartValue
      ? new Date(`${targetPeriodStartValue}T00:00:00.000Z`)
      : null

    if (
      targetPeriodStartValue &&
      Number.isNaN(targetPeriodStart?.getTime() ?? Number.NaN)
    ) {
      throw new Error(`Allocation row ${index + 1} target period is invalid.`)
    }

    return {
      amount: getRowRequiredNumber(
        row,
        "amount",
        `Allocation row ${index + 1} amount`
      ),
      category: (getRowString(row, "category") ??
        "commitment") as DashboardPaymentReceiptAllocationCategory,
      contributionPlanId: getRowString(row, "contributionPlanId") ?? null,
      foodPurchaseApplicationId:
        getRowString(row, "foodPurchaseApplicationId") ?? null,
      loanId: getRowString(row, "loanId") ?? null,
      notes: getRowString(row, "notes") ?? null,
      periodIntent: (getRowString(row, "periodIntent") ??
        "unspecified") as DashboardPaymentReceiptPeriodIntent,
      projectFinancingRequestId:
        getRowString(row, "projectFinancingRequestId") ?? null,
      procurementRepaymentScheduleItemId:
        getRowString(row, "procurementRepaymentScheduleItemId") ?? null,
      targetPeriodStart,
    }
  })
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
  const monthlyCommitment = getOptionalNumber(formData, "monthlyCommitment")
  const deductionSourceId = normalizeCollectionSourceFormValue(
    getOptionalTrimmedString(formData, "deductionSourceId")
  )

  if (
    monthlyCommitment === undefined ||
    !Number.isFinite(monthlyCommitment) ||
    monthlyCommitment <= 0
  ) {
    throw new Error("Starting commitment must be greater than 0.")
  }

  const member = await createMember({
    actorUserId: actor.user.id,
    address: getOptionalTrimmedString(formData, "address"),
    deductionSourceId,
    email: getOptionalTrimmedString(formData, "email")?.toLowerCase() ?? null,
    fullName: getRequiredString(formData, "fullName"),
    joinedAt,
    memberNumber: composeMemberNumber(
      actor.tenant.memberNumberPrefix,
      getRequiredString(formData, "memberNumber")
    ),
    memberType: getRequiredString(
      formData,
      "memberType"
    ) as DashboardMemberType,
    monthlyCommitment,
    occupation: getOptionalTrimmedString(formData, "occupation"),
    phoneNumber: getOptionalTrimmedString(formData, "phoneNumber"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/members")
  revalidatePath("/contributions")
  revalidatePath("/loans")
  revalidatePath("/repayments")

  return {
    fullName: member.fullName,
    id: member.id,
    joinedAt: member.joinedAt.toISOString(),
    memberNumber: member.memberNumber,
  }
}

export async function updateMemberAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  const deductionSourceId = normalizeCollectionSourceFormValue(
    getOptionalTrimmedString(formData, "deductionSourceId")
  )

  await updateMember(actor.tenant.id, memberId, {
    actorUserId: actor.user.id,
    address: getOptionalTrimmedString(formData, "address"),
    deductionSourceId,
    email: getOptionalTrimmedString(formData, "email")?.toLowerCase() ?? null,
    fullName: getRequiredString(formData, "fullName"),
    memberType: getRequiredString(
      formData,
      "memberType"
    ) as DashboardMemberType,
    occupation: getOptionalTrimmedString(formData, "occupation"),
    phoneNumber: getOptionalTrimmedString(formData, "phoneNumber"),
  })

  revalidateMemberBackfillPaths(memberId)
}

export async function updateMemberStatusAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  await requireMemberProfileWritesOpen(actor)

  const member = await updateMemberStatus(
    actor.tenant.id,
    getRequiredString(formData, "memberId"),
    getRequiredString(formData, "status") as DashboardMemberStatus,
    actor.user.id
  )

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  revalidatePath("/members")
}

export async function sendMemberPortalAccessEmailAction(formData: FormData) {
  const actor = await requireDashboardActor(memberManagementRoles)
  const access = await ensureMemberPortalAccess({
    actorUserId: actor.user.id,
    memberId: getRequiredString(formData, "memberId"),
    tenantId: actor.tenant.id,
  })
  const setup = createPasswordSetupToken(access.user)
  const setupUrl = buildTenantDashboardUrl(actor.tenant.slug, {
    pathname: `/login/reset/confirm?token=${encodeURIComponent(setup.token)}`,
  })
  const bodyText = [
    `Hello ${access.member.fullName},`,
    "",
    `${actor.tenant.name} has enabled your member portal access.`,
    "Use the secure link below to set your password and sign in.",
    `This link expires on ${setup.expiresAt}.`,
    "",
    setupUrl,
  ].join("\n")
  const draft = createNotificationEmailDraft({
    actionLabel: "Set portal password",
    actionUrl: setupUrl,
    bodyText,
    eventLabel: "member.portal_access_invited",
    notificationType: "member.portal_access_invited",
    previewText: `Set your password for ${actor.tenant.name}.`,
    recipient: {
      displayName: access.member.fullName,
      email: access.member.email,
      kind: "email",
      value: access.member.email,
    },
    sender: {
      displayName: actor.tenant.name,
      localPart: actor.tenant.slug,
    },
    subject: `${actor.tenant.name}: set up your member portal`,
  })

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.members",
    tenantId: actor.tenant.id,
  })

  revalidatePath(`/members/${access.member.id}`)
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

  const approvalDraft = createEmailDraftFromType("member.onboarding_approved", {
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, { pathname: "/" }),
    memberId: approved.member.id,
    recipientEmail: approved.user.email,
    recipientName: approved.user.fullName,
    requestId: approved.request.id,
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  await sendEmailDraftWithAudit({
    draft: approvalDraft,
    source: "dashboard.membership_approvals",
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

  const rejectionDraft = createEmailDraftFromType(
    "member.onboarding_rejected",
    {
      actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
        pathname: "/login",
      }),
      reason: rejected.request.rejectionReason
        ? `Reason: ${rejected.request.rejectionReason}`
        : null,
      recipientEmail: rejected.user.email,
      recipientName: rejected.user.fullName,
      requestId: rejected.request.id,
      tenantName: actor.tenant.name,
      tenantSlug: actor.tenant.slug,
    }
  )

  await sendEmailDraftWithAudit({
    draft: rejectionDraft,
    source: "dashboard.membership_approvals",
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

export async function createOwnMemberDocumentAction(formData: FormData) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  const member = await requireActorMember(actor)

  const document = await createMemberDocument({
    actorUserId: actor.user.id,
    documentType: getRequiredString(formData, "documentType"),
    documentUrl: getRequiredString(formData, "documentUrl"),
    memberId: member.id,
    reviewNotes: getOptionalTrimmedString(formData, "reviewNotes"),
    reviewStatus: "pending",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/support")
  revalidatePath(`/members/${document.memberId}`)
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
  revalidatePath("/project-financing")
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

  return {
    redirectTo: `/monthly-records?recordId=${record.id}`,
  }
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  revalidatePath("/monthly-records")
  revalidatePath("/contributions")
  revalidatePath("/repayments")
  revalidatePath("/loans")
  revalidatePath("/members")
  revalidatePath("/notifications")
}

export async function stageCollectionSourceContributionBatchAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const batch = await stageCollectionSourceContributionBatch({
    actorUserId: actor.user.id,
    deductionSourceId: getRequiredString(formData, "deductionSourceId"),
    month: Number(getRequiredString(formData, "month")),
    notes: getOptionalTrimmedString(formData, "notes"),
    reference: getOptionalTrimmedString(formData, "reference"),
    tenantId: actor.tenant.id,
    year: Number(getRequiredString(formData, "year")),
  })

  revalidatePath("/contributions")

  return {
    redirectTo: `/contributions?batchId=${batch.id}`,
  }
}

export async function updateCollectionSourceContributionBatchRowsAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const batchId = getRequiredString(formData, "batchId")
  const rowIds = formData
    .getAll("rowId")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0
    )
  const status = getRequiredString(formData, "status") as
    | "collected"
    | "exception"
    | "skipped"
    | "staged"
  const paidAmount = getOptionalTrimmedString(formData, "paidAmount")
  const exceptionReason = getOptionalTrimmedString(formData, "exceptionReason")

  await updateCollectionSourceContributionBatchRows({
    actorUserId: actor.user.id,
    batchId,
    rows: rowIds.map((rowId) => ({
      exceptionReason,
      paidAmount: paidAmount ? Number(paidAmount) : null,
      rowId,
      status,
    })),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
}

export async function postCollectionSourceContributionBatchRowsAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const batchId = getRequiredString(formData, "batchId")
  const rowIds = formData
    .getAll("rowId")
    .filter(
      (value): value is string => typeof value === "string" && value.length > 0
    )

  await postCollectionSourceContributionBatchRows({
    actorUserId: actor.user.id,
    batchId,
    notes: getOptionalTrimmedString(formData, "notes"),
    reference: getOptionalTrimmedString(formData, "reference"),
    rowIds,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/contributions")
  revalidatePath("/members")
  revalidatePath("/notifications")
}

type ChargeDefinitionHistoryRow = {
  amount: string
  effectiveFrom: string
}

type ShareStructureHistoryRow = {
  amount: string
  effectiveFrom: string
  valueType: "fixed_amount" | "percentage"
}

function getFormDataStringValues(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
}

function getChargeDefinitionHistoryRows(formData: FormData) {
  const historyEffectiveFromValues = getFormDataStringValues(
    formData,
    "historyEffectiveFrom"
  )
  const historyAmountValues = getFormDataStringValues(formData, "historyAmount")
  const historyRowCount = Math.max(
    historyEffectiveFromValues.length,
    historyAmountValues.length
  )
  const historyRows: ChargeDefinitionHistoryRow[] = Array.from(
    { length: historyRowCount },
    (_, index) => ({
      amount: historyAmountValues[index] ?? "",
      effectiveFrom: historyEffectiveFromValues[index] ?? "",
    })
  ).filter((row) => row.amount || row.effectiveFrom)

  if (historyRows.length === 0) {
    return [
      {
        amount: getRequiredString(formData, "amount"),
        effectiveFrom: getRequiredString(formData, "effectiveFrom"),
      },
    ]
  }

  const incompleteHistoryRow = historyRows.find(
    (row) => !row.amount || !row.effectiveFrom
  )

  if (incompleteHistoryRow) {
    throw new Error("Every charge history row needs both a date and amount.")
  }

  return historyRows.sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  )
}

const chargeWorkflowSet = new Set(chargeWorkflowKeys)
const chargeApplicabilityTriggerSet = new Set(chargeApplicabilityTriggerKeys)
const chargeCollectionModeSet = new Set(chargeCollectionModeKeys)

function parseChargeApplicabilityRows(
  formData: FormData
): ChargeApplicabilityInput[] | undefined {
  const rows: ChargeApplicabilityInput[] = []
  const compactValues = [
    ...formData.getAll("applicability"),
    ...formData.getAll("chargeApplicability"),
  ]
    .map((value) => String(value).trim())
    .filter(Boolean)

  for (const value of compactValues) {
    if (value.startsWith("{")) {
      const parsed = JSON.parse(value) as Partial<ChargeApplicabilityInput>

      if (
        parsed.workflow &&
        chargeWorkflowSet.has(parsed.workflow) &&
        parsed.trigger &&
        chargeApplicabilityTriggerSet.has(parsed.trigger)
      ) {
        rows.push({
          collectionMode:
            parsed.collectionMode &&
            chargeCollectionModeSet.has(parsed.collectionMode)
              ? parsed.collectionMode
              : "deduct_from_savings",
          isActive: parsed.isActive ?? true,
          isRequired: parsed.isRequired ?? true,
          trigger: parsed.trigger,
          workflow: parsed.workflow,
        })
      }
      continue
    }

    const [workflow, trigger, collectionMode = "deduct_from_savings"] =
      value.split(":")

    if (
      chargeWorkflowSet.has(workflow as ChargeApplicabilityInput["workflow"]) &&
      chargeApplicabilityTriggerSet.has(
        trigger as ChargeApplicabilityInput["trigger"]
      ) &&
      chargeCollectionModeSet.has(
        collectionMode as NonNullable<
          ChargeApplicabilityInput["collectionMode"]
        >
      )
    ) {
      rows.push({
        collectionMode: collectionMode as NonNullable<
          ChargeApplicabilityInput["collectionMode"]
        >,
        isActive: true,
        isRequired: true,
        trigger: trigger as ChargeApplicabilityInput["trigger"],
        workflow: workflow as ChargeApplicabilityInput["workflow"],
      })
    }
  }

  const workflows = getFormDataStringValues(formData, "applicabilityWorkflow")
  const triggers = getFormDataStringValues(formData, "applicabilityTrigger")
  const collectionModes = getFormDataStringValues(
    formData,
    "applicabilityCollectionMode"
  )

  workflows.forEach((workflow, index) => {
    const trigger = triggers[index]
    const collectionMode = collectionModes[index] || "deduct_from_savings"

    if (
      chargeWorkflowSet.has(workflow as ChargeApplicabilityInput["workflow"]) &&
      chargeApplicabilityTriggerSet.has(
        trigger as ChargeApplicabilityInput["trigger"]
      ) &&
      chargeCollectionModeSet.has(
        collectionMode as NonNullable<
          ChargeApplicabilityInput["collectionMode"]
        >
      )
    ) {
      rows.push({
        collectionMode: collectionMode as NonNullable<
          ChargeApplicabilityInput["collectionMode"]
        >,
        isActive: true,
        isRequired: true,
        trigger: trigger as ChargeApplicabilityInput["trigger"],
        workflow: workflow as ChargeApplicabilityInput["workflow"],
      })
    }
  })

  return compactValues.length > 0 || workflows.length > 0 ? rows : undefined
}

function parseChargeHistoryAmount(value: string) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    throw new Error("Charge history amount must be a valid number.")
  }

  return amount
}

function normalizeShareHistoryValueType(value: string) {
  if (value === "fixed_amount" || value === "percentage") {
    return value
  }

  throw new Error("Share history rule must be fixed amount or percentage.")
}

function getShareStructureHistoryRows(
  formData: FormData
): ShareStructureHistoryRow[] {
  const historyEffectiveFromValues = getFormDataStringValues(
    formData,
    "historyEffectiveFrom"
  )
  const historyAmountValues = getFormDataStringValues(formData, "historyAmount")
  const historyValueTypeValues = getFormDataStringValues(
    formData,
    "historyValueType"
  )
  const historyRowCount = Math.max(
    historyEffectiveFromValues.length,
    historyAmountValues.length,
    historyValueTypeValues.length
  )
  const historyRows: ShareStructureHistoryRow[] = Array.from(
    { length: historyRowCount },
    (_, index): ShareStructureHistoryRow => {
      const amount = historyAmountValues[index] ?? ""
      const effectiveFrom = historyEffectiveFromValues[index] ?? ""
      const rawValueType = historyValueTypeValues[index] ?? ""
      const valueType = rawValueType
        ? normalizeShareHistoryValueType(rawValueType)
        : "fixed_amount"

      return {
        amount,
        effectiveFrom,
        valueType,
      }
    }
  ).filter(
    (row) => row.amount || row.effectiveFrom || row.valueType !== "fixed_amount"
  )

  if (historyRows.length === 0) {
    return [
      {
        amount: getRequiredString(formData, "amount"),
        effectiveFrom: getRequiredString(formData, "effectiveFrom"),
        valueType: normalizeShareHistoryValueType(
          getRequiredString(formData, "valueType")
        ),
      },
    ]
  }

  const incompleteHistoryRow = historyRows.find(
    (row) => !row.amount || !row.effectiveFrom || !row.valueType
  )

  if (incompleteHistoryRow) {
    throw new Error("Every share history row needs a date, rule, and value.")
  }

  return historyRows.sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom)
  )
}

function parseShareHistoryAmount(value: string) {
  const amount = Number(value)

  if (!Number.isFinite(amount)) {
    throw new Error("Share history value must be a valid number.")
  }

  return amount
}

export async function createChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireChargeDefinitionWritesOpen(actor)
  const kind = getRequiredString(formData, "kind") as DashboardChargeKind
  const chargeValueType = ((
    formData.get("chargeValueType") as string | null
  )?.trim() ||
    (kind === "percentage"
      ? "percentage"
      : "fixed_amount")) as DashboardChargeValueType
  const definitionKind = (
    chargeValueType === "percentage" ? "percentage" : kind
  ) as "fixed" | "percentage"
  const historyRows = getChargeDefinitionHistoryRows(formData)
  const applicability = parseChargeApplicabilityRows(formData)
  const initialHistoryRow = historyRows[0]

  if (!initialHistoryRow) {
    throw new Error("Charge history is required.")
  }

  for (const historyRow of historyRows) {
    requireDateOnOrAfterTenantStartDate(
      actor,
      historyRow.effectiveFrom,
      "Charge history date"
    )
  }

  const chargeDefinition = await createChargeDefinition({
    amount: parseChargeHistoryAmount(initialHistoryRow.amount),
    effectiveFrom: new Date(`${initialHistoryRow.effectiveFrom}T00:00:00.000Z`),
    appliesToLoanRequests: formData.get("appliesToLoanRequests") === "on",
    appliesToLoans: formData.get("appliesToLoans") === "on",
    appliesToMembers: formData.get("appliesToMembers") === "on",
    ...(applicability ? { applicability } : {}),
    chargeFrequency: ((
      formData.get("chargeFrequency") as string | null
    )?.trim() || "recurring_monthly") as DashboardChargeFrequency,
    chargeValueType,
    isMonthlyLevy: formData.get("isMonthlyLevy") === "on",
    kind: definitionKind,
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

  if (!chargeDefinition?.id) {
    throw new Error("Charge definition could not be created.")
  }

  for (const historyRow of historyRows.slice(1)) {
    await createChargeDefinitionVersion({
      amount: parseChargeHistoryAmount(historyRow.amount),
      chargeDefinitionId: chargeDefinition.id,
      chargeValueType,
      createdByUserId: actor.user.id,
      effectiveFrom: new Date(`${historyRow.effectiveFrom}T00:00:00.000Z`),
      kind: definitionKind,
      tenantId: actor.tenant.id,
    })
  }

  revalidatePath("/charges")
  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
}

export async function createTenantShareStructureVersionAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)
  const historyRows = getShareStructureHistoryRows(formData)

  for (const historyRow of historyRows) {
    requireDateOnOrAfterTenantStartDate(
      actor,
      historyRow.effectiveFrom,
      "Share history date"
    )
  }

  const notes = (formData.get("notes") as string | null)?.trim() || undefined

  for (const historyRow of historyRows) {
    await upsertTenantShareStructureVersion({
      amount: parseShareHistoryAmount(historyRow.amount),
      basis: "after_charge_deductions",
      createdByUserId: actor.user.id,
      effectiveFrom: new Date(`${historyRow.effectiveFrom}T00:00:00.000Z`),
      notes,
      tenantId: actor.tenant.id,
      valueType: historyRow.valueType,
    })
  }

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
}

export async function updateTenantBusinessProfitPolicyAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await updateTenantBusinessProfitPolicy({
    actorUserId: actor.user.id,
    defaultDistributablePercentage: Number(
      getRequiredString(formData, "defaultDistributablePercentage")
    ),
    distributionBasis: getRequiredString(
      formData,
      "distributionBasis"
    ) as "share_capital_balance",
    expenseTreatment: getRequiredString(
      formData,
      "expenseTreatment"
    ) as "deduct_reviewed_expenses_before_distribution",
    financialYearStartMonth: Number(
      getRequiredString(formData, "financialYearStartMonth")
    ),
    historicalProfitMigrationMode: getRequiredString(
      formData,
      "historicalProfitMigrationMode"
    ) as
      | "manual_review_required"
      | "import_historical_profit_pools"
      | "no_historical_business_profit",
    profitDistributionFrequency: getRequiredString(
      formData,
      "profitDistributionFrequency"
    ) as "annual" | "semi_annual" | "quarterly" | "ad_hoc",
    requiresProfitDistributionApproval: getOptionalBoolean(
      formData,
      "requiresProfitDistributionApproval"
    ),
    reserveRetentionPercentage: Number(
      getRequiredString(formData, "reserveRetentionPercentage")
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/getting-started")
}

export async function updateTenantSharePolicyAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const configurationMode = getRequiredString(formData, "configurationMode") as
    | "monthly_history"
    | "unit_based"
  const unitAmount = (formData.get("unitAmount") as string | null)?.trim()
  const compulsoryShareUnits = (
    formData.get("compulsoryShareUnits") as string | null
  )?.trim()
  const maximumShareUnits = (
    formData.get("maximumShareUnits") as string | null
  )?.trim()

  await updateTenantSharePolicy({
    actorUserId: actor.user.id,
    configurationMode,
    compulsoryShareUnits:
      configurationMode === "unit_based" && compulsoryShareUnits
        ? Number(compulsoryShareUnits)
        : undefined,
    maximumShareUnits:
      configurationMode === "unit_based" && maximumShareUnits
        ? Number(maximumShareUnits)
        : undefined,
    tenantId: actor.tenant.id,
    unitAmount:
      configurationMode === "unit_based" && unitAmount
        ? Number(unitAmount)
        : undefined,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/shares")
  revalidatePath("/getting-started")
}

export async function updateTenantMigrationSetupAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await updateTenantMigrationSetup({
    actorUserId: actor.user.id,
    mode: getRequiredString(formData, "mode") as
      | "historical_backfill"
      | "brought_forward",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
}

export async function upsertTenantBroughtForwardSnapshotAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await upsertTenantBroughtForwardSnapshot({
    actorUserId: actor.user.id,
    asOfDate: getRequiredString(formData, "asOfDate"),
    memberCountSnapshot: Number(
      getRequiredString(formData, "memberCountSnapshot")
    ),
    notes: (formData.get("notes") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
    totalMemberSavingsAmount: Number(
      getRequiredString(formData, "totalMemberSavingsAmount")
    ),
    totalShareUnits: Number(getRequiredString(formData, "totalShareUnits")),
    totalSpecialSavingsAmount: Number(
      getRequiredString(formData, "totalSpecialSavingsAmount")
    ),
  })

  revalidatePath("/getting-started")
}

export async function updateTenantOperationProfileAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)
  const currentProfile = await getTenantOperationProfile(actor.tenant.id)
  const serviceAccessModes = tenantServiceKeys.reduce(
    (services, serviceKey) => {
      services[serviceKey] =
        getOptionalTenantServiceAccessMode(
          formData,
          `${serviceKey}AccessMode`
        ) ?? currentProfile.services[serviceKey].accessMode

      return services
    },
    {} as Record<TenantServiceKey, TenantServiceAccessMode>
  )
  const commitmentCollection = (
    formData.get("commitmentCollection") as string | null
  )?.trim()

  if (commitmentCollection) {
    if (commitmentCollection === "office") {
      serviceAccessModes.payment_receipts = "office_only"
      serviceAccessModes.collection_sources = "disabled"
      serviceAccessModes.collection_source_batch_posting = "disabled"
    } else if (commitmentCollection === "member_receipts") {
      serviceAccessModes.payment_receipts = "member_self_service"
      serviceAccessModes.collection_sources = "disabled"
      serviceAccessModes.collection_source_batch_posting = "disabled"
    } else if (commitmentCollection === "collection_sources") {
      serviceAccessModes.payment_receipts = "office_only"
      serviceAccessModes.collection_sources = "office_only"
      serviceAccessModes.collection_source_batch_posting = "office_only"
    } else if (commitmentCollection === "mixed") {
      serviceAccessModes.payment_receipts = "member_self_service"
      serviceAccessModes.collection_sources = "office_only"
      serviceAccessModes.collection_source_batch_posting = "office_only"
    } else {
      throw new Error("Invalid commitment collection style.")
    }
  }

  serviceAccessModes.procurement = getGuidedServiceAccessMode(
    formData,
    "procurement",
    serviceAccessModes.procurement
  )
  serviceAccessModes.food_purchase = getGuidedServiceAccessMode(
    formData,
    "foodPurchase",
    serviceAccessModes.food_purchase
  )

  const supportAccess = (formData.get("supportAccess") as string | null)?.trim()

  if (supportAccess === "office") {
    serviceAccessModes.support_cases = "office_only"
  } else if (supportAccess === "member") {
    serviceAccessModes.support_cases = "member_self_service"
  } else if (supportAccess && supportAccess !== "keep") {
    throw new Error("Invalid member support access.")
  }

  await updateTenantOperationProfile({
    actorUserId: actor.user.id,
    changeReason: getOptionalTrimmedString(formData, "changeReason"),
    policy: {
      foodPurchaseMaximumActiveObligationsPerMember: Number(
        getRequiredString(
          formData,
          "foodPurchaseMaximumActiveObligationsPerMember"
        )
      ),
      foodPurchaseRequiresOpenCycle: getOptionalBoolean(
        formData,
        "foodPurchaseRequiresOpenCycle"
      ),
      procurementMaximumActiveObligationsPerMember: Number(
        getRequiredString(
          formData,
          "procurementMaximumActiveObligationsPerMember"
        )
      ),
    },
    services: serviceAccessModes,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/getting-started")
  revalidatePath("/onboarding")
  revalidatePath("/settings/finance")
  revalidatePath("/settings/operation-profile")

  const redirectTo = (formData.get("redirectTo") as string | null)?.trim()

  if (redirectTo?.startsWith("/")) {
    return { redirectTo }
  }
}

export async function createMemberShareApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await createMemberShareApplication({
    memberId: getRequiredString(formData, "memberId"),
    notes: getOptionalTrimmedString(formData, "notes"),
    requestedByUserId: actor.user.id,
    requestedUnits: Number(getRequiredString(formData, "requestedUnits")),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/shares")
}

export async function createOwnMemberShareApplicationAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  const member = await requireOperationalActorMember(actor)

  await createMemberShareApplication({
    memberId: member.id,
    notes: getOptionalTrimmedString(formData, "notes"),
    requestedByUserId: actor.user.id,
    requestedUnits: Number(getRequiredString(formData, "requestedUnits")),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/shares")
  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/shares")
}

export async function reviewMemberShareApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const application = await reviewMemberShareApplication({
    actorUserId: actor.user.id,
    applicationId: getRequiredString(formData, "applicationId"),
    approvedUnits: getOptionalNumber(formData, "approvedUnits"),
    decision: getRequiredString(formData, "decision") as
      | "approved"
      | "rejected",
    reviewNotes: getOptionalTrimmedString(formData, "reviewNotes"),
    tenantId: actor.tenant.id,
  })

  await sendMemberShareApplicationStatusEmail(actor, application)

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/shares")
}

export async function updateTenantFinancingPolicyAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await updateTenantFinancingCyclePolicy({
    activeFinancingBlocksEmergency: getOptionalBoolean(
      formData,
      "activeFinancingBlocksEmergency"
    ),
    activeFinancingBlocksProcurement: getOptionalBoolean(
      formData,
      "activeFinancingBlocksProcurement"
    ),
    actorUserId: actor.user.id,
    disbursementRequiresDeployableFunds: getOptionalBoolean(
      formData,
      "disbursementRequiresDeployableFunds"
    ),
    foodPurchaseAllowsCommitmentReductionDuringPayback: getOptionalBoolean(
      formData,
      "foodPurchaseAllowsCommitmentReductionDuringPayback"
    ),
    foodPurchaseMaximumPaybackMonths: Number(
      getRequiredString(formData, "foodPurchaseMaximumPaybackMonths")
    ),
    loanEligibilityMultiple: Number(
      getRequiredString(formData, "loanEligibilityMultiple")
    ),
    normalLoanAllocationPercentage: Number(
      getRequiredString(formData, "normalLoanAllocationPercentage")
    ),
    normalLoanTermMonths: Number(
      getRequiredString(formData, "normalLoanTermMonths")
    ),
    procurementAllowsCommitmentReductionDuringPayback: getOptionalBoolean(
      formData,
      "procurementAllowsCommitmentReductionDuringPayback"
    ),
    procurementMaximumPaybackMonths: Number(
      getRequiredString(formData, "procurementMaximumPaybackMonths")
    ),
    quickLoanAllocationPercentage: Number(
      getRequiredString(formData, "quickLoanAllocationPercentage")
    ),
    quickLoanTermMonths: Number(
      getRequiredString(formData, "quickLoanTermMonths")
    ),
    requiresDualLoanApproval: getOptionalBoolean(
      formData,
      "requiresDualLoanApproval"
    ),
    reserveBufferAmount: Number(
      getRequiredString(formData, "reserveBufferAmount")
    ),
    specialSavingsCountsForEligibility: getOptionalBoolean(
      formData,
      "specialSavingsCountsForEligibility"
    ),
    strictCommitmentDuringFinancing: getOptionalBoolean(
      formData,
      "strictCommitmentDuringFinancing"
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/loan")
  revalidatePath("/loans")
}

export async function updateLoanProductSettingsAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await updateLoanProductSettings({
    actorUserId: actor.user.id,
    code: getOptionalTrimmedString(formData, "code"),
    isActive: getOptionalBoolean(formData, "isActive"),
    loanProductId: getOptionalTrimmedString(formData, "loanProductId"),
    loanType: getRequiredString(formData, "loanType") as "normal" | "quick",
    maxSavingsMultiple: Number(
      getRequiredString(formData, "maxSavingsMultiple")
    ),
    name: getRequiredString(formData, "name"),
    tenantId: actor.tenant.id,
    termMonths: Number(getRequiredString(formData, "termMonths")),
  })

  revalidatePath("/settings/finance/loan")
  revalidatePath("/loans")
}

export async function openMonthlyFinancingCycleAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await openMonthlyFinancingCycle({
    actorUserId: actor.user.id,
    statusNote: getOptionalTrimmedString(formData, "statusNote") ?? undefined,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance/loan")
  revalidatePath("/loans")
}

export async function updateMonthlyFinancingCycleStatusAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)

  await updateMonthlyFinancingCycleStatus({
    actorUserId: actor.user.id,
    financingCycleId: getRequiredString(formData, "financingCycleId"),
    status: getRequiredString(formData, "status") as
      | "closed"
      | "open"
      | "paused",
    statusNote: getOptionalTrimmedString(formData, "statusNote") ?? undefined,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance/loan")
  revalidatePath("/loans")
}

type ShareBusinessProfitHistoryRow = {
  deductionAmount: string
  profitAmount: string
  profitDate: string
  reason: string
  status:
    | "draft"
    | "pending"
    | "reviewed"
    | "completed"
    | "approved"
    | "archived"
}

function normalizeProfitEntryStatus(
  status: string | null | undefined
): ShareBusinessProfitHistoryRow["status"] {
  if (
    status === "draft" ||
    status === "pending" ||
    status === "reviewed" ||
    status === "completed" ||
    status === "approved" ||
    status === "archived"
  ) {
    return status
  }

  return "draft"
}

function getShareBusinessProfitHistoryRows(formData: FormData) {
  const historyProfitDateValues = getFormDataStringValues(
    formData,
    "historyProfitDate"
  )
  const historyProfitAmountValues = getFormDataStringValues(
    formData,
    "historyProfitAmount"
  )
  const historyDeductionAmountValues = getFormDataStringValues(
    formData,
    "historyDeductionAmount"
  )
  const historyDeductionReasonValues = getFormDataStringValues(
    formData,
    "historyDeductionReason"
  )
  const historyStatusValues = getFormDataStringValues(formData, "historyStatus")
  const historyRowCount = Math.max(
    historyProfitDateValues.length,
    historyProfitAmountValues.length,
    historyDeductionAmountValues.length,
    historyDeductionReasonValues.length,
    historyStatusValues.length
  )
  const historyRows: ShareBusinessProfitHistoryRow[] = Array.from(
    { length: historyRowCount },
    (_, index) => ({
      deductionAmount: historyDeductionAmountValues[index] ?? "",
      profitAmount: historyProfitAmountValues[index] ?? "",
      profitDate: historyProfitDateValues[index] ?? "",
      reason: historyDeductionReasonValues[index] ?? "",
      status: normalizeProfitEntryStatus(historyStatusValues[index]),
    })
  ).filter(
    (row) =>
      row.deductionAmount || row.profitAmount || row.profitDate || row.reason
  )

  const incompleteHistoryRow = historyRows.find(
    (row) => !row.profitAmount || !row.profitDate
  )

  if (incompleteHistoryRow) {
    throw new Error(
      "Every started business profit history row needs a profit date and amount."
    )
  }

  return historyRows.sort((a, b) => a.profitDate.localeCompare(b.profitDate))
}

function parseBusinessProfitHistoryAmount(value: string, label: string) {
  const amount = Number(value || 0)

  if (!Number.isFinite(amount)) {
    throw new Error(`${label} must be a valid number.`)
  }

  return amount
}

export async function createShareBusinessAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const sourceType = ((formData.get("sourceType") as string | null)?.trim() ||
    "manual") as "manual" | "backfill" | "import"
  await requireBusinessProfitOperationOpen(actor, sourceType)
  const endDate = (formData.get("endDate") as string | null)?.trim()
  const startDate = getRequiredString(formData, "startDate")
  const profitHistoryRows = getShareBusinessProfitHistoryRows(formData)

  if (endDate && endDate < startDate) {
    throw new Error("Business end date cannot be before the start date.")
  }

  const profitEntries = profitHistoryRows.map((row) => {
    if (sourceType === "backfill" || sourceType === "import") {
      requireDateOnOrAfterTenantStartDate(actor, row.profitDate, "Profit date")
    }

    if (row.profitDate < startDate) {
      throw new Error("Profit date cannot be before the business start date.")
    }

    if (endDate && row.profitDate > endDate) {
      throw new Error("Profit date cannot be after the business end date.")
    }

    const profitAmount = parseBusinessProfitHistoryAmount(
      row.profitAmount,
      "Profit amount"
    )
    const expenseAmount = parseBusinessProfitHistoryAmount(
      row.deductionAmount,
      "Deduction amount"
    )
    const allocatableProfitAmount = profitAmount - expenseAmount

    if (expenseAmount < 0) {
      throw new Error("Deduction amount cannot be negative.")
    }

    if (allocatableProfitAmount < 0) {
      throw new Error("Deduction cannot be greater than profit amount.")
    }

    if (expenseAmount > 0 && !row.reason.trim()) {
      throw new Error("Deduction reason is required when deduction is set.")
    }

    return {
      allocatableProfitAmount,
      expenseAmount,
      profitAmount,
      profitDate: new Date(`${row.profitDate}T00:00:00.000Z`),
      reason: row.reason.trim() || undefined,
      status: row.status,
    }
  })
  const legacyProfitAmount = getOptionalNumber(formData, "profitAmount") ?? 0

  await createShareBusiness({
    capitalAmount: Number(getRequiredString(formData, "capitalAmount")),
    createdByUserId: actor.user.id,
    endDate: endDate ? new Date(`${endDate}T00:00:00.000Z`) : undefined,
    linkedDividendPeriodId:
      (formData.get("linkedDividendPeriodId") as string | null)?.trim() ||
      undefined,
    name: getRequiredString(formData, "name"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    profitAmount:
      profitEntries.length > 0
        ? profitEntries.reduce((total, entry) => total + entry.profitAmount, 0)
        : legacyProfitAmount,
    profitEntries: profitEntries.length > 0 ? profitEntries : undefined,
    startDate: new Date(`${startDate}T00:00:00.000Z`),
    sourceType,
    status: getRequiredString(formData, "status") as
      | "planned"
      | "active"
      | "completed"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
  revalidatePath("/getting-started")
}

export async function updateShareBusinessAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireBusinessProfitOperationOpen(actor)
  const endDate = (formData.get("endDate") as string | null)?.trim()
  const startDate = getRequiredString(formData, "startDate")

  if (endDate && endDate < startDate) {
    throw new Error("Business end date cannot be before the start date.")
  }

  await updateShareBusiness({
    actorUserId: actor.user.id,
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
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
  revalidatePath("/getting-started")
}

export async function createShareBusinessProfitEntryAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const sourceType = getRequiredString(formData, "sourceType") as
    | "manual"
    | "backfill"
    | "import"
  await requireBusinessProfitOperationOpen(actor, sourceType)
  const profitDate = getRequiredString(formData, "profitDate")

  if (sourceType === "backfill" || sourceType === "import") {
    requireDateOnOrAfterTenantStartDate(actor, profitDate, "Profit date")
  }

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
    sourceType,
    status: getRequiredString(formData, "status") as
      | "draft"
      | "pending"
      | "reviewed"
      | "completed"
      | "approved"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
  revalidatePath("/getting-started")
}

export async function updateShareBusinessProfitEntryAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const sourceType = getRequiredString(formData, "sourceType") as
    | "manual"
    | "backfill"
    | "import"
  await requireBusinessProfitOperationOpen(actor, sourceType)
  const profitDate = getRequiredString(formData, "profitDate")

  if (sourceType === "backfill" || sourceType === "import") {
    requireDateOnOrAfterTenantStartDate(actor, profitDate, "Profit date")
  }

  await updateShareBusinessProfitEntry({
    actorUserId: actor.user.id,
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
    sourceType,
    status: getRequiredString(formData, "status") as
      | "draft"
      | "pending"
      | "reviewed"
      | "completed"
      | "approved"
      | "archived",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
  revalidatePath("/getting-started")
}

export async function generateShareProfitAllocationsAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireBusinessProfitOperationOpen(actor)

  await generateShareProfitAllocations({
    actorUserId: actor.user.id,
    profitEntryId: getRequiredString(formData, "profitEntryId"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
}

export async function generateHistoricalBackfillShareProfitAllocationsAction() {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireHistoricalFinanceSetupMutable(actor)

  await generateHistoricalBackfillShareProfitAllocations({
    actorUserId: actor.user.id,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
  revalidatePath("/getting-started")
}

export async function publishShareProfitAllocationsAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireBusinessProfitOperationOpen(actor)
  const profitEntryId = getRequiredString(formData, "profitEntryId")

  await publishShareProfitAllocations({
    actorUserId: actor.user.id,
    profitEntryId,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
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

export async function saveBusinessProfitSeasonReviewAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const requestedRedirectTo =
    (formData.get("redirectTo") as string | null)?.trim() ||
    "/getting-started?step=admin-member"
  const redirectTo = requestedRedirectTo.startsWith("?")
    ? `/getting-started${requestedRedirectTo}`
    : requestedRedirectTo
  const migrationState = await getTenantInitialMigrationState(actor.tenant.id)

  if (migrationState.snapshot.canUseLiveFinancialWrites) {
    return { redirectTo }
  }

  await requireInitialMigrationToolsOpen(actor)
  const seasonKeys = getAllTrimmedStrings(formData, "seasonKey").filter(Boolean)

  await saveBusinessProfitSeasonReviews({
    actorUserId: actor.user.id,
    seasons: seasonKeys.map((key) => ({
      deductionAmount:
        getOptionalNumber(formData, `deductionAmount-${key}`) ?? 0,
      deductionReason:
        (formData.get(`deductionReason-${key}`) as string | null)?.trim() ||
        null,
      key,
    })),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/getting-started")
  revalidatePath("/settings/finance")
  revalidatePath("/settings/finance/business")
  revalidatePath("/business")
  revalidatePath("/")

  return {
    redirectTo,
  }
}

export async function updateChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireChargeDefinitionWritesOpen(actor)
  const isActive = (formData.get("isActive") as string | null)?.trim()
  const appliesToLoanRequests = (
    formData.get("appliesToLoanRequests") as string | null
  )?.trim()
  const appliesToLoans = (
    formData.get("appliesToLoans") as string | null
  )?.trim()
  const appliesToMembers = (
    formData.get("appliesToMembers") as string | null
  )?.trim()
  const amount = (formData.get("amount") as string | null)?.trim()
  const chargeFrequency = (
    formData.get("chargeFrequency") as string | null
  )?.trim()
  const code = (formData.get("code") as string | null)?.trim()
  const effectiveFrom = (formData.get("effectiveFrom") as string | null)?.trim()
  const isMonthlyLevy = (formData.get("isMonthlyLevy") as string | null)?.trim()
  const kind = (formData.get("kind") as string | null)?.trim()
  const name = (formData.get("name") as string | null)?.trim()
  const purpose = (formData.get("purpose") as string | null)?.trim()
  const chargeValueType = (
    formData.get("chargeValueType") as string | null
  )?.trim()
  const notes = (formData.get("notes") as string | null)?.trim()
  const applicability = parseChargeApplicabilityRows(formData)
  const parseOptionalBoolean = (value: string | undefined) =>
    value === "true" || value === "on"
      ? true
      : value === "false" || value === "off"
        ? false
        : undefined

  requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Effective date")

  await updateChargeDefinition(
    actor.tenant.id,
    getRequiredString(formData, "chargeDefinitionId"),
    {
      ...(parseOptionalBoolean(appliesToLoanRequests) !== undefined
        ? { appliesToLoanRequests: parseOptionalBoolean(appliesToLoanRequests) }
        : {}),
      ...(parseOptionalBoolean(appliesToLoans) !== undefined
        ? { appliesToLoans: parseOptionalBoolean(appliesToLoans) }
        : {}),
      ...(parseOptionalBoolean(appliesToMembers) !== undefined
        ? { appliesToMembers: parseOptionalBoolean(appliesToMembers) }
        : {}),
      ...(applicability ? { applicability } : {}),
      ...(chargeFrequency
        ? { chargeFrequency: chargeFrequency as DashboardChargeFrequency }
        : {}),
      ...(code ? { code } : {}),
      ...(parseOptionalBoolean(isActive) !== undefined
        ? { isActive: parseOptionalBoolean(isActive) }
        : {}),
      ...(parseOptionalBoolean(isMonthlyLevy) !== undefined
        ? { isMonthlyLevy: parseOptionalBoolean(isMonthlyLevy) }
        : {}),
      ...(name ? { name } : {}),
      ...(amount ? { amount: Number(amount) } : {}),
      ...(effectiveFrom
        ? { effectiveFrom: new Date(`${effectiveFrom}T00:00:00.000Z`) }
        : {}),
      ...(kind ? { kind: kind as DashboardChargeKind } : {}),
      ...(chargeValueType
        ? { chargeValueType: chargeValueType as DashboardChargeValueType }
        : {}),
      ...(notes ? { notes } : {}),
      ...(purpose
        ? {
            purpose: purpose as
              | "general"
              | "member_share"
              | "loan_fee"
              | "membership_fee"
              | "penalty",
          }
        : {}),
    }
  )

  revalidatePath("/charges")
  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
}

export async function deleteChargeDefinitionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireChargeDefinitionWritesOpen(actor)
  await deleteChargeDefinition(
    actor.tenant.id,
    getRequiredString(formData, "chargeDefinitionId")
  )
  revalidatePath("/charges")
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/charges")
}

export async function deleteChargeDefinitionVersionAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireChargeDefinitionWritesOpen(actor)
  await deleteChargeDefinitionVersion(
    actor.tenant.id,
    getRequiredString(formData, "chargeDefinitionVersionId")
  )
  revalidatePath("/charges")
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/charges")
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  revalidatePath("/charges")
  revalidatePath("/contributions")
}

export async function submitLoanRequestAction(formData: FormData) {
  const actor = await requireDashboardActor([
    ...allStaffRoles,
    ...memberSelfServiceRoles,
  ])
  await requireLiveFinancialWritesOpen(actor)
  const actorMember =
    actor.membership.role === "member"
      ? await requireOperationalActorMember(actor)
      : null
  const requestedAmount = Number(getRequiredString(formData, "requestedAmount"))
  const requestedTermMonths = Number(
    getRequiredString(formData, "requestedTermMonths")
  )

  const request = await submitLoanRequest({
    actorUserId: actor.user.id,
    extraMonthlySavingsAmount: getOptionalNumber(
      formData,
      "extraMonthlySavingsAmount"
    ),
    guarantorMemberIds: [
      (formData.get("guarantorOneMemberId") as string | null)?.trim() ?? "",
      (formData.get("guarantorTwoMemberId") as string | null)?.trim() ?? "",
    ],
    loanProductId: getRequiredString(formData, "loanProductId"),
    memberId: actorMember?.id ?? getRequiredString(formData, "memberId"),
    purpose: (formData.get("purpose") as string | null)?.trim() || undefined,
    requestedAmount,
    requestedTermMonths,
    tenantId: actor.tenant.id,
  })

  for (const approval of request.guarantorApprovals ?? []) {
    if (!approval.guarantorMember.email) {
      continue
    }

    const draft = createEmailDraftFromType(
      "loan.guarantor_approval_requested",
      {
        actionLabel: "Review request",
        actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
          pathname: "/guarantor-approvals",
        }),
        amount: requestedAmount,
        guarantorApprovalId: approval.id,
        loanRequestId: request.id,
        memberName: request.borrowerMember.fullName,
        recipientEmail: approval.guarantorMember.email,
        recipientName: approval.guarantorMember.fullName,
        tenantName: actor.tenant.name,
        tenantSlug: actor.tenant.slug,
      }
    )

    await sendEmailDraftWithAudit({
      draft,
      source: "dashboard.loans",
      tenantId: actor.tenant.id,
    })
  }

  revalidatePath("/loans")
  revalidatePath("/")
}

export async function reviewLoanGuarantorApprovalAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const approval = await reviewLoanGuarantorApproval({
    actorUserId: actor.user.id,
    guarantorApprovalId: getRequiredString(formData, "guarantorApprovalId"),
    notes: (formData.get("notes") as string | null)?.trim() || undefined,
    status: getRequiredString(formData, "status") as "approved" | "rejected",
    tenantId: actor.tenant.id,
  })

  await sendTenantRoleNotificationEmails({
    actionLabel: "Open loans",
    actionUrl: "/loans",
    bodyText: `Guarantor ${approval.guarantorMember.fullName} ${approval.status} loan request ${approval.loanRequestId}.`,
    metadata: {
      guarantorApprovalId: approval.id,
      loanRequestId: approval.loanRequestId,
      status: approval.status,
    },
    notificationType: "loan.guarantor_approval_recorded",
    roles: ["tenant_admin", "finance_officer"],
    source: "dashboard.loans",
    subject: `${actor.tenant.name}: guarantor ${approval.status}`,
    tenantId: actor.tenant.id,
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  revalidatePath("/loans")
}

export async function respondMemberLoanGuarantorApprovalAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  await requireLiveFinancialWritesOpen(actor)

  const member = await requireOperationalActorMember(actor)

  await respondMemberLoanGuarantorApproval({
    actorUserId: actor.user.id,
    guarantorApprovalId: getRequiredString(formData, "guarantorApprovalId"),
    guarantorMemberId: member.id,
    notes: getOptionalTrimmedString(formData, "notes") ?? undefined,
    status: getRequiredString(formData, "status") as "approved" | "rejected",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/guarantor-approvals")
  revalidatePath("/loans")
  revalidatePath("/")
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  revalidatePath("/repayments")
  revalidatePath("/loans")
}

export async function updateCooperativeProfileAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  const rawCurrentSize = (formData.get("currentSize") as string | null)?.trim()
  const country = getOptionalTrimmedString(formData, "country")
  const state = getOptionalTrimmedString(formData, "state")
  let currentSize: number | null = null

  if (rawCurrentSize) {
    currentSize = parseCooperativeSizeRangeValue(rawCurrentSize)

    if (currentSize === null) {
      throw new Error("Select a valid cooperative size.")
    }
  }

  if (country && !isCooperativeCountry(country)) {
    throw new Error("Select a valid cooperative country.")
  }

  await updateTenantProfile({
    actorUserId: actor.user.id,
    city: getOptionalTrimmedString(formData, "city"),
    country,
    currentSize,
    memberNumberPrefix: normalizeMemberNumberPrefix(
      (formData.get("memberNumberPrefix") as string | null) ?? null
    ),
    name: getRequiredString(formData, "name"),
    officeAddress:
      (formData.get("officeAddress") as string | null)?.trim() || null,
    region: state,
    state,
    startDate: actor.tenant.startDate ?? null,
    tenantId: actor.tenant.id,
    timezone: getRequiredString(formData, "timezone"),
  })

  revalidatePath("/settings/profile")
  revalidatePath("/")
}

export async function updateTenantTrustProfileAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceAdminRoles)

  await updateTenantTrustProfile({
    actorUserId: actor.user.id,
    backupRetentionNote: getOptionalTrimmedString(
      formData,
      "backupRetentionNote"
    ),
    dataProcessingUrl: getOptionalTrimmedString(formData, "dataProcessingUrl"),
    incidentContactEmail: getOptionalTrimmedString(
      formData,
      "incidentContactEmail"
    ),
    incidentContactName: getOptionalTrimmedString(
      formData,
      "incidentContactName"
    ),
    legalTermsUrl: getOptionalTrimmedString(formData, "legalTermsUrl"),
    privacyPolicyUrl: getOptionalTrimmedString(formData, "privacyPolicyUrl"),
    recoveryPointObjective: getOptionalTrimmedString(
      formData,
      "recoveryPointObjective"
    ),
    recoveryTimeObjective: getOptionalTrimmedString(
      formData,
      "recoveryTimeObjective"
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/trust")
}

export async function updateTenantFinanceStartDateAction(formData: FormData) {
  const actor = await requireDashboardActor(workspaceConfigurationRoles)
  await requireHistoricalFinanceSetupMutable(actor)

  await updateTenantProfile({
    actorUserId: actor.user.id,
    city: actor.tenant.city ?? null,
    country: actor.tenant.country ?? null,
    currentSize: actor.tenant.currentSize ?? null,
    memberNumberPrefix: normalizeMemberNumberPrefix(
      actor.tenant.memberNumberPrefix ?? null
    ),
    name: actor.tenant.name,
    officeAddress: actor.tenant.officeAddress ?? null,
    region: actor.tenant.state ?? actor.tenant.region ?? null,
    state: actor.tenant.state ?? actor.tenant.region ?? null,
    startDate: (formData.get("startDate") as string | null)?.trim() || null,
    tenantId: actor.tenant.id,
    timezone: actor.tenant.timezone,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
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

  await finalizeTenantInitialMigration({
    actorUserId: actor.user.id,
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
  revalidatePath("/")
}

export async function createMemberOpeningBalanceAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")

  await requireMemberMigrationDraftMutable(actor, memberId)

  await createMemberOpeningBalance({
    actorUserId: actor.user.id,
    activeFinancingOutstanding:
      getOptionalNumber(formData, "activeFinancingOutstanding") ?? 0,
    activeFinancingOriginalAmount:
      getOptionalNumber(formData, "activeFinancingOriginalAmount") ?? 0,
    activeFinancingGuarantorOneMemberId: getOptionalTrimmedString(
      formData,
      "activeFinancingGuarantorOneMemberId"
    ),
    activeFinancingGuarantorTwoMemberId: getOptionalTrimmedString(
      formData,
      "activeFinancingGuarantorTwoMemberId"
    ),
    activeFinancingOpenedAt: getOptionalTrimmedString(
      formData,
      "activeFinancingOpenedAt"
    )
      ? new Date(
          `${getOptionalTrimmedString(formData, "activeFinancingOpenedAt")}T00:00:00.000Z`
        )
      : null,
    activeFinancingRepaymentMonths:
      getOptionalNumber(formData, "activeFinancingRepaymentMonths") ?? null,
    activeFinancingInstallmentAmount:
      getOptionalNumber(formData, "activeFinancingInstallmentAmount") ?? 0,
    activeFinancingInstallmentsPaid:
      getOptionalNumber(formData, "activeFinancingInstallmentsPaid") ?? null,
    commitmentSavingsBalance:
      getOptionalNumber(formData, "commitmentSavingsBalance") ?? 0,
    foodPurchaseOutstanding:
      getOptionalNumber(formData, "foodPurchaseOutstanding") ?? 0,
    foodPurchaseItemName: getOptionalTrimmedString(
      formData,
      "foodPurchaseItemName"
    ),
    foodPurchaseOpenedAt: getOptionalTrimmedString(
      formData,
      "foodPurchaseOpenedAt"
    )
      ? new Date(
          `${getOptionalTrimmedString(formData, "foodPurchaseOpenedAt")}T00:00:00.000Z`
        )
      : null,
    foodPurchaseOriginalAmount:
      getOptionalNumber(formData, "foodPurchaseOriginalAmount") ?? 0,
    foodPurchaseRepaymentMonths:
      getOptionalNumber(formData, "foodPurchaseRepaymentMonths") ?? null,
    foodPurchaseInstallmentAmount:
      getOptionalNumber(formData, "foodPurchaseInstallmentAmount") ?? 0,
    foodPurchaseInstallmentsPaid:
      getOptionalNumber(formData, "foodPurchaseInstallmentsPaid") ?? null,
    memberId,
    notes: getOptionalTrimmedString(formData, "notes"),
    openingDate: new Date(
      `${getRequiredString(formData, "openingDate")}T00:00:00.000Z`
    ),
    procurementOutstanding:
      getOptionalNumber(formData, "procurementOutstanding") ?? 0,
    procurementItemName: getOptionalTrimmedString(
      formData,
      "procurementItemName"
    ),
    procurementOpenedAt: getOptionalTrimmedString(
      formData,
      "procurementOpenedAt"
    )
      ? new Date(
          `${getOptionalTrimmedString(formData, "procurementOpenedAt")}T00:00:00.000Z`
        )
      : null,
    procurementOriginalAmount:
      getOptionalNumber(formData, "procurementOriginalAmount") ?? 0,
    procurementRepaymentMonths:
      getOptionalNumber(formData, "procurementRepaymentMonths") ?? null,
    procurementInstallmentAmount:
      getOptionalNumber(formData, "procurementInstallmentAmount") ?? 0,
    procurementInstallmentsPaid:
      getOptionalNumber(formData, "procurementInstallmentsPaid") ?? null,
    shareCapitalBalance:
      getOptionalNumber(formData, "shareCapitalBalance") ?? 0,
    shareUnits: getOptionalNumber(formData, "shareUnits") ?? null,
    sourceDocumentName: getOptionalTrimmedString(
      formData,
      "sourceDocumentName"
    ),
    sourceDocumentUrl: getOptionalTrimmedString(formData, "sourceDocumentUrl"),
    specialSavingsBalance:
      getOptionalNumber(formData, "specialSavingsBalance") ?? 0,
    tenantId: actor.tenant.id,
  })

  revalidateMemberBackfillPaths(memberId)
  revalidatePath("/getting-started")
  revalidatePath("/")
}

export async function createHistoricalMemberSharePurchaseAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")

  await requireMemberMigrationDraftMutable(actor, memberId)

  await createHistoricalMemberSharePurchase({
    actorUserId: actor.user.id,
    memberId,
    notes: getOptionalTrimmedString(formData, "notes"),
    paidAt: new Date(`${getRequiredString(formData, "paidAt")}T00:00:00.000Z`),
    shareUnits: Number(getRequiredString(formData, "shareUnits")),
    tenantId: actor.tenant.id,
  })

  revalidateMemberBackfillPaths(memberId)
}

export async function reviewMemberOpeningBalanceAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")

  await requireMemberMigrationDraftMutable(actor, memberId)

  await reviewMemberOpeningBalance({
    actorUserId: actor.user.id,
    decision: getRequiredString(formData, "decision") as
      | "approved"
      | "rejected",
    openingBalanceId: getRequiredString(formData, "openingBalanceId"),
    reviewNotes: getOptionalTrimmedString(formData, "reviewNotes"),
    tenantId: actor.tenant.id,
  })

  revalidateMemberBackfillPaths(memberId)
  revalidatePath("/getting-started")
  revalidatePath("/")
}

export async function cancelMemberOpeningBalanceAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")

  await requireMemberMigrationDraftMutable(actor, memberId)

  await cancelMemberOpeningBalance({
    actorUserId: actor.user.id,
    openingBalanceId: getRequiredString(formData, "openingBalanceId"),
    tenantId: actor.tenant.id,
  })

  revalidateMemberBackfillPaths(memberId)
  revalidatePath("/getting-started")
  revalidatePath("/")
}

export async function applyMemberOpeningBalanceAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")

  await requireMemberMigrationDraftMutable(actor, memberId)

  await applyMemberOpeningBalance({
    actorUserId: actor.user.id,
    openingBalanceId: getRequiredString(formData, "openingBalanceId"),
    tenantId: actor.tenant.id,
  })

  revalidateMemberBackfillPaths(memberId)
  revalidatePath("/getting-started")
  revalidatePath("/")
}

export async function reverseMemberOpeningBalanceAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")

  await requireMemberMigrationDraftMutable(actor, memberId)

  await reverseMemberOpeningBalance({
    actorUserId: actor.user.id,
    openingBalanceId: getRequiredString(formData, "openingBalanceId"),
    reversalNotes: getRequiredString(formData, "reversalNotes"),
    tenantId: actor.tenant.id,
  })

  revalidateMemberBackfillPaths(memberId)
  revalidatePath("/getting-started")
  revalidatePath("/")
}

type DashboardActor = Awaited<ReturnType<typeof requireDashboardActor>>
type LoanRequestReviewResult = Awaited<ReturnType<typeof reviewLoanRequest>>
type MigrationGuarantorPrefix = "guarantorOne" | "guarantorTwo"

type SupportNotificationType =
  | "support.case_created"
  | "support.case_status_updated"
  | "support.message_added"

function supportCaseDisplayName(supportCase: SupportCaseRow) {
  const memberText = supportCase.member
    ? ` for ${supportCase.member.fullName}`
    : ""

  return `support case "${supportCase.subject}"${memberText}`
}

function supportCaseMetadata(supportCase: SupportCaseRow) {
  return {
    linkedRecordId: supportCase.linkedRecordId,
    linkedRecordType: supportCase.linkedRecordType,
    memberId: supportCase.memberId,
    priority: supportCase.priority,
    status: supportCase.status,
    supportCaseId: supportCase.id,
  }
}

function supportMemberEmailPayload(
  actor: DashboardActor,
  supportCase: SupportCaseRow
) {
  if (!supportCase.member?.email) {
    return null
  }

  return {
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
      pathname: "/support",
    }),
    linkedRecordType: supportCase.linkedRecordType,
    memberName: supportCase.member.fullName,
    priority: supportCase.priority,
    recipientEmail: supportCase.member.email,
    recipientName: supportCase.member.fullName,
    status: supportCase.status,
    subject: supportCase.subject,
    supportCaseId: supportCase.id,
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  }
}

async function sendSupportStaffNotification(
  actor: DashboardActor,
  supportCase: SupportCaseRow,
  input: {
    bodyText: string
    notificationType: SupportNotificationType
    subject: string
  }
) {
  await sendTenantRoleNotificationEmails({
    actionLabel: "Open support",
    actionUrl: "/support",
    bodyText: input.bodyText,
    metadata: supportCaseMetadata(supportCase),
    notificationType: input.notificationType,
    roles: allStaffRoles,
    source: "dashboard.support",
    subject: input.subject,
    tenantId: actor.tenant.id,
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })
}

async function sendSupportCaseCreatedMemberEmail(
  actor: DashboardActor,
  supportCase: SupportCaseRow
) {
  const payload = supportMemberEmailPayload(actor, supportCase)

  if (!payload) {
    return
  }

  const draft = createEmailDraftFromType("support.case_created", payload)

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.support",
    tenantId: actor.tenant.id,
  })
}

async function sendSupportMessageMemberEmail(
  actor: DashboardActor,
  supportCase: SupportCaseRow,
  authorType: SupportCaseMessageAuthorType
) {
  const payload = supportMemberEmailPayload(actor, supportCase)

  if (!payload) {
    return
  }

  const draft = createEmailDraftFromType("support.message_added", {
    ...payload,
    authorType,
  })

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.support",
    tenantId: actor.tenant.id,
  })
}

async function sendSupportStatusMemberEmail(
  actor: DashboardActor,
  supportCase: SupportCaseRow
) {
  const payload = supportMemberEmailPayload(actor, supportCase)

  if (!payload) {
    return
  }

  const draft = createEmailDraftFromType("support.case_status_updated", payload)

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.support",
    tenantId: actor.tenant.id,
  })
}

async function sendPaymentReceiptStatusMemberEmail(
  actor: DashboardActor,
  receipt: MemberPaymentReceiptRow
) {
  if (!receipt.member.email) {
    return
  }

  const draft = createEmailDraftFromType(
    "member_payment_receipt.status_changed",
    {
      actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
        pathname: "/payment-receipts",
      }),
      amount: receipt.totalAmount,
      memberName: receipt.member.fullName,
      paymentReference: receipt.paymentReference,
      receiptId: receipt.id,
      recipientEmail: receipt.member.email,
      recipientName: receipt.member.fullName,
      reviewNotes: receipt.reviewNotes,
      status: receipt.status,
      tenantName: actor.tenant.name,
      tenantSlug: actor.tenant.slug,
    }
  )

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.payment_receipts",
    tenantId: actor.tenant.id,
  })
}

async function sendMemberShareApplicationStatusEmail(
  actor: DashboardActor,
  application: MemberShareApplicationRow
) {
  if (!application.memberEmail) {
    return
  }

  const draft = createEmailDraftFromType(
    "member_share_application.status_changed",
    {
      actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
        pathname: "/shares",
      }),
      approvedUnits: application.approvedUnits,
      memberName: application.memberName,
      recipientEmail: application.memberEmail,
      recipientName: application.memberName,
      requestedUnits: application.requestedUnits,
      reviewNotes: application.reviewNotes,
      shareApplicationId: application.id,
      shareValue:
        application.approvedUnits === null
          ? application.shareValueSnapshot
          : application.approvedUnits * application.unitAmountSnapshot,
      status: application.status,
      tenantName: actor.tenant.name,
      tenantSlug: actor.tenant.slug,
    }
  )

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.shares",
    tenantId: actor.tenant.id,
  })
}

async function sendLoanRequestStatusMemberEmail(
  actor: DashboardActor,
  request: LoanRequestReviewResult
) {
  if (!request.member?.email) {
    return
  }

  const draft = createEmailDraftFromType("loan.request_status_changed", {
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
      pathname: "/loans",
    }),
    amount: Number(request.requestedAmount),
    loanRequestId: request.id,
    memberName: request.member.fullName,
    recipientEmail: request.member.email,
    recipientName: request.member.fullName,
    reviewNotes: request.reviewNotes,
    status: request.status,
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.loans",
    tenantId: actor.tenant.id,
  })
}

async function sendProjectFinancingRequestStatusMemberEmail(
  actor: DashboardActor,
  request: ProjectFinancingRequestRow
) {
  if (!request.member.email) {
    return
  }

  const draft = createEmailDraftFromType(
    "project_financing.request_status_changed",
    {
      actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
        pathname: "/project-financing",
      }),
      amount: request.approvedAmount ?? request.requestedAmount,
      approvedStructure: request.approvedStructure,
      businessName: request.businessName,
      memberName: request.member.fullName,
      projectFinancingRequestId: request.id,
      recipientEmail: request.member.email,
      recipientName: request.member.fullName,
      reviewNotes: request.reviewNotes,
      status: request.status,
      tenantName: actor.tenant.name,
      tenantSlug: actor.tenant.slug,
    }
  )

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.project_financing",
    tenantId: actor.tenant.id,
  })
}

async function sendProcurementRequestStatusMemberEmail(
  actor: DashboardActor,
  request: ProcurementRequestRow
) {
  if (!request.member.email) {
    return
  }

  const draft = createEmailDraftFromType("procurement.request_status_changed", {
    actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
      pathname: "/procurement",
    }),
    amount: request.approvedCost ?? request.requestedCost,
    itemName: request.itemName,
    memberName: request.member.fullName,
    procurementRequestId: request.id,
    recipientEmail: request.member.email,
    recipientName: request.member.fullName,
    repaymentMonths:
      request.approvedRepaymentMonths ?? request.requestedRepaymentMonths,
    reviewNotes: request.reviewNotes,
    status: request.status,
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
    vendorName: request.vendorName,
  })

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.procurement",
    tenantId: actor.tenant.id,
  })
}

async function sendFoodPurchaseApplicationStatusMemberEmail(
  actor: DashboardActor,
  application: FoodPurchaseApplicationRow
) {
  if (!application.member.email) {
    return
  }

  const periodLabel = formatFoodPurchasePeriodLabel(
    application.cycle.periodMonth
  )
  const draft = createEmailDraftFromType(
    "food_purchase.application_status_changed",
    {
      actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
        pathname: "/food-purchase",
      }),
      amount: application.approvedAmount ?? application.requestedAmount,
      applicationId: application.id,
      itemDescription: application.itemDescription,
      memberName: application.member.fullName,
      periodLabel,
      recipientEmail: application.member.email,
      recipientName: application.member.fullName,
      reviewNotes: application.reviewNotes,
      status: application.status,
      tenantName: actor.tenant.name,
      tenantSlug: actor.tenant.slug,
    }
  )

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.food_purchase",
    tenantId: actor.tenant.id,
  })
}

function formatFoodPurchasePeriodLabel(periodMonth: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(periodMonth)
}

async function sendFoodPurchaseAccountingStatusCommitteeEmail(
  actor: DashboardActor,
  cycle: FoodPurchaseCycleRow,
  reviewNotes?: string | null
) {
  const recipient = cycle.accountingSubmittedByUser

  if (!recipient?.email) {
    return
  }

  const draft = createEmailDraftFromType(
    "food_purchase.accounting_status_changed",
    {
      actionUrl: buildTenantDashboardUrl(actor.tenant.slug, {
        pathname: "/food-purchase",
      }),
      cycleId: cycle.id,
      periodLabel: formatFoodPurchasePeriodLabel(cycle.periodMonth),
      profitAmount: cycle.profitAmount,
      recipientEmail: recipient.email,
      recipientName: recipient.fullName,
      reviewNotes,
      status: cycle.status as "accounting_approved" | "accounting_rejected",
      tenantName: actor.tenant.name,
      tenantSlug: actor.tenant.slug,
    }
  )

  await sendEmailDraftWithAudit({
    draft,
    source: "dashboard.food_purchase.accounting",
    tenantId: actor.tenant.id,
  })
}

function maxFieldLength(...fieldValues: string[][]) {
  return Math.max(0, ...fieldValues.map((values) => values.length))
}

function buildMemberAmountLogRows(formData: FormData) {
  const rowIdValues = getAllTrimmedStrings(formData, "rowId")
  const effectiveFromValues = getAllTrimmedStrings(formData, "effectiveFrom")
  const amountValues = getAllTrimmedStrings(formData, "amount")
  const notesValues = getAllTrimmedStrings(formData, "notes")
  const rowCount = maxFieldLength(
    rowIdValues,
    effectiveFromValues,
    amountValues,
    notesValues
  )
  const rows: Array<{
    amount: string
    effectiveFrom: string
    notes: string
    rowId: string
  }> = []

  for (let index = 0; index < rowCount; index += 1) {
    const row = {
      amount: indexedValue(amountValues, index),
      effectiveFrom: indexedValue(effectiveFromValues, index),
      notes: indexedValue(notesValues, index),
      rowId: indexedValue(rowIdValues, index),
    }
    const started = Boolean(row.amount || row.effectiveFrom || row.notes)

    if (!started) {
      continue
    }

    if (!row.amount || !row.effectiveFrom) {
      throw new Error("Each started commitment row needs a date and amount.")
    }

    rows.push(row)
  }

  return rows.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
}

function buildMemberActivityEventRows(formData: FormData) {
  const rowIdValues = getAllTrimmedStrings(formData, "rowId")
  const effectiveMonthValues = getAllTrimmedStrings(formData, "effectiveMonth")
  const statusValues = getAllTrimmedStrings(formData, "status")
  const reasonValues = getAllTrimmedStrings(formData, "reason")
  const notesValues = getAllTrimmedStrings(formData, "notes")
  const rowCount = maxFieldLength(
    rowIdValues,
    effectiveMonthValues,
    statusValues,
    reasonValues,
    notesValues
  )
  const rows: Array<{
    effectiveMonth: string
    notes: string
    reason: string
    rowId: string
    status: "active" | "inactive"
  }> = []

  for (let index = 0; index < rowCount; index += 1) {
    const row = {
      effectiveMonth: indexedValue(effectiveMonthValues, index),
      notes: indexedValue(notesValues, index),
      reason: indexedValue(reasonValues, index),
      rowId: indexedValue(rowIdValues, index),
      status: indexedValue(statusValues, index),
    }
    const started = Boolean(
      row.effectiveMonth || row.notes || row.reason || row.status
    )

    if (!started) {
      continue
    }

    if (!row.effectiveMonth || !row.status) {
      throw new Error("Each started activity row needs a month and status.")
    }

    if (row.status !== "active" && row.status !== "inactive") {
      throw new Error("Member activity status must be active or inactive.")
    }

    rows.push({
      ...row,
      status: row.status,
    })
  }

  return rows.sort((a, b) => a.effectiveMonth.localeCompare(b.effectiveMonth))
}

function buildLegacyLoanMigrationRows(formData: FormData) {
  const draftIdValues = getAllTrimmedStrings(formData, "draftId")
  const closedAtValues = getAllTrimmedStrings(formData, "closedAt")
  const loanLabelValues = getAllTrimmedStrings(formData, "loanLabel")
  const notesValues = getAllTrimmedStrings(formData, "notes")
  const openedAtValues = getAllTrimmedStrings(formData, "openedAt")
  const outstandingPrincipalBalanceValues = getAllTrimmedStrings(
    formData,
    "outstandingPrincipalBalance"
  )
  const principalAmountValues = getAllTrimmedStrings(
    formData,
    "principalAmount"
  )
  const savingsDuringLoanValues = getAllTrimmedStrings(
    formData,
    "savingsDuringLoan"
  )
  const scheduledMonthlyPrincipalRepaymentValues = getAllTrimmedStrings(
    formData,
    "scheduledMonthlyPrincipalRepayment"
  )
  const guarantorOneValues = getAllTrimmedStrings(
    formData,
    "guarantorOneMemberId"
  )
  const guarantorTwoValues = getAllTrimmedStrings(
    formData,
    "guarantorTwoMemberId"
  )
  const rowCount = maxFieldLength(
    closedAtValues,
    loanLabelValues,
    notesValues,
    openedAtValues,
    outstandingPrincipalBalanceValues,
    principalAmountValues,
    savingsDuringLoanValues,
    scheduledMonthlyPrincipalRepaymentValues,
    guarantorOneValues,
    guarantorTwoValues,
    draftIdValues
  )
  const rows: Array<{
    closedAt: string
    draftId: string
    index: number
    loanLabel: string
    notes: string
    openedAt: string
    outstandingPrincipalBalance: string
    principalAmount: string
    savingsDuringLoan: string
    scheduledMonthlyPrincipalRepayment: string
  }> = []

  for (let index = 0; index < rowCount; index += 1) {
    const row = {
      closedAt: indexedValue(closedAtValues, index),
      draftId: indexedValue(draftIdValues, index),
      index,
      loanLabel: indexedValue(loanLabelValues, index),
      notes: indexedValue(notesValues, index),
      openedAt: indexedValue(openedAtValues, index),
      outstandingPrincipalBalance: indexedValue(
        outstandingPrincipalBalanceValues,
        index
      ),
      principalAmount: indexedValue(principalAmountValues, index),
      savingsDuringLoan: indexedValue(savingsDuringLoanValues, index),
      scheduledMonthlyPrincipalRepayment: indexedValue(
        scheduledMonthlyPrincipalRepaymentValues,
        index
      ),
    }
    const started = Boolean(
      row.closedAt ||
      row.notes ||
      row.openedAt ||
      row.outstandingPrincipalBalance ||
      row.principalAmount ||
      row.savingsDuringLoan ||
      row.scheduledMonthlyPrincipalRepayment ||
      indexedValue(guarantorOneValues, index) ||
      indexedValue(guarantorTwoValues, index)
    )

    if (!started) {
      continue
    }

    if (
      !row.openedAt ||
      !row.principalAmount ||
      !row.scheduledMonthlyPrincipalRepayment ||
      !row.savingsDuringLoan
    ) {
      throw new Error(
        "Each started loan row needs a date, amount, repayment, and commitment."
      )
    }

    rows.push(row)
  }

  return rows.sort((a, b) => a.openedAt.localeCompare(b.openedAt))
}

async function resolveMigrationGuarantorMemberId({
  actor,
  formData,
  index,
  label,
  prefix,
}: {
  actor: DashboardActor
  formData: FormData
  index: number
  label: string
  prefix: MigrationGuarantorPrefix
}) {
  const existingMemberId = indexedValue(
    getAllTrimmedStrings(formData, `${prefix}MemberId`),
    index
  )

  if (existingMemberId) {
    return existingMemberId
  }

  const fullName = indexedValue(
    getAllTrimmedStrings(formData, `${prefix}CreateFullName`),
    index
  )
  const memberNumber = indexedValue(
    getAllTrimmedStrings(formData, `${prefix}CreateMemberNumber`),
    index
  )
  const joinedAtValue = indexedValue(
    getAllTrimmedStrings(formData, `${prefix}CreateJoinedAt`),
    index
  )
  const email =
    indexedValue(getAllTrimmedStrings(formData, `${prefix}CreateEmail`), index)
      .toLowerCase()
      .trim() || null
  const phoneNumber =
    indexedValue(
      getAllTrimmedStrings(formData, `${prefix}CreatePhone`),
      index
    ).trim() || null
  const started = Boolean(
    fullName || memberNumber || joinedAtValue || email || phoneNumber
  )

  if (!started) {
    return null
  }

  if (!fullName || !memberNumber || !joinedAtValue) {
    throw new Error(
      `${label} quick-create needs full name, member number, and joined date.`
    )
  }

  const joinedAt = new Date(`${joinedAtValue}T00:00:00.000Z`)
  requireDateOnOrAfterTenantStartDate(actor, joinedAt, `${label} joined date`)

  const member = await createMember({
    actorUserId: actor.user.id,
    address: null,
    currentSavingsBalance: 0,
    email,
    fullName,
    joinedAt,
    commitmentHistory: [],
    legacyLoanHistory: [],
    memberNumber: composeMemberNumber(
      actor.tenant.memberNumberPrefix,
      memberNumber
    ),
    memberType: "individual",
    monthlyCommitment: 0,
    occupation: null,
    phoneNumber,
    tenantId: actor.tenant.id,
  })

  return member.id
}

export async function createLegacyLoanMigrationDraftAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const rows = buildLegacyLoanMigrationRows(formData)
  const allowEmptyRows =
    getOptionalTrimmedString(formData, "allowEmptyRows") === "true"

  if (rows.length === 0) {
    if (allowEmptyRows) {
      revalidateMemberBackfillPaths(memberId)
      return
    }

    throw new Error("Add at least one loan history row.")
  }

  for (const row of rows) {
    const openedAt = new Date(`${row.openedAt}T00:00:00.000Z`)
    const closedAt = row.closedAt
      ? new Date(`${row.closedAt}T00:00:00.000Z`)
      : null
    requireDateOnOrAfterTenantStartDate(actor, openedAt, "Loan date")
    requireDateOnOrAfterTenantStartDate(actor, closedAt, "Closed date")

    const guarantorOneMemberId = await resolveMigrationGuarantorMemberId({
      actor,
      formData,
      index: row.index,
      label: "Guarantor 1",
      prefix: "guarantorOne",
    })
    const guarantorTwoMemberId = await resolveMigrationGuarantorMemberId({
      actor,
      formData,
      index: row.index,
      label: "Guarantor 2",
      prefix: "guarantorTwo",
    })

    if (
      guarantorOneMemberId &&
      guarantorTwoMemberId &&
      guarantorOneMemberId === guarantorTwoMemberId
    ) {
      throw new Error("Guarantor 1 and Guarantor 2 cannot be the same member.")
    }

    const principalAmount = Number(row.principalAmount)

    const loanInput = {
      actorUserId: actor.user.id,
      closedAt,
      guarantorOneMemberId,
      guarantorTwoMemberId,
      loanLabel: row.loanLabel || "Legacy loan",
      memberId,
      notes: row.notes || null,
      openedAt,
      principalAmount,
      outstandingPrincipalBalance: row.outstandingPrincipalBalance
        ? Number(row.outstandingPrincipalBalance)
        : principalAmount,
      savingsDuringLoan: Number(row.savingsDuringLoan),
      scheduledMonthlyPrincipalRepayment: Number(
        row.scheduledMonthlyPrincipalRepayment
      ),
      tenantId: actor.tenant.id,
    }

    if (row.draftId) {
      await updateLegacyLoanMigrationDraft({
        ...loanInput,
        draftId: row.draftId,
      })
    } else {
      await createLegacyLoanMigrationDraft(loanInput)
    }
  }

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidatePath("/settings/finance/loan")
  revalidateMemberBackfillPaths(memberId)
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
  revalidatePath("/getting-started")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidatePath("/settings/finance/loan")
  revalidateMemberBackfillPaths(memberId)
}

export async function upsertMemberAmountLogAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const rows = buildMemberAmountLogRows(formData)
  const allowEmptyRows =
    getOptionalTrimmedString(formData, "allowEmptyRows") === "true"

  if (rows.length === 0) {
    if (allowEmptyRows) {
      revalidateMemberBackfillPaths(memberId)
      return
    }

    throw new Error("Add at least one commitment history row.")
  }

  for (const row of rows) {
    const effectiveFrom = new Date(`${row.effectiveFrom}T00:00:00.000Z`)
    requireDateOnOrAfterTenantStartDate(actor, effectiveFrom, "Commitment date")

    await upsertMemberAmountLog({
      actorUserId: actor.user.id,
      amount: Number(row.amount),
      effectiveFrom,
      memberId,
      notes: row.notes || null,
      rowId: row.rowId || null,
      tenantId: actor.tenant.id,
    })
  }

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidateMemberBackfillPaths(memberId)
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
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidateMemberBackfillPaths(memberId)
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
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidateMemberBackfillPaths(memberId)
}

export async function upsertMemberActivityEventAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const rows = buildMemberActivityEventRows(formData)

  for (const row of rows) {
    await upsertMemberActivityEvent({
      actorUserId: actor.user.id,
      effectiveMonth: new Date(`${row.effectiveMonth}-01T00:00:00.000Z`),
      eventId: row.rowId || null,
      memberId,
      notes: row.notes || null,
      reason: row.reason || null,
      status: row.status,
      tenantId: actor.tenant.id,
    })
  }

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidateMemberBackfillPaths(memberId)
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
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidateMemberBackfillPaths(memberId)
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
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
}

export async function saveMemberProfitSeasonAdjustmentsAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const memberId = getRequiredString(formData, "memberId")
  await requireMemberMigrationDraftMutable(actor, memberId)
  const seasonKeys = getAllTrimmedStrings(formData, "seasonKey").filter(Boolean)
  const redirectTo = (formData.get("redirectTo") as string | null)?.trim()

  await saveMigrationProfitSeasonAdjustments({
    actorUserId: actor.user.id,
    memberId,
    notes: (formData.get("notes") as string | null)?.trim() || null,
    seasons: seasonKeys.map((key) => ({
      allocatedProfitAmount:
        getOptionalNumber(formData, `allocatedProfitAmount-${key}`) ?? null,
      key,
      sharePercentage:
        getOptionalNumber(formData, `sharePercentage-${key}`) ?? null,
    })),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/settings/finance")
  revalidatePath("/getting-started")
  revalidatePath("/settings/finance/migration")
  revalidatePath(`/settings/finance/migration/${memberId}`)
  revalidateMemberBackfillPaths(memberId)

  return {
    redirectTo:
      redirectTo && redirectTo.startsWith("/") ? redirectTo : undefined,
  }
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
  const memberSignupAccessMode = getRequiredString(
    formData,
    "memberSignupAccessMode"
  )

  if (
    !["disabled", "hidden", "in_office", "public"].includes(
      memberSignupAccessMode
    )
  ) {
    throw new Error("Choose a valid member signup access mode.")
  }

  await updateTenantMemberSignupSettings({
    actorUserId: actor.user.id,
    memberSignupAccessMode: memberSignupAccessMode as
      | "disabled"
      | "hidden"
      | "in_office"
      | "public",
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
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

  await sendTenantRoleNotificationEmails({
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
    tenantName: actor.tenant.name,
    tenantSlug: actor.tenant.slug,
  })

  revalidatePath("/repayments")
}

export async function createSupportCaseAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  const supportCase = await createSupportCase({
    assignedToUserId: getOptionalTrimmedString(formData, "assignedToUserId"),
    attachmentUrl: getOptionalTrimmedString(formData, "attachmentUrl"),
    category: getRequiredString(formData, "category") as
      | "payment_issue"
      | "account_update"
      | "shares"
      | "financing"
      | "procurement"
      | "feature_request"
      | "technical"
      | "other",
    description: getRequiredString(formData, "description"),
    linkedRecordId: getOptionalTrimmedString(formData, "linkedRecordId"),
    linkedRecordType: getOptionalTrimmedString(formData, "linkedRecordType") as
      | "member"
      | "contribution"
      | "repayment"
      | "loan_request"
      | "loan"
      | "share_application"
      | "procurement"
      | "receipt"
      | "other"
      | null,
    memberId: getOptionalTrimmedString(formData, "memberId"),
    moneyImpactRequested: getOptionalBoolean(formData, "moneyImpactRequested"),
    openedByUserId: actor.user.id,
    priority: getRequiredString(formData, "priority") as
      | "low"
      | "normal"
      | "high"
      | "urgent",
    subject: getRequiredString(formData, "subject"),
    tenantId: actor.tenant.id,
  })

  await sendSupportCaseCreatedMemberEmail(actor, supportCase)

  revalidatePath("/")
  revalidatePath("/support")
  revalidatePath("/payment-receipts")
}

export async function addSupportCaseMessageAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  const supportCaseId = getRequiredString(formData, "supportCaseId")

  await addSupportCaseMessage({
    attachmentUrl: getOptionalTrimmedString(formData, "attachmentUrl"),
    authorType: "staff",
    authorUserId: actor.user.id,
    message: getRequiredString(formData, "message"),
    supportCaseId,
    tenantId: actor.tenant.id,
  })

  const supportCase = await getSupportCase({
    supportCaseId,
    tenantId: actor.tenant.id,
  })

  await sendSupportMessageMemberEmail(actor, supportCase, "staff")

  revalidatePath("/support")
}

export async function createMemberSupportCaseAction(formData: FormData) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  const member = await requireActorMember(actor)

  const supportCase = await createMemberSupportCase({
    attachmentUrl: getOptionalTrimmedString(formData, "attachmentUrl"),
    category: getRequiredString(formData, "category") as
      | "payment_issue"
      | "account_update"
      | "shares"
      | "financing"
      | "procurement"
      | "feature_request"
      | "technical"
      | "other",
    description: getRequiredString(formData, "description"),
    linkedRecordId: getOptionalTrimmedString(formData, "linkedRecordId"),
    linkedRecordType: getOptionalTrimmedString(formData, "linkedRecordType") as
      | "member"
      | "contribution"
      | "repayment"
      | "loan_request"
      | "loan"
      | "share_application"
      | "procurement"
      | "receipt"
      | "other"
      | null,
    memberId: member.id,
    moneyImpactRequested: getOptionalBoolean(formData, "moneyImpactRequested"),
    openedByUserId: actor.user.id,
    subject: getRequiredString(formData, "subject"),
    tenantId: actor.tenant.id,
  })

  await sendSupportStaffNotification(actor, supportCase, {
    bodyText: `${supportCaseDisplayName(supportCase)} was opened by a member. Review the case and document resolution activity inside the support workspace.`,
    notificationType: "support.case_created",
    subject: `${actor.tenant.name}: support case opened`,
  })

  revalidatePath("/")
  revalidatePath("/support")
  revalidatePath("/payment-receipts")
}

export async function addMemberSupportCaseMessageAction(formData: FormData) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  const member = await requireActorMember(actor)
  const supportCaseId = getRequiredString(formData, "supportCaseId")

  await addMemberSupportCaseMessage({
    attachmentUrl: getOptionalTrimmedString(formData, "attachmentUrl"),
    authorUserId: actor.user.id,
    memberId: member.id,
    message: getRequiredString(formData, "message"),
    supportCaseId,
    tenantId: actor.tenant.id,
  })

  const supportCase = await getSupportCase({
    memberId: member.id,
    supportCaseId,
    tenantId: actor.tenant.id,
  })

  await sendSupportStaffNotification(actor, supportCase, {
    bodyText: `A member reply was added to ${supportCaseDisplayName(supportCase)}. Review the message before taking any money-impact action.`,
    notificationType: "support.message_added",
    subject: `${actor.tenant.name}: support case reply added`,
  })

  revalidatePath("/support")
}

export async function updateSupportCaseStatusAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  const supportCase = await updateSupportCaseStatus({
    actorUserId: actor.user.id,
    assignedToUserId: getOptionalTrimmedString(formData, "assignedToUserId"),
    priority: getRequiredString(formData, "priority") as
      | "low"
      | "normal"
      | "high"
      | "urgent",
    requiresFinancialAdjustment: getOptionalBoolean(
      formData,
      "requiresFinancialAdjustment"
    ),
    resolutionSummary: getOptionalTrimmedString(formData, "resolutionSummary"),
    status: getRequiredString(formData, "status") as
      | "open"
      | "in_progress"
      | "waiting_on_member"
      | "resolved"
      | "closed",
    supportCaseId: getRequiredString(formData, "supportCaseId"),
    tenantId: actor.tenant.id,
  })

  await sendSupportStatusMemberEmail(actor, supportCase)

  revalidatePath("/")
  revalidatePath("/support")
}

export async function reviewSupportCaseFinancialAdjustmentAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)

  const supportCase = await reviewSupportCaseFinancialAdjustment({
    actorUserId: actor.user.id,
    approvalNotes: getOptionalTrimmedString(formData, "approvalNotes"),
    approvalStatus: getRequiredString(formData, "approvalStatus") as
      | "approved"
      | "rejected",
    supportCaseId: getRequiredString(formData, "supportCaseId"),
    tenantId: actor.tenant.id,
  })

  await sendSupportStatusMemberEmail(actor, supportCase)

  revalidatePath("/")
  revalidatePath("/support")
}

export async function settleSupportCaseSpecialSavingsRefundAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const supportCaseId = getRequiredString(formData, "supportCaseId")
  const paidAt = getRequiredString(formData, "paidAt")

  requireDateOnOrAfterTenantStartDate(actor, paidAt, "Refund payment date")

  await settleSupportCaseSpecialSavingsRefund({
    actorUserId: actor.user.id,
    amount: Number(getRequiredString(formData, "amount")),
    notes: getOptionalTrimmedString(formData, "notes"),
    paidAt: new Date(`${paidAt}T00:00:00.000Z`),
    reference: getRequiredString(formData, "reference"),
    supportCaseId,
    tenantId: actor.tenant.id,
  })

  const supportCase = await getSupportCase({
    supportCaseId,
    tenantId: actor.tenant.id,
  })

  await sendSupportStatusMemberEmail(actor, supportCase)

  revalidatePath("/")
  revalidatePath("/support")
}

export async function createFoodPurchaseCycleAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const periodMonth = getRequiredString(formData, "periodMonth")
  const releasedAt = getRequiredString(formData, "releasedAt")

  requireDateOnOrAfterTenantStartDate(actor, `${periodMonth}-01`, "Period")
  requireDateOnOrAfterTenantStartDate(actor, releasedAt, "Release date")

  await createFoodPurchaseCycle({
    actorUserId: actor.user.id,
    periodMonth: new Date(`${periodMonth}-01T00:00:00.000Z`),
    releasedAmount: Number(getRequiredString(formData, "releasedAmount")),
    releasedAt: new Date(`${releasedAt}T00:00:00.000Z`),
    releaseNotes: getOptionalTrimmedString(formData, "releaseNotes"),
    requestSource: "staff",
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/food-purchase")
}

export async function submitFoodPurchaseApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await submitFoodPurchaseApplication({
    actorUserId: actor.user.id,
    cycleId: getRequiredString(formData, "cycleId"),
    itemDescription: getOptionalTrimmedString(formData, "itemDescription"),
    memberId: getRequiredString(formData, "memberId"),
    requestSource: "staff",
    requestedAmount: Number(getRequiredString(formData, "requestedAmount")),
    requestedPaybackMonths: Number(
      getRequiredString(formData, "requestedPaybackMonths")
    ),
    requestNotes: getOptionalTrimmedString(formData, "requestNotes"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/food-purchase")
}

export async function submitOwnFoodPurchaseApplicationAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  await requireLiveFinancialWritesOpen(actor)
  const member = await requireOperationalActorMember(actor)

  await submitFoodPurchaseApplication({
    actorUserId: actor.user.id,
    cycleId: getRequiredString(formData, "cycleId"),
    itemDescription: getOptionalTrimmedString(formData, "itemDescription"),
    memberId: member.id,
    requestSource: "member_self_service",
    requestedAmount: Number(getRequiredString(formData, "requestedAmount")),
    requestedPaybackMonths: Number(
      getRequiredString(formData, "requestedPaybackMonths")
    ),
    requestNotes: getOptionalTrimmedString(formData, "requestNotes"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/food-purchase")
}

export async function reviewFoodPurchaseApplicationAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  const application = await reviewFoodPurchaseApplication({
    actorUserId: actor.user.id,
    applicationId: getRequiredString(formData, "applicationId"),
    approvedAmount: getOptionalNumber(formData, "approvedAmount"),
    approvedPaybackMonths: getOptionalNumber(formData, "approvedPaybackMonths"),
    notes: getOptionalTrimmedString(formData, "notes"),
    status: getRequiredString(formData, "status") as
      | "approved"
      | "rejected"
      | "under_review",
    tenantId: actor.tenant.id,
  })

  await sendFoodPurchaseApplicationStatusMemberEmail(actor, application)

  revalidatePath("/")
  revalidatePath("/food-purchase")
}

export async function recordFoodPurchaseAccountingAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await recordFoodPurchaseAccounting({
    actorUserId: actor.user.id,
    cycleId: getRequiredString(formData, "cycleId"),
    notes: getOptionalTrimmedString(formData, "notes"),
    operatingExpenseAmount:
      getOptionalNumber(formData, "operatingExpenseAmount") ?? 0,
    purchaseCostAmount: Number(
      getRequiredString(formData, "purchaseCostAmount")
    ),
    salesAmount: Number(getRequiredString(formData, "salesAmount")),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/food-purchase")
}

export async function reviewFoodPurchaseAccountingAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)
  const notes = getOptionalTrimmedString(formData, "notes")

  const cycle = await reviewFoodPurchaseAccounting({
    actorUserId: actor.user.id,
    cycleId: getRequiredString(formData, "cycleId"),
    decision: getRequiredString(formData, "decision") as
      | "approved"
      | "rejected",
    notes,
    tenantId: actor.tenant.id,
  })
  await sendFoodPurchaseAccountingStatusCommitteeEmail(actor, cycle, notes)

  revalidatePath("/")
  revalidatePath("/food-purchase")
}

export async function createProcurementRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await createProcurementRequest({
    actorUserId: actor.user.id,
    itemDescription: getOptionalTrimmedString(formData, "itemDescription"),
    itemName: getRequiredString(formData, "itemName"),
    memberId: getRequiredString(formData, "memberId"),
    requestSource: "staff",
    requestedCost: Number(getRequiredString(formData, "requestedCost")),
    requestedRepaymentMonths: Number(
      getRequiredString(formData, "requestedRepaymentMonths")
    ),
    tenantId: actor.tenant.id,
    vendorName: getOptionalTrimmedString(formData, "vendorName"),
  })

  revalidatePath("/")
  revalidatePath("/procurement")
}

export async function createOwnProcurementRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  await requireLiveFinancialWritesOpen(actor)
  const member = await requireOperationalActorMember(actor)

  await createProcurementRequest({
    actorUserId: actor.user.id,
    itemDescription: getOptionalTrimmedString(formData, "itemDescription"),
    itemName: getRequiredString(formData, "itemName"),
    memberId: member.id,
    requestSource: "member_self_service",
    requestedCost: Number(getRequiredString(formData, "requestedCost")),
    requestedRepaymentMonths: Number(
      getRequiredString(formData, "requestedRepaymentMonths")
    ),
    tenantId: actor.tenant.id,
    vendorName: getOptionalTrimmedString(formData, "vendorName"),
  })

  revalidatePath("/")
  revalidatePath("/procurement")
}

export async function reviewProcurementRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const request = await reviewProcurementRequest({
    actorUserId: actor.user.id,
    approvedCost: getOptionalNumber(formData, "approvedCost"),
    approvedRepaymentMonths: getOptionalNumber(
      formData,
      "approvedRepaymentMonths"
    ),
    notes: getOptionalTrimmedString(formData, "notes"),
    procurementRequestId: getRequiredString(formData, "procurementRequestId"),
    status: getRequiredString(formData, "status") as
      | "approved"
      | "rejected"
      | "under_review",
    tenantId: actor.tenant.id,
  })

  await sendProcurementRequestStatusMemberEmail(actor, request)

  revalidatePath("/")
  revalidatePath("/procurement")
}

export async function recordProcurementPurchaseAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await recordProcurementPurchase({
    actorUserId: actor.user.id,
    firstDueDate: new Date(
      `${getRequiredString(formData, "firstDueDate")}T00:00:00.000Z`
    ),
    procurementRequestId: getRequiredString(formData, "procurementRequestId"),
    purchaseDate: new Date(
      `${getRequiredString(formData, "purchaseDate")}T00:00:00.000Z`
    ),
    purchaseNotes: getOptionalTrimmedString(formData, "purchaseNotes"),
    purchaseReference: getOptionalTrimmedString(formData, "purchaseReference"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/procurement")
}

export async function createProjectFinancingRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)
  await requireLiveFinancialWritesOpen(actor)

  await createProjectFinancingRequest({
    actorUserId: actor.user.id,
    businessDescription: getOptionalTrimmedString(
      formData,
      "businessDescription"
    ),
    businessName: getRequiredString(formData, "businessName"),
    memberId: getRequiredString(formData, "memberId"),
    projectPurpose: getOptionalTrimmedString(formData, "projectPurpose"),
    proposedStructure: getOptionalTrimmedString(
      formData,
      "proposedStructure"
    ) as
      | "investment_partnership"
      | "profit_sharing"
      | "repayable_facility"
      | "undecided"
      | null,
    requestedAmount: Number(getRequiredString(formData, "requestedAmount")),
    requestedPaybackMonths: getOptionalNumber(
      formData,
      "requestedPaybackMonths"
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/project-financing")
}

export async function createOwnProjectFinancingRequestAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  await requireLiveFinancialWritesOpen(actor)
  const member = await requireOperationalActorMember(actor)

  await createProjectFinancingRequest({
    actorUserId: actor.user.id,
    businessDescription: getOptionalTrimmedString(
      formData,
      "businessDescription"
    ),
    businessName: getRequiredString(formData, "businessName"),
    memberId: member.id,
    projectPurpose: getOptionalTrimmedString(formData, "projectPurpose"),
    proposedStructure: getOptionalTrimmedString(
      formData,
      "proposedStructure"
    ) as
      | "investment_partnership"
      | "profit_sharing"
      | "repayable_facility"
      | "undecided"
      | null,
    requestedAmount: Number(getRequiredString(formData, "requestedAmount")),
    requestedPaybackMonths: getOptionalNumber(
      formData,
      "requestedPaybackMonths"
    ),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/project-financing")
}

export async function reviewProjectFinancingRequestAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  const request = await reviewProjectFinancingRequest({
    actorUserId: actor.user.id,
    approvedAmount: getOptionalNumber(formData, "approvedAmount"),
    approvedPaybackMonths: getOptionalNumber(formData, "approvedPaybackMonths"),
    approvedStructure: getOptionalTrimmedString(
      formData,
      "approvedStructure"
    ) as
      | "investment_partnership"
      | "profit_sharing"
      | "repayable_facility"
      | "undecided"
      | null,
    notes: getOptionalTrimmedString(formData, "notes"),
    projectFinancingRequestId: getRequiredString(
      formData,
      "projectFinancingRequestId"
    ),
    status: getRequiredString(formData, "status") as
      | "approved"
      | "rejected"
      | "under_review",
    tenantId: actor.tenant.id,
  })

  await sendProjectFinancingRequestStatusMemberEmail(actor, request)

  revalidatePath("/")
  revalidatePath("/project-financing")
}

export async function recordProjectFinancingDisbursementAction(
  formData: FormData
) {
  const actor = await requireDashboardActor(financeManagementRoles)
  await requireLiveFinancialWritesOpen(actor)

  await recordProjectFinancingDisbursement({
    actorUserId: actor.user.id,
    disbursedAt: new Date(
      `${getRequiredString(formData, "disbursedAt")}T00:00:00.000Z`
    ),
    notes: getOptionalTrimmedString(formData, "notes"),
    projectFinancingRequestId: getRequiredString(
      formData,
      "projectFinancingRequestId"
    ),
    reference: getOptionalTrimmedString(formData, "reference"),
    tenantId: actor.tenant.id,
  })

  revalidatePath("/")
  revalidatePath("/project-financing")
  revalidatePath("/payment-receipts")
}

export async function createMemberPaymentReceiptAction(formData: FormData) {
  const actor = await requireDashboardActor(allStaffRoles)

  await createMemberPaymentReceipt({
    allocations: parsePaymentReceiptAllocations(formData),
    channel: getRequiredString(
      formData,
      "channel"
    ) as DashboardContributionChannel,
    memberId: getRequiredString(formData, "memberId"),
    memberNotes: getOptionalTrimmedString(formData, "memberNotes"),
    paidAt: new Date(`${getRequiredString(formData, "paidAt")}T00:00:00.000Z`),
    paymentReference: getOptionalTrimmedString(formData, "paymentReference"),
    proofDocumentName: getOptionalTrimmedString(formData, "proofDocumentName"),
    proofDocumentUrl: getOptionalTrimmedString(formData, "proofDocumentUrl"),
    submittedByUserId: actor.user.id,
    tenantId: actor.tenant.id,
    totalAmount: Number(getRequiredString(formData, "totalAmount")),
  })

  revalidatePath("/")
  revalidatePath("/payment-receipts")
}

export async function createOwnMemberPaymentReceiptAction(formData: FormData) {
  const actor = await requireDashboardActor(memberSelfServiceRoles)
  const member = await requireOperationalActorMember(actor)
  const operationProfile = await getTenantOperationProfile(actor.tenant.id)

  if (!operationProfile.services.payment_receipts.canMemberCreate) {
    throw new Error(
      "Payment receipt self-service is not enabled for this cooperative."
    )
  }

  await createMemberPaymentReceipt({
    allocations: parsePaymentReceiptAllocations(formData),
    channel: getRequiredString(
      formData,
      "channel"
    ) as DashboardContributionChannel,
    memberId: member.id,
    memberNotes: getOptionalTrimmedString(formData, "memberNotes"),
    paidAt: new Date(`${getRequiredString(formData, "paidAt")}T00:00:00.000Z`),
    paymentReference: getOptionalTrimmedString(formData, "paymentReference"),
    proofDocumentName: getOptionalTrimmedString(formData, "proofDocumentName"),
    proofDocumentUrl: getOptionalTrimmedString(formData, "proofDocumentUrl"),
    submittedByUserId: actor.user.id,
    tenantId: actor.tenant.id,
    totalAmount: Number(getRequiredString(formData, "totalAmount")),
  })

  revalidatePath("/")
  revalidatePath("/payment-receipts")
}

export async function reviewMemberPaymentReceiptAction(formData: FormData) {
  const actor = await requireDashboardActor(financeManagementRoles)
  const adjustedAllocations = parsePaymentReceiptAllocations(
    formData,
    "adjustedAllocationsJson"
  )

  const receipt = await reviewMemberPaymentReceipt({
    actorUserId: actor.user.id,
    adjustedAllocations: adjustedAllocations.length
      ? adjustedAllocations
      : undefined,
    adjustmentReason: getOptionalTrimmedString(formData, "adjustmentReason"),
    decision: getRequiredString(
      formData,
      "decision"
    ) as DashboardPaymentReceiptStatus,
    receiptId: getRequiredString(formData, "receiptId"),
    reviewNotes: getOptionalTrimmedString(formData, "reviewNotes"),
    tenantId: actor.tenant.id,
  })

  await sendPaymentReceiptStatusMemberEmail(actor, receipt)

  revalidatePath("/")
  revalidatePath("/payment-receipts")
  revalidatePath("/contributions")
  revalidatePath("/repayments")
  revalidatePath("/loans")
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
  revalidatePath("/getting-started")
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
  revalidatePath("/getting-started")
  revalidateMemberBackfillPaths(memberId)
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
  revalidatePath("/getting-started")
  revalidateMemberBackfillPaths(memberId)
}

export const dashboardActionInputSchema = z.object({
  fields: z.array(z.tuple([z.string(), z.string()])),
})

export type DashboardActionInput = z.infer<typeof dashboardActionInputSchema>

function formDataFromInput(input: DashboardActionInput) {
  const formData = new FormData()

  for (const [key, value] of input.fields) {
    formData.append(key, value)
  }

  return formData
}

function formAction<TResult>(
  handler: (formData: FormData) => Promise<TResult>
) {
  return authenticatedProcedure
    .input(dashboardActionInputSchema)
    .mutation(({ ctx, input }) =>
      runDashboardActionWithContext(ctx, () =>
        handler(formDataFromInput(input))
      )
    )
}

function noInputAction<TResult>(handler: () => Promise<TResult>) {
  return authenticatedProcedure.mutation(({ ctx }) =>
    runDashboardActionWithContext(ctx, handler)
  )
}

const dashboardActionHandlers = {
  createMemberAction,
  updateMemberAction,
  updateMemberStatusAction,
  sendMemberPortalAccessEmailAction,
  approveMemberOnboardingAction,
  rejectMemberOnboardingAction,
  updateMemberKycAction,
  createMemberDocumentAction,
  createOwnMemberDocumentAction,
  updateMemberDocumentReviewAction,
  recordContributionAction,
  setMemberContributionPlanAction,
  updateContributionPlanAction,
  closeContributionPlanAction,
  updateMemberPaymentAllocationPreferenceAction,
  recordMemberPaymentAction,
  createMonthlyRecordAction,
  updateMonthlyRecordSettingsAction,
  generateMonthlyRecordsNowAction,
  applyMonthlyRecordMemberAction,
  cancelMonthlyRecordMemberAction,
  stageCollectionSourceContributionBatchAction,
  updateCollectionSourceContributionBatchRowsAction,
  postCollectionSourceContributionBatchRowsAction,
  createChargeDefinitionAction,
  deleteChargeDefinitionAction,
  deleteChargeDefinitionVersionAction,
  createTenantShareStructureVersionAction,
  updateTenantShareStructureVersionAction,
  createChargeDefinitionVersionAction,
  updateChargeDefinitionVersionAction,
  updateTenantSharePolicyAction,
  updateTenantMigrationSetupAction,
  upsertTenantBroughtForwardSnapshotAction,
  updateTenantOperationProfileAction,
  createMemberShareApplicationAction,
  createOwnMemberShareApplicationAction,
  reviewMemberShareApplicationAction,
  updateTenantBusinessProfitPolicyAction,
  updateTenantFinancingPolicyAction,
  updateLoanProductSettingsAction,
  openMonthlyFinancingCycleAction,
  updateMonthlyFinancingCycleStatusAction,
  createShareBusinessAction,
  updateShareBusinessAction,
  createShareBusinessProfitEntryAction,
  updateShareBusinessProfitEntryAction,
  generateShareProfitAllocationsAction,
  generateHistoricalBackfillShareProfitAllocationsAction,
  publishShareProfitAllocationsAction,
  saveBusinessProfitMigrationWorksheetAction,
  saveBusinessProfitSeasonReviewAction,
  updateChargeDefinitionAction,
  applyChargeAction,
  waiveChargeApplicationAction,
  reverseChargeApplicationAction,
  submitLoanRequestAction,
  reviewLoanGuarantorApprovalAction,
  respondMemberLoanGuarantorApprovalAction,
  reviewLoanRequestAction,
  disburseLoanAction,
  postRepaymentAction,
  updateCooperativeProfileAction,
  updateTenantTrustProfileAction,
  updateTenantFinanceStartDateAction,
  finalizeInitialMigrationAction,
  unlockInitialMigrationAction,
  createMemberOpeningBalanceAction,
  createHistoricalMemberSharePurchaseAction,
  reviewMemberOpeningBalanceAction,
  cancelMemberOpeningBalanceAction,
  applyMemberOpeningBalanceAction,
  reverseMemberOpeningBalanceAction,
  createLegacyLoanMigrationDraftAction,
  updateLegacyLoanMigrationDraftAction,
  upsertMemberAmountLogAction,
  markLegacyLoansReviewedAction,
  markBusinessProfitPoolsReviewedAction,
  upsertMigrationBackfillAdjustmentAction,
  setMigrationBackfillDefaultingMonthsAction,
  upsertMemberActivityEventAction,
  deleteMemberActivityEventAction,
  upsertMigrationProfitAdjustmentAction,
  saveMemberProfitSeasonAdjustmentsAction,
  updateMemberSignupAccessModeAction,
  createMemberSignupLinkAction,
  updateMemberSignupLinkAction,
  toggleMemberSignupLinkAction,
  rotateMemberSignupLinkAction,
  createTenantDomainAction,
  setTenantDomainPrimaryAction,
  updateTenantDomainVerificationStatusAction,
  runTenantDomainVerificationCheckAction,
  provisionTenantUserRoleAction,
  saveNotificationPreferenceAction,
  refreshCollectionsStatusesAction,
  recordCollectionFollowUpAction,
  createSupportCaseAction,
  addSupportCaseMessageAction,
  createMemberSupportCaseAction,
  addMemberSupportCaseMessageAction,
  updateSupportCaseStatusAction,
  reviewSupportCaseFinancialAdjustmentAction,
  settleSupportCaseSpecialSavingsRefundAction,
  createFoodPurchaseCycleAction,
  submitFoodPurchaseApplicationAction,
  submitOwnFoodPurchaseApplicationAction,
  reviewFoodPurchaseApplicationAction,
  recordFoodPurchaseAccountingAction,
  reviewFoodPurchaseAccountingAction,
  createProcurementRequestAction,
  createOwnProcurementRequestAction,
  reviewProcurementRequestAction,
  recordProcurementPurchaseAction,
  createProjectFinancingRequestAction,
  createOwnProjectFinancingRequestAction,
  reviewProjectFinancingRequestAction,
  recordProjectFinancingDisbursementAction,
  createMemberPaymentReceiptAction,
  createOwnMemberPaymentReceiptAction,
  reviewMemberPaymentReceiptAction,
  importMembersCsvAction,
  importDeductionSourcesCsvAction,
  importLoanProductsCsvAction,
  importContributionsCsvAction,
  importChargesCsvAction,
  importLoanMigrationsCsvAction,
  importRepaymentMigrationsCsvAction,
  stageImportBatchAction,
  applyImportBatchAction,
  queueBackfillDraftAction,
  getBackfillPreviewAction,
  queueBackfillApplyAction,
}

export type DashboardActionHandlers = typeof dashboardActionHandlers
export type DashboardActionName = keyof DashboardActionHandlers
export type DashboardFormActionName = {
  [TName in DashboardActionName]: Parameters<
    DashboardActionHandlers[TName]
  > extends [FormData]
    ? TName
    : never
}[DashboardActionName]
export type DashboardNoInputActionName = Exclude<
  DashboardActionName,
  DashboardFormActionName
>

export const dashboardActionsRouter = createTRPCRouter({
  createMemberAction: formAction(dashboardActionHandlers.createMemberAction),
  updateMemberAction: formAction(dashboardActionHandlers.updateMemberAction),
  updateMemberStatusAction: formAction(
    dashboardActionHandlers.updateMemberStatusAction
  ),
  sendMemberPortalAccessEmailAction: formAction(
    dashboardActionHandlers.sendMemberPortalAccessEmailAction
  ),
  approveMemberOnboardingAction: formAction(
    dashboardActionHandlers.approveMemberOnboardingAction
  ),
  rejectMemberOnboardingAction: formAction(
    dashboardActionHandlers.rejectMemberOnboardingAction
  ),
  updateMemberKycAction: formAction(
    dashboardActionHandlers.updateMemberKycAction
  ),
  createMemberDocumentAction: formAction(
    dashboardActionHandlers.createMemberDocumentAction
  ),
  createOwnMemberDocumentAction: formAction(
    dashboardActionHandlers.createOwnMemberDocumentAction
  ),
  updateMemberDocumentReviewAction: formAction(
    dashboardActionHandlers.updateMemberDocumentReviewAction
  ),
  recordContributionAction: formAction(
    dashboardActionHandlers.recordContributionAction
  ),
  setMemberContributionPlanAction: formAction(
    dashboardActionHandlers.setMemberContributionPlanAction
  ),
  updateContributionPlanAction: formAction(
    dashboardActionHandlers.updateContributionPlanAction
  ),
  closeContributionPlanAction: formAction(
    dashboardActionHandlers.closeContributionPlanAction
  ),
  updateMemberPaymentAllocationPreferenceAction: formAction(
    dashboardActionHandlers.updateMemberPaymentAllocationPreferenceAction
  ),
  recordMemberPaymentAction: formAction(
    dashboardActionHandlers.recordMemberPaymentAction
  ),
  createMonthlyRecordAction: formAction(
    dashboardActionHandlers.createMonthlyRecordAction
  ),
  updateMonthlyRecordSettingsAction: formAction(
    dashboardActionHandlers.updateMonthlyRecordSettingsAction
  ),
  generateMonthlyRecordsNowAction: noInputAction(
    dashboardActionHandlers.generateMonthlyRecordsNowAction
  ),
  applyMonthlyRecordMemberAction: formAction(
    dashboardActionHandlers.applyMonthlyRecordMemberAction
  ),
  cancelMonthlyRecordMemberAction: formAction(
    dashboardActionHandlers.cancelMonthlyRecordMemberAction
  ),
  stageCollectionSourceContributionBatchAction: formAction(
    dashboardActionHandlers.stageCollectionSourceContributionBatchAction
  ),
  updateCollectionSourceContributionBatchRowsAction: formAction(
    dashboardActionHandlers.updateCollectionSourceContributionBatchRowsAction
  ),
  postCollectionSourceContributionBatchRowsAction: formAction(
    dashboardActionHandlers.postCollectionSourceContributionBatchRowsAction
  ),
  createChargeDefinitionAction: formAction(
    dashboardActionHandlers.createChargeDefinitionAction
  ),
  deleteChargeDefinitionAction: formAction(
    dashboardActionHandlers.deleteChargeDefinitionAction
  ),
  deleteChargeDefinitionVersionAction: formAction(
    dashboardActionHandlers.deleteChargeDefinitionVersionAction
  ),
  createTenantShareStructureVersionAction: formAction(
    dashboardActionHandlers.createTenantShareStructureVersionAction
  ),
  updateTenantShareStructureVersionAction: formAction(
    dashboardActionHandlers.updateTenantShareStructureVersionAction
  ),
  createChargeDefinitionVersionAction: formAction(
    dashboardActionHandlers.createChargeDefinitionVersionAction
  ),
  updateChargeDefinitionVersionAction: formAction(
    dashboardActionHandlers.updateChargeDefinitionVersionAction
  ),
  updateTenantSharePolicyAction: formAction(
    dashboardActionHandlers.updateTenantSharePolicyAction
  ),
  updateTenantMigrationSetupAction: formAction(
    dashboardActionHandlers.updateTenantMigrationSetupAction
  ),
  upsertTenantBroughtForwardSnapshotAction: formAction(
    dashboardActionHandlers.upsertTenantBroughtForwardSnapshotAction
  ),
  updateTenantOperationProfileAction: formAction(
    dashboardActionHandlers.updateTenantOperationProfileAction
  ),
  createMemberShareApplicationAction: formAction(
    dashboardActionHandlers.createMemberShareApplicationAction
  ),
  createOwnMemberShareApplicationAction: formAction(
    dashboardActionHandlers.createOwnMemberShareApplicationAction
  ),
  reviewMemberShareApplicationAction: formAction(
    dashboardActionHandlers.reviewMemberShareApplicationAction
  ),
  updateTenantBusinessProfitPolicyAction: formAction(
    dashboardActionHandlers.updateTenantBusinessProfitPolicyAction
  ),
  updateTenantFinancingPolicyAction: formAction(
    dashboardActionHandlers.updateTenantFinancingPolicyAction
  ),
  updateLoanProductSettingsAction: formAction(
    dashboardActionHandlers.updateLoanProductSettingsAction
  ),
  openMonthlyFinancingCycleAction: formAction(
    dashboardActionHandlers.openMonthlyFinancingCycleAction
  ),
  updateMonthlyFinancingCycleStatusAction: formAction(
    dashboardActionHandlers.updateMonthlyFinancingCycleStatusAction
  ),
  createShareBusinessAction: formAction(
    dashboardActionHandlers.createShareBusinessAction
  ),
  updateShareBusinessAction: formAction(
    dashboardActionHandlers.updateShareBusinessAction
  ),
  createShareBusinessProfitEntryAction: formAction(
    dashboardActionHandlers.createShareBusinessProfitEntryAction
  ),
  updateShareBusinessProfitEntryAction: formAction(
    dashboardActionHandlers.updateShareBusinessProfitEntryAction
  ),
  generateShareProfitAllocationsAction: formAction(
    dashboardActionHandlers.generateShareProfitAllocationsAction
  ),
  generateHistoricalBackfillShareProfitAllocationsAction: noInputAction(
    dashboardActionHandlers.generateHistoricalBackfillShareProfitAllocationsAction
  ),
  publishShareProfitAllocationsAction: formAction(
    dashboardActionHandlers.publishShareProfitAllocationsAction
  ),
  saveBusinessProfitMigrationWorksheetAction: formAction(
    dashboardActionHandlers.saveBusinessProfitMigrationWorksheetAction
  ),
  saveBusinessProfitSeasonReviewAction: formAction(
    dashboardActionHandlers.saveBusinessProfitSeasonReviewAction
  ),
  updateChargeDefinitionAction: formAction(
    dashboardActionHandlers.updateChargeDefinitionAction
  ),
  applyChargeAction: formAction(dashboardActionHandlers.applyChargeAction),
  waiveChargeApplicationAction: formAction(
    dashboardActionHandlers.waiveChargeApplicationAction
  ),
  reverseChargeApplicationAction: formAction(
    dashboardActionHandlers.reverseChargeApplicationAction
  ),
  submitLoanRequestAction: formAction(
    dashboardActionHandlers.submitLoanRequestAction
  ),
  reviewLoanRequestAction: formAction(
    dashboardActionHandlers.reviewLoanRequestAction
  ),
  reviewLoanGuarantorApprovalAction: formAction(
    dashboardActionHandlers.reviewLoanGuarantorApprovalAction
  ),
  respondMemberLoanGuarantorApprovalAction: formAction(
    dashboardActionHandlers.respondMemberLoanGuarantorApprovalAction
  ),
  disburseLoanAction: formAction(dashboardActionHandlers.disburseLoanAction),
  postRepaymentAction: formAction(dashboardActionHandlers.postRepaymentAction),
  updateCooperativeProfileAction: formAction(
    dashboardActionHandlers.updateCooperativeProfileAction
  ),
  updateTenantTrustProfileAction: formAction(
    dashboardActionHandlers.updateTenantTrustProfileAction
  ),
  updateTenantFinanceStartDateAction: formAction(
    dashboardActionHandlers.updateTenantFinanceStartDateAction
  ),
  finalizeInitialMigrationAction: formAction(
    dashboardActionHandlers.finalizeInitialMigrationAction
  ),
  unlockInitialMigrationAction: formAction(
    dashboardActionHandlers.unlockInitialMigrationAction
  ),
  createMemberOpeningBalanceAction: formAction(
    dashboardActionHandlers.createMemberOpeningBalanceAction
  ),
  createHistoricalMemberSharePurchaseAction: formAction(
    dashboardActionHandlers.createHistoricalMemberSharePurchaseAction
  ),
  reviewMemberOpeningBalanceAction: formAction(
    dashboardActionHandlers.reviewMemberOpeningBalanceAction
  ),
  cancelMemberOpeningBalanceAction: formAction(
    dashboardActionHandlers.cancelMemberOpeningBalanceAction
  ),
  applyMemberOpeningBalanceAction: formAction(
    dashboardActionHandlers.applyMemberOpeningBalanceAction
  ),
  reverseMemberOpeningBalanceAction: formAction(
    dashboardActionHandlers.reverseMemberOpeningBalanceAction
  ),
  createLegacyLoanMigrationDraftAction: formAction(
    dashboardActionHandlers.createLegacyLoanMigrationDraftAction
  ),
  updateLegacyLoanMigrationDraftAction: formAction(
    dashboardActionHandlers.updateLegacyLoanMigrationDraftAction
  ),
  upsertMemberAmountLogAction: formAction(
    dashboardActionHandlers.upsertMemberAmountLogAction
  ),
  markLegacyLoansReviewedAction: formAction(
    dashboardActionHandlers.markLegacyLoansReviewedAction
  ),
  markBusinessProfitPoolsReviewedAction: formAction(
    dashboardActionHandlers.markBusinessProfitPoolsReviewedAction
  ),
  upsertMigrationBackfillAdjustmentAction: formAction(
    dashboardActionHandlers.upsertMigrationBackfillAdjustmentAction
  ),
  setMigrationBackfillDefaultingMonthsAction: formAction(
    dashboardActionHandlers.setMigrationBackfillDefaultingMonthsAction
  ),
  upsertMemberActivityEventAction: formAction(
    dashboardActionHandlers.upsertMemberActivityEventAction
  ),
  deleteMemberActivityEventAction: formAction(
    dashboardActionHandlers.deleteMemberActivityEventAction
  ),
  upsertMigrationProfitAdjustmentAction: formAction(
    dashboardActionHandlers.upsertMigrationProfitAdjustmentAction
  ),
  saveMemberProfitSeasonAdjustmentsAction: formAction(
    dashboardActionHandlers.saveMemberProfitSeasonAdjustmentsAction
  ),
  updateMemberSignupAccessModeAction: formAction(
    dashboardActionHandlers.updateMemberSignupAccessModeAction
  ),
  createMemberSignupLinkAction: formAction(
    dashboardActionHandlers.createMemberSignupLinkAction
  ),
  updateMemberSignupLinkAction: formAction(
    dashboardActionHandlers.updateMemberSignupLinkAction
  ),
  toggleMemberSignupLinkAction: formAction(
    dashboardActionHandlers.toggleMemberSignupLinkAction
  ),
  rotateMemberSignupLinkAction: formAction(
    dashboardActionHandlers.rotateMemberSignupLinkAction
  ),
  createTenantDomainAction: formAction(
    dashboardActionHandlers.createTenantDomainAction
  ),
  setTenantDomainPrimaryAction: formAction(
    dashboardActionHandlers.setTenantDomainPrimaryAction
  ),
  updateTenantDomainVerificationStatusAction: formAction(
    dashboardActionHandlers.updateTenantDomainVerificationStatusAction
  ),
  runTenantDomainVerificationCheckAction: formAction(
    dashboardActionHandlers.runTenantDomainVerificationCheckAction
  ),
  provisionTenantUserRoleAction: formAction(
    dashboardActionHandlers.provisionTenantUserRoleAction
  ),
  saveNotificationPreferenceAction: formAction(
    dashboardActionHandlers.saveNotificationPreferenceAction
  ),
  refreshCollectionsStatusesAction: noInputAction(
    dashboardActionHandlers.refreshCollectionsStatusesAction
  ),
  recordCollectionFollowUpAction: formAction(
    dashboardActionHandlers.recordCollectionFollowUpAction
  ),
  createSupportCaseAction: formAction(
    dashboardActionHandlers.createSupportCaseAction
  ),
  addSupportCaseMessageAction: formAction(
    dashboardActionHandlers.addSupportCaseMessageAction
  ),
  createMemberSupportCaseAction: formAction(
    dashboardActionHandlers.createMemberSupportCaseAction
  ),
  addMemberSupportCaseMessageAction: formAction(
    dashboardActionHandlers.addMemberSupportCaseMessageAction
  ),
  updateSupportCaseStatusAction: formAction(
    dashboardActionHandlers.updateSupportCaseStatusAction
  ),
  reviewSupportCaseFinancialAdjustmentAction: formAction(
    dashboardActionHandlers.reviewSupportCaseFinancialAdjustmentAction
  ),
  settleSupportCaseSpecialSavingsRefundAction: formAction(
    dashboardActionHandlers.settleSupportCaseSpecialSavingsRefundAction
  ),
  createFoodPurchaseCycleAction: formAction(
    dashboardActionHandlers.createFoodPurchaseCycleAction
  ),
  submitFoodPurchaseApplicationAction: formAction(
    dashboardActionHandlers.submitFoodPurchaseApplicationAction
  ),
  submitOwnFoodPurchaseApplicationAction: formAction(
    dashboardActionHandlers.submitOwnFoodPurchaseApplicationAction
  ),
  reviewFoodPurchaseApplicationAction: formAction(
    dashboardActionHandlers.reviewFoodPurchaseApplicationAction
  ),
  recordFoodPurchaseAccountingAction: formAction(
    dashboardActionHandlers.recordFoodPurchaseAccountingAction
  ),
  reviewFoodPurchaseAccountingAction: formAction(
    dashboardActionHandlers.reviewFoodPurchaseAccountingAction
  ),
  createProcurementRequestAction: formAction(
    dashboardActionHandlers.createProcurementRequestAction
  ),
  createOwnProcurementRequestAction: formAction(
    dashboardActionHandlers.createOwnProcurementRequestAction
  ),
  reviewProcurementRequestAction: formAction(
    dashboardActionHandlers.reviewProcurementRequestAction
  ),
  recordProcurementPurchaseAction: formAction(
    dashboardActionHandlers.recordProcurementPurchaseAction
  ),
  createProjectFinancingRequestAction: formAction(
    dashboardActionHandlers.createProjectFinancingRequestAction
  ),
  createOwnProjectFinancingRequestAction: formAction(
    dashboardActionHandlers.createOwnProjectFinancingRequestAction
  ),
  reviewProjectFinancingRequestAction: formAction(
    dashboardActionHandlers.reviewProjectFinancingRequestAction
  ),
  recordProjectFinancingDisbursementAction: formAction(
    dashboardActionHandlers.recordProjectFinancingDisbursementAction
  ),
  createMemberPaymentReceiptAction: formAction(
    dashboardActionHandlers.createMemberPaymentReceiptAction
  ),
  createOwnMemberPaymentReceiptAction: formAction(
    dashboardActionHandlers.createOwnMemberPaymentReceiptAction
  ),
  reviewMemberPaymentReceiptAction: formAction(
    dashboardActionHandlers.reviewMemberPaymentReceiptAction
  ),
  importMembersCsvAction: formAction(
    dashboardActionHandlers.importMembersCsvAction
  ),
  importDeductionSourcesCsvAction: formAction(
    dashboardActionHandlers.importDeductionSourcesCsvAction
  ),
  importLoanProductsCsvAction: formAction(
    dashboardActionHandlers.importLoanProductsCsvAction
  ),
  importContributionsCsvAction: formAction(
    dashboardActionHandlers.importContributionsCsvAction
  ),
  importChargesCsvAction: formAction(
    dashboardActionHandlers.importChargesCsvAction
  ),
  importLoanMigrationsCsvAction: formAction(
    dashboardActionHandlers.importLoanMigrationsCsvAction
  ),
  importRepaymentMigrationsCsvAction: formAction(
    dashboardActionHandlers.importRepaymentMigrationsCsvAction
  ),
  stageImportBatchAction: formAction(
    dashboardActionHandlers.stageImportBatchAction
  ),
  applyImportBatchAction: formAction(
    dashboardActionHandlers.applyImportBatchAction
  ),
  queueBackfillDraftAction: formAction(
    dashboardActionHandlers.queueBackfillDraftAction
  ),
  getBackfillPreviewAction: formAction(
    dashboardActionHandlers.getBackfillPreviewAction
  ),
  queueBackfillApplyAction: formAction(
    dashboardActionHandlers.queueBackfillApplyAction
  ),
})
