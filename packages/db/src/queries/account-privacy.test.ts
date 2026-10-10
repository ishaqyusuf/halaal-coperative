import { describe, expect, it } from "bun:test"
import type { PrismaClient } from "../../generated/prisma/client"
import { accountDeletionNoticeCopy } from "@halaalvest/domain/account-privacy-notice"
import { publicPolicies } from "@halaalvest/domain/public-policies"
import {
  ACCOUNT_DELETION_NOTICE_VERSION,
  accountDeletionNoticeVersion,
  cancelOwnPrivacyRequest,
  getPrivacyProcessingInventory,
  getPrivacyRevocationScope,
  listPrivacyQueue,
  recordPrivacyProcessingNote,
  requestAccountDeletion,
  revokePrivacyRequestAccount,
  verifyPrivacyRequest,
} from "./account-privacy"

function database(
  options: {
    member?: boolean
    prior?: boolean
    operator?: boolean
    status?: string
    replacement?: number
    platformOwner?: boolean
    memberships?: {
      id: string
      tenantId: string
      role: "tenant_admin" | "member"
    }[]
  } = {}
) {
  const writes: string[] = []
  const reads: unknown[] = []
  const updates: unknown[] = []
  const request = {
    id: "request-a",
    tenantId: "tenant-a",
    userId: "user-a",
    supportCaseId: "case-a",
    status: options.status ?? "verified",
    verifiedAt: new Date(),
  }
  const tx = {
    user: {
      findFirst: async (args: { where: { isPlatformOwner?: boolean } }) =>
        args.where.isPlatformOwner
          ? options.operator === false
            ? null
            : { id: "operator" }
          : options.member === false
            ? null
            : { id: "user-a", memberProfile: null },
      findUnique: async () => ({
        id: "user-a",
        email: "member@example.test",
        deletedAt: null,
        isPlatformOwner: options.platformOwner ?? false,
      }),
      count: async () => 0,
      update: async () => {
        writes.push("user")
        return {}
      },
    },
    accountPrivacyRequest: {
      findFirst: async (args: unknown) => {
        reads.push(args)
        return options.prior ? request : null
      },
      findUnique: async () => request,
      create: async () => {
        writes.push("request")
        return request
      },
      update: async (args: unknown) => {
        writes.push("request")
        updates.push(args)
        return request
      },
    },
    supportCase: {
      create: async () => {
        writes.push("support")
        return { id: "case-a" }
      },
    },
    supportCaseMessage: {
      create: async () => {
        writes.push("message")
        return {}
      },
    },
    auditLog: {
      create: async () => {
        writes.push("audit")
        return {}
      },
    },
    membership: {
      findMany: async () =>
        options.memberships ?? [
          { id: "membership-a", tenantId: "tenant-a", role: "tenant_admin" },
        ],
      count: async () => options.replacement ?? 0,
    },
    mobilePushRegistration: {
      deleteMany: async () => {
        writes.push("push")
        return {}
      },
    },
    mobileUserNotificationPreference: {
      deleteMany: async () => {
        writes.push("preferences")
        return {}
      },
    },
    mobileDeviceSession: {
      deleteMany: async () => {
        writes.push("sessions")
        return {}
      },
    },
    authChallenge: {
      deleteMany: async () => {
        writes.push("challenges")
        return {}
      },
    },
  }
  const prisma = {
    $transaction: async (fn: (transaction: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaClient
  return { prisma, writes, reads, updates }
}
const input = {
  tenantId: "tenant-a",
  userId: "user-a",
  idempotencyKey: "key",
  noticeVersion: ACCOUNT_DELETION_NOTICE_VERSION,
}
const membershipA = {
  id: "membership-a",
  tenantId: "tenant-a",
  role: "tenant_admin",
}
const membershipB = {
  id: "membership-b",
  tenantId: "tenant-b",
  role: "member",
}
describe("account privacy safeguards", () => {
  it("changes the request version when either reviewed request surface changes", () => {
    expect(ACCOUNT_DELETION_NOTICE_VERSION).toMatch(
      /^notice-sha256-[0-9a-f]{64}$/
    )
    expect(ACCOUNT_DELETION_NOTICE_VERSION.length).toBeLessThanOrEqual(80)
    expect(
      accountDeletionNoticeVersion({
        inApp: { ...accountDeletionNoticeCopy, scope: "Changed in-app scope" },
        publicDeletionPolicy: publicPolicies["delete-account"],
      })
    ).not.toBe(ACCOUNT_DELETION_NOTICE_VERSION)
    expect(
      accountDeletionNoticeVersion({
        inApp: accountDeletionNoticeCopy,
        publicDeletionPolicy: {
          ...publicPolicies["delete-account"],
          interactiveCopy: {
            ...publicPolicies["delete-account"].interactiveCopy,
            verification: {
              ...publicPolicies["delete-account"].interactiveCopy.verification,
              confirmation: "Changed public confirmation",
            },
          },
        },
      })
    ).not.toBe(ACCOUNT_DELETION_NOTICE_VERSION)
  })
  it("keeps restricted processing evidence out of the bulk operator queue", async () => {
    let selection: Record<string, unknown> | undefined
    const prisma = {
      user: { findFirst: async () => ({ id: "operator" }) },
      accountPrivacyRequest: {
        findMany: async (args: { select: Record<string, unknown> }) => {
          selection = args.select
          return []
        },
      },
    } as unknown as PrismaClient
    await listPrivacyQueue({ actorUserId: "operator" }, prisma)
    expect(selection?.processingEvidence).toBeUndefined()
    expect(selection?.verificationEvidence).toBe(true)
  })
  it("paginates stable queue order so long-running processing requests cannot hide newer requests", async () => {
    const requestedAt = new Date("2026-09-25T12:00:00.000Z")
    const all = Array.from({ length: 61 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      requestedAt,
    }))
    const prisma = {
      user: { findFirst: async () => ({ id: "operator" }) },
      accountPrivacyRequest: {
        findMany: async (args: {
          where: {
            OR?: [
              { requestedAt: { gt: Date } },
              { requestedAt: Date; id: { gt: string } },
            ]
          }
          take: number
        }) => {
          const afterId = args.where.OR?.[1].id.gt
          return all
            .filter((row) => !afterId || row.id > afterId)
            .slice(0, args.take)
        },
      },
    } as unknown as PrismaClient
    const first = await listPrivacyQueue({ actorUserId: "operator" }, prisma)
    expect(first.data).toHaveLength(50)
    expect(first.meta.cursor).toBeTruthy()
    const second = await listPrivacyQueue(
      { actorUserId: "operator", cursor: first.meta.cursor },
      prisma
    )
    expect(second.data).toHaveLength(11)
    expect(second.meta.cursor).toBeNull()
    expect(
      new Set([...first.data, ...second.data].map((row) => row.id)).size
    ).toBe(61)
  })
  it("rejects a malformed privacy queue cursor before querying records", async () => {
    let queried = false
    const prisma = {
      user: { findFirst: async () => ({ id: "operator" }) },
      accountPrivacyRequest: {
        findMany: async () => {
          queried = true
          return []
        },
      },
    } as unknown as PrismaClient
    await expect(
      listPrivacyQueue({ actorUserId: "operator", cursor: "invalid" }, prisma)
    ).rejects.toThrow("Refresh the privacy queue")
    expect(queried).toBe(false)
  })
  it("appends restricted processing evidence without losing the completion contact or completing erasure", async () => {
    let operator = true
    const writes: unknown[] = []
    const request = {
      id: "request-a",
      tenantId: "tenant-a",
      status: "processing",
      accessRevokedAt: new Date(),
      processingEvidence: {
        completionContactEmail: "member@example.test",
        processorErasure: "pending",
      } as Record<string, unknown>,
    }
    const tx = {
      user: { findFirst: async () => (operator ? { id: "operator" } : null) },
      accountPrivacyRequest: {
        findUnique: async () => request,
        update: async (args: {
          data: { processingEvidence: Record<string, unknown> }
        }) => {
          writes.push(args)
          request.processingEvidence = args.data.processingEvidence
        },
      },
      auditLog: { create: async (args: unknown) => writes.push(args) },
    }
    const prisma = {
      ...tx,
      $transaction: async (run: (transaction: typeof tx) => unknown) => run(tx),
    } as unknown as PrismaClient
    const input = {
      actorUserId: "operator",
      requestId: "request-a",
      category: "external_processors_backups" as const,
      evidence: "Email processor request reference 123 remains pending.",
    }
    expect(await recordPrivacyProcessingNote(input, prisma)).toEqual({
      recorded: true,
      erasureComplete: false,
      noteCount: 1,
    })
    expect(
      await recordPrivacyProcessingNote(
        {
          ...input,
          evidence: "Email processor acknowledged request reference 123.",
        },
        prisma
      )
    ).toMatchObject({ noteCount: 2, erasureComplete: false })
    expect(request.processingEvidence.completionContactEmail).toBe(
      "member@example.test"
    )
    expect(request.processingEvidence.processingNotes).toHaveLength(2)
    expect(writes).toHaveLength(4)
    request.status = "verified"
    await expect(recordPrivacyProcessingNote(input, prisma)).rejects.toThrow(
      "not ready"
    )
    operator = false
    await expect(recordPrivacyProcessingNote(input, prisma)).rejects.toThrow(
      "operator access"
    )
    expect(writes).toHaveLength(4)
  })
  it("limits processing inventory to current operators and revoked requests, returning counts without PII", async () => {
    const calls: unknown[] = []
    const financialActorCalls: { model: string; where: unknown }[] = []
    let operator = true
    const request = {
      id: "request-a",
      userId: "user-a",
      status: "processing",
      accessRevokedAt: new Date(),
      processingEvidence: {
        processingNotes: [
          {
            category: "external_processors_backups",
            evidence: "Processor acknowledgement reference 123 was reviewed.",
            recordedAt: "2026-09-25T00:00:00.000Z",
            recordedByUserId: "operator",
            completionContactEmail: "secret@example.test",
          },
        ],
      },
    }
    const count = (args: unknown) => {
      calls.push(args)
      return Promise.resolve(1)
    }
    const financialCount = (model: string) => (args: { where: unknown }) => {
      financialActorCalls.push({ model, where: args.where })
      return count(args)
    }
    const prisma = {
      user: {
        findFirst: async () => (operator ? { id: "operator" } : null),
      },
      accountPrivacyRequest: {
        findUnique: async () => request,
        count,
      },
      member: { count },
      memberDocument: { count },
      contribution: { count: financialCount("contribution") },
      loan: { count: financialCount("loan") },
      memberOnboardingRequest: { count },
      memberSignupLink: { count },
      importBatch: { count },
      memberActivityEvent: { count },
      offlineSyncEvent: { count },
      tenantOperationProfile: { count },
      memberSpecialSavingsWithdrawal: {
        count: financialCount("memberSpecialSavingsWithdrawal"),
      },
      collectionSourceContributionBatch: {
        count: financialCount("collectionSourceContributionBatch"),
      },
      memberPaymentReceipt: { count: financialCount("memberPaymentReceipt") },
      loanRequest: { count: financialCount("loanRequest") },
      loanApproval: { count: financialCount("loanApproval") },
      loanGuarantorApproval: {
        count: financialCount("loanGuarantorApproval"),
      },
      collectionFollowUp: { count: financialCount("collectionFollowUp") },
      repayment: { count: financialCount("repayment") },
      foodPurchaseCycle: { count: financialCount("foodPurchaseCycle") },
      foodPurchaseApplication: {
        count: financialCount("foodPurchaseApplication"),
      },
      procurementRequest: { count: financialCount("procurementRequest") },
      projectFinancingRequest: {
        count: financialCount("projectFinancingRequest"),
      },
      monthlyRecord: { count: financialCount("monthlyRecord") },
      tenantShareStructureVersion: {
        count: financialCount("tenantShareStructureVersion"),
      },
      memberShareOverride: { count: financialCount("memberShareOverride") },
      memberAmountLog: { count: financialCount("memberAmountLog") },
      chargeDefinitionVersion: {
        count: financialCount("chargeDefinitionVersion"),
      },
      legacyLoanMigrationDraft: {
        count: financialCount("legacyLoanMigrationDraft"),
      },
      migrationBackfillAdjustment: {
        count: financialCount("migrationBackfillAdjustment"),
      },
      memberOpeningBalance: { count: financialCount("memberOpeningBalance") },
      backfillBatch: { count: financialCount("backfillBatch") },
      appliedBackfillMonth: { count: financialCount("appliedBackfillMonth") },
      backfillActivity: { count: financialCount("backfillActivity") },
      shareBusiness: { count: financialCount("shareBusiness") },
      shareBusinessProfitEntry: {
        count: financialCount("shareBusinessProfitEntry"),
      },
      migrationProfitAdjustment: {
        count: financialCount("migrationProfitAdjustment"),
      },
      memberShareLedgerEntry: {
        count: financialCount("memberShareLedgerEntry"),
      },
      historicalMemberSharePurchase: {
        count: financialCount("historicalMemberSharePurchase"),
      },
      memberShareApplication: {
        count: financialCount("memberShareApplication"),
      },
      tenant: { count: financialCount("tenant") },
      qaPurgeRun: { count: financialCount("qaPurgeRun") },
      qaTesterCredential: { count: financialCount("qaTesterCredential") },
      membership: { count },
      supportCase: { count },
      supportCaseMessage: { count },
      dashboardEvidenceUpload: { count },
      legalAcceptance: { count },
      subscriptionCheckoutIntent: { count },
      mobileAppAccessPurchase: { count },
      mobileAppReviewGrant: { count },
      mobileAppAccessProviderEvent: { count },
      authChallenge: { count },
      mobileDeviceSession: { count },
      mobilePushRegistration: { count },
      mobileUserNotificationPreference: { count },
      auditLog: { count },
    } as unknown as PrismaClient
    const inventory = await getPrivacyProcessingInventory(
      { actorUserId: "operator", requestId: request.id },
      prisma
    )
    expect(inventory.counts.memberProfiles).toBe(1)
    expect(inventory.counts.onboardingRequests).toBe(1)
    expect(inventory.counts.onboardingApprovals).toBe(1)
    expect(inventory.counts.signupLinksCreated).toBe(1)
    expect(inventory.counts.importBatchesCreated).toBe(1)
    expect(inventory.counts.memberActivityEventsCreated).toBe(1)
    expect(inventory.counts.offlineSyncEventsCreated).toBe(1)
    expect(inventory.counts.operationProfilesReviewed).toBe(1)
    expect(inventory.counts.savingsWithdrawalsProcessed).toBe(1)
    expect(inventory.counts.collectionBatchesPosted).toBe(1)
    expect(inventory.counts.paymentReceiptsReviewed).toBe(1)
    expect(inventory.counts.loanApprovalsActed).toBe(1)
    expect(inventory.counts.guarantorApprovalsResponded).toBe(1)
    expect(inventory.counts.collectionFollowUpsAssigned).toBe(1)
    expect(inventory.counts.repaymentsReceived).toBe(1)
    expect(inventory.counts.foodCyclesReleased).toBe(1)
    expect(inventory.counts.foodCyclesAccountingSubmitted).toBe(1)
    expect(inventory.counts.foodApplicationsSubmitted).toBe(1)
    expect(inventory.counts.foodApplicationsReviewed).toBe(1)
    expect(inventory.counts.procurementRequestsCreated).toBe(1)
    expect(inventory.counts.procurementRequestsReviewed).toBe(1)
    expect(inventory.counts.procurementRequestsPurchased).toBe(1)
    expect(inventory.counts.projectFinancingRequestsCreated).toBe(1)
    expect(inventory.counts.projectFinancingRequestsReviewed).toBe(1)
    expect(inventory.counts.projectFinancingRequestsDisbursed).toBe(1)
    expect(inventory.counts.monthlyRecordsCreated).toBe(1)
    expect(inventory.counts.shareStructureVersionsCreated).toBe(1)
    expect(inventory.counts.openingBalancesReversed).toBe(1)
    expect(inventory.counts.shareApplicationsReviewed).toBe(1)
    expect(inventory.counts.tenantTrustReviews).toBe(1)
    expect(inventory.counts.qaCredentialsCreated).toBe(1)
    expect(inventory.counts.privacyRequestsVerified).toBe(1)
    expect(inventory.counts.mobileSessionsRevoked).toBe(1)
    expect(inventory.counts.memberContributions).toBe(1)
    expect(inventory.counts.memberPaymentReceipts).toBe(1)
    expect(inventory.counts.memberFinancingRequests).toBe(1)
    expect(inventory.counts.memberLoans).toBe(1)
    expect(inventory.counts.memberRepayments).toBe(1)
    expect(financialActorCalls).toEqual(
      [
        ["memberSpecialSavingsWithdrawal", "processedByUserId"],
        ["collectionSourceContributionBatch", "createdByUserId"],
        ["collectionSourceContributionBatch", "postedByUserId"],
        ["memberPaymentReceipt", "submittedByUserId"],
        ["memberPaymentReceipt", "reviewedByUserId"],
        ["loanRequest", "createdByUserId"],
        ["loanApproval", "actorUserId"],
        ["loanGuarantorApproval", "requestedByUserId"],
        ["loanGuarantorApproval", "respondedByUserId"],
        ["collectionFollowUp", "actorUserId"],
        ["collectionFollowUp", "assignedToUserId"],
        ["repayment", "receivedByUserId"],
        ["foodPurchaseCycle", "releasedByUserId"],
        ["foodPurchaseCycle", "accountingSubmittedByUserId"],
        ["foodPurchaseApplication", "submittedByUserId"],
        ["foodPurchaseApplication", "reviewedByUserId"],
        ["procurementRequest", "createdByUserId"],
        ["procurementRequest", "reviewedByUserId"],
        ["procurementRequest", "purchasedByUserId"],
        ["projectFinancingRequest", "createdByUserId"],
        ["projectFinancingRequest", "reviewedByUserId"],
        ["projectFinancingRequest", "disbursedByUserId"],
        ["monthlyRecord", "createdByUserId"],
        ["tenantShareStructureVersion", "createdByUserId"],
        ["memberShareOverride", "createdByUserId"],
        ["memberAmountLog", "createdByUserId"],
        ["chargeDefinitionVersion", "createdByUserId"],
        ["legacyLoanMigrationDraft", "createdByUserId"],
        ["migrationBackfillAdjustment", "createdByUserId"],
        ["memberOpeningBalance", "createdByUserId"],
        ["memberOpeningBalance", "reviewedByUserId"],
        ["memberOpeningBalance", "appliedByUserId"],
        ["memberOpeningBalance", "reversedByUserId"],
        ["backfillBatch", "createdByUserId"],
        ["backfillBatch", "updatedByUserId"],
        ["appliedBackfillMonth", "appliedByUserId"],
        ["backfillActivity", "createdByUserId"],
        ["shareBusiness", "createdByUserId"],
        ["shareBusinessProfitEntry", "createdByUserId"],
        ["migrationProfitAdjustment", "createdByUserId"],
        ["memberShareLedgerEntry", "createdByUserId"],
        ["historicalMemberSharePurchase", "createdByUserId"],
        ["memberShareApplication", "requestedByUserId"],
        ["memberShareApplication", "reviewedByUserId"],
        ["tenant", "migrationFinalizedByUserId"],
        ["tenant", "migrationEmergencyUnlockedByUserId"],
        ["tenant", "trustReviewedByUserId"],
        ["qaPurgeRun", "requestedByUserId"],
        ["qaTesterCredential", "createdByUserId"],
        ["contribution", "member"],
        ["memberPaymentReceipt", "member"],
        ["loanRequest", "member"],
        ["loan", "member"],
        ["repayment", "member"],
      ].map(([model, field]) => ({
        model,
        where:
          field === "member"
            ? { member: { userId: "user-a" } }
            : { [field]: "user-a" },
      }))
    )
    expect(inventory.counts.activeEvidenceUploads).toBe(1)
    expect(inventory.counts.supportCasesAssigned).toBe(1)
    expect(inventory.counts.supportCasesMember).toBe(1)
    expect(inventory.counts.supportCasesAdjustmentApproved).toBe(1)
    expect(inventory.counts.subscriptionCheckoutIntents).toBe(1)
    expect(inventory.counts.mobileAppAccessPurchases).toBe(1)
    expect(inventory.counts.mobileAppReviewGrants).toBe(1)
    expect(inventory.counts.mobileAppAccessProviderEvents).toBe(1)
    expect(inventory.counts.privacyRequests).toBe(1)
    expect(inventory.counts.remainingMobileSessions).toBe(1)
    expect(inventory.erasureComplete).toBe(false)
    expect(JSON.stringify(inventory)).not.toContain("user-a")
    expect(JSON.stringify(inventory)).not.toContain("secret@example.test")
    expect(calls).toContainEqual({
      where: { uploaderUserId: "user-a", status: { not: "deleted" } },
    })
    expect(calls).toContainEqual({ where: { assignedToUserId: "user-a" } })
    expect(calls).toContainEqual({
      where: { purchase: { userId: "user-a" } },
    })
    expect(calls).toContainEqual({ where: { approvedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { createdByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { reviewedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { processedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { postedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { submittedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { actorUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { requestedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { respondedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { receivedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { member: { userId: "user-a" } } })
    expect(calls).toContainEqual({ where: { verifiedByUserId: "user-a" } })
    expect(calls).toContainEqual({ where: { revokedByUserId: "user-a" } })
    expect(calls).toContainEqual({
      where: { financialAdjustmentApprovedByUserId: "user-a" },
    })
    expect(calls).toContainEqual({
      where: { requestedByUserId: "user-a" },
    })
    request.status = "verified"
    await expect(
      getPrivacyProcessingInventory(
        { actorUserId: "operator", requestId: request.id },
        prisma
      )
    ).rejects.toThrow("not ready")
    expect(calls).toHaveLength(83)
    operator = false
    await expect(
      getPrivacyProcessingInventory(
        { actorUserId: "operator", requestId: request.id },
        prisma
      )
    ).rejects.toThrow("operator access")
  })
  it("rejects outdated notices and missing tenant membership before creating a case", async () => {
    const db = database({ member: false })
    await expect(
      requestAccountDeletion({ ...input, noticeVersion: "old" }, db.prisma)
    ).rejects.toThrow("notice changed")
    await expect(requestAccountDeletion(input, db.prisma)).rejects.toThrow(
      "Sign in"
    )
    expect(db.writes).toEqual([])
  })
  it("returns the existing request without duplicate support or audit records", async () => {
    const db = database({ prior: true })
    expect((await requestAccountDeletion(input, db.prisma)).id).toBe(
      "request-a"
    )
    expect(db.writes).toEqual([])
  })
  it("scopes cancellation to the requester and to unprocessed requests", async () => {
    const db = database()
    await expect(
      cancelOwnPrivacyRequest(
        { userId: "user-b", requestId: "request-a" },
        db.prisma
      )
    ).rejects.toThrow("no longer be cancelled")
    expect(db.reads[0]).toMatchObject({
      where: {
        userId: "user-b",
        id: "request-a",
        accessRevokedAt: null,
        status: { in: ["submitted", "verified", "awaiting_information"] },
      },
    })
    expect(db.writes).toEqual([])
  })
  it("requires current operator authority and useful verification evidence", async () => {
    const db = database({ operator: false, status: "submitted" })
    await expect(
      verifyPrivacyRequest(
        {
          actorUserId: "actor",
          requestId: "request-a",
          verificationEvidence: "Identity and request scope verified",
        },
        db.prisma
      )
    ).rejects.toThrow("operator access")
    await expect(
      verifyPrivacyRequest(
        {
          actorUserId: "actor",
          requestId: "request-a",
          verificationEvidence: "  ",
        },
        db.prisma
      )
    ).rejects.toThrow("verification evidence")
    expect(db.writes).toEqual([])
  })
  it("never revokes the last cooperative administrator or platform owner", async () => {
    for (const options of [
      { replacement: 0 },
      { replacement: 1, platformOwner: true },
    ]) {
      const db = database(options)
      await expect(
        revokePrivacyRequestAccount(
          {
            actorUserId: "actor",
            requestId: "request-a",
            handoverAndRetentionEvidence: "Handover and retention reviewed",
            reviewedMemberships: [membershipA],
          },
          db.prisma
        )
      ).rejects.toThrow("Transfer")
      expect(db.writes).toEqual([])
    }
  })
  it("revokes authentication without claiming complete erasure or altering financial records", async () => {
    const db = database({ replacement: 1 })
    expect(
      await revokePrivacyRequestAccount(
        {
          actorUserId: "actor",
          requestId: "request-a",
          handoverAndRetentionEvidence:
            "Replacement administrator appointed; finance records require retention review.",
          reviewedMemberships: [membershipA],
        },
        db.prisma
      )
    ).toEqual({ accessRevoked: true, erasureComplete: false })
    expect(db.writes).toEqual([
      "push",
      "preferences",
      "sessions",
      "challenges",
      "user",
      "request",
      "message",
      "audit",
    ])
    expect(db.updates).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "processing",
          processingEvidence: expect.objectContaining({
            completionContactEmail: "member@example.test",
            completionNotification: "pending",
            sharedFinancialRecords: "pending_retention_review",
          }),
        }),
      })
    )
  })
  it("requires an operator handover and retention note before revocation", async () => {
    const db = database({ replacement: 1 })
    await expect(
      revokePrivacyRequestAccount(
        {
          actorUserId: "actor",
          requestId: "request-a",
          handoverAndRetentionEvidence: "too short",
          reviewedMemberships: [membershipA],
        },
        db.prisma
      )
    ).rejects.toThrow("handover and retention review")
    expect(db.writes).toEqual([])
  })
  it("lists every current cooperative membership only for a verified operator review", async () => {
    const rows = [
      {
        id: "membership-a",
        tenantId: "tenant-a",
        role: "tenant_admin",
        tenant: { name: "Cooperative A", slug: "cooperative-a" },
      },
      {
        id: "membership-b",
        tenantId: "tenant-b",
        role: "member",
        tenant: { name: "Cooperative B", slug: "cooperative-b" },
      },
    ]
    const prisma = {
      user: { findFirst: async () => ({ id: "operator" }) },
      accountPrivacyRequest: {
        findUnique: async () => ({
          id: "request-a",
          userId: "user-a",
          status: "verified",
          verifiedAt: new Date(),
          accessRevokedAt: null,
        }),
      },
      membership: { findMany: async () => rows },
    } as unknown as PrismaClient
    expect(
      await getPrivacyRevocationScope(
        { actorUserId: "operator", requestId: "request-a" },
        prisma
      )
    ).toEqual({ requestId: "request-a", memberships: rows })
  })
  it("rejects a membership added after review before changing a global login", async () => {
    const db = database({
      replacement: 1,
      memberships: [
        { id: "membership-a", tenantId: "tenant-a", role: "tenant_admin" },
        { id: "membership-b", tenantId: "tenant-b", role: "member" },
      ],
    })
    await expect(
      revokePrivacyRequestAccount(
        {
          actorUserId: "actor",
          requestId: "request-a",
          handoverAndRetentionEvidence:
            "All cooperative memberships and retention duties reviewed.",
          reviewedMemberships: [membershipA],
        },
        db.prisma
      )
    ).rejects.toThrow("memberships changed")
    expect(db.writes).toEqual([])
    await expect(
      revokePrivacyRequestAccount(
        {
          actorUserId: "actor",
          requestId: "request-a",
          handoverAndRetentionEvidence:
            "All cooperative memberships and retention duties reviewed.",
          reviewedMemberships: [
            { ...membershipA, role: "member" },
            membershipB,
          ],
        },
        db.prisma
      )
    ).rejects.toThrow("memberships changed")
    expect(db.writes).toEqual([])
    expect(
      await revokePrivacyRequestAccount(
        {
          actorUserId: "actor",
          requestId: "request-a",
          handoverAndRetentionEvidence:
            "All cooperative memberships and retention duties reviewed.",
          reviewedMemberships: [membershipB, membershipA],
        },
        db.prisma
      )
    ).toEqual({ accessRevoked: true, erasureComplete: false })
  })
})
