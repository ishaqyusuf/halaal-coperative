import { ExpectedQueryError } from "../query-error"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import {
  accountDeletionNoticeCopy,
  privacyRequestDueAt,
} from "@halaalvest/domain/account-privacy-notice"
import { publicPolicies } from "@halaalvest/domain/public-policies"
import { createPrismaClient } from "../prisma"

export function accountDeletionNoticeVersion(input: {
  inApp: { scope: string; consequences: readonly string[] }
  publicDeletionPolicy: unknown
}) {
  return `notice-sha256-${createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")}`
}
export const ACCOUNT_DELETION_NOTICE_VERSION = accountDeletionNoticeVersion({
  inApp: accountDeletionNoticeCopy,
  publicDeletionPolicy: publicPolicies["delete-account"],
})
export const PRIVACY_PROCESSING_CATEGORIES = [
  "member_profile_documents",
  "shared_financial_records",
  "support_notifications_audit",
  "private_uploads",
  "legal_store_records",
  "external_processors_backups",
  "completion_contact",
] as const
export type PrivacyProcessingCategory =
  (typeof PRIVACY_PROCESSING_CATEGORIES)[number]
type PrivacyProcessingNote = {
  category: PrivacyProcessingCategory
  evidence: string
  recordedAt: string
  recordedByUserId: string
}
function processingNotes(
  value: Prisma.JsonValue | null
): PrivacyProcessingNote[] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw conflict("Privacy processing evidence needs operator review.")
  const notes = value.processingNotes
  if (notes === undefined) return []
  if (!Array.isArray(notes))
    throw conflict("Privacy processing evidence needs operator review.")
  return notes.map((note) => {
    if (
      !note ||
      typeof note !== "object" ||
      Array.isArray(note) ||
      !PRIVACY_PROCESSING_CATEGORIES.includes(
        note.category as PrivacyProcessingCategory
      ) ||
      typeof note.evidence !== "string" ||
      typeof note.recordedAt !== "string" ||
      typeof note.recordedByUserId !== "string"
    )
      throw conflict("Privacy processing evidence needs operator review.")
    return {
      category: note.category as PrivacyProcessingCategory,
      evidence: note.evidence,
      recordedAt: note.recordedAt,
      recordedByUserId: note.recordedByUserId,
    }
  })
}
function conflict(message: string) {
  return new AppError({ code: "PRECONDITION_FAILED", publicMessage: message })
}
function client(override?: PrismaClient) {
  const db = override ?? createPrismaClient()
  if (!db) throw conflict("Privacy requests are temporarily unavailable.")
  return db
}
const publicSelection = {
  id: true,
  supportCaseId: true,
  status: true,
  noticeVersion: true,
  requestedAt: true,
  verifiedAt: true,
  accessRevokedAt: true,
  completionSummary: true,
  completedAt: true,
  updatedAt: true,
} as const

async function serializable<T>(
  db: PrismaClient,
  action: (tx: Prisma.TransactionClient) => Promise<T>
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(action, { isolationLevel: "Serializable" })
    } catch (error) {
      if (
        attempt < 2 &&
        error &&
        typeof error === "object" &&
        "code" in error &&
        ["P2034", "P2002"].includes(String(error.code))
      )
        continue
      throw error
    }
  }
}
type AccountDeletionInput = {
  tenantId: string
  userId: string
  idempotencyKey: string
  noticeVersion: string
  source?: "signed_in" | "verified_email"
  verifiedEmail?: string
}
function assertDeletionNotice(version: string) {
  if (version !== ACCOUNT_DELETION_NOTICE_VERSION)
    throw conflict(
      "The deletion notice changed. Refresh and review it before submitting."
    )
}
async function requestAccountDeletionInTransaction(
  tx: Prisma.TransactionClient,
  input: AccountDeletionInput
) {
  const user = await tx.user.findFirst({
    where: {
      id: input.userId,
      deletedAt: null,
      ...(input.verifiedEmail ? { email: input.verifiedEmail } : {}),
      memberships: { some: { tenantId: input.tenantId } },
    },
    include: { memberProfile: { select: { id: true, tenantId: true } } },
  })
  if (!user)
    throw conflict("Sign in to your account before requesting deletion.")
  const prior = await tx.accountPrivacyRequest.findFirst({
    where: {
      userId: input.userId,
      OR: [
        { idempotencyKey: input.idempotencyKey },
        {
          status: {
            in: ["submitted", "verified", "awaiting_information", "processing"],
          },
        },
      ],
    },
    orderBy: { requestedAt: "desc" },
    select: publicSelection,
  })
  if (prior) return prior
  const description =
    input.source === "verified_email"
      ? "Account deletion requested through a verified email link. Email control has been checked, but an operator must still verify identity and scope, review ownership handover and retention, then process the request. Closing this case does not complete erasure or settle financial obligations or cancel store subscriptions."
      : "Account and associated personal-data deletion requested by the signed-in account holder. Verify identity and scope, review ownership handover and retention, then process through the platform privacy workflow. Closing this support case does not complete erasure. This request does not settle financial obligations or cancel store subscriptions."
  const support = await tx.supportCase.create({
    data: {
      tenantId: input.tenantId,
      openedByUserId: input.userId,
      memberId:
        user.memberProfile?.tenantId === input.tenantId
          ? user.memberProfile.id
          : null,
      category: "account_update",
      subject: "Account deletion and privacy request",
      description,
      messages: {
        create: {
          tenantId: input.tenantId,
          authorUserId: input.userId,
          authorType: "system",
          message: description,
        },
      },
    },
  })
  const request = await tx.accountPrivacyRequest.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      supportCaseId: support.id,
      idempotencyKey: input.idempotencyKey,
      noticeVersion: input.noticeVersion,
    },
    select: publicSelection,
  })
  await tx.auditLog.create({
    data: {
      tenantId: input.tenantId,
      actorType: input.source === "verified_email" ? "system" : "user",
      actorUserId: input.source === "verified_email" ? null : input.userId,
      action: "privacy.deletion_requested",
      entityType: "account_privacy_request",
      entityId: request.id,
      metadata: {
        noticeVersion: input.noticeVersion,
        supportCaseId: support.id,
        source: input.source ?? "signed_in",
      },
      occurredAt: new Date(),
    },
  })
  return request
}
export async function requestAccountDeletion(
  input: AccountDeletionInput,
  override?: PrismaClient
) {
  assertDeletionNotice(input.noticeVersion)
  const db = client(override)
  return serializable(db, (tx) =>
    requestAccountDeletionInTransaction(tx, input)
  )
}
export function listOwnPrivacyRequests(
  userId: string,
  override?: PrismaClient
) {
  return client(override).accountPrivacyRequest.findMany({
    where: { userId },
    select: publicSelection,
    orderBy: { requestedAt: "desc" },
    take: 20,
  })
}
export async function cancelOwnPrivacyRequest(
  input: { userId: string; requestId: string },
  override?: PrismaClient
) {
  const db = client(override)
  return serializable(db, async (tx) => {
    const request = await tx.accountPrivacyRequest.findFirst({
      where: {
        id: input.requestId,
        userId: input.userId,
        accessRevokedAt: null,
        status: { in: ["submitted", "verified", "awaiting_information"] },
      },
    })
    if (!request?.tenantId)
      throw conflict(
        "This request can no longer be cancelled in the app. Contact privacy support."
      )
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: { status: "cancelled" },
    })
    if (request.supportCaseId)
      await tx.supportCaseMessage.create({
        data: {
          tenantId: request.tenantId,
          supportCaseId: request.supportCaseId,
          authorUserId: input.userId,
          authorType: "system",
          message:
            "The account holder cancelled the privacy request before processing.",
        },
      })
    await tx.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorType: "user",
        actorUserId: input.userId,
        action: "privacy.deletion_cancelled",
        entityType: "account_privacy_request",
        entityId: request.id,
        occurredAt: new Date(),
      },
    })
    return { cancelled: true }
  })
}
async function requirePrivacyOperator(
  tx: Prisma.TransactionClient,
  actorUserId: string
) {
  const actor = await tx.user.findFirst({
    where: { id: actorUserId, isPlatformOwner: true, deletedAt: null },
    select: { id: true },
  })
  if (!actor) throw conflict("Platform privacy operator access is required.")
}
const privacyQueuePageSize = 50
function parsePrivacyQueueCursor(cursor: string | null | undefined) {
  if (!cursor) return null
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString()
    )
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[0] !== "string" ||
      typeof parsed[1] !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(parsed[0]) ||
      !Number.isFinite(Date.parse(parsed[0])) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        parsed[1]
      )
    )
      throw ExpectedQueryError.validation("Invalid cursor")
    return { requestedAt: new Date(parsed[0]), id: parsed[1] }
  } catch {
    throw conflict("Refresh the privacy queue and try again.")
  }
}
export async function listPrivacyQueue(
  input: { actorUserId: string; cursor?: string | null },
  override?: PrismaClient
) {
  const db = client(override)
  await requirePrivacyOperator(db, input.actorUserId)
  const cursor = parsePrivacyQueueCursor(input.cursor)
  const rows = await db.accountPrivacyRequest.findMany({
    where: {
      status: { notIn: ["completed", "cancelled", "rejected"] },
      ...(cursor
        ? {
            OR: [
              { requestedAt: { gt: cursor.requestedAt } },
              { requestedAt: cursor.requestedAt, id: { gt: cursor.id } },
            ],
          }
        : {}),
    },
    // List columns only: evidence stays in the one-request read below.
    select: {
      id: true,
      status: true,
      requestedAt: true,
      verifiedAt: true,
      accessRevokedAt: true,
      tenant: { select: { name: true } },
      user: { select: { email: true, fullName: true } },
    },
    orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
    take: privacyQueuePageSize + 1,
  })
  const data = rows.slice(0, privacyQueuePageSize)
  const last = data.at(-1)
  return {
    data,
    meta: {
      cursor:
        rows.length > privacyQueuePageSize && last
          ? Buffer.from(
              JSON.stringify([last.requestedAt.toISOString(), last.id])
            ).toString("base64url")
          : null,
    },
  }
}
/** One privacy request for the operator's details sheet (2 statements). */
export async function getPrivacyRequestForOperator(
  input: { actorUserId: string; requestId: string },
  override?: PrismaClient
) {
  const db = client(override)
  await requirePrivacyOperator(db, input.actorUserId)
  const request = await db.accountPrivacyRequest.findUnique({
    where: { id: input.requestId },
    select: {
      ...publicSelection,
      tenantId: true,
      tenant: { select: { name: true } },
      user: { select: { email: true, fullName: true } },
      verificationEvidence: true,
    },
  })
  if (!request) throw ExpectedQueryError.notFound("Privacy request not found.")
  return request
}
export async function getPrivacyProcessingInventory(
  input: { actorUserId: string; requestId: string },
  override?: PrismaClient
) {
  const db = client(override)
  await requirePrivacyOperator(db, input.actorUserId)
  const request = await db.accountPrivacyRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      userId: true,
      status: true,
      accessRevokedAt: true,
      processingEvidence: true,
    },
  })
  if (
    !request?.userId ||
    !["processing", "completed"].includes(request.status) ||
    !request.accessRevokedAt
  )
    throw conflict("This request is not ready for processing inventory.")

  const userId = request.userId
  const [
    memberProfiles,
    memberDocuments,
    onboardingRequests,
    onboardingApprovals,
    signupLinksCreated,
    importBatchesCreated,
    memberActivityEventsCreated,
    offlineSyncEventsCreated,
    operationProfilesReviewed,
    savingsWithdrawalsProcessed,
    collectionBatchesCreated,
    collectionBatchesPosted,
    paymentReceiptsSubmitted,
    paymentReceiptsReviewed,
    loanRequestsCreated,
    loanApprovalsActed,
    guarantorApprovalsRequested,
    guarantorApprovalsResponded,
    collectionFollowUpsActed,
    collectionFollowUpsAssigned,
    repaymentsReceived,
    foodCyclesReleased,
    foodCyclesAccountingSubmitted,
    foodApplicationsSubmitted,
    foodApplicationsReviewed,
    foodApplicationsGoodsReleased,
    procurementRequestsCreated,
    procurementRequestsReviewed,
    procurementRequestsPurchased,
    projectFinancingRequestsCreated,
    projectFinancingRequestsReviewed,
    projectFinancingRequestsDisbursed,
    monthlyRecordsCreated,
    shareStructureVersionsCreated,
    shareOverridesCreated,
    memberAmountLogsCreated,
    chargeVersionsCreated,
    legacyLoanDraftsCreated,
    migrationAdjustmentsCreated,
    openingBalancesCreated,
    openingBalancesReviewed,
    openingBalancesApplied,
    openingBalancesReversed,
    backfillBatchesCreated,
    backfillBatchesUpdated,
    appliedBackfillMonthsApplied,
    backfillActivitiesCreated,
    shareBusinessesCreated,
    shareProfitEntriesCreated,
    migrationProfitAdjustmentsCreated,
    shareLedgerEntriesCreated,
    historicalSharePurchasesCreated,
    shareApplicationsRequested,
    shareApplicationsReviewed,
    tenantMigrationsFinalized,
    tenantEmergencyUnlocks,
    tenantTrustReviews,
    qaPurgeRunsRequested,
    qaCredentialsCreated,
    memberships,
    supportCases,
    supportCasesAssigned,
    supportCasesMember,
    supportCasesAdjustmentApproved,
    supportMessages,
    activeEvidenceUploads,
    legalAcceptances,
    subscriptionCheckoutIntents,
    mobileAppAccessPurchases,
    mobileAppReviewGrants,
    mobileAppAccessProviderEvents,
    cooperativeMobileAccessTerms,
    cooperativeMobileInvoiceItems,
    privacyRequests,
    privacyRequestsVerified,
    remainingAuthChallenges,
    remainingMobileSessions,
    mobileSessionsRevoked,
    remainingPushRegistrations,
    remainingNotificationPreferences,
    auditEntries,
    memberContributions,
    memberPaymentReceipts,
    memberFinancingRequests,
    memberLoans,
    memberRepayments,
    assistantConversations,
    assistantProposalsActed,
    assistantChannelChallenges,
    assistantChannelLinks,
    mobileAccessTermsAccepted,
    platformBillingSettingsUpdated,
    platformBillFundingChosen,
    profitPayoutsPaid,
    profitPayoutsReversed,
  ] = await Promise.all([
    db.member.count({ where: { userId } }),
    db.memberDocument.count({ where: { member: { userId } } }),
    db.memberOnboardingRequest.count({ where: { userId } }),
    db.memberOnboardingRequest.count({ where: { approvedByUserId: userId } }),
    db.memberSignupLink.count({ where: { createdByUserId: userId } }),
    db.importBatch.count({ where: { createdByUserId: userId } }),
    db.memberActivityEvent.count({ where: { createdByUserId: userId } }),
    db.offlineSyncEvent.count({ where: { createdByUserId: userId } }),
    db.tenantOperationProfile.count({ where: { reviewedByUserId: userId } }),
    db.memberSpecialSavingsWithdrawal.count({
      where: { processedByUserId: userId },
    }),
    db.collectionSourceContributionBatch.count({
      where: { createdByUserId: userId },
    }),
    db.collectionSourceContributionBatch.count({
      where: { postedByUserId: userId },
    }),
    db.memberPaymentReceipt.count({ where: { submittedByUserId: userId } }),
    db.memberPaymentReceipt.count({ where: { reviewedByUserId: userId } }),
    db.loanRequest.count({ where: { createdByUserId: userId } }),
    db.loanApproval.count({ where: { actorUserId: userId } }),
    db.loanGuarantorApproval.count({ where: { requestedByUserId: userId } }),
    db.loanGuarantorApproval.count({ where: { respondedByUserId: userId } }),
    db.collectionFollowUp.count({ where: { actorUserId: userId } }),
    db.collectionFollowUp.count({ where: { assignedToUserId: userId } }),
    db.repayment.count({ where: { receivedByUserId: userId } }),
    db.foodPurchaseCycle.count({ where: { releasedByUserId: userId } }),
    db.foodPurchaseCycle.count({
      where: { accountingSubmittedByUserId: userId },
    }),
    db.foodPurchaseApplication.count({
      where: { submittedByUserId: userId },
    }),
    db.foodPurchaseApplication.count({ where: { reviewedByUserId: userId } }),
    db.foodPurchaseApplication.count({
      where: { goodsReleasedByUserId: userId },
    }),
    db.procurementRequest.count({ where: { createdByUserId: userId } }),
    db.procurementRequest.count({ where: { reviewedByUserId: userId } }),
    db.procurementRequest.count({ where: { purchasedByUserId: userId } }),
    db.projectFinancingRequest.count({ where: { createdByUserId: userId } }),
    db.projectFinancingRequest.count({ where: { reviewedByUserId: userId } }),
    db.projectFinancingRequest.count({ where: { disbursedByUserId: userId } }),
    db.monthlyRecord.count({ where: { createdByUserId: userId } }),
    db.tenantShareStructureVersion.count({
      where: { createdByUserId: userId },
    }),
    db.memberShareOverride.count({ where: { createdByUserId: userId } }),
    db.memberAmountLog.count({ where: { createdByUserId: userId } }),
    db.chargeDefinitionVersion.count({ where: { createdByUserId: userId } }),
    db.legacyLoanMigrationDraft.count({ where: { createdByUserId: userId } }),
    db.migrationBackfillAdjustment.count({
      where: { createdByUserId: userId },
    }),
    db.memberOpeningBalance.count({ where: { createdByUserId: userId } }),
    db.memberOpeningBalance.count({ where: { reviewedByUserId: userId } }),
    db.memberOpeningBalance.count({ where: { appliedByUserId: userId } }),
    db.memberOpeningBalance.count({ where: { reversedByUserId: userId } }),
    db.backfillBatch.count({ where: { createdByUserId: userId } }),
    db.backfillBatch.count({ where: { updatedByUserId: userId } }),
    db.appliedBackfillMonth.count({ where: { appliedByUserId: userId } }),
    db.backfillActivity.count({ where: { createdByUserId: userId } }),
    db.shareBusiness.count({ where: { createdByUserId: userId } }),
    db.shareBusinessProfitEntry.count({ where: { createdByUserId: userId } }),
    db.migrationProfitAdjustment.count({
      where: { createdByUserId: userId },
    }),
    db.memberShareLedgerEntry.count({ where: { createdByUserId: userId } }),
    db.historicalMemberSharePurchase.count({
      where: { createdByUserId: userId },
    }),
    db.memberShareApplication.count({ where: { requestedByUserId: userId } }),
    db.memberShareApplication.count({ where: { reviewedByUserId: userId } }),
    db.tenant.count({ where: { migrationFinalizedByUserId: userId } }),
    db.tenant.count({
      where: { migrationEmergencyUnlockedByUserId: userId },
    }),
    db.tenant.count({ where: { trustReviewedByUserId: userId } }),
    db.qaPurgeRun.count({ where: { requestedByUserId: userId } }),
    db.qaTesterCredential.count({ where: { createdByUserId: userId } }),
    db.membership.count({ where: { userId } }),
    db.supportCase.count({ where: { openedByUserId: userId } }),
    db.supportCase.count({ where: { assignedToUserId: userId } }),
    db.supportCase.count({ where: { member: { userId } } }),
    db.supportCase.count({
      where: { financialAdjustmentApprovedByUserId: userId },
    }),
    db.supportCaseMessage.count({ where: { authorUserId: userId } }),
    db.dashboardEvidenceUpload.count({
      where: { uploaderUserId: userId, status: { not: "deleted" } },
    }),
    db.legalAcceptance.count({ where: { userId } }),
    db.subscriptionCheckoutIntent.count({
      where: { requestedByUserId: userId },
    }),
    db.mobileAppAccessPurchase.count({ where: { userId } }),
    db.mobileAppReviewGrant.count({ where: { userId } }),
    db.mobileAppAccessProviderEvent.count({
      where: { purchase: { userId } },
    }),
    db.cooperativeMobileAccessTerm.count({ where: { member: { userId } } }),
    db.cooperativeMobileInvoiceItem.count({
      where: { term: { member: { userId } } },
    }),
    db.accountPrivacyRequest.count({ where: { userId } }),
    db.accountPrivacyRequest.count({ where: { verifiedByUserId: userId } }),
    db.authChallenge.count({ where: { userId } }),
    db.mobileDeviceSession.count({ where: { userId } }),
    db.mobileDeviceSession.count({ where: { revokedByUserId: userId } }),
    db.mobilePushRegistration.count({ where: { userId } }),
    db.mobileUserNotificationPreference.count({ where: { userId } }),
    db.auditLog.count({ where: { actorUserId: userId } }),
    db.contribution.count({ where: { member: { userId } } }),
    db.memberPaymentReceipt.count({ where: { member: { userId } } }),
    db.loanRequest.count({ where: { member: { userId } } }),
    db.loan.count({ where: { member: { userId } } }),
    db.repayment.count({ where: { member: { userId } } }),
    db.assistantConversation.count({ where: { userId } }),
    db.assistantProposal.count({ where: { actorUserId: userId } }),
    db.assistantChannelChallenge.count({ where: { userId } }),
    db.assistantChannelLink.count({ where: { userId } }),
    db.cooperativeMobileAccessTerm.count({
      where: { acceptedByUserId: userId },
    }),
    db.tenantPlatformBillingSetting.count({
      where: { updatedByUserId: userId },
    }),
    db.platformBill.count({ where: { fundingChosenByUserId: userId } }),
    db.profitPayout.count({ where: { paidByUserId: userId } }),
    db.profitPayout.count({ where: { reversedByUserId: userId } }),
  ])
  return {
    requestId: request.id,
    counts: {
      memberProfiles,
      memberDocuments,
      onboardingRequests,
      onboardingApprovals,
      signupLinksCreated,
      importBatchesCreated,
      memberActivityEventsCreated,
      offlineSyncEventsCreated,
      operationProfilesReviewed,
      savingsWithdrawalsProcessed,
      collectionBatchesCreated,
      collectionBatchesPosted,
      paymentReceiptsSubmitted,
      paymentReceiptsReviewed,
      loanRequestsCreated,
      loanApprovalsActed,
      guarantorApprovalsRequested,
      guarantorApprovalsResponded,
      collectionFollowUpsActed,
      collectionFollowUpsAssigned,
      repaymentsReceived,
      foodCyclesReleased,
      foodCyclesAccountingSubmitted,
      foodApplicationsSubmitted,
      foodApplicationsReviewed,
      foodApplicationsGoodsReleased,
      procurementRequestsCreated,
      procurementRequestsReviewed,
      procurementRequestsPurchased,
      projectFinancingRequestsCreated,
      projectFinancingRequestsReviewed,
      projectFinancingRequestsDisbursed,
      monthlyRecordsCreated,
      shareStructureVersionsCreated,
      shareOverridesCreated,
      memberAmountLogsCreated,
      chargeVersionsCreated,
      legacyLoanDraftsCreated,
      migrationAdjustmentsCreated,
      openingBalancesCreated,
      openingBalancesReviewed,
      openingBalancesApplied,
      openingBalancesReversed,
      backfillBatchesCreated,
      backfillBatchesUpdated,
      appliedBackfillMonthsApplied,
      backfillActivitiesCreated,
      shareBusinessesCreated,
      shareProfitEntriesCreated,
      migrationProfitAdjustmentsCreated,
      shareLedgerEntriesCreated,
      historicalSharePurchasesCreated,
      shareApplicationsRequested,
      shareApplicationsReviewed,
      tenantMigrationsFinalized,
      tenantEmergencyUnlocks,
      tenantTrustReviews,
      qaPurgeRunsRequested,
      qaCredentialsCreated,
      memberships,
      supportCases,
      supportCasesAssigned,
      supportCasesMember,
      supportCasesAdjustmentApproved,
      supportMessages,
      activeEvidenceUploads,
      legalAcceptances,
      subscriptionCheckoutIntents,
      mobileAppAccessPurchases,
      mobileAppReviewGrants,
      mobileAppAccessProviderEvents,
      cooperativeMobileAccessTerms,
      cooperativeMobileInvoiceItems,
      privacyRequests,
      privacyRequestsVerified,
      remainingAuthChallenges,
      remainingMobileSessions,
      mobileSessionsRevoked,
      remainingPushRegistrations,
      remainingNotificationPreferences,
      auditEntries,
      memberContributions,
      memberPaymentReceipts,
      memberFinancingRequests,
      memberLoans,
      memberRepayments,
      assistantConversations,
      assistantProposalsActed,
      assistantChannelChallenges,
      assistantChannelLinks,
      mobileAccessTermsAccepted,
      platformBillingSettingsUpdated,
      platformBillFundingChosen,
      profitPayoutsPaid,
      profitPayoutsReversed,
    },
    ...privacyCompletionState(request.processingEvidence),
    notes: processingNotes(request.processingEvidence),
  }
}
/** Where the completion steps stand, read from the request's evidence. */
function privacyCompletionState(value: Prisma.JsonValue | null) {
  const evidence =
    value && typeof value === "object" && !Array.isArray(value) ? value : {}
  const notes = processingNotes(value)
  const notice = evidence.completionNotification
  return {
    externalProcessorsReviewed: notes.some(
      (note) => note.category === "external_processors_backups"
    ),
    sharedRecordsReviewed:
      evidence.sharedFinancialRecords === "kept_with_name_only",
    erasureComplete: evidence.personalDetails === "erased",
    retentionSummary:
      typeof evidence.retentionSummary === "string"
        ? evidence.retentionSummary
        : null,
    completionNotification:
      notice === "email_sent" ||
      notice === "operator_recorded" ||
      notice === "failed"
        ? notice
        : ("pending" as const),
  }
}
export async function recordPrivacyProcessingNote(
  input: {
    actorUserId: string
    requestId: string
    category: PrivacyProcessingCategory
    evidence: string
  },
  override?: PrismaClient
) {
  const evidence = input.evidence.trim()
  if (
    !PRIVACY_PROCESSING_CATEGORIES.includes(input.category) ||
    evidence.length < 20 ||
    evidence.length > 2000
  )
    throw conflict(
      "Choose a category and record 20–2000 characters of processing evidence."
    )
  const db = client(override)
  return serializable(db, async (tx) => {
    await requirePrivacyOperator(tx, input.actorUserId)
    const request = await tx.accountPrivacyRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        accessRevokedAt: true,
        processingEvidence: true,
      },
    })
    if (
      !request?.tenantId ||
      request.status !== "processing" ||
      !request.accessRevokedAt
    )
      throw conflict("This request is not ready for processing evidence.")
    const notes = processingNotes(request.processingEvidence)
    if (notes.length >= 100)
      throw conflict(
        "This request's processing evidence needs operator review."
      )
    const now = new Date()
    const note: PrivacyProcessingNote = {
      category: input.category,
      evidence,
      recordedAt: now.toISOString(),
      recordedByUserId: input.actorUserId,
    }
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: {
        processingEvidence: {
          ...(request.processingEvidence as Prisma.JsonObject),
          processingNotes: [...notes, note],
        },
      },
    })
    await tx.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorType: "user",
        actorUserId: input.actorUserId,
        action: "privacy.processing_evidence_recorded",
        entityType: "account_privacy_request",
        entityId: request.id,
        metadata: { category: input.category },
        occurredAt: now,
      },
    })
    return {
      recorded: true,
      erasureComplete: false,
      noteCount: notes.length + 1,
    }
  })
}
export async function verifyPrivacyRequest(
  input: {
    actorUserId: string
    requestId: string
    verificationEvidence: string
  },
  override?: PrismaClient
) {
  const evidence = input.verificationEvidence.trim()
  if (evidence.length < 20 || evidence.length > 2000)
    throw conflict(
      "Record the identity and scope verification evidence before continuing."
    )
  const db = client(override)
  return serializable(db, async (tx) => {
    await requirePrivacyOperator(tx, input.actorUserId)
    const request = await tx.accountPrivacyRequest.findUnique({
      where: { id: input.requestId },
    })
    if (
      !request?.tenantId ||
      !["submitted", "awaiting_information"].includes(request.status)
    )
      throw conflict("Refresh the privacy request before verification.")
    const now = new Date()
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: {
        status: "verified",
        verifiedAt: now,
        verifiedByUserId: input.actorUserId,
        verificationEvidence: evidence,
      },
    })
    await tx.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorType: "user",
        actorUserId: input.actorUserId,
        action: "privacy.identity_verified",
        entityType: "account_privacy_request",
        entityId: request.id,
        occurredAt: now,
      },
    })
    return { verified: true }
  })
}
export async function getPrivacyRevocationScope(
  input: { actorUserId: string; requestId: string },
  override?: PrismaClient
) {
  const db = client(override)
  await requirePrivacyOperator(db, input.actorUserId)
  const request = await db.accountPrivacyRequest.findUnique({
    where: { id: input.requestId },
    select: {
      id: true,
      userId: true,
      status: true,
      verifiedAt: true,
      accessRevokedAt: true,
    },
  })
  if (
    !request?.userId ||
    request.status !== "verified" ||
    !request.verifiedAt ||
    request.accessRevokedAt
  )
    throw conflict("This request is not ready for access revocation.")
  const memberships = await db.membership.findMany({
    where: { userId: request.userId },
    select: {
      id: true,
      tenantId: true,
      role: true,
      tenant: { select: { name: true, slug: true } },
    },
    orderBy: [{ tenantId: "asc" }, { id: "asc" }],
  })
  return { requestId: request.id, memberships }
}

export async function revokePrivacyRequestAccount(
  input: {
    actorUserId: string
    requestId: string
    handoverAndRetentionEvidence: string
    reviewedMemberships: { id: string; tenantId: string; role: string }[]
  },
  override?: PrismaClient
) {
  const evidence = input.handoverAndRetentionEvidence.trim()
  if (evidence.length < 20 || evidence.length > 2000)
    throw conflict(
      "Record the administration handover and retention review before revoking access."
    )
  const db = client(override)
  return serializable(db, async (tx) => {
    await requirePrivacyOperator(tx, input.actorUserId)
    const request = await tx.accountPrivacyRequest.findUnique({
      where: { id: input.requestId },
    })
    if (
      !request?.tenantId ||
      !request.userId ||
      request.status !== "verified" ||
      !request.verifiedAt
    )
      throw conflict(
        "Verify the account holder and request scope before revoking access."
      )
    const memberships = await tx.membership.findMany({
      where: { userId: request.userId },
      select: { id: true, tenantId: true, role: true },
    })
    const scopeKey = (membership: {
      id: string
      tenantId: string
      role: string
    }) => `${membership.id}:${membership.tenantId}:${membership.role}`
    const actualIds = memberships.map(scopeKey).sort()
    const reviewedIds = input.reviewedMemberships.map(scopeKey).sort()
    if (
      actualIds.length !== reviewedIds.length ||
      actualIds.some((id, index) => id !== reviewedIds[index])
    )
      throw conflict(
        "Cooperative memberships changed. Refresh and review every workspace before revoking access."
      )
    for (const membership of memberships.filter((membership) =>
      ["tenant_admin", "super_admin"].includes(membership.role)
    )) {
      const replacement = await tx.membership.count({
        where: {
          tenantId: membership.tenantId,
          userId: { not: request.userId },
          role: { in: ["tenant_admin", "super_admin"] },
          user: { deletedAt: null },
        },
      })
      if (!replacement)
        throw conflict(
          "Transfer cooperative administration before deleting the last administrator’s account."
        )
    }
    const target = await tx.user.findUnique({ where: { id: request.userId } })
    if (!target || target.deletedAt)
      throw conflict(
        "This account is already unavailable; review the processing evidence."
      )
    if (
      target.isPlatformOwner &&
      !(await tx.user.count({
        where: {
          id: { not: target.id },
          isPlatformOwner: true,
          deletedAt: null,
        },
      }))
    )
      throw conflict(
        "Transfer platform ownership before deleting the last platform operator."
      )
    const now = new Date()
    await tx.mobilePushRegistration.deleteMany({ where: { userId: target.id } })
    await tx.mobileUserNotificationPreference.deleteMany({
      where: { userId: target.id },
    })
    await tx.mobileDeviceSession.deleteMany({ where: { userId: target.id } })
    await tx.authChallenge.deleteMany({ where: { userId: target.id } })
    // Assistant chats, linked messaging channels and link codes are personal,
    // not financial records: erase them. Writes a confirmed proposal made keep
    // their own rows and audit entries. Conversations cascade to messages,
    // turns and proposals; channel queues hold the chat id, so go first.
    await tx.assistantChannelOutbox.deleteMany({
      where: { link: { is: { userId: target.id } } },
    })
    await tx.assistantChannelInbox.deleteMany({
      where: { link: { is: { userId: target.id } } },
    })
    await tx.assistantChannelLink.deleteMany({ where: { userId: target.id } })
    await tx.assistantChannelChallenge.deleteMany({
      where: { userId: target.id },
    })
    await tx.assistantConversation.deleteMany({ where: { userId: target.id } })
    await tx.user.update({
      where: { id: target.id },
      data: {
        deletedAt: now,
        passwordHash: null,
        cooperativeAccessCode: null,
        phoneNumber: null,
        fullName: "Deleted account",
        email: `deleted-${target.id}@users.invalid`,
        isPlatformOwner: false,
      },
    })
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: {
        status: "processing",
        accessRevokedAt: now,
        processingEvidence: {
          accountIdentifiers: "anonymised",
          passwordAndChallenges: "erased",
          deviceSessionsAndPushTokens: "erased",
          assistantConversationsAndChannels: "erased",
          sharedFinancialRecords: "pending_retention_review",
          processorErasure: "pending",
          completionNotification: "pending",
          completionContactEmail: target.email,
          handoverAndRetentionEvidence: evidence,
        },
      },
    })
    if (request.supportCaseId)
      await tx.supportCaseMessage.create({
        data: {
          tenantId: request.tenantId,
          supportCaseId: request.supportCaseId,
          authorUserId: null,
          authorType: "system",
          message:
            "Account access was revoked after identity and handover review. Erasure, retention decisions, processor outcomes, and completion contact remain open.",
        },
      })
    await tx.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorType: "user",
        actorUserId: input.actorUserId,
        action: "privacy.account_access_revoked",
        entityType: "account_privacy_request",
        entityId: request.id,
        metadata: { completedErasure: false },
        occurredAt: now,
      },
    })
    return { accessRevoked: true, erasureComplete: false }
  })
}

function evidenceObject(value: Prisma.JsonValue | null): Prisma.JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw conflict("Privacy processing evidence needs operator review.")
  return value
}
const removedAtRequest = "Removed at the account holder’s request."
/**
 * Support cases that touched money stay whole: they are dispute and audit
 * records the cooperative must keep. Every other case the person opened or
 * wrote in loses its free text.
 */
const supportCaseWithoutMoney = {
  requiresFinancialAdjustment: false,
  moneyImpactRequested: false,
  financialAdjustmentApprovalStatus: "not_required",
} as const

/**
 * Redacts a former member's personal details inside the caller's
 * transaction (close-my-account plan, decision 2). Contact, ID and KYC
 * details, member documents, sign-up contact details and the free text of
 * support cases without money are removed. The member's name and member
 * number stay, and every money row is kept untouched: the cooperative must
 * know who it paid, for the legal retention period. Phase D's login closing
 * can call this inside revocation once the cooperative has settled.
 */
export async function redactFormerMemberPersonalData(
  tx: Prisma.TransactionClient,
  input: { userId: string; keepSupportCaseId?: string | null }
) {
  const { userId } = input
  const member = await tx.member.findUnique({
    where: { userId },
    select: { id: true },
  })
  const memberDocuments = member
    ? (await tx.memberDocument.deleteMany({ where: { memberId: member.id } }))
        .count
    : 0
  if (member)
    await tx.member.update({
      where: { id: member.id },
      data: {
        email: null,
        phoneNumber: null,
        address: null,
        occupation: null,
        governmentIdNumber: null,
        kycDocumentType: null,
        kycDocumentUrl: null,
        kycDocumentUploadedAt: null,
        kycReviewNotes: null,
      },
    })
  const onboardingRequests = (
    await tx.memberOnboardingRequest.updateMany({
      where: { userId },
      data: {
        email: `deleted-${userId}@users.invalid`,
        phoneNumber: null,
        rejectionReason: null,
      },
    })
  ).count
  const notKept = input.keepSupportCaseId
    ? { id: { not: input.keepSupportCaseId } }
    : {}
  const supportCases = (
    await tx.supportCase.updateMany({
      where: {
        ...notKept,
        ...supportCaseWithoutMoney,
        OR: [
          { openedByUserId: userId },
          ...(member ? [{ memberId: member.id }] : []),
        ],
      },
      data: {
        subject: "Support case (details removed)",
        description: removedAtRequest,
      },
    })
  ).count
  const supportMessages = (
    await tx.supportCaseMessage.updateMany({
      where: {
        authorUserId: userId,
        authorType: { not: "system" },
        supportCase: { is: { ...notKept, ...supportCaseWithoutMoney } },
      },
      data: { message: removedAtRequest, attachmentUrl: null },
    })
  ).count
  return {
    memberProfile: member ? 1 : 0,
    memberDocuments,
    onboardingRequests,
    supportCases,
    supportMessages,
  }
}

/**
 * Completion step 1 (ADR-20261116 privacy request completion): redact the
 * person's remaining personal details after their login is closed. Money
 * records keep their name and member number. Safe to run again: a retry
 * after a failed confirmation email only refreshes the retention summary.
 */
export async function erasePrivacyRequestPersonalData(
  input: { actorUserId: string; requestId: string; retentionSummary: string },
  override?: PrismaClient
) {
  const retentionSummary = input.retentionSummary.trim()
  if (retentionSummary.length < 20 || retentionSummary.length > 2000)
    throw conflict(
      "Write 20–2000 characters on what was kept and why before finishing."
    )
  const db = client(override)
  return serializable(db, async (tx) => {
    await requirePrivacyOperator(tx, input.actorUserId)
    const request = await tx.accountPrivacyRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        tenantId: true,
        userId: true,
        supportCaseId: true,
        status: true,
        requestedAt: true,
        accessRevokedAt: true,
        processingEvidence: true,
        tenant: { select: { name: true } },
      },
    })
    if (
      !request?.tenantId ||
      !request.userId ||
      request.status !== "processing" ||
      !request.accessRevokedAt
    )
      throw conflict("End their access before finishing the request.")
    const evidence = evidenceObject(request.processingEvidence)
    if (
      !processingNotes(request.processingEvidence).some(
        (note) => note.category === "external_processors_backups"
      )
    )
      throw conflict(
        "Write down what outside services and backups did before finishing."
      )
    const userId = request.userId
    const now = new Date()
    const alreadyErased = evidence.personalDetails === "erased"
    let erasedCounts = evidence.erasedCounts ?? null
    if (!alreadyErased) {
      erasedCounts = await redactFormerMemberPersonalData(tx, {
        userId,
        keepSupportCaseId: request.supportCaseId,
      })
      await tx.auditLog.create({
        data: {
          tenantId: request.tenantId,
          actorType: "user",
          actorUserId: input.actorUserId,
          action: "privacy.personal_data_erased",
          entityType: "account_privacy_request",
          entityId: request.id,
          metadata: erasedCounts,
          occurredAt: now,
        },
      })
    }
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: {
        processingEvidence: {
          ...evidence,
          personalDetails: "erased",
          personalDetailsErasedAt:
            typeof evidence.personalDetailsErasedAt === "string"
              ? evidence.personalDetailsErasedAt
              : now.toISOString(),
          erasedCounts,
          sharedFinancialRecords: "kept_with_name_only",
          processorErasure: "recorded",
          retentionSummary,
        },
      },
    })
    return {
      requestId: request.id,
      requestedAt: request.requestedAt,
      tenantName: request.tenant?.name ?? null,
      contactEmail:
        typeof evidence.completionContactEmail === "string"
          ? evidence.completionContactEmail
          : null,
      retentionSummary,
      alreadyErased,
    }
  })
}

/** Completion step 2 failed: the confirmation email did not go out. */
export async function recordPrivacyCompletionNoticeFailed(
  input: { actorUserId: string; requestId: string },
  override?: PrismaClient
) {
  const db = client(override)
  return serializable(db, async (tx) => {
    await requirePrivacyOperator(tx, input.actorUserId)
    const request = await tx.accountPrivacyRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        processingEvidence: true,
      },
    })
    if (!request?.tenantId || request.status !== "processing")
      throw conflict("Refresh the privacy request and try again.")
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: {
        processingEvidence: {
          ...evidenceObject(request.processingEvidence),
          completionNotification: "failed",
        },
      },
    })
    await tx.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorType: "user",
        actorUserId: input.actorUserId,
        action: "privacy.completion_notice_failed",
        entityType: "account_privacy_request",
        entityId: request.id,
        occurredAt: new Date(),
      },
    })
    return { recorded: true }
  })
}

export type PrivacyCompletionConfirmation =
  | { method: "email" }
  | { method: "operator"; note: string }

/**
 * Completion step 3: the person has been told, so the request is done. Marks
 * it completed, drops the contact email kept only for this notice, closes
 * the support case and writes the audit entry.
 */
export async function completePrivacyRequest(
  input: {
    actorUserId: string
    requestId: string
    confirmation: PrivacyCompletionConfirmation
  },
  override?: PrismaClient
) {
  const operatorNote =
    input.confirmation.method === "operator"
      ? input.confirmation.note.trim()
      : null
  if (
    operatorNote !== null &&
    (operatorNote.length < 20 || operatorNote.length > 2000)
  )
    throw conflict("Write 20–2000 characters on how you told them.")
  const db = client(override)
  return serializable(db, async (tx) => {
    await requirePrivacyOperator(tx, input.actorUserId)
    const request = await tx.accountPrivacyRequest.findUnique({
      where: { id: input.requestId },
      select: {
        id: true,
        tenantId: true,
        supportCaseId: true,
        status: true,
        requestedAt: true,
        processingEvidence: true,
      },
    })
    if (!request?.tenantId || request.status !== "processing")
      throw conflict("Refresh the privacy request and try again.")
    const evidence = evidenceObject(request.processingEvidence)
    if (evidence.personalDetails !== "erased")
      throw conflict("Erase their personal details before finishing.")
    const now = new Date()
    const dueAt = privacyRequestDueAt(request.requestedAt)
    const withinResponseWindow = now.getTime() <= dueAt.getTime()
    const retained =
      typeof evidence.retentionSummary === "string"
        ? evidence.retentionSummary
        : "No retention summary was recorded."
    const completionSummary = [
      "Personal details were deleted or anonymised.",
      "The cooperative’s money records are kept under the person’s name and member number, without contact or ID details.",
      `Kept: ${retained}`,
      input.confirmation.method === "email"
        ? "The person was told by email."
        : "The person was told another way, recorded by the operator.",
    ].join(" ")
    const { completionContactEmail: _dropped, ...kept } = evidence
    await tx.accountPrivacyRequest.update({
      where: { id: request.id },
      data: {
        status: "completed",
        completedAt: now,
        completionSummary,
        processingEvidence: {
          ...kept,
          completionNotification:
            input.confirmation.method === "email"
              ? "email_sent"
              : "operator_recorded",
          ...(operatorNote ? { completionNotificationNote: operatorNote } : {}),
          completedWithinResponseWindow: withinResponseWindow,
        },
      },
    })
    if (request.supportCaseId) {
      await tx.supportCaseMessage.create({
        data: {
          tenantId: request.tenantId,
          supportCaseId: request.supportCaseId,
          authorUserId: null,
          authorType: "system",
          message:
            "The privacy request is complete: contact, ID and other personal details were erased, money records are kept under the member's name for the legal period, and the person was told.",
        },
      })
      await tx.supportCase.update({
        where: { id: request.supportCaseId },
        data: {
          status: "closed",
          resolvedAt: now,
          closedAt: now,
          resolutionSummary: "Privacy request completed.",
        },
      })
    }
    await tx.auditLog.create({
      data: {
        tenantId: request.tenantId,
        actorType: "user",
        actorUserId: input.actorUserId,
        action: "privacy.request_completed",
        entityType: "account_privacy_request",
        entityId: request.id,
        metadata: {
          confirmation: input.confirmation.method,
          dueAt: dueAt.toISOString(),
          withinResponseWindow,
        },
        occurredAt: now,
      },
    })
    return { completed: true, completedAt: now, withinResponseWindow }
  })
}

function privacyChallengeSecret() {
  const secret = process.env.PRIVACY_REQUEST_CHALLENGE_SECRET?.trim()
  if (secret && secret.length >= 32) return secret
  if (process.env.NODE_ENV !== "production")
    return "local-privacy-request-challenge-secret-2026"
  throw new AppError({
    code: "PROVIDER_UNAVAILABLE",
    publicMessage: "Account deletion verification is temporarily unavailable.",
  })
}
export function privacyRecipientEmailHash(email: string) {
  return createHmac("sha256", privacyChallengeSecret())
    .update(email.trim().toLowerCase())
    .digest("hex")
}
export function privacyChallengeTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex")
}
function equalHex(left: string, right: string) {
  const a = Buffer.from(left, "hex"),
    b = Buffer.from(right, "hex")
  return a.length === 32 && b.length === 32 && timingSafeEqual(a, b)
}
export async function beginExternalAccountDeletion(
  input: {
    email: string
    workspaceSlug: string
    tokenHash: string
    expiresAt: Date
  },
  override?: PrismaClient
) {
  const db = client(override)
  const email = input.email.trim().toLowerCase()
  const workspace = {
    OR: [
      { slug: input.workspaceSlug },
      {
        domains: {
          some: {
            hostname: input.workspaceSlug,
            verificationStatus: "verified",
          },
        },
      },
    ],
  }
  const users = await db.user.findMany({
    where: {
      email,
      deletedAt: null,
      memberships: { some: { tenant: workspace } },
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      memberships: {
        where: { tenant: workspace },
        select: { tenantId: true, tenant: { select: { name: true } } },
      },
    },
    take: 2,
  })
  if (users.length !== 1) return null
  const user = users[0]
  if (!user) return null
  const tenantIds = new Set(
    user.memberships.map((membership) => membership.tenantId)
  )
  if (tenantIds.size !== 1) return null
  const membership = user.memberships[0]
  if (!membership) return null
  const challenge = await db.authChallenge.create({
    data: {
      tenantId: membership.tenantId,
      userId: user.id,
      purpose: "account_deletion_email",
      evidenceHash: input.tokenHash,
      recipientEmailHash: privacyRecipientEmailHash(user.email),
      expiresAt: input.expiresAt,
      maxAttempts: 5,
    },
    select: { id: true },
  })
  return {
    challengeId: challenge.id,
    email: user.email,
    displayName: user.fullName,
    tenantName: membership.tenant.name,
  }
}
export async function discardUndeliveredAccountDeletionChallenge(
  challengeId: string,
  override?: PrismaClient
) {
  await client(override).authChallenge.deleteMany({
    where: {
      id: challengeId,
      purpose: "account_deletion_email",
      consumedAt: null,
    },
  })
}
export async function confirmExternalAccountDeletion(
  input: { challengeId: string; token: string; noticeVersion: string },
  override?: PrismaClient
) {
  assertDeletionNotice(input.noticeVersion)
  const db = client(override)
  const outcome = await serializable(db, async (tx) => {
    const challenge = await tx.authChallenge.findFirst({
      where: { id: input.challengeId, purpose: "account_deletion_email" },
    })
    if (
      !challenge ||
      challenge.consumedAt ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.attemptCount >= challenge.maxAttempts
    )
      return { status: "invalid" as const }
    if (
      !equalHex(challenge.evidenceHash, privacyChallengeTokenHash(input.token))
    ) {
      await tx.authChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          attemptCount: { lt: challenge.maxAttempts },
        },
        data: { attemptCount: { increment: 1 } },
      })
      return { status: "invalid" as const }
    }
    if (!challenge.userId || !challenge.recipientEmailHash)
      return { status: "invalid" as const }
    const user = await tx.user.findFirst({
      where: {
        id: challenge.userId,
        deletedAt: null,
        memberships: { some: { tenantId: challenge.tenantId } },
      },
      select: { email: true },
    })
    if (
      !user ||
      !equalHex(
        challenge.recipientEmailHash,
        privacyRecipientEmailHash(user.email)
      )
    )
      return { status: "invalid" as const }
    const request = await requestAccountDeletionInTransaction(tx, {
      tenantId: challenge.tenantId,
      userId: challenge.userId,
      idempotencyKey: challenge.id,
      noticeVersion: input.noticeVersion,
      source: "verified_email",
      verifiedEmail: user.email,
    })
    const consumed = await tx.authChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    })
    if (consumed.count !== 1)
      throw conflict("This verification link has already been used.")
    return {
      status: "created" as const,
      requestId: request.id,
      requestStatus: request.status,
    }
  })
  if (outcome.status !== "created")
    throw conflict(
      "This verification link is invalid or expired. Request a new link."
    )
  return { requestId: outcome.requestId, status: outcome.requestStatus }
}
