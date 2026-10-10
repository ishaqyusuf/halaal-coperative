import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { PrivacyProcessingCountList } from "./privacy-processing-count-list"

test("renders every selected deletion link and keeps the partial-inventory caveat", () => {
  const counts = {
    memberProfiles: 1,
    memberDocuments: 2,
    onboardingRequests: 18,
    onboardingApprovals: 19,
    signupLinksCreated: 20,
    importBatchesCreated: 21,
    memberActivityEventsCreated: 22,
    offlineSyncEventsCreated: 23,
    operationProfilesReviewed: 24,
    savingsWithdrawalsProcessed: 25,
    collectionBatchesCreated: 26,
    collectionBatchesPosted: 27,
    paymentReceiptsSubmitted: 28,
    paymentReceiptsReviewed: 29,
    loanRequestsCreated: 30,
    loanApprovalsActed: 31,
    guarantorApprovalsRequested: 32,
    guarantorApprovalsResponded: 33,
    collectionFollowUpsActed: 34,
    collectionFollowUpsAssigned: 35,
    repaymentsReceived: 36,
    foodCyclesReleased: 37,
    foodCyclesAccountingSubmitted: 38,
    foodApplicationsSubmitted: 39,
    foodApplicationsReviewed: 40,
    procurementRequestsCreated: 41,
    procurementRequestsReviewed: 42,
    procurementRequestsPurchased: 43,
    projectFinancingRequestsCreated: 44,
    projectFinancingRequestsReviewed: 45,
    projectFinancingRequestsDisbursed: 46,
    monthlyRecordsCreated: 47,
    shareStructureVersionsCreated: 48,
    shareOverridesCreated: 49,
    memberAmountLogsCreated: 50,
    chargeVersionsCreated: 51,
    legacyLoanDraftsCreated: 52,
    migrationAdjustmentsCreated: 53,
    openingBalancesCreated: 54,
    openingBalancesReviewed: 55,
    openingBalancesApplied: 56,
    openingBalancesReversed: 57,
    backfillBatchesCreated: 58,
    backfillBatchesUpdated: 59,
    appliedBackfillMonthsApplied: 60,
    backfillActivitiesCreated: 61,
    shareBusinessesCreated: 62,
    shareProfitEntriesCreated: 63,
    migrationProfitAdjustmentsCreated: 64,
    shareLedgerEntriesCreated: 65,
    historicalSharePurchasesCreated: 66,
    shareApplicationsRequested: 67,
    shareApplicationsReviewed: 68,
    tenantMigrationsFinalized: 69,
    tenantEmergencyUnlocks: 70,
    tenantTrustReviews: 71,
    qaPurgeRunsRequested: 72,
    qaCredentialsCreated: 73,
    memberships: 3,
    supportCases: 4,
    supportCasesAssigned: 5,
    supportCasesMember: 6,
    supportCasesAdjustmentApproved: 7,
    supportMessages: 8,
    activeEvidenceUploads: 9,
    legalAcceptances: 10,
    subscriptionCheckoutIntents: 11,
    mobileAppAccessPurchases: 81,
    mobileAppReviewGrants: 83,
    mobileAppAccessProviderEvents: 82,
    privacyRequests: 12,
    privacyRequestsVerified: 74,
    remainingAuthChallenges: 13,
    remainingMobileSessions: 14,
    mobileSessionsRevoked: 75,
    remainingPushRegistrations: 15,
    remainingNotificationPreferences: 16,
    auditEntries: 17,
    memberContributions: 76,
    memberPaymentReceipts: 77,
    memberFinancingRequests: 78,
    memberLoans: 79,
    memberRepayments: 80,
  }
  const html = renderToStaticMarkup(
    <PrivacyProcessingCountList counts={counts} />
  )

  expect(html.match(/<dt>/g)).toHaveLength(83)
  const renderedCounts = Array.from(
    html.matchAll(/<dd[^>]*>(\d+)<\/dd>/g),
    (match) => Number(match[1])
  ).sort((a, b) => a - b)
  expect(renderedCounts).toEqual(
    Array.from({ length: 83 }, (_, index) => index + 1)
  )
  expect(html).toContain("Staff and import history")
  expect(html).toContain("Support cases assigned to staff account")
  expect(html).toContain("Offline sync events created")
  expect(html).toContain("Software checkout intents requested")
  expect(html).toContain("Personal mobile app store purchase chains")
  expect(html).toContain("Personal mobile app provider events")
  expect(html).toContain("Shared financial and collections history")
  expect(html).toContain("Guarantor approvals responded")
  expect(html).toContain("Foodstuff, procurement and project financing")
  expect(html).toContain("Project financing requests disbursed")
  expect(html).toContain("Backfill and migration actor history")
  expect(html).toContain("Opening balances reversed")
  expect(html).toContain("Share and profit actor history")
  expect(html).toContain("Tenant and QA actor history")
  expect(html).toContain("A financial record can appear")
  expect(html).toContain("Member-linked financial records")
  expect(html).toContain("Post-revocation checks")
  expect(html).toContain("Post-revocation access artifacts remain")
  expect(html).toContain("counts do not establish whether a session")
  expect(html).toContain("support case categories can overlap")
  expect(html).toContain("A zero count does not establish erasure")
  expect(html).not.toContain("undefined")

  const zeroArtifactHtml = renderToStaticMarkup(
    <PrivacyProcessingCountList
      counts={{
        ...counts,
        remainingAuthChallenges: 0,
        remainingMobileSessions: 0,
        remainingPushRegistrations: 0,
        remainingNotificationPreferences: 0,
      }}
    />
  )
  expect(zeroArtifactHtml).not.toContain(
    "Post-revocation access artifacts remain"
  )
  expect(zeroArtifactHtml).toContain("A zero count does not establish erasure")
})
