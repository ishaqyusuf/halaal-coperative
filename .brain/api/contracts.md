# API Contracts
Apple provider identity handoff (29 September): Apple catalog availability and receipt verification now fail closed while the personal-team iOS release identity is pending. Once approved, the server requires `APPLE_APP_ID` to equal the reviewed App Store Connect app ID and verifies signed transactions against that record’s iOS bundle. The `mobileAppAccess` response shapes, Google package/verifier and role permissions are unchanged. See [handoff ADR](../decisions/ADR-20260929-personal-apple-publisher-handoff.md).

Apple provider identity correction (29 September): Apple catalog and receipt verification bind to the centrally approved Zeroes Organization HalaalVest bundle `com.halaalvest.mobile` and require private `APPLE_APP_ID` to equal the verified ASC app ID `6815838235`. A mismatch fails closed; the temporary personal-team pending state is superseded. `mobileAppAccess` response shapes, Google verification and role permissions are unchanged. See [current ADR](../decisions/ADR-20260929-zeroes-organization-ios-release-identity.md).

Personal access catalog contract now includes `restorableProductIds` independently of sellable `products`; an empty offer list never implies Restore is disabled. Snapshot includes `accessEndsAt`, equal to the current period end or verified grace end, for the native pre-entry gate. Mobile billing callbacks send only an Apple transaction ID or Google purchase token; the server re-queries provider state and binds it to the signed user. Google acknowledgment is withheld on an unapplied event; a conflicting or failed notification remains retryable. No store-localized display price is an entitlement claim.

Production `mobileAppAccess.catalog` serves **no new products** unless its personal catalog has exactly Apple six-month and annual mappings plus Google six-month and annual base-plan mappings on one Google subscription product, in addition to the existing Production sales/policy/provider checks. A partial catalog may still return configured `restorableProductIds` for previously purchased receipts. This source gate does not validate provider-side product creation, available price points or regional sale settings.

The personal `mobileAppAccess` catalog returns `{ products, userBinding }` to an active signed-in tenant user; the binding is a user UUID, not the tenant subscription ID. The access snapshot returns `accessAllowed`, `status`, `duration`, `periodEndsAt`, `cancelAtPeriodEnd` and provider metadata for that user across cooperative memberships in the selected store environment. `verifyPurchase` returns `{ verified: true, applied: boolean }` only after server provider verification and checks the signed user's membership in the selected cooperative; a second membership does not require a second store purchase. Another user's chain or account binding is rejected; older evidence is unapplied and equal-time conflicting evidence asks for a fresh Restore. Google acknowledgment follows applied persistence only. No client-submitted product, price, user ID or entitlement is trusted.

Native-store verification may now fail with a retryable conflict when a different provider state has already been applied at the same verification millisecond. It makes no entitlement or provider-event write and does not return `{ verified: true, applied: true }`; the mobile Restore path retains purchase review. Store notification handlers return HTTP 503 for that conflict so the provider can redeliver after a fresh current-state query.

## Google RTDN envelope — 28 September 2026

- The Google RTDN push body requires top-level `version: "1.0"`, nested `version: "1.0"` for test, subscription and pending-refund events, and a positive integer `notificationType` for a subscription event. An unsupported version or incomplete subscription event fails retryably before Play requery, entitlement persistence or pending-refund receipt. A future positive refund reason remains a queued human-review code rather than being rejected solely for differing from today's chargeback code 7. See [Google's RTDN reference](https://developer.android.com/google/play/billing/rtdn-reference).
- The decoded `DeveloperNotification` accepts only its listed top-level keys. An unfamiliar top-level event field, even alongside an otherwise valid subscription notice, returns retryable HTTP 503 before Play lookup or acknowledgment; Zod must not strip it before the mutually-exclusive event check. This is a conservative forward-version boundary pending monitored redelivery and operator review.

## Store purchase acknowledgment result — 28 September 2026

- `subscriptions.verifyStorePurchase` keeps the response `{ verified: true, applied: boolean }`. For Google, `applied: false` never triggers server acknowledgment, even if Play's purchase state says acknowledgment is pending. This response means the caller must keep the transaction in Restore/support review; it is not a successful plan change. Google RTDN returns 503 for that same unapplied-and-pending-acknowledgment combination so delivery can be retried and investigated.

## Platform refund-review listing — 28 September 2026

- `storeRefundReviews.queue` accepts strict `{ cursor?: string | null }`. The response is `{ asOf, data, meta: { cursor } }`, where `asOf` is the server query time used for urgency labels; each row contains only `id`, nullable `tenantId`, `occurredAt`, `createdAt`, nullable `orderId`, `refundReason`, `accountBinding`, `receivedAt`, `reviewBy`, `trackedDeliveries: number | null`, and `lastObservedAt: Date | null`. A null deadline or order ID signals evidence needing investigation rather than hiding a damaged record; null delivery fields mean the older receipt was not tracked. The cursor is opaque and bounded. No mutation, token decryption or financial recommendation is exposed by this contract.

## Privacy processing inventory — 25 September 2026

- `accountPrivacy.processingInventory` remains platform-owner-only and available only after access revocation while a request is `processing`. Its read-only, PII-minimized `counts` now has 80 selected categories: one for each of the 73 directly named Prisma `userId`/`*UserId` scalars in the current model scan, plus seven selected member-linked counts for documents, support cases, contributions, payment receipts, financing requests, facilities and repayments. Categories can overlap. They are review prompts, not deletable-row decisions or proof of processor erasure; other indirect links, content and external copies remain outside the response.
- A source drift test compares those 73 direct Prisma fields with the count-query AST and requires exact model/field coverage. It fails when a direct user-ID field is added without explicit inventory/data-map review. It does not broaden the runtime response or prove full personal-data coverage.

## Mobile store offer availability — 25 September 2026

Superseded on 28 September: the old tenant catalog is now permanently empty for new offers; the historical contract below describes its earlier gate. Personal offers use `mobileAppAccess.catalog`.

- `subscriptions.storeCatalog` returns an empty product list while new offers are unavailable. For an authorized Production subscription administrator it still returns the signed tenant account binding, allowing an existing Apple/Google purchase to be restored or managed while sales are gated. Sandbox binding and offers require current database-backed QA classification; an unset/invalid billing environment returns no binding. Production new offers require the explicit sales switch and effective approval hashes for Terms, Privacy, billing, deletion, support and cooperative disclosures. Provider-state verification and entitlement reconciliation remain independent.
- The production-contract Android `subscription-store-offer` journey reads `subscriptions.snapshot` and `subscriptions.storeCatalog({ store: "google" })`, requires one target-plan Google product with a base plan and UUID account binding, then checks the native offer screen without purchasing. An absent catalog blocks the journey. Its receipt is not store transaction evidence.

## Implementation-first additions — 2026-09-07

- `subscriptions.checkoutStatus` accepts a UUID intent id and returns status,
  requested plan, expiry, and nullable checkout URL. Only ready, unexpired HTTPS
  URLs on exact `HALAALVEST_BILLING_CHECKOUT_HOSTS` entries are exposed;
  credentials and non-443 ports are rejected. Empty allowlists expose no URL.
  An intent recorded with `requestState.channel=mobile` never exposes a hosted
  URL, even if the intent becomes ready and its host is allowlisted. Use native
  Apple/Google billing for mobile software plans.
  Returning from checkout causes server reads, never a client-driven upgrade.
- `mobile.admin.financingOperations.workspace` pages at 50 records;
  `mobile.admin.repaymentOperations.workspace` pages at 80. Both return nullable
  `nextCursor`, fetch one lookahead row and order by date plus unique id.
  Cursors are limited to 1024 characters and bound to resource, signed tenant,
  lane, search and optional financing `entityId`. They are positions, not authorization: every query retains
  tenant predicates. Invalid or reused scopes require refresh.
- Repayment cursors advance over raw rows before fully paid schedule rows are
  omitted. Financing statistics describe loaded rows, not whole-tenant totals;
  repayment summaries remain separately calculated.
- Financing `entityId` is a UUID-filtered request/loan destination lookup, still
  constrained by tenant and lane. Notification handling uses this filter rather
  than searching only the first page; detail resolution never replaces the
  full workspace with the filtered result.
- Source only: pagination, scoped denial, lifecycle and offline acceptance
  remain open in Tickets 30/32. No schema or financial mutation rule changed.


## QA accelerator contract v1

- Clients declare `clientKind` (`mobile` or `web`) and `contractVersion: 1`; the server privately decides environment availability.
- Authorization binds a normalized exact `.test` QA Domain, client identifier, host/device/network signal, client kind, environment, and expiry to digest-only evidence.
- Platform issuance returns a fixed-width 78-digit tester credential derived from
  32 cryptographically random bytes. The raw credential is returned once and is
  never persisted; storage and authorization matching remain digest-only. The
  decimal transport shape is safe for headless Android text entry without
  reducing the random source.
- Profile responses contain cooperative name, identity label, role, optional member code, eligibility, and an opaque selection reference. They contain no password, OTP, access code, raw membership id, or tester credential.
- Profile entry returns an ordinary signed session. Mobile additionally persists the existing durable device session; web uses existing host-scoped signed cookies.
- Revoked or expired QA authorization invalidates derived session context and disables Quick Fill.
- Quick Fill is a client-owned draft operation backed by the shared coverage inventory; it never submits a mutation.

## Production-contract QA harness contract v1

- Stale Operation Profile proof uses the exact Enterprise stale Tenant Admin,
  requires entitled read-only Procurement, and invokes the production update
  with an outdated expected mode. `CONFLICT` alone is insufficient: subsequent
  reads must preserve configured modes and review metadata. The native conflict/
  refresh checkpoint remains required; API-only proof cannot complete the journey.

- Member role-denial proof invokes the production staff-finance overview with
  an ordinary exact-domain Member session and accepts only `FORBIDDEN` as
  permission evidence. A required Android staff deep-link checkpoint must settle
  in the Member-only shell. API-only proof remains incomplete. Pre-executor
  execution failures preserve the ordinary cleanup path and a bounded incomplete
  result; unavailable API cleanup is explicit `null`, not a successful assertion.
- QA footer-inspection and API-evidence-directory environment inputs are declared
  in Turbo. They control diagnostics/output only and grant no app capability.

- Procurement proof uses the exact Standard Member production read/create/history
  contracts, stable domain-isolated UUID replay, complete bounded pagination,
  pending-state/no-schedule assertions and a required Android checkpoint. Its
  initial fixture must be charge-free; unknown charges block, not disappear.
  Exceptions retain only allowlisted code and a readiness-required boolean.
  API v2 is not accepted: incomplete historical migration triggers `CONFLICT`
  even though the service read advertises create access. No request was created.
  The read capability now includes authoritative member operational readiness.
  API v3 blocks at the service read and skips creation, with ordinary sign-out
  and credential revocation verified. The positive fixture still needs truthful
  migration evidence; no successful procurement journey is claimed.

- The internal harness accepts only `local`, `development`, or `preview`, an
  exact normalized `.test` QA Domain, and a bounded stable run id. Production
  fails before database access.
- The domain plan owns the complete required subscription-plan, role, Operation
  Profile, product-area, and reserved-state vocabulary. Every identity is visibly
  QA-labelled and belongs to the exact domain.
- Database preview is read-only and refuses live-tenant, foreign-QA-domain,
  stable-slug/prefix, and cooperative-number collisions before provisioning.
- Provisioning is idempotent and resets the governed tenant shell,
  subscription/provider-null state, tenant policy, Operation Profile service
  modes, memberships, and member shell. The overdue scenario preserves its
  transaction-derived savings snapshot on rerun instead of replacing it with a
  seed value. Provisioning creates no password, OTP, bearer
  token, tester credential, custom domain, or provider effect.
- The resulting tenant shells are not authenticated sessions. Session entry must
  use the existing QA accelerator and ordinary short-lived, revocable auth
  contracts; no arbitrary production token import is accepted.
- QA authorization is keyed by a stored token digest and must match the original
  client signal, client kind, contract version, server environment, exact QA
  Domain, active tester credential, expiry, and revocation state. Profile entry
  accepts only the authorization-derived opaque membership selection reference.
- The pending-review baseline is created through the existing
  `createMobileMemberReceiptForSession` service with member self-service access,
  a stable QA-only reference, valid allocation, and normal audit evidence. An
  unchanged rerun reuses the pending receipt instead of creating another.
- The published-profit baseline prepares only its exact QA-owned business period
  in an audited fixture transaction, generates reconciled allocations through
  the existing finance service, and uses the ordinary expected-state/idempotent
  mobile approval and publication commands. It cannot reuse an unrelated
  published period or modify a period containing foreign business rows.
- The overdue baseline uses internal server-owned timestamps—not API input—to
  replay a coherent historical contribution, monthly cycle, member request,
  dual review, disbursement, repayment schedule, and collections refresh. The
  first repayment date must be strictly after the disbursement date.
- The stale baseline sends an outdated expected Operation Profile mode through
  the ordinary compare-and-set command, requires `CONFLICT`, rechecks the exact
  setting is unchanged, and stores one stable linked QA observation.
- The human-readable report contains scenario/result aggregates and explicit
  remaining gaps, never identities, credentials, tokens, or production data.
- The immutable v1 positive-journey registry contains 18 journeys spanning all
  16 required product areas. Each definition names its exact production tRPC
  paths, required role, fixture prerequisites, evidence assertion, and Android
  checkpoint; a router-conformance test fails if any path is missing from the
  assembled application router.
- Activation/auth evidence starts with ordinary recovery request/completion and
  password sign-in contracts. The QA accelerator may then provide governed
  exact-domain entry for the remaining representative roles, but it does not
  replace recovery or password-auth proof.
- The role-switch journey uses one Starter/healthy user with a default Tenant
  Admin membership plus a non-default Member membership. Membership resolution
  must prefer the default inside the resolved tenant, never a row from another
  tenant.
- Registry coverage is not execution evidence. Runtime results must be redacted,
  associated with an authorized exact-domain session, and retain both API
  assertions and the named Android checkpoint without credentials, session
  tokens, provider secrets, or notification payload secrets.
- The contract executor accepts selected journey keys and an injected step
  adapter. It executes in declared order, stops one journey after its first
  blocked/failed step, marks later steps skipped, and maps thrown adapter details
  to `TRANSPORT_UNAVAILABLE`. Receipts expose only journey/area/role/scenario,
  declared contract keys, bounded outcome codes, timestamps, and aggregate
  counts; identity and private transport material are excluded.
- The negative journey contract v1 contains seven categories. Suppressed offline
  mutations must produce zero transport calls. Invoked steps compare the public
  application outcome with `CONFLICT`, `PERMISSION_DENIED`,
  `PRECONDITION_FAILED`, `NOT_FOUND`, or canonical idempotent replay; route
  existence alone is not execution evidence.
- Its sequential executor never sends a suppressed step through the invocation
  adapter. A nonzero verified call becomes `TRANSPORT_WAS_CALLED`; an unexpected
  public result becomes `OUTCOME_MISMATCH`; private adapter failures become
  bounded transport or Android-checkpoint codes and skip later steps.
- The invitation proof calls `qaAccelerator.issueCredential`, `.authorize`,
  `.profiles`, `.enterProfile`, `mobile.admin.access.invite`, and
  `auth.mobile.signOut` in that order, then revokes the temporary credential.
  Its redacted receipt contains only bounded status/count/boolean facts and
  requires the route result, setup handoff, persisted membership, and delivery
  audit to agree.
- The first real adapter proof (`t30-core-v20`) cold-launches the Android
  development client, enters a Starter/healthy Member through the ordinary QA
  accelerator, and calls `mobile.member.home`, `mobile.member.commitments`,
  `mobile.member.shares.list`, and `mobile.member.statement`. Its redacted
  receipt requires four API passes, the native checkpoint, native/API sign-out,
  temporary credential revocation, and revocation of both created mobile
  sessions.
- The second real adapter proof (`t30-share-profit-v10`) enters an
  Enterprise/published-profit Tenant Admin through the same boundary, calls
  `mobile.admin.shareProfitGovernance.workspace` and
  `mobile.admin.shareProfitGovernance.profitDetail`, and requires matching
  published-period, allocation, and completed-entry evidence before native
  summary/detail checkpoints. Native/API sign-out, both credential revocations,
  and both mobile-session revocations pass.
- The third real adapter proof, accepted after its visual gate as
  `t30-subscription-v13`, enters the Starter/healthy
  multi-role identity as Tenant Admin, reads `subscriptions.snapshot`, and
  invokes `subscriptions.requestPlanChange` twice with the same deterministic
  key. Both responses must retain the Standard target and same non-empty intent
  id before Android captures current plan, plan detail, floating confirmation,
  and recorded-result states. Starter remains current until a provider-confirmed
  transition. The exact role accessibility segment prevents selection of the
  same user's Member membership.
- The fourth real adapter proof (`t30-role-switch-v6`) uses one multi-role
  identity to move from Tenant Admin to Member through the ordinary workspace
  selector. It requires replacement-session issuance, role-scoped cache
  isolation, six Android screenshots, native/API sign-out, both credential
  revocations, and all four created mobile-session revocations. The status bar
  is neutral on More, follows the emerald Plan and billing hero while that
  screen is active, and returns to neutral after the role switch.
- The fifth real adapter proof (`t30-admin-charge-final-v6`) enters a Finance
  Officer through the ordinary QA accelerator, calls
  `mobile.admin.charges.workspace` and `mobile.admin.charges.applyCharge`, then
  verifies the Android `admin/charges` result. Acceptance requires exactly one
  charge application, one ledger transaction, two balanced ledger entries, and
  the expected savings snapshot. Its 16 Android checkpoints cover the fixed
  day/month/year calendar sheet, semantic backdrop, Gboard-safe evidence input,
  review, content-sized success sheet, list result, and charge detail. The
  receipt must contain no runtime warnings and must prove cleanup, sign-out,
  both credential revocations, and both session revocations.
- Android secure-field automation verifies focus before entry, compares the
  observed masked length after each key event, retries only an exactly one-digit
  shortfall, and fails closed on overshoot or any larger divergence. Read-only
  UI hierarchy capture may retry three bounded times; interactive commands are
  never replayed. These are driver reliability rules, not authentication bypasses.
- Together the five adapters prove 5/18 positive journeys, not the complete
  matrix.

## Purpose

This file captures payload shapes, response conventions, and contract assumptions.

## How To Use

- Update when request/response schemas or validation rules change.
- Prefer examples and concise field lists.

## Contract Principles

- Include tenant context implicitly from auth, not from untrusted client input alone.
- Return authoritative balances from backend services only.
- Use explicit workflow statuses for requests, approvals, and repayments.
- Keep money fields consistent across endpoints.
- Pending brought-forward member opening positions can transition to `cancelled` through the finance-managed dashboard action. Cancellation is tenant-scoped, audited, does not post ledger entries, and allows the same opening date to be staged again.
- Member registry rows expose `backfillStatus.appliedOpeningBalanceId`; an applied opening position sets `backfillStatus.state` to `applied` just like authoritative historical backfill evidence.

## Mobile reports, statements, and activity

- The catalogue contains the complete fixed report-key vocabulary; the server maps active subscription report/audit depth to per-report `available` and `rowLimit` values. The client can present these values but cannot widen them.
- Admin generation accepts `{ key, requestId, fromDate?, toDate? }`. Tenant, actor, permission, entitlement, and row cap come from the signed server context. The result contains CSV content, safe filename, MIME type, row count, generation timestamp, and a 15-minute expiry over the authenticated response; no credential or content enters a URL.
- Member statement generation accepts only `requestId`; member and tenant identity come from the active member workspace. Staff-selected statement exports remain a separate web/staff contract.
- The mobile client stores ready files only in app cache, removes them on cancel, expiry, permission/session loss, or unmount, and invokes the platform share adapter from a deliberate user action. Raw CSV is not retained in generated-file presentation state.
- Activity accepts bounded date/action/entity/search filters plus an opaque cursor. Results are newest-first and contain actor, authorizer/reviewer where available, affected entity, timestamp, and no more than three allowlisted redacted facts. Arbitrary payloads, credentials, contact details, bank details, document URLs, and secrets are excluded.

## Mobile admin financing operations

- Workspace input is `lane: review|disbursement|activity` plus an optional bounded search term. Tenant, actor, role, permissions, Operation Profile, and entitlement are resolved from the signed server context, never from client ids.
- The workspace response separates the immutable monthly-cycle snapshot from live capacity/deployable health and returns only server-derived blockers, evidence, stats, and allowed actions.
- Cycle update input includes a UUID `commandId`, `expectedState: missing|draft|open|paused|closed`, optional cycle id, target `open|paused|closed`, and bounded evidence note. Pause/resume preserves the first-open snapshot; closed cannot reopen.
- Approval retains the established request-review contract and reruns live product, term, eligibility snapshot, overlap, guarantor, dual-approval, and reserved-capacity checks before materializing an approved loan.
- Disbursement input includes UUID `commandId`, expected loan state, loan id, and optional ISO first-repayment date. Approval is not release authority: deployable funds are rechecked inside the transaction before ledger and schedule evidence is created.
- Completed retries return the canonical idempotent result; mismatched fingerprints, stale expected state, insufficient cash, cross-tenant ids, and duplicate disbursement fail closed.

## Mobile admin project-financing operations

- Workspace input is `lane: review|active|closed` with optional bounded search and opaque cursor. Detail accepts one request UUID. Tenant, actor, role, permissions, Operation Profile, and entitlement come only from the signed server context.
- Review input includes a UUID `commandId`, request id, `expectedState: submitted|under_review`, decision, approved amount/structure, optional term for a repayable facility, and bounded review evidence. Approval cannot retain an undecided structure.
- Activation input includes a UUID `commandId`, request id, and `expectedState: approved`. Only `repayable_facility` creates the approved principal obligation; partnership and profit-sharing activation remains non-repayable evidence.
- Release-evidence input includes a UUID `commandId`, request id, `expectedState: active`, strict date-only release date, bounded reference, and optional bounded note. It cannot initiate a transfer or infer ledger posting.
- Responses expose server-shaped capabilities, boundary and attention messages, timeline, principal paid/outstanding/completion evidence, and repayment rows only where the structure supports repayment. Completed retries return the canonical idempotent result; stale state, cross-tenant ids, mismatched fingerprints, invalid terms, and non-repayable receipt targets fail closed.

## Mobile admin share and profit governance

- Workspace input is `book: share_capital|profit_allocation` with optional bounded search and opaque cursor. Tenant, actor, role, and capabilities come only from the signed server context.
- Share-capital responses preserve the configured `unit_based` or `monthly_history` policy and keep compulsory ownership, optional approved units, pending reserved units, remaining capacity, price snapshot, applications, and immutable ledger evidence separate.
- Share review input includes UUID `commandId`, application id, `expectedState: pending`, decision, bounded review notes, and positive integer `approvedUnits` only for approval. Approval rechecks the tenant policy and available units before exactly-once share-capital posting.
- Profit responses distinguish live/historical source, gross result, reviewed expenses/deductions, distributable amount, allocation total, reconciliation state, pending approvals, and publication state. Detail never returns another tenant's records.
- Profit approval input includes UUID `commandId`, entry id, `expectedState: reviewed`, and bounded notes. Publication input includes UUID `commandId`, entry id, and `expectedState: approved`; publication requires reconciled allocations and rebuilds the authoritative period/member evidence exactly once.
- Member share/statement contracts expose published allocations only. Draft, reviewed, approved-but-unpublished, and other-member allocation evidence does not cross that boundary.
- Completed retries return the canonical idempotent result. Cross-tenant ids, stale expected state, mismatched command fingerprints, unit-limit violations, unreconciled allocations, and duplicate review/publication fail closed.

## Mobile public authentication

- Mobile public auth exposes sign-in and password recovery only; there is no mobile membership activation/sign-up client route.
- `trpc.auth.mobile.signIn` accepts the stable `cooperativeAccessCode` API field plus `password`. Mobile labels the credential `Cooperative number`; tenant context is server-resolved and never client-selected.
- Recovery request accepts `cooperativeNumber`, normalized account `email`, and `deviceId`, and always returns the same production keys and neutral public copy. Missing accounts, resolved-tenant throttling and notification delivery failures do not disclose account existence. Development may additionally return a bounded OTP for QA; production never exposes it.
- Recovery completion accepts the request `challengeId`, six-digit `code`, `cooperativeNumber`, `deviceId`, and new `password`. Evidence is tenant-bound, expires after 30 minutes, is single-use and attempt-limited; the password update and challenge consumption are atomic. Success returns the canonical signed mobile profile/session and completion audit metadata contains no email, OTP, evidence hash or password.

## Mobile device sessions

- Requests declaring `x-trpc-source: mobile` accept only signed mobile-kind bearer tokens with a matching unexpired, unrevoked durable session for the same tenant, user, selected membership, and one-way-hashed device signal. Legacy signed bearer values are not accepted on this boundary.
- Device summaries expose only safe labels, platform/build/app metadata, created/last-used/expiry timestamps, current state, and revocation status. Token hashes, device hashes, bearer values, and raw fingerprints never leave the database boundary.
- Refresh returns a canonical profile with a new signed token only after atomically replacing the current durable session. A duplicate/concurrent refresh loses the expected-state claim and cannot restore revoked access.
- Password recovery, role switching, sign-out, sign-out-all, explicit user/admin revocation, membership removal, member suspension, tenant suspension, and expiry invalidate the affected session contract. Unauthorized responses clear the matching local token plus tenant/user/membership-scoped caches and drafts; responses for an older token do not clear a newer session.

## Current Scaffold Contracts

- `GET /health`
  - `api`: `"ok"`.
  - `auth`: `"session-present"` or `"anonymous"`.
  - `tenantId`: active tenant identifier derived from request headers.
  - `tenantSlug`: resolved tenant slug when available.
  - `resolution`: one of `subdomain`, `hostname`, `fallback`, or `none`.
  - `database`: current DB runtime mode, currently `seed-only` or `database-configured`.
  - `timestamp`: ISO timestamp for the request context.
- `trpc.health.summary`
  - `api`: `"ok"`.
  - `tenantCount`: number of seed tenants currently available.
  - `timestamp`: ISO timestamp.
- `trpc.health.tenant`
  - `tenant`: seed tenant record selected by `tenantId` or fallback default.
- `trpc.workspace.summary`
  - `tenantId`: active tenant identifier.
  - `tenantName`: display name of the active tenant.
  - `dashboard`: dashboard summary object from `packages/domain`.
  - `loanPolicy`: loan policy object from `packages/domain`.
  - `resolvedBy`: tenant-resolution mode used for the request.
- `trpc.analytics.summary`
  - Request fields: optional `period` of `current_month`, `last_3_months`, `last_6_months`, or `last_12_months`; tenant id is derived from the authenticated request context.
  - `workspace`: tenant id, tenant name, currency code, generated timestamp, and selected period label.
  - `primaryMetrics`: deployable funds, collection coverage, portfolio-at-risk rate, action queue total, and pending disbursement amount.
  - `contributionAnalytics`: current expected/received/gap figures, paid/unpaid/staged member rows, and period trend rows.
  - `financingAnalytics`: outstanding principal, due-this-month amount, overdue/PAR buckets, disbursement holds, collections cases, and monthly movement rows.
  - `memberTrustAnalytics`: active members, pending approvals, KYC/document review counts, and failed import count.
  - `shareProfitAnalytics`: share capital, active investment pool count, profit pending allocation, and draft dividend periods.
- `trpc.reports.summary`
  - Request fields: optional `from` and `to` date strings; tenant id and admin access are derived from the authenticated request context.
  - `workspace`: tenant id, tenant name, currency code, generated timestamp, and selected date range.
  - `financeSnapshot`: deployable funds, collection coverage, outstanding principal, overdue amount, pending disbursement count, and portfolio-at-risk metrics.
  - `governanceMetrics`: audit counts, collection follow-up counts, open/high-priority collection cases, KYC pending count, and failed import count.
  - `notificationDelivery`: total, sent, queued, and failed notification counts in the selected range.
  - `complianceWatch`: linked review counts for KYC, documents, failed imports, and pending profit allocation review.
  - `auditPreview`: up to five normalized activity events with a human-readable `actionLabel`, actor, entity, timestamp, and activity-report link.
  - `collectionsPreview`: up to five recent collection follow-ups with member, financing product, status, note, and repayment-workspace link.
  - CSV generation stays in dedicated export routes.
- `trpc.onboarding.status`
  - `status`: `"complete"` or `"incomplete"`.
  - `completedStepCount`: completed onboarding steps.
  - `totalStepCount`: total tracked onboarding steps.
  - `completionRatio`: numeric progress ratio.
  - `primarySiteHostname`: primary public hostname when configured.
  - `primaryDashboardHostname`: legacy dashboard alias hostname when configured; the canonical tenant host now serves both public and authenticated flows.
  - `steps`: labeled step list with completion state.
- `trpc.onboarding.bootstrap`
  - Request creates tenant name, slug, primary admin identity, optional city/state/country profile fields, default policy values, and base routing hostnames.
  - Response returns the created tenant record, owner user id, primary hostnames, and refreshed onboarding state.
- `trpc.onboarding.membershipApprovals`
  - Member-management-only infinite result with a `data` array plus `meta.cursor` and `meta.total`; tenant scope is derived from authenticated context.
  - Input accepts optional cursor, page size, search text, request status, and sort tuple. Supported sort fields are `emailVerifiedAt`, `fullName`, `memberNumber`, `phoneNumber`, `status`, and `submittedAt`.
- `trpc.onboarding.membershipApprovalSummary`
  - Member-management-only tenant summary for pending approval, awaiting verification, approved, rejected, and total request counts.
- `trpc.imports.batches`
  - Tenant-scoped infinite result with a `data` array and `meta.cursor`; input accepts optional cursor, page size, import type, search text, batch status, and a supported sort tuple.
  - Batch rows expose author identity, import type/status, valid and total row counts, existing-match and duplicate counts, a five-row review preview, and any recorded error message.
- `trpc.imports.batch`
  - Request accepts `batchId`; tenant scope comes only from authenticated context.
  - Response returns the same import batch row shape used by the list, including its review preview. Unknown or cross-tenant ids return not found.
- Import staging and apply actions derive authorization from the import kind. Member, collection-source, and loan-product imports require workspace-configuration roles; finance-history imports require finance-management roles.
- Collection-source CSV rows use `name`, `type`, and `externalReference`. Names are compared case-insensitively for in-file duplicates, which are rejected before a batch or registry write. Apply is atomic and returns audit evidence containing created and updated source ids. Existing sources already referenced by collection-source contribution batches cannot have their type or external reference changed through the migration importer.
- Loan-product CSV rows use optional `code` plus `name`, `loanType`, `termMonths`, and `maxSavingsMultiple`. Codes normalize to uppercase; terms must be positive whole months; savings multiples must be greater than zero. Both normalized name and code participate in duplicate and existing-record reconciliation. Existing matches require a server-verified acknowledgement, identity conflicts are rejected, and products referenced by loan requests or loans cannot have their imported policy semantics changed.
- Loan-product direct import is atomic. Staged apply conditionally claims a draft/failed batch, then commits product writes, the batch `applied` status, and audit evidence in one transaction; concurrent requests cannot both apply the same batch, and a failed contender cannot regress an applied batch to failed. Audit metadata includes created and updated ids and before/after policy changes. Existing case-only name/code ambiguity is rejected for live correction before reconciliation.
- `POST /api/signup`
  - Request validates `cooperativeCodePrefix`, `cooperativeName`, `primaryContactFullName`, `primaryContactEmail`, `primaryContactMemberNumber`, `workspaceSlug`, and optional `approvalToken`.
  - `cooperativeCodePrefix` is required, normalized to uppercase, restricted to 3–5 alphabetic characters, and must be globally unique. The public flow derives the new tenant's member-number prefix from it instead of accepting a separate free-form prefix.
  - When `MARKETING_EARLY_ACCESS_ENABLED=true`, `approvalToken` is required and must verify to the same cooperative name and primary contact email before the route sends verification email.
  - Response returns `expiresAt`, `onboardingUrl`, delivery metadata, and the verification email draft.
- `POST /api/early-access`
  - Request validates `cooperativeName`, `primaryContactFullName`, `primaryContactEmail`, optional `phone`, selected `currentSize`, selected `recordSystem`, selected `launchTimeline`, one or more `setupNeeds`, and optional `message` for details not covered by the structured fields.
  - Supported setup areas cover member/balance migration, savings/contributions, shares, interest-free financing, procurement/Foodstuff Purchase, and businesses/profit distribution.
  - Response returns a received message, email delivery metadata, and in development only the generated approval URL.
  - Production error cases: email delivery is not configured, `MARKETING_ADMIN_EMAILS` is missing, or all admin email deliveries fail.
- `GET /api/early-access/approve?token=...`
  - Request validates a signed early access request token from the query string.
  - Successful response sends an approved setup email to the cooperative primary contact and renders a small browser confirmation page.
  - The approved setup URL includes `approvalToken`, which expires after 7 days and is required by `POST /api/signup` whenever early access mode is enabled.
  - Generated development URLs use the configured marketing origin such as `https://halaalvest.localhost` rather than the direct `http://localhost:1440` fallback when Portless is configured.
  - Production signed email URLs for this approval handoff, `POST /api/early-access`, and `POST /api/signup` require an explicitly configured HTTPS marketing root (`MARKETING_APP_URL`, `NEXT_PUBLIC_MARKETING_APP_URL`, then `PLATFORM_ROOT_DOMAIN`). Invalid/missing origins fail closed with `PROVIDER_UNAVAILABLE` (default HTTP 500); Preview detection uses `APP_ENV` or `VERCEL_ENV` and rejects known Production hosts even when `APP_ENV` is absent. Conflicting Preview/Production labels also fail. Request URL fallback remains local-development only. See [the marketing email origin ADR](../decisions/ADR-20260926-trusted-marketing-email-origins.md).
- `POST /api/onboarding`
  - Request validates `cooperativeName`, `cooperativeCodePrefix`, `primaryContactFullName`, `primaryContactEmail`, selected cooperative size range in `currentSize`, `officeAddress`, required `city`, `state`, `country`, `startDate`, admin password, and the signed `token`.
  - The signed token is authoritative for cooperative name, cooperative prefix, workspace slug, cooperative admin identity, and membership number. The route returns HTTP 410 with `The verification link has expired.` when that verified cooperative/workspace identity is no longer available after tenant creation.
  - The route applies server-side tenant policy defaults instead of asking for public policy fields.
  - The selected `currentSize` range is persisted as the existing representative integer, while `officeAddress`, `city`, `state`, `country`, and `startDate` are persisted directly on the tenant record during workspace bootstrap; `region` is also written from `state` for legacy readers.
- `GET /api/signup/availability`
  - Request query fields: `cooperativeCodePrefix`, `cooperativeName`, and `workspaceSlug`.
  - Response reports normalized availability for all three identities. Prefix checks use the same global uniqueness boundary enforced again during tenant creation.
- `trpc.mobile.auth.signIn`
  - Request fields: `cooperativeAccessCode` and `password`; mobile never accepts a client-selected tenant id or slug.
  - The server normalizes and globally resolves the access code, verifies the password, derives the tenant from the matched user, requires an active membership (except the existing platform-owner path), enforces subscription entitlement, and returns the signed mobile profile.
  - Invalid code and invalid password share neutral public failure copy so the endpoint does not disclose which credential exists.
- `POST <tenant-host>/auth/login`
  - Tenant-hosted website sign-in accepts `identifier` plus `password`, where `identifier` may be the tenant user's email or cooperative access code.
  - The resolved custom domain supplies tenant scope before credential lookup. Platform-host login remains email-only unless an explicit tenant is resolved.
- `trpc.notifications.list`
  - array of shared notification payloads built from `@halaalvest/notifications` types.
- `trpc.members.list`
  - Staff-only infinite result with a `data` array and `meta.cursor`, `meta.hasNextPage`, and `meta.hasPreviousPage`; tenant scope is derived from authenticated context and list input accepts optional cursor, page size, search, member type, status, KYC status, joined-date range, sort fields, and mode-aware `migrationStatus` (`pending` or `finalized`).
  - Migration filtering uses the same derived member-readiness contract as member verification: every brought-forward member requires an applied opening position, while historical members who joined before the current month require complete backfill and current-month members have no historical work due.
- `trpc.members.get`
  - Staff-only tenant-scoped member profile lookup by `memberId`; returns no cross-tenant or member-role directory access.
- `trpc.mobile.admin.overview`
  - Request fields: none. Tenant, actor, active membership, and effective role come from the signed request context.
  - Response fields: three authoritative metrics (`deployable-funds`, `collection-coverage`, `portfolio-risk`), up to eight non-zero action-queue items ordered critical before warning before neutral while retaining canonical order within a severity, compliance-watch counts, setup warnings, recent audited activity, and `generatedAt`.
- `trpc.mobile.admin.members.list`
  - Request fields: optional trimmed `search`, exact member `status`, exact `kycStatus`, positive `page`, and `pageSize` from 1 through 50; no tenant identifier.
  - Response fields: bounded member rows, complete filtered-registry summary counts, page metadata, up to three pending onboarding requests, review queues, and generation time. Member rows expose lifecycle status, KYC, Collection Source, linked-login context, compact identity data, and the latest active monthly commitment as the directory's monthly obligation. Complete financial history and obligation evidence remain in the tenant-scoped detail sections.
- `trpc.mobile.admin.members.detail`
  - Request fields: `memberId`; tenant scope remains server-derived. Unknown or cross-tenant records return the same absent detail contract.
  - Response fields: member identity/lifecycle context, authoritative financial metrics, and read-only statement sections used by the member detail screen.
- `trpc.mobile.admin.members.create`
  - Request fields: member number, full name, joined timestamp, member type, and optional contact/profile/monthly-commitment fields.
  - Duplicate member number or linked-login identity returns a user-correctable conflict. Creation retains migration and subscription capacity checks plus transactional audit effects.
- `trpc.mobile.admin.members.updateStatus|updateKyc|reviewOnboarding`
  - Status input requires `memberId`, a legal target status, and bounded non-empty `reviewNotes`. KYC input requires `memberId`, a legal target KYC state, bounded non-empty `kycReviewNotes`, and optional identity-document evidence. Onboarding input requires `requestId`, exact `approved` or `rejected` decision, and bounded non-empty `reviewNotes`.
  - Member lifecycle transitions are server-authorized: exited is terminal; active/inactive/suspended transitions follow the explicit transition matrix; KYC moves through submission/review or resubmission and never jumps directly from not-started to verified. Same-state commands remain idempotent. Every accepted command preserves tenant scoping and audit/notification behavior.
- `trpc.mobile.admin.finance.overview`
  - Optional input accepts a bounded `limit`, one supported queue key, and bounded search text; tenant and capability scope are derived from the signed active workspace.
  - Output includes `state`, `generatedAt`, server-derived `capabilities`, `stats`, `queueCounts`, and queue `items`. Each item carries its queue identity, member context, age, amount, policy evidence, blockers, expected current state, and allowed actions. The mobile client formats these values but never calculates approval risk or authorization.
- `trpc.mobile.admin.finance.*` command procedures and `trpc.mobile.admin.support.*`
  - Every command accepts a UUID `commandId`, exact `expectedState`, record identifier, and action-specific evidence. Final approval/rejection decisions require notes; finance-adjustment review also requires the expected approval state.
  - A deterministic tenant-scoped command receipt claims the command before execution. Completed duplicates replay the saved canonical entity/state result. In-progress or uncertain-finalization duplicates fail closed. A domain failure before confirmed mutation releases its processing claim for a deliberate corrected retry.
  - Collection follow-up returns follow-up state and never posts repayment. Support adjustment review returns governance state and never posts money.
- `trpc.mobile.admin.repaymentOperations.workspace|facility`
  - Workspace accepts one exact lane (`due`, `collections`, or `posted`), optional bounded search, and optional opaque cursor. It returns only the active lane's bounded rows plus full-scope servicing summary, capabilities, generated time, and cursor evidence.
  - Facility accepts one facility id and returns an exact tenant-scoped servicing record with principal/paid/outstanding values, next obligation, schedule rows, posted repayments, and collection evidence. Unknown or cross-tenant ids return the same absent contract.
- `trpc.mobile.admin.repaymentOperations.post`
  - Input requires UUID `commandId`, facility id, positive two-decimal amount, explicit ISO paid date, bounded payment reference, exact expected facility status, and expected outstanding principal.
  - The retry-bounded Serializable command rechecks tenant ownership, active/completed state, outstanding principal, overpayment, reference uniqueness, and idempotency before allocating to earliest unpaid rows and atomically writing repayment, loan, schedule, ledger, audit, and command-receipt evidence.
- `trpc.mobile.admin.repaymentOperations.recordFollowUp`
  - Input requires UUID `commandId`, facility id, expected facility status, exact collection stage and priority, bounded evidence note, and optional bounded next action/promise date.
  - The result is explicitly nonfinancial: it may append collection and audit evidence but cannot change outstanding principal, schedule/payment status, repayment history, or ledger values.
- `trpc.business.list`
  - Staff-only tenant-scoped infinite result with a `data` array and `meta.cursor`, `meta.hasNextPage`, `meta.hasPreviousPage`, and `meta.total`.
  - Request fields accept optional cursor, page size, search text, business status, latest profit status, source type, profit-evidence state, start-date range, dividend period, and a supported sort tuple.
  - Pagination reads one row beyond the requested page and emits a next cursor only when another row exists.
- `trpc.business.setup`
  - Staff-only tenant finance setup and permission contract used by the business registry and URL-backed business sheet.
  - The setup determines allowed create/edit/review/allocation actions and preserves migration and published-allocation locks.
  - Returns `currentProfitSeason` with `id`, `label`, `periodStart`, `periodEnd`, `status`, `canRecordProfit`, and an optional blocking `reason`, plus the saved migration setup mode.
- `trpc.business.summary`
  - Staff-only tenant summary for business counts, capital, realized/allocatable profit, and linked dividend-period filter options.
  - The summary reads tenant finance setup directly and does not repeat the route's migration/setup loader work.
- Dashboard business create/update actions
  - A manual live business may be created before profit is realized; profit entries are optional and can be added later with evidence.
  - Business start/end dates describe the business lifecycle and may predate the current sharing season. End must not precede start.
  - New or edited manual profit dates must be inside the business lifecycle, inside the current writable profit season, and no later than today. The server ignores client season selection and links the authoritative tenant season.
  - Scheduled seasons are created as tenant-scoped drafts on first valid profit when absent. Non-draft, overlapping, or unavailable seasons reject the write.
  - Historical migration/backfill records retain source-specific profit-history behavior and migration controls.
  - Explicit historical dividend-period IDs are accepted only when the period belongs to the authenticated tenant and contains the profit date.
  - Planned, active, completed, archived, manual, backfill, and import records remain in the unified `/business` registry rather than separate future/ongoing pages.
- `trpc.contributions.ledger`
  - Staff-only contribution ledger query with optional member, channel, contribution-date, search, and supported sort input.
  - The DB owns `pageSize + 1` and returns an opaque cursor bound to the requested sort tuple plus deterministic id tie-breaker. The response keeps the full filtered total independent from the current cursor page.
- `trpc.contributions.list`
  - Staff-only paginated contribution result with joined member display fields. Member-role financial history remains self-scoped through dedicated statement/mobile endpoints.
- `trpc.charges.listDefinitions`
  - array of tenant charge definitions with amount, kind, active state, and applicability flags.
- `trpc.charges.chargeLibrary`
  - Request fields: optional `q`, `status`, `frequency`, `valueType`, and supported `sort`; tenant scope is derived from authenticated context.
  - Response fields: a bounded `data` array of filtered charge-definition rows plus `meta.total`. Each row includes current amount, active state, value type, charge frequency, effective date, and dated version history.
  - This endpoint is a configuration-registry query, not an infinite ledger feed. Server and client use the same normalized input and mutations invalidate it instead of polling.
- Manual charge application
  - The client selects a member, active fixed-amount definition, assessed date, collection mode, and note. The server ignores any client amount, resolves the effective dated definition version, and derives the authoritative positive amount before posting.
  - Percentage definitions are excluded from manual application and may only be assessed by a configured workflow with a server-owned basis amount.
- `trpc.paymentReceipts.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, `submittedFrom`, `submittedTo`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `MemberPaymentReceiptRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `memberName`, `paidAt`, `paymentReference`, `status`, `submittedAt`, and `totalAmount`.
  - `meta.cursor` is an opaque, versioned keyset cursor bound to the requested sort field/direction and its stable tie breakers. Clients must pass it through unchanged and must not interpret it as a receipt ID.
- `trpc.paymentReceipts.get`
  - Request fields: `receiptId`.
  - Response fields: one `MemberPaymentReceiptRow` or `null` when the receipt is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed payment receipt sheets so filtered and infinite-loaded table rows can hydrate their review/support detail state independently of the first server-rendered list page.
  - The dashboard list and sheet use exact cache invalidation after receipt submission/review; background polling is not part of the contract.
- `trpc.procurement.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `ProcurementRequestRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `itemName`, `memberName`, `status`, `requestedCost`, `approvedCost`, `estimatedMonthlyRepayment`, `outstandingAmount`, `requestedAt`, and `vendorName`.
- `trpc.procurement.get`
  - Request fields: `procurementRequestId`.
  - Response fields: one `ProcurementRequestRow` or `null` when the request is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed procurement review/purchase sheets so filtered and infinite-loaded table rows can hydrate their selected request independently of the first server-rendered list page.
- `trpc.foodPurchase.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, and staff-only `memberId` and `cycleId` filters; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `FoodPurchaseApplicationRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count. Member-role responses omit member/staff email fields that the member interface does not require.
  - Supported sort fields: `memberName`, `status`, `requestedAmount`, `approvedAmount`, `paidAmount`, `requestedAt`, and `itemDescription`.
  - Pagination uses an opaque keyset cursor bound to the requested sort field/direction and deterministic tie-break values. A cursor cannot be reused with another sort, and nullable amount/item sorts keep null values last without skipping or duplicating equal rows.
- `trpc.foodPurchase.get`
  - Request fields: `foodPurchaseApplicationId`.
  - Response fields: one `FoodPurchaseApplicationRow` or `null` when the application is absent, outside the tenant, or outside the member's own profile scope. Member-role responses use the same email-minimized DTO as the list.
  - Used by URL-backed Foodstuff Purchase application review sheets so filtered and infinite-loaded table rows can hydrate their selected application independently of the first server-rendered list page.
- `trpc.mobile.admin.foodPurchaseOperations.workspace`
  - Request fields: required lane, optional selected cycle id, optional bounded search text, and optional opaque cursor. No tenant or actor identifiers are accepted.
  - Response fields: permission-shaped capabilities, selected cycle and legal transitions, full-scope cycle/application/approved/paid/outstanding/shortfall aggregates, at most 30 application rows, and `nextApplicationCursor`.
  - Search and aggregation are database-owned. Loading another page cannot change the authoritative totals, and cursors cannot be used to escape the signed tenant.
- `trpc.mobile.admin.foodPurchaseOperations.applicationDetail`
  - Request fields: `applicationId` only. The response is the exact tenant-scoped application evidence or `null`.
- `trpc.mobile.admin.foodPurchaseOperations.createCycle|transitionCycle|completeCycle`
  - Every request includes a UUID `commandId`. Create requires date-only period/release dates and a positive bounded amount; transitions require a legal literal transition plus the exact expected cycle state; completion requires `accounting_approved`.
  - Replays return the canonical result only when the command fingerprint matches. Stale state, duplicate period, cross-tenant targets, and illegal terminal transitions fail without partial writes.
- `trpc.mobile.admin.foodPurchaseOperations.reviewApplication`
  - Requires application id, UUID command id, expected `submitted|under_review` state, decision, and review evidence for final decisions. Approval additionally requires positive approved amount and payback months and reuses the cycle-capacity, obligation-cap, immutable-policy, and Serializable claim guards.
- `trpc.mobile.admin.foodPurchaseOperations.submitAccounting|reviewAccounting`
  - Submission requires nonnegative sales, purchase-cost, and operating-expense totals from `intake_closed|accounting_rejected`; review requires expected `accounting_submitted`, an approve/reject decision, and correction guidance on rejection.
  - Accepted accounting is governance evidence only. These commands do not create a ledger posting, member obligation, profit distribution, or dividend allocation.
- `trpc.projectFinancing.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `ProjectFinancingRequestRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `businessName`, `memberName`, `status`, `requestedAmount`, `approvedAmount`, `estimatedMonthlyPayback`, `requestedAt`, and `disbursedAt`.
- `trpc.projectFinancing.get`
  - Request fields: `projectFinancingRequestId`.
  - Response fields: one `ProjectFinancingRequestRow` or `null` when the request is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed project financing review/disbursement sheets so filtered and infinite-loaded table rows can hydrate their selected request independently of the first server-rendered list page.
- `trpc.loans.requests` and `trpc.loans.portfolio`
  - Request fields: optional opaque `cursor`, `pageSize`, `q`, `status`, supported `sort`, and staff-only `memberId`; tenant and member scoping are derived from authenticated context.
  - Response fields: a bounded `data` page plus `meta.cursor`/`meta.hasNextPage`. The cursor is bound to its sort field and direction and must be passed through unchanged.
  - Request sorts support `memberName`, `requestedAt`, and `status`. Portfolio sorts support `memberName`, `loanProductName`, `estimatedMonthlyServicing`, and `status`.
  - Member-role callers are forced to the linked member profile. List DTOs select member identity only, do not expose staff or guarantor emails, and normalize every nested Prisma Decimal to a JSON-safe number before hydration.
- `trpc.loans.request` and `trpc.loans.loan`
  - Request fields: `loanRequestId` or `loanId` respectively.
  - Response fields: one tenant-scoped detail record or `null`; member-role callers are additionally constrained to their linked member profile. Loan products, charges, schedules, repayments, and all monetary fields are returned as plain JSON-safe DTO values.
  - These endpoints hydrate URL-selected, read-only loan details independently of the currently loaded infinite-query page.
- Dashboard loan request/review/guarantor/disbursement actions
  - Request and repayment money must be positive, finite, and limited to two decimal places; terms are positive whole months.
  - Capacity-sensitive request creation, request review, guarantor response, and disbursement run in retry-bounded Serializable transactions with expected-state claims. Review/disbursement enforce legal state transitions and one-time materialization/posting, guarantor evidence is immutable after response, and repayment schedule IDs must belong to the selected loan.
  - Successful client workflows invalidate both loan list query families plus any affected URL-selected request/loan detail, then refresh route-owned capacity summaries; background polling is not part of the contract.
- `trpc.repayments.schedule` and `trpc.repayments.history`
  - Both procedures are finance-only, derive tenant scope from authenticated context, return bounded `data` pages with `meta.cursor`, `meta.hasNextPage`, and `meta.total`, and use opaque cursors bound to the active sort tuple.
  - Schedule input supports `q`, schedule status, collection stage/resolution/assignee, member, due-date range, `collectionsOnly`, and sorts by due date, installment, member name, or status. Collections-only requests always resolve to overdue installments and keep overdue rows with no prior follow-up.
  - History input supports `q`, repayment status, member, paid-date range, and sorts by paid date, member name, amount, or status.
- `trpc.repayments.scheduleItem`, `trpc.repayments.repayment`, and `trpc.repayments.summary`
  - Selected-record procedures return one exact tenant-scoped schedule item or repayment, or `null`; summary returns aggregate servicing totals without loading the full row set.
  - The dashboard uses these procedures for independently hydrated URL-owned details, one active Collections/Schedule/History view, and mutation-driven invalidation without polling.
- Dashboard repayment posting and collections actions
  - Repayment posting runs in a retry-bounded Serializable transaction, rechecks the authoritative outstanding balance, allocates money to the earliest unpaid installments, and stores the first actual allocation as the repayment's schedule link instead of trusting a client-selected row.
  - Ledger, loan-balance, schedule-allocation, repayment, and audit writes commit atomically. Collection follow-up remains a separate non-ledger workflow and composes assignee, stage, and resolution filters within one tenant-scoped relation predicate.
- `trpc.shareApplications.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: a bounded `data` array of `MemberShareApplicationRow` records plus `meta.cursor`, `meta.hasNextPage`, and `meta.total` for the filtered tenant/member result count. The DB owns the `pageSize + 1` read and issues an opaque cursor bound to the active ordering tuple and deterministic ID tie-breaker.
  - Supported sort fields: `memberName`, `status`, `requestedUnits`, `shareValueSnapshot`, `createdAt`, and `reviewedAt`.
- `trpc.shareApplications.get`
  - Request fields: `memberShareApplicationId`.
  - Response fields: one `MemberShareApplicationRow` or `null` when the application is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed additional share application review sheets so filtered and infinite-loaded table rows can hydrate their selected application independently of the first server-rendered list page.
- Dashboard share application mutations
  - Successful create/review workflows invalidate the share-application list and selected detail, await URL-owned sheet closure, and only then refresh server-owned position summaries so the list and unit-position summary cannot diverge; background polling is not part of the contract.
  - Finance review runs in a retry-bounded Serializable transaction, re-reads and conditionally claims the pending application inside the transaction, recalculates the member capacity there, and materializes at most one ledger/audit outcome.
- `trpc.support.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `priority`, `sort`, and staff-only `memberId`, `assignedToUserId`, and `category` filters; tenant and member scoping are derived from authenticated context.
  - Member sessions ignore staff-only member, assignee, and category filters. The server-issued opaque cursor encodes the active ordering tuple and is valid only with the same sort.
  - Response fields: `data` array of `SupportCaseRow` records plus `meta.cursor` for ordering-aware infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `subject`, `status`, `category`, `priority`, `assignedToUser`, `latestReply`, `linkedRecord`, `createdAt`, and `updatedAt`.
- `trpc.support.get`
  - Request fields: `supportCaseId`.
  - Response fields: one `SupportCaseRow` or `null` when the case is absent, outside the tenant, or outside the member's own profile scope. A completed special-savings refund includes its amount, payment date, and reference.
  - Used by URL-backed support update/reply/financial-adjustment sheets so filtered and infinite-loaded table rows can hydrate their selected case independently of the first server-rendered list page.
- Dashboard `settleSupportCaseSpecialSavingsRefundAction`
  - Request fields: `supportCaseId`, positive `amount`, `paidAt`, required external `reference`, and optional `notes`.
  - Requires a finance-management role, live financial writes, a linked member, money-impact intent, approved financial-adjustment review, sufficient special savings, and no prior withdrawal for the case.
  - Posts the member withdrawal and balanced ledger adjustment, records audit evidence, and resolves the support case in a retry-bounded Serializable transaction. The transaction rejects completed cases and duplicate tenant payment references.
- Dashboard/mobile support create actions
  - Optional support attachment links accept an HTTPS URL without credentials or local/literal-IP hosts, or an exact `/api/uploads/{uuid}` private path (at most 1,000 characters). Other schemes, insecure HTTP, malformed paths and control characters are rejected before persistence. Private upload claims still enforce tenant, uploader, purpose and exact message association.
  - Staff and member create actions derive their actor from authenticated context and require the Operation Profile `support_cases` service mode to allow staff or member creation respectively. Existing case reads remain available when creation is blocked.
- `trpc.mobile.member.procurement.list`
  - Response includes the first 20 request rows, `requestNextCursor`, exact member-scoped aggregate summary, server-shaped policy/capability metadata, and `canCreateRequest`. Create availability composes the Operation Profile mode, active-obligation cap, active-financing blocker, member linkage, authoritative operational readiness, and payback/commitment policy while existing history remains readable. Missing readiness fails closed; an unready linked member receives the existing member-verification restriction. The service-level `capability` still describes Operation Profile access, not permission to bypass member prerequisites.
- `trpc.mobile.member.procurement.requests` and `.request`
  - Page request fields: optional opaque `cursor` and `pageSize` from 1 through 50. Detail accepts one UUID `procurementRequestId`. Neither contract accepts tenant or member identity.
  - The server resolves the member from the authenticated tenant/user session, returns normalized `data`, `nextCursor`, and availability `state`, and returns `null` when a detail is absent or outside that exact tenant/member scope.
- Dashboard procurement create actions
  - Staff-created procurement requests send `requestSource: "staff"` to the shared DB workflow and require Operation Profile staff create access.
  - Member-created procurement requests, including mobile member requests, send `requestSource: "member_self_service"` and require Operation Profile member create access.
  - Existing procurement request listing, review, purchase evidence, and repayment schedule visibility remain available for historical records when create access is disabled or read-only.
- `trpc.mobile.member.foodPurchase.list`
  - Response includes the first 20 applications, `applicationNextCursor`, exact application/open-cycle aggregates, server-shaped policy/capability metadata, and `canCreateApplication`. Create availability composes Operation Profile mode, open-cycle policy, active-obligation cap, member linkage, and payback/commitment policy while existing applications remain readable.
- `trpc.mobile.member.foodPurchase.applications` and `.application`
  - Page request fields: optional opaque `cursor` and `pageSize` from 1 through 50. Detail accepts one UUID `foodPurchaseApplicationId`. Tenant/member identity is always session-derived.
  - Responses use member-safe normalized application rows, return the server cursor for the next bounded page, and fail closed with `null` for an absent or out-of-scope detail.
- `trpc.mobile.member.projectFinancing.list`
  - Response includes the first 20 requests, `requestNextCursor`, exact member-scoped totals/outstanding evidence, eligible structures, migration-write availability, and explicit restriction reasons. Structure and migration eligibility remain server-owned.
- `trpc.mobile.member.projectFinancing.requests` and `.request`
  - Page request fields: optional opaque `cursor` and `pageSize` from 1 through 50. Detail accepts one UUID `projectFinancingRequestId`; tenant/member identity is not accepted.
  - The server derives ownership from the active member session and returns `null` outside the signed tenant/member boundary.
- `trpc.mobile.member.commitments`
  - Request fields: none. Tenant, user, active membership, and member identity are derived from the authenticated request.
  - Response fields: the `commitments` section identity, generated timestamp, title/subtitle, empty-state copy, compact recent rows, and separate metrics for active commitment, total savings, voluntary special savings, and posted contribution count.
  - The response is a server-owned read model; the mobile client formats returned values but does not derive balances or combine voluntary savings with the commitment amount.
- `trpc.mobile.member.shares.list`
  - Request fields: none. Tenant, user, active membership, and member identity are derived from the authenticated request.
  - Response fields: compact member identity, tenant share policy, approved/pending unit position with server-derived remaining requestable units, bounded application history, posted share-ledger preview, published-only dividend evidence, and generated timestamp/state.
  - Approved ownership, pending-reserved units, ledger balance, and published dividends remain separate server-owned values. Draft or unpublished profit allocations are not returned.
- `trpc.mobile.member.shares.createApplication`
  - Request fields: positive integer `requestedUnits` and optional bounded `notes`; member and tenant identifiers are not accepted.
  - The command resolves the linked member from authenticated context before delegating to the authoritative share-application workflow and its readiness, policy, capacity, and tenant guards.
- `trpc.mobile.member.shares.applications`
  - Request fields: optional opaque `cursor` and bounded `pageSize` from 1 through 50; no member or tenant identifier.
  - Response fields: normalized application `data`, `nextCursor`, member-safe `total`, and availability `state`.
- `trpc.mobile.member.statement`
  - Request fields: none. Tenant, user, active membership, and member identity are derived from the authenticated request.
  - Response fields: generated timestamp, compact member identity, separate commitment/savings/financing/published-dividend metrics, and profile, commitments, financing, shares, charges, documents, and ledger sections.
  - Statement summaries do not calculate balances in the client. Growing posted ledger history is fetched through `trpc.mobile.member.activity` with `kind: "statement"`.
- `trpc.mobile.member.financing.list`
  - Request fields: none. Tenant, user, active membership, and member identity are derived from authenticated context.
  - Response fields: availability state, generated timestamp, compact member identity, active products, server-owned financing/servicing section, and the first bounded request-history page with `requestNextCursor`.
- `trpc.mobile.member.financing.quote`
  - Request fields: `loanProductId`, positive `requestedAmount`, positive whole `requestedTermMonths`, and optional non-negative `extraMonthlySavingsAmount`; no member or tenant identifier.
  - Response fields: selected product, requested amount/term, eligibility savings base and eligible amount, cycle capacity, pool/deployable funds, server-estimated monthly servicing, effective submission charge amounts and collection modes, fee total, a `chargeQuoteHash`, blockers, warnings, `canSubmit`, and generation time. Percentage charges expose their calculated monetary amount, not the percentage setting.
  - The mobile client may format these values but must not recalculate financial policy. A quote is advisory; `createRequest` repeats all authoritative guards inside the existing command workflow.
- `trpc.mobile.member.financing.requests`
  - Request fields: optional opaque `cursor` and bounded `pageSize` from 1 through 50; no member or tenant identifier.
  - Response fields: member-safe normalized request `data`, `nextCursor`, and availability `state`.
- `trpc.mobile.member.financing.createRequest`
  - Request fields: the quote input plus a required 64-character lowercase SHA-256 `chargeQuoteHash` from the reviewed quote and an optional bounded `purpose`; member and tenant identifiers are derived from the session.
  - The server recomputes the charge fingerprint within the Serializable submission transaction before creating a request or applying any charge. A mismatch fails with a fresh-quote instruction. The hash is a stale-terms check, not an authorization token.
  - Response is the server-confirmed normalized request, including assessed charges and guarantor evidence. Offline or stale clients must preserve a draft and must not dispatch this command.
- `trpc.mobile.member.projectFinancing.quote`
  - Request fields: positive finite `requestedAmount`; member and tenant are derived from the active session.
  - Response fields: the requested amount, server-calculated submission charge amounts and collection modes, total, generation time, and a SHA-256 `chargeQuoteHash`. This quote is advisory until submission.
- `trpc.mobile.member.projectFinancing.createRequest`
  - Request fields include the reviewed 64-character lowercase `chargeQuoteHash`, requested amount, business/structure details, and a UUID submission key. Member and tenant are session-derived.
  - The database recomputes the charge fingerprint within the Serializable transaction before request, audit, or charge writes. Changed terms fail with a fresh-review instruction; duplicate submission keys still return the canonical existing request.
- `trpc.mobile.member.guarantorApprovals.list`
  - Request fields: none. The linked guarantor member is derived from authenticated context.
  - Response fields: availability state, compact member identity, summary counts, and only that member's tenant-scoped pending/answered request evidence.
- `trpc.mobile.member.guarantorApprovals.respond`
  - Request fields: `decisionConfirmed: true`, `guarantorApprovalId`, exact `approved` or `rejected` status, and optional bounded notes; rejected decisions require notes.
  - The command resolves the responding member from the signed session, accepts pending rows only, records audit evidence, and does not allow an answered decision to be overwritten.
- `trpc.mobile.member.receipts.list`
  - Request fields: optional opaque `cursor`; no tenant or member identifier.
  - Response fields: availability `state`, generated timestamp, compact member identity, summary counts, bounded normalized receipt/allocation rows, `nextCursor`, `canCreateReceipt`, `canCreateSupportCase`, and server-shaped category options containing `postable`, `requiresTarget`, target kind, payable target ids/labels, and outstanding amounts.
- `trpc.mobile.member.receipts.create`
  - Request fields: positive `totalAmount`, paid timestamp, optional bounded reference/proof/notes, channel, and one or more positive allocations with category, period intent/month, notes, and only the category-specific target id.
  - Allocation sum must equal the receipt total. Unsupported categories/targets, cross-member targets, duplicate active references, stale operational readiness, and disabled Operation Profile access are rejected by the server. Success returns the canonical staged receipt rather than a client-fabricated optimistic record.
- `trpc.mobile.member.support.list` and `.detail`
  - `list` accepts only an optional opaque cursor and returns availability state, member identity, capability, summary counts, bounded cases, and `nextCursor`. `detail` accepts only `supportCaseId` and returns the exact member-owned case with full messages, linked-record context, money-impact and financial-approval evidence, and resolution summary.
- `trpc.mobile.member.support.create` and `.reply`
  - Create accepts a bounded subject/description, known category, optional money-impact request, and optional typed linked record. Receipt links are ownership-validated. Reply accepts only `supportCaseId`, bounded member message, and optional attachment URL.
  - Both commands derive member/tenant/author from the signed session, remain audited, reject cross-member or terminal records, and return the canonical updated case. Financial-adjustment state remains non-posting governance evidence.
- Dashboard Foodstuff Purchase create actions
  - Staff-created Foodstuff Purchase cycles and applications send `requestSource: "staff"` to the shared DB workflow and require Operation Profile staff create access.
  - Member-created Foodstuff Purchase applications, including mobile member applications, send `requestSource: "member_self_service"` and require Operation Profile member create access.
  - Staff-assisted and member-self-service submissions require the selected member to be operationally ready, accept only open cycles, and reject terminal/accounting-correction cycles even if a legacy open-cycle setting is disabled.
  - Application review and cycle accounting review accept exact status/decision values only. They run in retry-bounded Serializable transactions with atomic state claims; approval also rechecks cycle capacity and the member active-obligation cap before applying approval-triggered charges.
  - Existing Foodstuff Purchase cycle, application, payment, and accounting evidence remains visible when create access is disabled or read-only.
- Dashboard Collection Source batch posting actions
  - `stageCollectionSourceContributionBatchAction` accepts `deductionSourceId`, `year`, `month`, optional `reference`, and optional `notes`, then returns `redirectTo` for the staged batch detail.
  - `updateCollectionSourceContributionBatchRowsAction` accepts `batchId`, one or more `rowId` fields, `status` (`collected`, `exception`, `skipped`, or `staged`), optional `paidAmount`, and optional `exceptionReason`.
  - `postCollectionSourceContributionBatchRowsAction` accepts `batchId`, one or more collected `rowId` fields, optional `reference`, and optional `notes`.
  - All three actions derive tenant and actor from dashboard auth, require live financial writes, require Operation Profile `collection_source_batch_posting` staff create access, and audit staging, row updates, and posting.
- Operation Profile visibility contracts
  - Dashboard shell receives `hiddenNavPaths` from server context and filters role-visible nav links for disabled, unused services.
  - `trpc.reports.summary` includes `exportVisibility`, keyed by export href, so clients can hide disabled, unused service export cards.
  - `trpc.mobile.member.home` includes `services` for Operation Profile-aware mobile service tiles.
  - `trpc.mobile.member.receipts.list` includes `canCreateReceipt`; mobile and web member receipt submission mutations reject when payment receipt self-service is not enabled.
- Mobile Operation Profile administration
  - `trpc.mobile.admin.operationProfile.overview` accepts no tenant id and returns all six service rows with configured mode, effective mode, plain-language consequence, subscription restriction evidence, reviewed/updated timestamps, and bounded policy-limit display values.
  - `trpc.mobile.admin.operationProfile.updateService` accepts `serviceKey`, `expectedAccessMode`, `nextAccessMode`, and optional `changeReason` (trimmed, at most 1000 characters). A restrictive transition requires a non-empty reason. These names match the executable router schema; `expectedMode`/`nextMode` are not transport fields.
  - Update compares the expected service state inside the signed tenant, writes only that service plus review metadata, preserves every unrelated setting, and emits before/after audit evidence. No-op updates return the canonical unchanged profile without an audit event; stale or concurrent compare-and-set misses fail closed.
  - Subscription entitlement is composed read-only: it may make the effective access more restrictive and block writes, but can never enable a service or grant authority beyond the configured Operation Profile and role permission.

## Starter Contract Template

- Endpoint:
- Request fields:
- Response fields:
- Validation rules:
- Error cases:

# QA maintenance contract

- Ticket 30 Android session-cleanup evidence uses a DB-owned, tenant/user/start-time
  scoped aggregate of all matching durable sessions and all non-null revocation
  timestamps. It must not filter a paginated device-management response in memory:
  that list is capped at 25 and may omit newer revoked sessions after repeated QA.
  The internal helper returns counts only, adds no endpoint, and preserves the
  runner's minimum expected-session count and all-revoked requirements. Journey
  callbacks are awaited before session cleanup begins.
- Candidate discovery never grants purge eligibility; adoption stores the QA marker.
- A purge start revalidates the signed preview fingerprint and rejects empty, stale, or provider-blocked work.
- Run responses contain status and aggregate counts only.
- Ticket 30's internal harness cleanup adds no user endpoint. Its preview accepts
  only a validated non-production scenario plan, resolves the exact stable
  harness identities, and returns a fingerprint, bounded scenario keys, blockers,
  and aggregate counts.
- Harness cleanup blocks identity, classification, QA-domain, purge-state,
  credential/session, custom-domain, member-document, and provider-resource
  hazards. Both execution modes revalidate the fingerprint and row `updatedAt`
  values before calling the existing QA marker/delete lifecycle.
- Irreversible execution requires the exact `PURGE TICKET 30 QA HARNESS`
  confirmation. Rollback rehearsal requires the distinct exact
  `REHEARSE TICKET 30 QA HARNESS CLEANUP` confirmation, performs the same
  transaction, verifies zero targets remain inside it, deliberately rolls back,
  and then requires identical fingerprint/counts.
- Human-readable harness reports omit the fingerprint, tenant and identity
  details, cooperative numbers, credentials, sessions, provider identifiers,
  document URLs, and financial details.

# Shared error contract

- REST failures return `{ error: { code, message, referenceId, retryable, action? } }` with an HTTP status derived from the classified transport code.
- tRPC failures replace arbitrary transport messages with professional public copy and include the same envelope at `data.appError`.
- API responses expose `x-request-id`; a valid inbound value is preserved and an invalid or absent value is replaced with a generated UUID.
- Database, provider, stack, query, payload, tenant, member, financial, and identity details never appear in the public envelope.
- Marketing form APIs use the same `{ error: PublicError }` envelope, including deliberately authored validation, conflict, expired-link, and provider-unavailability branches. Form clients read public guidance from `error.message`.
- `POST /api/error-report` accepts only an allowlisted dashboard source plus a valid shared error code and `ERR-*` reference from an authenticated user with an active membership in the resolved tenant. Its audit metadata excludes message, stack, path, component stack, user agent, payload, and identity.
- API request correlation is returned in `x-request-id`. Unexpected Hono failures are owned by the Hono fallback, while tRPC procedure failures are owned by the tRPC adapter and are not recaptured by the outer boundary.
- Marketing caught-route diagnostics are a private operational side effect only; response status and `{ error: PublicError }` remain the complete public contract.

# Tenant subscription contract

- `trpc.subscriptions.snapshot` accepts no tenant identifier. It returns the signed tenant's current provider-neutral plan, effective status/source, trial/current/grace periods, active-member count/limit/remaining capacity, over-cap state, effective entitlements/enforcement, active add-ons, bounded invoices, all requestable plan definitions, cache/source state, and updated timestamp.
- Plan definitions keep monthly subscription, one-time setup, separately quoted add-ons, and provider pass-through costs as distinct categories. The client may format these values but may not infer entitlements or billing success.
- `trpc.subscriptions.requestPlanChange` accepts only a known public `requestedPlanCode` and tenant-scoped `idempotencyKey`. Reuse for another plan is rejected. Success returns the canonical intent id/status, requested plan, checkout availability/URL, and truthful support follow-up.
- First-time Free Beta provisioning anchors the trial to provisioning time. Time-driven beta/trial/past-due/grace/cancelled transitions are reconciled and audited server-side.
- Member login and active-member expansion use the same authoritative effective snapshot in account-access and member-command boundaries; unavailable billing infrastructure fails unsafe entitlement decisions closed while preserving allowed existing administration reads.

# Mobile reports, access, and notification contract

- Admin report responses contain summary metrics, bounded report cards, sanitized activity evidence, and bounded collection follow-ups. They do not recreate editable desktop report tables or accept tenant input.
- Workspace-access responses contain tenant users, their tenant memberships, role coverage, and summary counts. Mobile invitation input deliberately excludes `super_admin`; hiding a CTA is never the authorization boundary.
- A workspace invitation requires a configured tenant cooperative prefix and returns the provisioned user's `cooperativeNumber`, email/name/role, `setupUrl`, and `deliveryStatus` (`sent`, `queued`, `failed`, or `unknown`). Provisioning success is not misreported as failure when downstream delivery/audit fails: the issued number remains available for a manual handoff. Development fixtures use the separate `development_fixture` UI-only status and never claim email delivery.
- Notification responses expose safe title/summary copy rather than raw email bodies or metadata. Deliveries contain `isRead`; summary contains `unread`. Failed delivery copy is bounded and never exposes provider/database details.
- Failed server email delivery evidence now carries only generic `errorMessage: "Email delivery failed."`; provider response bodies and arbitrary transport messages are not stored in tenant delivery audits. Retry logs omit recipients and raw causes, while the internal error boundary retains a safe HTTP status when available. See [`../decisions/ADR-20260925-minimise-email-failure-evidence.md`](../decisions/ADR-20260925-minimise-email-failure-evidence.md).
- Notification read synchronization is an online event command. A successful receipt invalidates its scoped read cache, uses a deterministic actor/tenant/delivery audit id with duplicate skipping, and remains visibly saved if a subsequent refresh fails.
- Push registration accepts a validated provider token, platform, permission state, and optional Expo project id only from an authenticated durable mobile session. The canonical response contains registration state and validation time, never the provider token. Re-registration rotates endpoint ownership safely and records only a token fingerprint in audit metadata.
- Preference responses combine tenant push-channel policy, signed-user choice, subscription availability, and mandatory-category rules. `security` and `transactions` cannot be disabled; optional categories fail closed when unavailable to the tenant or plan.
- Notification action payloads contain only version, notification id, tenant id, intended role, allowlisted action, and optional bounded opaque entity id. The mobile registry revalidates session/tenant/role before routing; exact-record screens independently re-resolve ownership and render an unavailable state when the record no longer exists or is inaccessible.
- Mobile context switching resolves the next signed context before clearing current scoped drafts/read caches; it clears them before persisting/rendering the next context. A denied switch preserves the current context.

# Mobile staff contribution-operations contract

- `trpc.mobile.admin.contributions.workspace` accepts `lane` (`ledger`, `commitments`, or `collections`), optional bounded search, and optional opaque cursor. It returns only that lane's bounded rows, full-scope metrics, capabilities, policy state, generated time, cache-safe display evidence, and the next cursor.
- `member` accepts only `memberId`; `batch` accepts only `batchId`. Both re-resolve tenant ownership and return authoritative expected-state, supported targets/actions, blockers, and exact detail rather than trusting a list-row snapshot.
- Every command accepts a UUID `commandId` and bounded `expectedState`. The server stores a deterministic payload fingerprint; exact retries replay the canonical prior result, while mismatched command reuse and stale expected state fail closed.
- `setPlan` requires a positive amount and effective date; `closePlan` requires an active plan and end date; `updateAllocationPreference` accepts only `manual_split`, `savings_first`, or `loan_first`.
- `recordPayment` accepts explicit non-negative commitment, extra-savings, scheduled-servicing, and extra-loan components plus server-owned target identifiers. Any total remainder follows the stored allocation preference: manual split rejects, savings first adds to special savings, and loan first adds to loan payoff when a valid loan exists or falls back to savings.
- `stageBatch` accepts source, year/month, and bounded optional reference/notes. Source-period uniqueness is authoritative. `updateBatchRows` accepts 1–100 tenant-owned rows and requires a reason for exceptions. `postBatchRows` accepts 1–100 selected collected rows and posts only rows still eligible at command time.
- Mobile may render and persist drafts but must not dispatch writes from offline or visibly stale state. Canonical server results replace local optimistic assumptions after every command.

# Mobile staff charge-operations contract

- `trpc.mobile.admin.charges.workspace` accepts `lane` (`applications`, `levies`, or `rules`), bounded search, optional opaque cursor, and lane-compatible member, purpose, workflow, period, status, and collection-mode filters. Application/levy pages contain at most 30 rows and return `nextCursor`; Rules returns the bounded definition registry.
- `detail` accepts only `applicationId` and re-resolves tenant ownership. It returns member, definition code/name, immutable effective version id/date/rate, amount basis when percentage-based, trigger, collection mode, linked workflow target, posting ledger entries, audit history, and authoritative workspace state.
- `formOptions` returns at most 40 active, tenant-owned member choices plus active manual/monthly definitions. It is picker data, not an authorization boundary.
- `applyCharge` accepts member, definition, assessment time, optional percentage basis/evidence, server-previewed expected amount, UUID command id, and expected state. The server resolves the effective version/rate, recalculates the amount, validates applicability and tenant ownership, and rejects duplicate one-time or same-period monthly applications.
- `settle` accepts a pending separate-payment application, payment time, tenant-unique reference, optional evidence, UUID command id, and expected state. The canonical result follows a balanced cash/income posting and audited state transition.
- `waive` and `reverse` require a reason of at least eight characters, correction permission, UUID command id, and exact expected state. Pending waivers create no synthetic ledger transaction; posted waivers/reversals create corrective ledger evidence rather than deleting the original posting.
- Existing dated charge versions become immutable after the definition has any member application. Operators must add a new dated version instead of rewriting historical evidence.
- Mobile may preserve drafts while offline, but apply, settle, waive, and reverse remain online-only canonical commands; stale reads cannot dispatch them.

## Logly telemetry (2026-09-07)

Published Logly 0.2 batch schema; only coarse `site_visit`/`page_view` events survive the package privacy projection. Missing configuration returns 503; forbidden origin 403; invalid batch 400; oversized batch 413; unavailable collector 502; collector responses retain status. Project identity is always server-selected. [Full boundary](../features/logly-analytics.md).

## Country heat-map forwarding — 2026-09-07

The shared analytics proxy forwards Vercel's `x-vercel-ip-country` as `x-logly-country` only when `VERCEL=1` and the value is an uppercase two-letter code. Logly enforces its exact ISO whitelist; invalid/missing values remain unknown. Browser-supplied `x-logly-country` and raw IP headers are not forwarded. The same edge metadata applies to independently scoped native routes where present. No body field, IP/GPS storage, user identity or consumer database change. Counts reflect the delivery network; old events remain unknown. Focused package tests and TypeScript checks pass; consumer deployment and owner-deferred live acceptance remain outstanding.

## Logly product telemetry — 2026-09-22

- Both web proxies accept published Logly batches (1–25 events, 48 KiB streaming maximum); outbound only `site_visit`/`page_view`, coarse route, random visitor and event IDs, timestamps, visit kind, and empty properties. Project is fixed by deployed surface.
- Android native wire extension accepts source `mobile`, platform `android`, and bounded version/build; outbound only `app_session`/`screen_view`. Actor, campaign, referrer, and arbitrary property fields are discarded.
- Exact per-app origin lists fail closed when absent. Native requires no Origin and uses explicit server-side proxy origin. Trusted Vercel country is forwarded; caller country/IP is not. Collector errors return generic bodies; failures have a four-second upstream deadline.


### Launch privacy/store contracts

Production external-deletion email origin validation now rejects reserved `.invalid`, `.test` and `.example` hosts and documentation `example.com`, `.net` and `.org` hosts, including subdomains, in addition to local/private hosts and non-HTTPS or credential/path-bearing URLs. A misconfigured reserved host therefore leaves the public deletion form unavailable and cannot be used for verification email links. The configured origin must still be checked against the exact deployed target; this syntax guard is not proof of public reachability or delivered email.
Preview additionally rejects the known Production HalaalVest marketing/API/dashboard hosts as external-deletion email origins. The current shared `MARKETING_APP_URL=https://halaalvest.com` cannot produce Preview verification links; a distinct approved Preview origin and delivered-link QA are required.

The native tRPC client sends query inputs through POST bodies so search and other query values are absent from request URLs. The shared `/api/trpc` fetch handler accepts POST query override while preserving existing web GET queries and mutation POSTs. This reduces URL-log exposure; it does not prove there is no processor-side request-body retention.

`accountPrivacy.revocationScope = {requestId: UUID}` is platform-owner-only and reads the complete current membership IDs, cooperative names/slugs and roles for a verified, unrevoked request. `accountPrivacy.revokeAccess = {requestId: UUID, confirmed: true, handoverAndRetentionEvidence: string(20..2000), reviewedMemberships: {id: UUID, tenantId: UUID, role: string}[]}` is operator-only. The serializable write requires the reviewed membership tuples to equal the current complete set, then rechecks the verified request, live platform-owner authority and last-administrator/owner safeguards. A scope change requires a new review before the global login is revoked. The response is `{accessRevoked: true, erasureComplete: false}`; it never means account-data deletion has finished. The operator queue continues to show the request as `processing`. Completion-contact email is kept only in restricted `processingEvidence` after the user account's email is anonymised; retention and notification handling remain open.
`accountPrivacy.processingInventory = {requestId: UUID}` is a read-only platform-owner query available only after access revocation while the request is `processing`. It returns the request ID and 83 selected counts spanning all 75 directly named Prisma user-ID scalars, seven selected member-linked categories and one personal mobile store provider-event count through `purchase.userId`. Member-linked contribution, receipt, financing-request, facility and repayment counts include records created or reviewed by someone else. Backfill, migration, share/profit, tenant/QA, privacy-verifier and session-revoker roles are included alongside account, financial, operational, support, legal and store roles. Counts may overlap on one record; the current privacy request is expected to remain counted. The four credential/session/push/preference survivor categories should be checked for unexpected rows, not treated as a completion certificate. It returns no personal fields or provider payload and explicitly reports `erasureComplete: false`; it does not scan other indirect links, shared data or record contents, processors or backups.
`accountPrivacy.recordProcessingNote = {requestId: UUID, category: member_profile_documents | shared_financial_records | support_notifications_audit | private_uploads | legal_store_records | external_processors_backups | completion_contact, evidence: string(20..2000)}` appends a restricted operator note only to an access-revoked `processing` request. The serializable write preserves existing processing evidence, caps notes at 100, records the operator/server time and a category-only audit event, and returns `{recorded: true, erasureComplete: false, noteCount}`. The inventory query returns these notes to platform owners without the completion-contact email. A note is not an erasure or processor-verification API.
`accountPrivacy.operatorQueue` excludes `processingEvidence`, including the preserved completion-contact email; bulk queue clients receive request identity/status and verification evidence only. Server-side processing retains the evidence for a later approved completion-contact action. The query returns `{data, meta: {cursor}}` with at most 50 requests ordered by `(requestedAt, id)` ascending. A bounded opaque cursor continues after that tuple; malformed cursors are rejected. Processing requests remain visible without trapping newer submissions behind the former 100-row limit. The dashboard explicitly loads additional pages.
Privacy request input is strict `{idempotencyKey: UUID, noticeVersion: string, confirmed: true}`: `noticeVersion` must equal the current `accountPrivacy.notice` response, whose `notice-sha256-` value is derived from the exact in-app notice and complete public deletion-policy source. A changed request surface rejects stale submissions; earlier stored requests retain their recorded version. This fingerprint is not legal approval, policy publication or an erasure-completion claim. Pending/repeated submissions reuse the existing request. User output includes request/support IDs, status and notice/processing timestamps, not operator verification evidence. Cancellation is owner-scoped and only allowed before access revocation for submitted/verified/awaiting-information states. Verification requires 20–2000 trimmed characters of evidence. Store purchase inputs are Apple transaction ID or Google purchase token; server verifies current status before writing existing subscription authority. Raw purchase tokens and receipts are not logged or persisted by this implementation.

The public `/delete-account/verify` confirmation renders the same shared notice scope and four consequences before its explicit checkbox and POST. Its server-provided notice version also covers the public deletion-policy object, including the verification copy. Both authenticated and email-verified request paths therefore expose the shared versioned notice to the requester; an old version still fails closed.

Google deferred plan replacements can return a two-item `subscriptionsv2.get` response for the new token. While the replacement item has no expiry, the server applies only the sole live old-plan item, requires its deferred marker to name the configured queued product, stores the linked new token and acknowledges it. On renewal the sole live new-plan item becomes the entitlement. Ambiguous simultaneous live items, unmapped queued products and missing deferred evidence are rejected; Google sandbox purchase/renewal evidence is still required before launch.

The private applied store-provider event records the verified predecessor token digest. A late suspended predecessor token is a no-op only if an applied Google event for the same tenant names that exact digest as replaced. Unknown tokens continue to fail chain checks; an expiry or revocation of the **current** token continues to update the subscription. Raw Google purchase tokens are never stored in this event.


### Legal acceptance contract
At `MARKETING_STAGE=launch`, `legal.current.acceptanceRequired` is true even when both documents are drafts. Signup and tenant bootstrap reject an unavailable bundle until Terms and Privacy are approved, effective and acknowledged with their exact versions and hashes. The all-draft no-acceptance onboarding path applies only before launch.
`LegalAcknowledgement = {confirmed: true, documents: [{documentType: "terms" | "privacy", documentVersion, contentHash}]}` requires exactly one reference for each current approved effective document. Client content is never trusted. Any content/version/approval hash change requires fresh review. The server retains the content snapshot, source hash, version, action, surface and server timestamp. Acceptance is unique per account/document snapshot across workspaces. After confirming membership in the current workspace, `legal.accepted` reads that account-wide history so the same platform acceptance remains visible when the user switches cooperatives. Terms acceptance and privacy notice acknowledgement are separate actions; neither creates marketing consent. Prelaunch all-draft onboarding preserves the existing flow without recording acceptance and remains a release gate.
Effective Terms/Privacy publication now also requires `approvedSnapshotHash` to match SHA-256 of the exact server-side snapshot: document type, version, effective/approval dates, approval reference and policy text. A changed field, missing/malformed hash, blank version/reference, invalid/future date or effective date before approval removes that document from the published bundle and keeps acceptance unavailable. Marketing renders the same document as non-effective/noindex. The deletion page additionally remains non-effective if its optional `interactiveCopy` is missing or differs from the actual rendered request/verification/email copy, even when a new hash was computed for that detached policy. The hash is a technical binding to owner/legal sign-off, not sign-off itself; see [`../decisions/ADR-20260925-approved-legal-snapshot-binding.md`](../decisions/ADR-20260925-approved-legal-snapshot-binding.md).


The deletion-start `workspaceSlug` field accepts either a normalized workspace slug or bare website hostname (maximum 253 characters). A hostname matches only a verified tenant-domain record, and the same tenant constraint selects the account membership used for the challenge. All matching memberships are inspected: multiple roles in one tenant are valid, but a slug/domain identifier that matches more than one tenant for the same user issues no challenge. The neutral response is preserved for unknown or ambiguous accounts. Initiation rate limiting is keyed to normalized email across workspace aliases, with a separate network limit. See [the verified-domain ADR](../decisions/ADR-20260925-accept-verified-domains-for-external-deletion.md).
The public deletion form enforces the same workspace label pattern and two-character minimum as the API, and trims/lowercases pasted identifiers before submission; the API independently normalizes and validates them. The public deletion-start POST enforces server readiness independently of whether the web form is visible. In production-mode Preview it requires an isolated current database URL, 32+ character challenge secret, trusted HTTPS origin, configured email delivery, console mode and a QA-domain route; Production requires live delivery. An unavailable target returns `PROVIDER_UNAVAILABLE` before creating a challenge or sending email.
A deletion-start attempt retains a verification challenge only after the notification service returns `sent`; `failed` or `queued` outcomes discard it while preserving the neutral public response. Provider acceptance still does not prove inbox delivery.
External account deletion links are valid for 30 minutes and one successful redemption; raw tokens are never stored. A challenge binds tenant/user, token digest and keyed recipient-email hash. A changed account email, expired/used link or failed token is rejected. The public start response is neutral to avoid user enumeration; its copy asks the visitor to check the inbox and use the contact fallback if no link arrives, without promising a send for unknown, ambiguous or failed-delivery cases. Web confirmation returns the existing request reference and true status when one is already active; an email link proves address control only, so operator verification remains separate. Production requires real email delivery and a shared 32+ character `PRIVACY_REQUEST_CHALLENGE_SECRET` on the marketing runtime.

Production deletion verification emails also require an explicitly configured, non-local HTTPS marketing root origin (`MARKETING_APP_URL`, `NEXT_PUBLIC_MARKETING_APP_URL`, or `PLATFORM_ROOT_DOMAIN`). The request URL cannot supply the email destination. Invalid origin configuration fails before a challenge or email is created; local development may use its request origin. See [`../decisions/ADR-20260924-trusted-deletion-email-origin.md`](../decisions/ADR-20260924-trusted-deletion-email-origin.md).

Dashboard evidence uploads advertise 10 MiB. Production bytes use direct private Blob upload, so they do not traverse Vercel's 4.5 MB Function body limit; local multipart POST is development-only. Authenticated intent and token issuance bind tenant/user/purpose/path, restrict MIME and size, and finalization verifies persisted Blob metadata. Production remains disabled until `DASHBOARD_PRIVATE_BLOB_ENABLED=1` plus private store/signing secrets and the record-level authorization, retention, deletion and cross-invocation QA gates in [`../runbooks/private-upload-storage-readiness.md`](../runbooks/private-upload-storage-readiness.md).
The emailed URL carries only the challenge ID in its server-visible query. The one-time token is in the URL fragment, which is read on the client and immediately removed from browser history; it is not passed through server-rendered props or the initial HTTP request.
The workspace match uses a live tenant membership, including a secondary workspace, rather than the user's primary tenant. If more than one active account with that email belongs to the workspace, initiation returns the same neutral response without issuing a link; the operator contact path can resolve the ambiguity. Redemption rechecks current membership in the challenge tenant.

Private upload intent now persists a pending metadata row; token issuance requires that row and an unmarked tenant. Finalization compares provider MIME and exact size with the row, then atomically transitions to uploaded and writes `file.uploaded` audit. A duplicate finalize is idempotent. GET requires uploaded metadata as well as saved-record authorization. Orphan cleanup is bounded and disabled by default; finalized unlinked objects still require an approved retention policy.

Private evidence URLs are claimed in the same transaction as the matching member-document, opening-balance, receipt or support-message write. The claim compares tenant, original uploader, purpose and uploaded state, and only one entity type/UUID can own a private object. GET requires that exact persisted claim plus the saved URL and current user ownership; an unclaimed finalized upload remains unreadable.
Personal mobile store notification persistence after account revocation (29 September): `applyVerifiedMobileAppAccess` accepts a server-verified, system-origin notice for an already owned provider chain or a same-user, same-environment linked successor when the user has `deletedAt`. It rejects mobile/client verification and unlinked new chains for that deleted user. Applied events retain ordering/idempotency checks and carry an audit marker `reconciledAfterAccessRevocation: true`; this is billing reconciliation, not account or mobile-access reactivation. See [the ADR](../decisions/ADR-20260929-reconcile-personal-store-notices-after-access-revocation.md).
Revoked-user personal access snapshot (29 September): `mobileAppAccess.snapshot` includes only purchase rows whose `User.deletedAt` is null. If a retained active store chain belongs to a soft-deleted user, a direct snapshot read returns `accessAllowed: false`, `status: unsubscribed` and no current period; notification reconciliation of that chain remains separate. No extra account lookup is added to the hot path.

## Logly generic business attribution — 1 October 2026

Supersedes the anonymous-only actor/property projection above when `LOGLY_ATTRIBUTION_SECRET` is configured. Browser/native event envelopes accept optional `analyticsContext` (maximum 4096 characters); the local proxy verifies it, rejects invalid submitted contexts with 400, removes the token, and forwards opaque `actorId`, generic `groups.business` key/name/kind and bounded permitted scalar properties. Tokens bind a fixed project and capture interval; delayed delivery is accepted only within 24 hours of capture. Direct client account/group IDs are never authoritative.

Dashboard context GET returns `{ context: { token, scope, expiresAt } | null }` with private/no-store caching. Mobile profile responses add the same optional `analyticsContext` object, issued only after ordinary session/membership validation. Missing attribution configuration returns null and retains anonymous collection. This token grants no business API or reporting access. [Feature and rollout contract](../features/logly-analytics.md).

Custom browser/native event names are validated with the Logly lowercase 80-character contract and survive ingestion alongside automatic navigation events. Permitted scalar metadata is preserved; signed `audience` (`internal`, `business`, `anonymous`), `surface`, and nullable `workspace_role` override submitted values. The browser `useEvents` facade and native `trackProductEvent` return false when capture is unavailable or the name is invalid.

## Logly QA analytics policy — 1 October 2026

Dashboard and Marketing `GET /api/analytics/context` return a private, no-store policy envelope with `enabled: boolean`. Dashboard also returns `context` (signed attribution or null); Marketing carries no authenticated attribution. QA accounts, QA-derived sessions and QA-classified active workspaces receive denial independently of attribution-secret availability. Mobile profiles include server-derived `analyticsEnabled: boolean` alongside `analyticsContext`. Browser `POST /api/analytics` drops authenticated QA submissions with 204 and no collector call. Native public ingest remains credential-free and relies on the native runtime's server-issued policy; analytics authorization is not application authorization. Existing signed proof and origin/project validation still applies to accepted events.


## Release error-contract integration — 10 October 2026

Remaining database query failures use the existing explicit error boundary. Invalid pagination remains validation failure. Private evidence record association now returns expected not-found, permission, precondition or conflict classifications; cross-tenant/uploader access is still rejected, and repeat/concurrent claims cannot be silently accepted. Configuration failures and failed QA fixture invariants use reportable `QueryInfrastructureError` without exposing their internal detail. Evidence permission/conflict tests and local concurrent-finalization tests pass. No endpoint, role grant, payload or ledger calculation changed.

## Domain-only QA authorization — 11 October 2026

`qaAccelerator.authorize.credential` is optional for compatibility. Current Mobile, Dashboard and Marketing submit domain/client identity/contract version only. Omission selects exact server-configured domain authorization with an expiring system receipt; it does not bypass capability, rate limits, eligible QA profile checks or client-bound authorization. Legacy credential input remains accepted. The response remains `{ authorizationToken, expiresAt, qaDomain }`. Production fails closed.
