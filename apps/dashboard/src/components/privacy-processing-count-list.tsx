const countLabels = {
  memberProfiles: "Member profiles",
  memberDocuments: "Member documents",
  onboardingRequests: "Member onboarding requests",
  onboardingApprovals: "Onboarding requests approved as staff",
  signupLinksCreated: "Signup links created as staff",
  importBatchesCreated: "Import batches created as staff",
  memberActivityEventsCreated: "Member activity events created as staff",
  offlineSyncEventsCreated: "Offline sync events created",
  operationProfilesReviewed: "Operation profiles reviewed as staff",
  savingsWithdrawalsProcessed: "Special savings withdrawals processed",
  collectionBatchesCreated: "Collection batches created",
  collectionBatchesPosted: "Collection batches posted",
  paymentReceiptsSubmitted: "Payment receipts submitted",
  paymentReceiptsReviewed: "Payment receipts reviewed",
  loanRequestsCreated: "Financing requests created",
  loanApprovalsActed: "Financing approvals acted",
  guarantorApprovalsRequested: "Guarantor approvals requested",
  guarantorApprovalsResponded: "Guarantor approvals responded",
  collectionFollowUpsActed: "Collection follow-ups acted",
  collectionFollowUpsAssigned: "Collection follow-ups assigned",
  repaymentsReceived: "Repayments received as staff",
  foodCyclesReleased: "Foodstuff cycles released",
  foodCyclesAccountingSubmitted: "Foodstuff accounting submitted",
  foodApplicationsSubmitted: "Foodstuff applications submitted",
  foodApplicationsReviewed: "Foodstuff applications reviewed",
  procurementRequestsCreated: "Procurement requests created",
  procurementRequestsReviewed: "Procurement requests reviewed",
  procurementRequestsPurchased: "Procurement requests purchased",
  projectFinancingRequestsCreated: "Project financing requests created",
  projectFinancingRequestsReviewed: "Project financing requests reviewed",
  projectFinancingRequestsDisbursed: "Project financing requests disbursed",
  monthlyRecordsCreated: "Monthly records created",
  shareStructureVersionsCreated: "Share structure versions created",
  shareOverridesCreated: "Member share overrides created",
  memberAmountLogsCreated: "Member amount logs created",
  chargeVersionsCreated: "Charge versions created",
  legacyLoanDraftsCreated: "Legacy financing drafts created",
  migrationAdjustmentsCreated: "Migration backfill adjustments created",
  openingBalancesCreated: "Opening balances created",
  openingBalancesReviewed: "Opening balances reviewed",
  openingBalancesApplied: "Opening balances applied",
  openingBalancesReversed: "Opening balances reversed",
  backfillBatchesCreated: "Backfill batches created",
  backfillBatchesUpdated: "Backfill batches updated",
  appliedBackfillMonthsApplied: "Backfill months applied",
  backfillActivitiesCreated: "Backfill activities created",
  shareBusinessesCreated: "Share businesses created",
  shareProfitEntriesCreated: "Share business profit entries created",
  migrationProfitAdjustmentsCreated: "Migration profit adjustments created",
  shareLedgerEntriesCreated: "Member share ledger entries created",
  historicalSharePurchasesCreated: "Historical share purchases created",
  shareApplicationsRequested: "Share applications requested",
  shareApplicationsReviewed: "Share applications reviewed",
  tenantMigrationsFinalized: "Tenant migrations finalized",
  tenantEmergencyUnlocks: "Tenant emergency unlocks performed",
  tenantTrustReviews: "Tenant trust reviews performed",
  qaPurgeRunsRequested: "QA purge runs requested",
  qaCredentialsCreated: "QA tester credentials created",
  memberships: "Cooperative memberships",
  supportCases: "Support cases opened",
  supportCasesAssigned: "Support cases assigned to staff account",
  supportCasesMember: "Support cases linked to member profile",
  supportCasesAdjustmentApproved: "Support cases with adjustment approval",
  supportMessages: "Support messages authored",
  activeEvidenceUploads: "Active evidence uploads",
  legalAcceptances: "Legal acceptance records",
  subscriptionCheckoutIntents: "Software checkout intents requested",
  mobileAppAccessPurchases: "Personal mobile app store purchase chains",
  mobileAppReviewGrants: "Mobile app reviewer access grants",
  mobileAppAccessProviderEvents: "Personal mobile app provider events",
  privacyRequests: "Privacy requests retained",
  privacyRequestsVerified: "Privacy requests verified as operator",
  remainingAuthChallenges: "Authentication challenges remaining",
  remainingMobileSessions: "Mobile sessions remaining",
  mobileSessionsRevoked: "Mobile sessions revoked as actor",
  remainingPushRegistrations: "Push registrations remaining",
  remainingNotificationPreferences: "Notification preferences remaining",
  auditEntries: "Audit entries attributed to account",
  memberContributions: "Contributions linked to member profile",
  memberPaymentReceipts: "Payment receipts linked to member profile",
  memberFinancingRequests: "Financing requests linked to member profile",
  memberLoans: "Financing facilities linked to member profile",
  memberRepayments: "Repayments linked to member profile",
} as const

type CountKey = keyof typeof countLabels

const countGroups: { title: string; keys: CountKey[] }[] = [
  {
    title: "Member-linked financial records",
    keys: [
      "memberContributions",
      "memberPaymentReceipts",
      "memberFinancingRequests",
      "memberLoans",
      "memberRepayments",
    ],
  },
  {
    title: "Account and retained records",
    keys: [
      "memberProfiles",
      "memberDocuments",
      "onboardingRequests",
      "memberships",
      "legalAcceptances",
      "privacyRequests",
      "privacyRequestsVerified",
      "activeEvidenceUploads",
    ],
  },
  {
    title: "Staff and import history",
    keys: [
      "onboardingApprovals",
      "signupLinksCreated",
      "importBatchesCreated",
      "memberActivityEventsCreated",
      "offlineSyncEventsCreated",
      "operationProfilesReviewed",
    ],
  },
  {
    title: "Shared financial and collections history",
    keys: [
      "savingsWithdrawalsProcessed",
      "collectionBatchesCreated",
      "collectionBatchesPosted",
      "paymentReceiptsSubmitted",
      "paymentReceiptsReviewed",
      "loanRequestsCreated",
      "loanApprovalsActed",
      "guarantorApprovalsRequested",
      "guarantorApprovalsResponded",
      "collectionFollowUpsActed",
      "collectionFollowUpsAssigned",
      "repaymentsReceived",
    ],
  },
  {
    title: "Foodstuff, procurement and project financing",
    keys: [
      "foodCyclesReleased",
      "foodCyclesAccountingSubmitted",
      "foodApplicationsSubmitted",
      "foodApplicationsReviewed",
      "procurementRequestsCreated",
      "procurementRequestsReviewed",
      "procurementRequestsPurchased",
      "projectFinancingRequestsCreated",
      "projectFinancingRequestsReviewed",
      "projectFinancingRequestsDisbursed",
      "monthlyRecordsCreated",
    ],
  },
  {
    title: "Backfill and migration actor history",
    keys: [
      "shareStructureVersionsCreated",
      "shareOverridesCreated",
      "memberAmountLogsCreated",
      "chargeVersionsCreated",
      "legacyLoanDraftsCreated",
      "migrationAdjustmentsCreated",
      "openingBalancesCreated",
      "openingBalancesReviewed",
      "openingBalancesApplied",
      "openingBalancesReversed",
      "backfillBatchesCreated",
      "backfillBatchesUpdated",
      "appliedBackfillMonthsApplied",
      "backfillActivitiesCreated",
    ],
  },
  {
    title: "Share and profit actor history",
    keys: [
      "shareBusinessesCreated",
      "shareProfitEntriesCreated",
      "migrationProfitAdjustmentsCreated",
      "shareLedgerEntriesCreated",
      "historicalSharePurchasesCreated",
      "shareApplicationsRequested",
      "shareApplicationsReviewed",
    ],
  },
  {
    title: "Tenant and QA actor history",
    keys: [
      "tenantMigrationsFinalized",
      "tenantEmergencyUnlocks",
      "tenantTrustReviews",
      "qaPurgeRunsRequested",
      "qaCredentialsCreated",
    ],
  },
  {
    title: "Support, software billing and audit",
    keys: [
      "supportCases",
      "supportCasesAssigned",
      "supportCasesMember",
      "supportCasesAdjustmentApproved",
      "supportMessages",
      "subscriptionCheckoutIntents",
      "mobileAppAccessPurchases",
      "mobileAppReviewGrants",
      "mobileAppAccessProviderEvents",
      "auditEntries",
    ],
  },
  {
    title: "Post-revocation checks",
    keys: [
      "remainingAuthChallenges",
      "remainingMobileSessions",
      "mobileSessionsRevoked",
      "remainingPushRegistrations",
      "remainingNotificationPreferences",
    ],
  },
]

export function PrivacyProcessingCountList({
  counts,
}: {
  counts: Record<CountKey, number>
}) {
  const remainingAccessArtifacts =
    counts.remainingAuthChallenges +
    counts.remainingMobileSessions +
    counts.remainingPushRegistrations +
    counts.remainingNotificationPreferences
  return (
    <div className="space-y-4">
      <p className="font-medium">Selected links to the revoked account</p>
      {remainingAccessArtifacts > 0 ? (
        <p role="alert" className="text-destructive">
          Post-revocation access artifacts remain in these selected counts.
          Investigate the challenges, mobile sessions, push registrations and
          notification preferences before relying on access revocation. The
          counts do not establish whether a session or provider copy is usable.
        </p>
      ) : null}
      {countGroups.map((group) => (
        <section className="space-y-2" key={group.title}>
          <h4 className="font-medium">{group.title}</h4>
          <dl className="grid gap-2 sm:grid-cols-2">
            {group.keys.map((key) => (
              <div className="flex justify-between gap-4" key={key}>
                <dt>{countLabels[key]}</dt>
                <dd className="font-medium tabular-nums">{counts[key]}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="text-muted-foreground">
        This partial inventory counts only the links listed above. Onboarding
        and support case categories can overlap. A financial record can appear
        under a member link and one or more actor roles. The current privacy
        request is expected to remain in its count. Indirect links, shared
        record contents, free text, attachments, external processors and backups
        need separate review. A zero count does not establish erasure or
        complete this request.
      </p>
    </div>
  )
}
