# Account deletion data map — decision packet

Post-revocation linked-artifact check (29 September): the operator inventory highlights any nonzero `AuthChallenge.userId`, `MobileDeviceSession.userId`, `MobilePushRegistration.userId` or `MobileUserNotificationPreference.userId` count after access revocation. `MobileDeviceSession.revokedByUserId` is historical actor evidence and does not trigger the alert. A positive count requires investigation of the local revocation transaction and any provider/session copies; zero is only a selected database observation, never erasure proof. This check does not delete rows or decide retention.

External verification retry check (28 September): a focused database test confirms that a newly verified email link for a user who already has an active deletion request returns that existing request and consumes the new challenge without another support case or audit write. The original one-time challenge still rejects reuse. This helps a requester recover by requesting a fresh link after an uncertain first response; delivered email, operator action, retention and completed erasure remain unverified.

Status: Technical inventory for owner, cooperative and legal review. **No retention period, erasure authority or completion claim is approved by this document.** Checked against the current Prisma source on 25 September 2026; exclude the unrelated Jawdah material.

## What the implementation does today

After separate email-control and operator identity/scope checks, `revokePrivacyRequestAccount` removes the login's password and identifying account fields, authentication challenges, mobile sessions, push registrations and notification preferences. It preserves the user row as a deleted pseudonym, keeps the request in `processing`, records an audit event and stores the prior email only as restricted completion-contact evidence. It does not erase member or cooperative records, delete processor copies, send a completion notice or mark the request `completed`. The operator's 83 linked-record counts are a **selected partial inventory**, not a deletion checklist. They cover every directly named `userId`/`*UserId` scalar in the current Prisma model scan, seven member-linked categories (documents, support cases, contributions, payment receipts, financing requests, financing facilities and repayments), and personal mobile store provider events linked through a purchase. Actor and member categories can overlap, and the current request is expected to remain counted. Other indirect links, shared/free-text contents, external processors and backups remain outside these counts.

Before that global access revocation, the verified platform operator now reads and acknowledges every current cooperative membership and role. The transaction rejects a different ID/tenant/role set and still protects last administrators and platform ownership. This makes the account-wide access scope reviewable; it does not decide whether each cooperative's shared financial or member records can be erased.

Local persistence rehearsal (25 September): against the explicitly local `localhost:55434/halaalvest` database, a synthetic `.test` non-administrator with an existing mobile device session and a current platform owner completed challenge creation, token redemption, tracked request/support-case creation, operator verification and access revocation inside one Serializable transaction deliberately rolled back at the end. Within the transaction the request reached `processing`, returned `erasureComplete: false`, and the target was no longer an active user or holder of a mobile device session. The selected processing inventory loaded without exposing the completion contact or claiming erasure. A separate rollback-only Serializable transaction created and successfully cancelled a signed-in request before processing. Privacy-request, deletion-challenge, support-case and audit row counts were unchanged after both rollbacks. No email was sent or existing account changed. The package-local `.env` still names the old `amanah_cooperative` database and cannot be used for this test without an explicit local-only database-name correction; the root `.env` points to Preview. This rehearsal validates local schema and workflow execution only, not email delivery, deployed authorization, processor outcomes or complete erasure.

Native local-state observation (25 September): `apps/mobile/src/lib/session-store.ts` keeps a device ID in SecureStore. Local session invalidation now removes it together with token/profile, drafts/files/reads and app-lock state; the next authenticated session generates a fresh ID. Token refresh and cooperative-role switching retain the current ID. This is source-level linkage reduction, not proof of deletion from server, analytics, diagnostics or processor stores. Verify sign-out, server revocation, new sign-in and app-lock/push behavior in signed builds before claiming device-level deletion. See [the device-ID ADR](../decisions/ADR-20260925-rotate-mobile-device-id-on-session-invalidation.md).

## Decisions needed before any completion transition

| Data family | Source and current state | Owner/legal decision and execution evidence required |
| --- | --- | --- |
| Login, challenge, device and push state | `User`, `AuthChallenge`, `MobileDeviceSession`, `MobilePushRegistration`, `MobileUserNotificationPreference`; revocation deletes/anonymises these in one transaction. | Verify web/mobile sessions and downstream push services stop accepting the account; decide retention of security/audit evidence and document any provider copies. |
| Member identity and KYC | `Member` contact, employment, government ID and KYC fields; `MemberDocument` URLs and objects; revocation leaves them intact. | Separate cooperative-controlled member obligations from eligible personal fields; decide redaction, restricted retention, object deletion, authority, period and proof. Preserve posted money history. |
| Shared financial and operational records | Contributions, receipts, loans, guarantor actions, repayments, procurement, Foodstuff Purchase, projects, shares/profit, imports, backfill, monthly records, tenant operations and offline events contain user attribution. | Decide which immutable transaction/audit facts remain, which actor identifiers can be pseudonymised without breaking integrity, access restrictions and expiry; require cooperative/legal sign-off before mutation. |
| Support, notification and free text | `SupportCase`, `SupportCaseMessage`, attachments, notification and email records may repeat identifiers in text or provider stores. | Classify case/attachment contents and recipients; define redaction/object deletion, processor request, access restriction and evidence of completion. |
| Evidence uploads | `DashboardEvidenceUpload` metadata and private Blob objects may be linked by uploader or business record. | Decide whether the object is a shared financial proof or eligible for deletion; delete provider bytes before metadata when approved and verify no remaining linked references. |
| Legal and software-store evidence | `LegalAcceptance`, `SubscriptionCheckoutIntent`, provider events and purchase history may support contract, tax, dispute or refund evidence. | Approve retention basis, access control, period and processor/store obligations; do not infer that account deletion cancels Apple/Google subscriptions. |
| Privacy request and completion contact | `AccountPrivacyRequest`, processing notes, support case and audit trail preserve the request and original email after revocation. | Decide when and how the completion email is delivered, when its address is erased, what restricted request evidence remains, and how failed delivery is handled. |
| External processors and backups | Hosting/database, email, notifications, analytics/diagnostics, private storage and backup copies are not proved erased by local row changes. | Inventory enabled providers and locations; record processor acknowledgements, backup expiry, transfer safeguards and owner-approved exception handling. |

## Schema reference scan

A read-only scan of `packages/db/prisma/models/*.prisma` found **75 scalar `*UserId` fields across 53 models**. The grouped list below is a locator for technical review, not proof that every personal datum has been found: free text, JSON, URLs, indirect member/tenant links, external systems and differently named identifiers need separate inspection. Some scalar IDs have Prisma `User` relations; others are historical IDs without a declared relation. Neither group should be deleted by a generic cascade.

Coverage check (29 September 2026): the current operator count query checks **all 75 directly named `userId`/`*UserId` scalar fields** found in this Prisma model scan. Seven additional selected categories follow a `Member.userId` relation and one follows `MobileAppAccessProviderEvent.purchase.userId`, rather than another direct scalar. This is a measure of selected source-field and relationship coverage, not of all personal data discovered or erasure completed. The direct fields counted are:

The 28 September source drift test (`packages/db/src/queries/privacy-processing-inventory-coverage.test.ts`) independently scans Prisma models and the TypeScript count-query AST. It requires the documented 75 direct fields and an exact model/field match in `getPrivacyProcessingInventory`. Sixteen focused privacy tests and database TypeScript pass. This guards future schema edits against silently omitting a direct user-ID count; it does not discover differently named fields, free text, JSON, indirect relations, provider copies, backups or eligible erasure decisions.

| Area | Direct fields counted in the operator inventory |
| --- | --- |
| Account and onboarding | `Member.userId`, `MemberOnboardingRequest.userId`, `MemberOnboardingRequest.approvedByUserId`, `MemberSignupLink.createdByUserId`, `Membership.userId` |
| Staff/import/operations/support | `ImportBatch.createdByUserId`, `MemberActivityEvent.createdByUserId`, `OfflineSyncEvent.createdByUserId`, `TenantOperationProfile.reviewedByUserId`, `SupportCase.openedByUserId`, `SupportCase.assignedToUserId`, `SupportCase.financialAdjustmentApprovedByUserId`, `SupportCaseMessage.authorUserId`, `DashboardEvidenceUpload.uploaderUserId` |
| Financial and collections actor roles | `MemberSpecialSavingsWithdrawal.processedByUserId`, `CollectionSourceContributionBatch.createdByUserId`, `CollectionSourceContributionBatch.postedByUserId`, `MemberPaymentReceipt.submittedByUserId`, `MemberPaymentReceipt.reviewedByUserId`, `LoanRequest.createdByUserId`, `LoanApproval.actorUserId`, `LoanGuarantorApproval.requestedByUserId`, `LoanGuarantorApproval.respondedByUserId`, `CollectionFollowUp.actorUserId`, `CollectionFollowUp.assignedToUserId`, `Repayment.receivedByUserId` |
| Foodstuff, procurement, projects and monthly records | `FoodPurchaseCycle.releasedByUserId`, `FoodPurchaseCycle.accountingSubmittedByUserId`, `FoodPurchaseApplication.submittedByUserId`, `FoodPurchaseApplication.reviewedByUserId`, `ProcurementRequest.createdByUserId`, `ProcurementRequest.reviewedByUserId`, `ProcurementRequest.purchasedByUserId`, `ProjectFinancingRequest.createdByUserId`, `ProjectFinancingRequest.reviewedByUserId`, `ProjectFinancingRequest.disbursedByUserId`, `MonthlyRecord.createdByUserId` |
| Backfill and migration | `TenantShareStructureVersion.createdByUserId`, `MemberShareOverride.createdByUserId`, `MemberAmountLog.createdByUserId`, `ChargeDefinitionVersion.createdByUserId`, `LegacyLoanMigrationDraft.createdByUserId`, `MigrationBackfillAdjustment.createdByUserId`, `MemberOpeningBalance.createdByUserId`, `.reviewedByUserId`, `.appliedByUserId`, `.reversedByUserId`, `BackfillBatch.createdByUserId`, `.updatedByUserId`, `AppliedBackfillMonth.appliedByUserId`, `BackfillActivity.createdByUserId` |
| Share and profit governance | `ShareBusiness.createdByUserId`, `ShareBusinessProfitEntry.createdByUserId`, `MigrationProfitAdjustment.createdByUserId`, `MemberShareLedgerEntry.createdByUserId`, `HistoricalMemberSharePurchase.createdByUserId`, `MemberShareApplication.requestedByUserId`, `.reviewedByUserId` |
| Tenant and QA actions | `Tenant.migrationFinalizedByUserId`, `.migrationEmergencyUnlockedByUserId`, `.trustReviewedByUserId`, `QaPurgeRun.requestedByUserId`, `QaTesterCredential.createdByUserId` |
| Legal, subscription and privacy | `LegalAcceptance.userId`, `SubscriptionCheckoutIntent.requestedByUserId`, `MobileAppAccessPurchase.userId`, `MobileAppReviewGrant.userId`, `AccountPrivacyRequest.userId`, `AuditLog.actorUserId` |
| Privacy and session actor links | `AccountPrivacyRequest.verifiedByUserId`, `MobileDeviceSession.revokedByUserId` |
| Post-revocation checks | `AuthChallenge.userId`, `MobileDeviceSession.userId`, `MobilePushRegistration.userId`, `MobileUserNotificationPreference.userId` |

Prioritise category-specific retention and restriction review of the backfill/share and tenant-governance actor links above. `ImportBatch.sourceCsv`, `ImportBatchRow.payload` and `OfflineSyncEvent.payload` can also contain other people's data; counting a creator link does not inspect or resolve those contents. Do not turn 75/75 source-field coverage into a percentage of personal data processed or an erasure target.

| Prisma file | Models with `*UserId` fields |
| --- | --- |
| `audit.prisma` | `AuditLog` |
| `auth.prisma` | `AuthChallenge`, `MobileDeviceSession`, `Membership` |
| `backfill.prisma` | `TenantShareStructureVersion`, `MemberShareOverride`, `MemberAmountLog`, `ChargeDefinitionVersion`, `LegacyLoanMigrationDraft`, `MigrationBackfillAdjustment`, `MemberOpeningBalance`, `BackfillBatch`, `AppliedBackfillMonth`, `BackfillActivity` |
| `contributions.prisma` | `MemberSpecialSavingsWithdrawal`, `CollectionSourceContributionBatch`, `MemberPaymentReceipt` |
| `dashboard-evidence-upload.prisma` | `DashboardEvidenceUpload` |
| `food-purchase.prisma` | `FoodPurchaseCycle`, `FoodPurchaseApplication` |
| `imports.prisma` | `ImportBatch` |
| `loans.prisma` | `LoanRequest`, `LoanApproval`, `LoanGuarantorApproval`, `CollectionFollowUp`, `Repayment` |
| `member-onboarding.prisma` | `MemberOnboardingRequest`, `MemberSignupLink` |
| `member.prisma` | `Member`, `MemberActivityEvent` |
| `mobile-app-access.prisma` | `MobileAppReviewGrant` |
| `monthly-records.prisma` | `MonthlyRecord` |
| `notification.prisma` | `MobileUserNotificationPreference`, `MobilePushRegistration` |
| `offline-sync.prisma` | `OfflineSyncEvent` |
| `privacy.prisma` | `AccountPrivacyRequest`, `LegalAcceptance` |
| `procurement.prisma` | `ProcurementRequest` |
| `project-financing.prisma` | `ProjectFinancingRequest` |
| `qa-accelerator.prisma` | `QaTesterCredential` (QA-only data requires its own teardown verification) |
| `share-business.prisma` | `ShareBusiness`, `ShareBusinessProfitEntry`, `MigrationProfitAdjustment`, `MemberShareLedgerEntry`, `HistoricalMemberSharePurchase`, `MemberShareApplication` |
| `subscription.prisma` | `SubscriptionCheckoutIntent` |
| `support.prisma` | `SupportCase`, `SupportCaseMessage` |
| `tenant.prisma` | `Tenant`, `QaPurgeRun` (QA-only), `TenantOperationProfile` |

Before implementing completion, create a category-by-category approved schedule and execution record covering the subject's roles and every cooperative they belong to; confirm legal authority for each shared record; make erasure/restriction idempotent and auditable; verify storage and processor outcomes; set and disclose a defensible request-processing timeframe, deliver a truthful completion notice, and test repeat and failure paths. Until then, `processing` and `erasureComplete: false` are the only supported outcomes.
