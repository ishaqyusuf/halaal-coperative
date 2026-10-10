# API Endpoints

Personal review-access endpoints (29 September): `mobileAppAccess.issueReviewGrant` and `mobileAppAccess.revokeReviewGrant` are platform-owner-only mutations for synthetic QA review accounts. They use database-verified actor/target checks and audit events. `mobileAppAccess.snapshot` can return an active `review_grant` for the selected QA tenant/environment; an ordinary unpaid user still receives the paywall state. There is no public grant endpoint.

Personal mobile subscription continuation (28 September): `mobileAppAccess.catalog` now also returns `restorableProductIds` when new offers are gated, so an existing purchase can still be found and verified. Its `snapshot` adds `accessEndsAt` for locally enforced grace/expiry timing. Signed-mobile tRPC calls to ordinary feature endpoints require current personal access; `auth.mobile.*`, `mobileAppAccess.*`, `accountPrivacy.*`, `legal.*`, `support.*`, and scoped mobile member/admin support remain reachable for recovery. The shared `/billing/store-notifications/apple` and `/google` endpoints now dispatch verified personal products to personal entitlement state and keep historical tenant products on the old writer; Google acknowledgment follows applied personal state. Mobile-source headers alone grant no exemption.

## Personal mobile app access source — 28 September 2026

The superseded `trpc.subscriptions.storeCatalog` now always returns an empty new-offer list. It keeps the historical tenant purchase binding for reconciliation of any existing receipt; it cannot sell monthly Starter/Standard/Growth native products even if the old switch is set.

- `trpc.mobileAppAccess.catalog({ store })` returns the signed user's stable UUID binding and configured personal six-month/yearly products. New offers require the separate `MOBILE_APP_BILLING_SALES_ENABLED` switch and the existing effective public-policy gate in Production; eligible classified QA tenants may see sandbox offers. An empty list still permits an existing purchase to be restored.
- `trpc.mobileAppAccess.snapshot` returns only the signed user's current paid/grace app-access decision within the active tenant and configured store environment.
- `trpc.mobileAppAccess.verifyPurchase` accepts an Apple transaction ID or Google purchase token, re-queries current signed/provider state, checks the individual user/tenant binding, applies ordered evidence, then acknowledges an applied Google purchase if required. It does not change the tenant software plan or finance ledger. Signed-device QA remains pending.

`POST /billing/store-notifications/google` now treats an unfamiliar decoded RTDN top-level key as a retryable 503, including when a recognized subscription event is also present. It performs no Play lookup, entitlement update or acknowledgment for that message. Authentication and the existing documented event kinds are unchanged; monitored redelivery and operator review are required before accepting a new Google event shape.

## Google purchase acknowledgment guard — 28 September 2026

- `trpc.subscriptions.verifyStorePurchase` now acknowledges a Google token only after verified evidence was actually applied to the signed tenant's subscription. A verified but unapplied event returns `{ verified: true, applied: false }` without acknowledgment, preserving the client's Restore/support path. `POST /billing/store-notifications/google` similarly withholds acknowledgment and returns retryable HTTP 503 when Play requires acknowledgment but persistence reports `applied: false`; a verified event that does not need acknowledgment retains its normal response. This avoids claiming a grant that did not occur. The relevant token must still be reconciled promptly or Play can automatically refund an unacknowledged purchase; no live provider transaction has tested this path.

## Platform Google refund-review queue — 28 September 2026

- `trpc.storeRefundReviews.queue({ cursor? })` is a platform-owner-only, read-only listing of up to 30 pending Google `pending_refund_review.received` provider events per page, ordered by provider event time and event ID. It returns event/order references, reason code, claimed account binding, receipt and conservative review-deadline timestamps, plus tracked push count and last-observed time. Older rows without counted deliveries return null for those two fields. It never returns the pending-refund token, encrypted token, token digest or full provider payload. Invalid cursors fail closed. The dashboard route `/platform/refund-reviews` also checks platform-owner access before rendering. This is an intake view, not a Google `ReviewRefund` decision or response.

## Mobile store offer gate — 25 September 2026

Superseded on 28 September: historical behavior below is retained as context; the tenant catalog now returns no new offers in either environment.

- `trpc.subscriptions.storeCatalog({ store })` still requires tenant `manage_subscription`. It returns no new products while Production public policies are draft/incomplete or `STORE_BILLING_SALES_ENABLED` is not `true`, but retains the signed tenant account binding for existing-purchase restoration. Sandbox offers and restoration require an active QA-classified tenant with a QA source domain; unknown billing environment returns neither binding nor offers. Purchase verification remains independently available so an existing charge can be reconciled.

## Source additions — 2026-09-07 (verification deferred)

- `trpc.subscriptions.checkoutStatus({ intentId })`: read a checkout intent in
  the signed tenant under `manage_subscription`; foreign/missing ids return
  `NOT_FOUND`. Mobile-origin intents return a null hosted checkout URL. No
  mutation or client-return payment confirmation.
- Financing and repayment admin `workspace` queries accept optional bounded
  opaque `cursor` and return `nextCursor`. Permissions remain unchanged.


## QA accelerator (local, development, preview only)

- `trpc.qaAccelerator.capability` — public version/capability negotiation; returns unavailable outside authorized non-production environments.
- `trpc.qaAccelerator.authorize` — exchanges an exact QA Domain plus tester credential for a bounded client authorization; raw credentials and passwords are never returned.
- `trpc.qaAccelerator.profiles` — validates the client-bound authorization and lists eligible active memberships from the exact QA-classified domain.
- `trpc.qaAccelerator.enterProfile` — reauthorizes the selected membership and mints the ordinary mobile bearer or web signed session.
- `trpc.qaAccelerator.issueCredential` / `revokeCredential` — platform-owner-only credential lifecycle operations.
- Dashboard `GET|POST /auth/qa` and marketing `GET|POST /api/qa-access` keep authorization material in HttpOnly, SameSite, host-scoped cookies.

## Purpose

This file tracks the public and internal API surface of the platform.

## How To Use

- Add or update entries when routes or actions change.
- Keep descriptions short and behavior-focused.

## Proposed Endpoint Areas

- Auth and session.
- Tenant onboarding.
- Member management.
- Contributions.
- Charges.
- Loan requests and approvals.
- Repayments.
- Statements and reports.
- Dashboard summaries.

## Current Scaffold Endpoints

### Mobile admin financing operations

- `TRPC /trpc/mobile.admin.financingOperations.workspace`
  - Returns one tenant-scoped `review`, `disbursement`, or `activity` lane with the immutable current-cycle snapshot, live deployable/capacity health, blockers, evidence, counts, and role-shaped allowed actions.
- `TRPC /trpc/mobile.admin.financingOperations.updateCycle`
  - Opens, pauses, resumes, or closes the current financing cycle using UUID command id, expected state, optional cycle id, and evidence note. Closed is terminal and resume does not rewrite the snapshot.
- `TRPC /trpc/mobile.admin.finance.reviewFinancingRequest`
  - Reuses the governed finance review command with expected request state and evidence; final approval reruns guarantor, dual-approval, eligibility, product, term, overlap, and capacity checks.
- `TRPC /trpc/mobile.admin.financingOperations.disburse`
  - Disburses one approved loan with expected state, UUID command id, and optional first-repayment date after a fresh transactional deployable-funds check.

### Mobile admin project-financing operations

- `TRPC /trpc/mobile.admin.projectFinancingOperations.workspace|detail`
  - Returns a bounded tenant-scoped Review, Active, or Closed lane and independently hydrated request detail with structure, review, activation, release, paid/outstanding, completion, capability, boundary, attention, timeline, and repayment evidence.
- `TRPC /trpc/mobile.admin.projectFinancingOperations.review`
  - Moves a submitted or under-review request through the governed review decision using expected state and a UUID command id.
- `TRPC /trpc/mobile.admin.projectFinancingOperations.activate`
  - Activates one approved structure using expected state and a UUID command id; only repayable facilities materialize an approved principal obligation.
- `TRPC /trpc/mobile.admin.projectFinancingOperations.recordDisbursement`
  - Records bounded release date, reference, and note evidence for an active structure. It does not initiate a bank transfer or create an unapproved ledger posting.

### Mobile admin share and profit governance

- `TRPC /trpc/mobile.admin.shareProfitGovernance.workspace`
  - Returns one bounded tenant-scoped `share_capital` or `profit_allocation` book with explicit share-policy/profit-period facts, role-shaped capabilities, optional server search, and opaque continuation cursor.
- `TRPC /trpc/mobile.admin.shareProfitGovernance.shareDetail|profitDetail`
  - Returns exact tenant-owned share-application or profit-period governance evidence without granting mutation authority. Member allocations remain hidden until publication.
- `TRPC /trpc/mobile.admin.shareProfitGovernance.reviewShare`
  - Approves or rejects one pending optional-share application through expected state, UUID command id, and bounded review evidence. Approval rechecks capacity and posts share capital exactly once.
- `TRPC /trpc/mobile.admin.shareProfitGovernance.approveProfit`
  - Approves one reviewed, reconciled business-profit entry through expected state, UUID command id, and bounded approval evidence.
- `TRPC /trpc/mobile.admin.shareProfitGovernance.publishProfit`
  - Publishes one approved profit entry and its reconciled member allocations through an idempotent tenant-scoped command; only then can member contracts expose the allocation evidence.

### Mobile admin repayment operations

- `TRPC /trpc/mobile.admin.repaymentOperations.workspace`
  - Returns one bounded tenant-scoped `due`, `collections`, or `posted` lane with summary totals, capabilities, generated time, active facilities, earliest-obligation ordering, and optional bounded search/cursor state.
- `TRPC /trpc/mobile.admin.repaymentOperations.facility`
  - Returns exact tenant-scoped facility principal, paid/outstanding values, status, next obligation, schedule rows, posted repayments, nonfinancial collection evidence, and role-shaped actions.
- `TRPC /trpc/mobile.admin.repaymentOperations.post`
  - Posts one repayment using a UUID command id, expected facility status/outstanding principal, positive amount, explicit paid date, and bounded unique reference. The server selects and allocates against the earliest unpaid obligations.
- `TRPC /trpc/mobile.admin.repaymentOperations.recordFollowUp`
  - Records bounded collection stage, priority, next action, promise date, and evidence note under a UUID command id without changing principal, repayment, schedule, or ledger values.

- `TRPC /trpc/auth.mobile.signIn`
  - Purpose: resolve a globally unique Cooperative number, validate password, and return the canonical tenant/membership-scoped mobile session.
  - Notes: the API field remains `cooperativeAccessCode`; mobile briefly presents the resolved cooperative identity before persisting the returned session.
- `TRPC /trpc/auth.mobile.recovery.request|complete`
  - Purpose: issue neutral, tenant-bound recovery evidence and complete a single-use password reset into a canonical signed session.
  - Notes: mobile accepts Cooperative number plus account email for request, then challenge reference, six-digit OTP, and new password for completion. Request is persistently rate-limited by account, explicit mobile device, network and resolved tenant; production response shape remains neutral for missing accounts, tenant throttling and delivery failure. Mobile exposes no membership activation/sign-up endpoint or executable activation command.
- `TRPC /trpc/mobile.sessions.list|refresh|revoke|revokeAll`
  - Purpose: list the signed user's current/recent device access, rotate the current durable token, revoke one owned session, or revoke every owned mobile session.
  - Notes: tenant, user, current token, and device signal come from the authenticated mobile request. Refresh replaces exactly one active token and rejects replay. Revoking current/all access requires the mobile client to clear its secure session, scoped read cache, and drafts.
- `TRPC /trpc/mobile.sessions.adminList|adminRevoke|adminRevokeAll`
  - Purpose: let authorized tenant administrators inspect or revoke a tenant user's mobile access after a security incident.
  - Notes: requires `manage_roles`; target users/sessions remain tenant-scoped and every revocation is audited.

- `GET /`
  - Purpose: basic API status message.
- `GET /health`
  - Purpose: health response with request-context information.
  - Notes: includes tenant resolution and DB runtime mode.
- `TRPC /trpc/health.summary`
  - Purpose: lightweight API and tenant count health summary.
- `TRPC /trpc/health.tenant`
  - Purpose: return a seed tenant snapshot for setup flows.
- `TRPC /trpc/workspace.summary`
  - Purpose: tenant dashboard summary and tenant policy derived from shared domain modules.
- `TRPC /trpc/analytics.summary`
  - Purpose: tenant-scoped cooperative analytics summary for contribution pacing, financing risk, member trust/compliance, and share-profit governance.
  - Notes: accepts an optional period of `current_month`, `last_3_months`, `last_6_months`, or `last_12_months`; defaults to `last_6_months`.
- `TRPC /trpc/reports.summary`
  - Purpose: tenant-admin reporting summary for finance snapshot, export catalog context, audit evidence, collections follow-up, notification delivery, and compliance watch.
  - Notes: accepts optional `from` and `to` date strings; tenant context and report access are derived from the authenticated request.
- `TRPC /trpc/onboarding.status`
  - Purpose: return onboarding progress for the active tenant, including domain, primary admin contact, policy, and ledger bootstrap state.
- `TRPC /trpc/onboarding.bootstrap`
  - Purpose: create a new tenant workspace with primary domains, tenant-admin contact, default policy, and baseline ledger accounts.
- `TRPC /trpc/onboarding.membershipApprovals|membershipApprovalSummary`
  - Purpose: list and summarize tenant membership signup requests for the Midday-style approval queue.
  - Notes: both procedures require the shared `manage_members` permission; list input supports URL-backed search, status, sort, and cursor pagination.
- `POST /api/signup`
  - Launch-stage gate: if the approved effective Terms/Privacy bundle is unavailable, rejects before availability checks, token minting or verification email delivery. Prelaunch all-draft requests retain the existing private setup path.
  - Purpose: validate the private cooperative setup intent, verify early access approval when `MARKETING_EARLY_ACCESS_ENABLED=true`, mint a signed onboarding token, and build the verification email draft for the cooperative primary contact.
  - Notes: requires a globally unique 3–5-letter cooperative prefix and is implemented as `apps/marketing/app/api/signup/route.ts` because the full auth/session stack is not in place yet.
- `GET /api/signup/availability`
  - Purpose: check normalized cooperative prefix, cooperative name, and workspace-subdomain availability before setup submission.
  - Notes: availability is advisory; onboarding bootstrap repeats all uniqueness checks transactionally.
- `POST /api/early-access`
  - Purpose: capture accountable contact details plus structured cooperative size, current record system, setup timeline, and setup needs, then email configured platform admins a signed approval API link.
  - Notes: production requires email delivery plus `MARKETING_ADMIN_EMAILS`.
- `GET /api/early-access/approve?token=...`
  - Purpose: verify the signed admin approval token and send the cooperative primary contact an approved setup link.
  - Notes: the link is bearer-style and sends the approval email when opened. Local development links should use the configured marketing host, e.g. `http://halaalvest.localhost/api/early-access/approve?...`.
- `POST /api/onboarding`
  - Purpose: verify the signed signup token and provision the tenant workspace from a simplified cooperative profile payload.
  - Notes: implemented as `apps/marketing/app/api/onboarding/route.ts` and backed directly by `createTenantWorkspaceBootstrap`; returns HTTP 410 when the verified cooperative name or reserved workspace slug has already been used, making a completed workspace link single-use.
- `TRPC /trpc/mobile.auth.signIn`
  - Purpose: resolve a mobile user and tenant from a globally unique cooperative access code plus password, then issue the entitled signed mobile profile.
  - Notes: tenant identity is never accepted from mobile input; invalid credentials use neutral failure copy and public/tenant rate limits remain enforced.
- `POST <tenant-host>/auth/login`
  - Purpose: authenticate a custom-domain website user with email or cooperative access code plus password inside the host-resolved tenant.
  - Notes: the platform host remains email-only when no tenant domain is resolved.
- `TRPC /trpc/notifications.list`
  - Purpose: return sample notification payloads using the shared notification registry.
- `TRPC /trpc/members.list|get|create|update|updateStatus`
  - Purpose: list and manage tenant member records.
- `TRPC /trpc/mobile.admin.overview`
  - Purpose: return the authorized staff mobile exception dashboard with deployable funds, collection coverage, portfolio risk, severity-ordered action queues, compliance gaps, setup warnings, and recent audited activity.
  - Notes: tenant context comes from the signed active workspace and access requires the shared `manage_members` permission.
- `TRPC /trpc/mobile.admin.members.list|detail|create|updateStatus|updateKyc|reviewOnboarding`
  - Purpose: provide the feature-owned staff mobile member directory, detail, creation, lifecycle, KYC, and onboarding-review boundary.
  - Notes: list input supports bounded pages plus search, member-status, and KYC filters. All procedures require `manage_members`; commands derive tenant and actor from the signed session, require explicit review notes, and preserve the authoritative audit, notification, migration, subscription, and lifecycle guards.
  - Notes: `list` and `get` require an operations-officer-or-higher staff role; tenant identity is derived from the authenticated context. Member-role accounts do not receive tenant-wide member records. `list` accepts the URL-backed, mode-aware `migrationStatus=pending|finalized` filter and preserves derived filtering across cursor pagination.
- `TRPC /trpc/subscriptions.snapshot`
  - Purpose: return the signed tenant's provider-neutral subscription read model, including plan, effective lifecycle status, billing/trial/grace periods, active-member usage/limit, effective entitlements, add-ons, invoices, available plans, and source/fallback state.
  - Notes: requires `manage_subscription`; accepts no tenant input. Billing infrastructure failure returns the explicit fail-safe snapshot instead of silently enabling member login or expansion.
- `TRPC /trpc/subscriptions.requestPlanChange`
  - Purpose: record a tenant-scoped idempotent plan-change/checkout intent for a public plan.
  - Notes: requires `manage_subscription`; accepts `requestedPlanCode` plus bounded `idempotencyKey`. A missing checkout URL returns truthful billing-support follow-up and never claims payment or plan activation.
- `TRPC /trpc/mobile.admin.operationProfile.overview`
  - Purpose: return the signed tenant's six-service Operation Profile, configured and subscription-effective modes, review/update evidence, and mobile-relevant policy limits.
  - Notes: requires `manage_operation_profile`; accepts no tenant input. Subscription restriction may narrow an effective mode but never widens a stricter configured mode.
- `TRPC /trpc/mobile.admin.operationProfile.updateService`
  - Purpose: update exactly one Operation Profile service mode through a deliberate admin review.
  - Notes: requires `manage_operation_profile`; accepts service key, expected mode, next mode, and bounded reason. Tenant and actor come from the signed workspace; restrictive changes require a reason, stale/concurrent expected state is rejected, unrelated services are preserved, and before/after evidence is audited.
- `TRPC /trpc/mobile.admin.finance.overview|reviewReceipt|reviewFinancingRequest|reviewProcurementRequest|reviewFoodPurchaseApplication|reviewProjectFinancingRequest|reviewShareApplication|recordCollectionFollowUp`
  - Purpose: provide one feature-owned, tenant-scoped staff work queue and deliberate command boundary for finance and operational exceptions.
  - Notes: the overview returns server-computed member context, age, amount, policy evidence, blockers, current state, and role-specific allowed actions. Every command requires an expected state and UUID command receipt; final decisions require review evidence and return a canonical server result.
- `TRPC /trpc/mobile.admin.support.reply|updateStatus|reviewFinancialAdjustment`
  - Purpose: manage staff support replies, state transitions, and finance governance decisions from the same mobile work-queue feature.
  - Notes: support financial-adjustment review records approval evidence only and cannot post, reverse, waive, settle, or rewrite money. Any settlement remains a separate finance workflow.
- `TRPC /trpc/mobile.admin.charges.workspace|detail|formOptions`
  - Purpose: provide tenant-scoped Applications, Monthly levies, and Rules lanes, exact charge detail, and bounded member/definition picker data for authorized staff.
  - Notes: workspace search/filter/cursor state is server-owned; detail resolves the immutable effective dated version, workflow target, posting ledger, and audit history. Tenant identity comes only from the signed active workspace.
- `TRPC /trpc/mobile.admin.charges.applyCharge|settle|waive|reverse`
  - Purpose: apply a supported manual charge or levy, settle a pending separate-payment charge, or record a governed waiver/reversal.
  - Notes: every command requires a UUID receipt and expected state. Manage and correction permissions remain distinct; the server validates tenant ownership, effective definition/version, target, amount, duplicate policy, payment-reference uniqueness, legal transition, reason/evidence, and any balanced corrective posting.
- `TRPC /trpc/imports.batches|batch`
  - Purpose: page tenant import batches and resolve the exact URL-selected batch for review or apply workflows.
  - Notes: tenant identity is derived from authenticated context. `batches` accepts import type, status, search, sort, cursor, and page size; `batch` accepts only the batch id and rejects records outside the active tenant.
- `Dashboard actions /imports/stage|apply|deduction-sources|loan-products`
  - Purpose: stage, review, and atomically apply migration CSV data under the import-kind permission policy.
  - Notes: collection-source imports require workspace-configuration authorization, reject duplicate names server-side, preserve canonical external references, protect sources already used by posted collection batches from semantic mutation, and revalidate contribution/source consumers after success.
  - Notes: loan-product imports require workspace-configuration authorization, preserve normalized optional codes, reject unsafe terms/multiples and duplicate name/code identities server-side, require explicit acknowledgement for existing matches, protect policies already referenced by loan records, and atomically apply product plus batch status changes. Successful writes revalidate loan and finance-settings consumers.
- `TRPC /trpc/contributions.list|record|memberHistory|memberSavings`
  - Purpose: list and post contributions plus retrieve member savings history.
- `TRPC /trpc/charges.listDefinitions|createDefinition|updateDefinition`
  - Purpose: manage tenant charge definitions.
- `TRPC /trpc/charges.chargeLibrary`
  - Purpose: return the bounded, tenant-scoped operational charge registry with URL-owned search, status, frequency, value-type, and sort controls plus dated definition history.
  - Notes: the dashboard awaits and hydrates this query, invalidates it after mutations, and does not use polling or artificial infinite pagination.
- `TRPC /trpc/paymentReceipts.list|get`
  - Purpose: list tenant/member payment receipts for the Midday-style dashboard table and hydrate the URL-selected receipt sheet.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member.
- `TRPC /trpc/procurement.list|get`
  - Purpose: list tenant/member procurement requests for the Midday-style dashboard table and hydrate the URL-selected review/purchase sheet.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member.
- `TRPC /trpc/foodPurchase.list|get`
  - Purpose: list tenant/member Foodstuff Purchase applications for the Midday-style dashboard table and hydrate the URL-selected application review sheet.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member, cycle, status, and search text.
- `TRPC /trpc/projectFinancing.list|get`
  - Purpose: list tenant/member project financing requests for the Midday-style dashboard table and hydrate URL-selected review/disbursement sheets.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member, status, and search text.
- `TRPC /trpc/mobile.member.procurement.list|requests|request`
  - Purpose: return the mobile member procurement capability/policy overview, bounded cursor history, and exact selected-request detail.
  - Notes: page size is capped at 50; list defaults to the first 20 rows; tenant, user, and linked member scope come only from the authenticated member workspace.
- `TRPC /trpc/mobile.member.foodPurchase.list|applications|application`
  - Purpose: return the Foodstuff Purchase mobile overview, open-cycle/policy state, bounded application history, and exact selected-application detail.
  - Notes: access-mode restrictions never hide existing member records, and no client-selected tenant/member identity is accepted.
- `TRPC /trpc/mobile.admin.foodPurchaseOperations.workspace|applicationDetail`
  - Purpose: return the authorized staff Foodstuff Purchase cycle desk, permission-shaped legal actions, full-cycle allocation/payment totals and shortfall, a bounded server-filtered application queue, and exact selected-application evidence.
  - Notes: `workspace` returns at most 30 applications plus an opaque continuation cursor. Tenant and staff identity come only from the signed active workspace; visibility requires `view_admin_work_queue` plus at least one Foodstuff Purchase operating capability.
- `TRPC /trpc/mobile.admin.foodPurchaseOperations.createCycle|transitionCycle|reviewApplication|submitAccounting|reviewAccounting|completeCycle`
  - Purpose: record committee release evidence, control intake, review applications, submit/review committee accounting, and complete a legally eligible cycle.
  - Notes: each command requires its dedicated named permission, UUID command receipt, expected state, tenant-owned target, and bounded evidence. Release/accounting evidence cannot post cash, obligations, profit distributions, or dividends.
- `TRPC /trpc/mobile.member.projectFinancing.list|requests|request`
  - Purpose: return the project-financing mobile overview, eligible structures/migration restriction, bounded cursor history, and exact selected-request detail.
  - Notes: summaries are full member-scoped database aggregates rather than totals derived from the bounded first page.
- `TRPC /trpc/repayments.schedule|scheduleItem|history|repayment|summary`
  - Purpose: provide finance-only, tenant-scoped repayment schedule, collections, posted-history, exact detail, and aggregate summary read models for the tabbed Repayments workspace.
  - Notes: list procedures use sort-bound opaque cursors and bounded pages; selected records are resolved independently of the active page; successful writes invalidate the affected lists/details/summary instead of polling.
- `TRPC /trpc/shareApplications.list|get`
  - Purpose: list tenant/member additional share applications for the Midday-style dashboard table and hydrate URL-selected review sheets.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member, status, and search text.
- `TRPC /trpc/support.list|get`
  - Purpose: list tenant/member support cases for the Midday-style dashboard table and hydrate URL-selected update/reply/financial-adjustment sheets.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile and ignore staff-only filters; staff requests are tenant-scoped and may filter by member, assignee, category, status, and priority. Infinite loading uses a server-issued ordering-aware cursor. Completed special-savings refunds include compact withdrawal evidence.
- Dashboard action `settleSupportCaseSpecialSavingsRefundAction`
  - Purpose: let finance post a one-time, support-linked special-savings refund after financial-adjustment approval.
  - Notes: validates live-write and tenant/member boundaries, available special savings, payment evidence, completed-case state, duplicate settlement, and tenant payment-reference uniqueness inside a retry-bounded Serializable transaction before posting the balanced ledger transaction and resolving the case.
- Dashboard/mobile support create actions
  - Purpose: create staff or member support cases only when the Operation Profile `support_cases` mode permits that actor; history reads remain available when new-case creation is disabled or read-only.
- `TRPC /trpc/mobile.member.commitments`
  - Purpose: return the signed-in member's active commitment, total savings, voluntary special savings, posted contribution count, and compact recent records for the mobile Commitments screen.
  - Notes: accepts no member or tenant identifier. Both scopes come from the authenticated active member workspace; the dedicated member-core query replaces the Commitments screen's former generic `mobile.member.section` read.
- `TRPC /trpc/mobile.member.shares.list` and `/trpc/mobile.member.shares.createApplication`
  - Purpose: return the signed-in member's share ownership, optional-share applications, posted ledger evidence, and published dividend evidence, and accept an optional-share request for that member.
  - Notes: neither operation accepts a member or tenant identifier. Both scopes come from the authenticated active member workspace. Reads use bounded member-only queries and published-only dividend filters; commands resolve the member again from the session before entering the authoritative share-application workflow.
- `TRPC /trpc/mobile.member.shares.applications`
  - Purpose: cursor-page the signed-in member's optional-share request history beyond the bounded Shares snapshot.
  - Notes: accepts only an opaque record cursor and bounded page size; tenant and member scope come from the active member session.
- `TRPC /trpc/mobile.member.statement`
  - Purpose: return the signed-in member's explainable statement snapshot across profile, commitments, financing, shares, charges, documents, and posted ledger evidence.
  - Notes: accepts no input identity. The dedicated statement query composes feature-owned commitment/share read models and exposes published dividends only; long posted activity is loaded separately through the cursor-paginated member activity route.
- `TRPC /trpc/mobile.member.statementExport`
  - Purpose: generate the signed-in member's bounded CSV statement for private native sharing.
  - Notes: accepts only a client request UUID. Tenant and member come exclusively from the authenticated member workspace; report entitlement and row limits are server-owned. CSV content returns over the authenticated mobile procedure, is written to short-lived app cache, and never travels in a URL.
- `TRPC /trpc/mobile.member.financing.list`, `/quote`, `/requests`, and `/createRequest`
  - Purpose: return the signed-in member's financing snapshot and bounded request history, produce an authoritative request quote, and submit an interest-free financing request.
  - Notes: none of these routes accept a member or tenant identifier. Quote and create resolve the linked member from the signed session. The quote returns eligibility, monthly-cycle capacity, term validation, servicing, calculated charge amounts and collection modes, a charge fingerprint, overlap blockers, live-write readiness, and deployable-funds warnings; create requires that fingerprint and independently rechecks the authoritative transactional guards and charge terms before writing.
- `TRPC /trpc/mobile.member.guarantorApprovals.list` and `/respond`
  - Purpose: list only financing guarantor requests linked to the signed-in member and record that member's deliberate approval or rejection.
  - Notes: respond requires explicit decision confirmation; rejection requires a bounded reason. The DB boundary derives the guarantor member from the session and retains pending-only, tenant-scoped, immutable audited evidence.
- `TRPC /trpc/mobile.member.receipts.list` and `/create`
  - Purpose: cursor-page the signed-in member's staged receipt history, return authoritative posting categories/targets and create capabilities, and submit an allocation-aware receipt for finance review.
  - Notes: neither operation accepts tenant or member identity. `list` accepts only an optional opaque cursor. `create` preserves duplicate-reference, exact allocation-total, category-target, finance-start, operational-readiness, Operation Profile, audit, and staged-only posting boundaries.
- `TRPC /trpc/mobile.member.support.list`, `/detail`, `/create`, and `/reply`
  - Purpose: cursor-page the signed-in member's support history, hydrate one exact case with full conversation/resolution context, create general or receipt-linked cases, and append member-authored replies.
  - Notes: tenant/member scope comes only from the active signed member session. Receipt links must belong to that member; Operation Profile controls creation while history and replies remain readable/usable according to record state. Support financial-review evidence never posts money.
- `TRPC /trpc/mobile.admin.reports.overview`
  - Purpose: return the server-owned mobile report catalogue, summary metrics, entitlement availability, and bounded row limits for the active tenant.
  - Notes: requires `view_reports`; tenant scope comes only from the signed membership. The client blocks generation/share while using stale cache.
- `TRPC /trpc/mobile.admin.reports.activity`
  - Purpose: cursor-page tenant governance activity with actor, authorizer, affected entity, timestamp, and at most three allowlisted redacted metadata facts.
  - Notes: accepts bounded filters and an opaque cursor, never tenant identity. Sensitive values and arbitrary before/after payloads are removed at the database boundary.
- `TRPC /trpc/mobile.admin.reports.generate`
  - Purpose: synchronously generate one entitled, row-bounded CSV report for private native sharing.
  - Notes: accepts a report key, optional date range, and client request UUID. The server derives tenant, actor, entitlement, depth, and row cap, audits the generation, and returns authenticated response content with a 15-minute expiry. No bearer token, public URL, or durable object is created.
- `TRPC /trpc/mobile.admin.access.overview` and `/invite`
  - Purpose: show tenant workspace role coverage and invite or assign one supported tenant role.
  - Notes: both require `manage_roles`; tenant and actor come from the signed membership. Invite accepts tenant admin, finance officer, operations officer, or member and cannot provision a mobile super admin. The tenant must have a 3–5 letter cooperative prefix. A successful command returns the issued `cooperativeNumber`, `setupUrl`, and truthful email `deliveryStatus`; failed/unknown delivery preserves a manual cooperative-number handoff after provisioning.
- `TRPC /trpc/mobile.notifications.overview` and `/markRead`
  - Purpose: list bounded delivery history/preferences for the signed account and synchronize unread receipts.
  - Notes: overview filters delivery audit rows by tenant and the signed user's normalized recipient email. `markRead` accepts at most 25 UUID delivery IDs, proves recipient ownership, and writes deterministic duplicate-safe actor/tenant audit receipts.
- `TRPC /trpc/mobile.notifications.registerPush`, `/disablePush`, `/preferences`, and `/updatePreference`
  - Purpose: bind one Expo push endpoint to the active durable device session, disable it when permission/session state changes, and read/update the signed user's governed push categories.
  - Notes: tenant, user, role, and device-session scope come only from the signed mobile session. Raw tokens are validated and never returned; security/transaction categories remain mandatory, while tenant channel policy and subscription availability constrain optional categories.

## Near-Term Route Targets

- `TRPC /trpc/auth.*`: session and membership actions.
- `TRPC /trpc/members.*`: tenant-scoped member listing and management.
- `TRPC /trpc/loanRequests.*`: submit and review new loan requests.
- `TRPC /trpc/contributions.*`: contribution posting and reporting.

## Starter Endpoint Template

- Method:
- Path:
- Purpose:
- Roles allowed:
- Request summary:
- Response summary:

# Platform QA maintenance

- `qaMaintenance.candidates`, `adopt`, `preview`, `start`, and `run` are platform-owner-only tRPC operations.
- `preview` issues a ten-minute signed snapshot token. `start` requires that token plus the exact `PURGE ALL QA DATA` confirmation.

## Mobile staff contribution operations

- `TRPC /trpc/mobile.admin.contributions.workspace`
  - Purpose: return one bounded tenant-scoped Ledger, Commitments, or Collections lane plus aggregate metrics, capability flags, policy evidence, cursor state, and an expected workspace state.
  - Notes: only the requested lane is queried; tenant and staff role come from the signed active workspace.
- `TRPC /trpc/mobile.admin.contributions.member|batch`
  - Purpose: hydrate one exact tenant-owned member contribution workspace or Collection Source batch, including authoritative targets, blockers, row state, and expected-state evidence.
- `TRPC /trpc/mobile.admin.contributions.setPlan|closePlan|updateAllocationPreference|recordPayment`
  - Purpose: manage dated commitment history and allocation preference or record an individual payment using server-provided targets and existing ledger workflows.
- `TRPC /trpc/mobile.admin.contributions.stageBatch|updateBatchRows|postBatchRows`
  - Purpose: stage one unique Collection Source period, resolve collected/exception/skipped rows, and post selected collected rows through the shared transactional contribution workflow.
  - Notes: all writes require UUID command evidence plus the expected current state; batch writes additionally require finance capability, live financial writes, and Operation Profile staff-create access.

## Logly ingest proxy (2026-09-07)

- `POST /api/analytics`: browser telemetry for `halaalvest-web`, served by dashboard and marketing.
- `POST /api/analytics/mobile`: native telemetry for `halaalvest-mobile`, served by marketing and dashboard.
- Privacy, origin/credential selection and retry contract: [Logly analytics](../features/logly-analytics.md). No business API or database change.

## Product telemetry — 2026-09-22

- Dashboard and marketing `POST /api/analytics`: public, exact surface origin validation; server-fixed project/key; bounded privacy-projected web batches.
- `POST /api/analytics/mobile`: public Android telemetry proxy, rejects browser Origin, uses existing mobile-only key and namespace. No tenant/member data or authenticated identity is accepted into the outbound projection.


### Launch-readiness API checkpoint (24 September 2026)
- `subscriptions.storeCatalog` / `verifyStorePurchase`: subscription administrators receive configured store products and tenant account binding; verified current provider evidence is required for entitlement persistence.
- `POST /billing/store-notifications/apple` and `/google`: signature/identity-verified notifications trigger current subscription verification; no client entitlement authority. Google subscription and voided-subscription-order RTDNs both re-query current Play state before applying; the voided signal alone does not revoke a later valid period. Event kinds must be mutually exclusive. One-time voids return non-success. An authenticated pending refund-review message records a deduplicated provider event with an encrypted review token and a conservative 24-hour deadline from the earlier provider event or receipt time, then returns HTTP 503 because no staffed response path exists; a missing encryption key also fails closed. This receipt is not a refund suggestion, and live RTDN configuration remains gated. Google entitlement persistence completes before acknowledgment, and a persistence failure returns HTTP 503 without acknowledging. The 256 KiB Hono body limit rejects oversized requests, including streamed bodies without `Content-Length`, with HTTP 413 before provider verification. Controlled HTTP tests cover this handler order, Apple test-event no-op and malformed/unauthenticated requests; real provider delivery, signatures, refunds and retries remain unverified.
- `accountPrivacy.notice`, `list`, `request`, `cancel`: authenticated privacy workflow; requests use active tenant context plus UUID idempotency and exact confirmed notice version. List/cancel derive requester from session.
- `accountPrivacy.operatorQueue({ cursor? })`, `verify`, `revocationScope`, `revokeAccess`: platform-owner-only queue with 50-request stable pages and an explicit next cursor, documented identity/scope verification, then a complete current-membership read before account-wide access revocation. The mutation requires acknowledged membership ID/cooperative/role tuples, a 20–2000 character administration-handover/retention note and `confirmed: true`. Its serializable transaction rejects any changed membership scope, blocks deletion of the last cooperative administrator or platform owner, removes login/device/push access and anonymises account identifiers. It preserves the current verified email solely as restricted completion-contact evidence, leaves the request `processing`, and does **not** claim shared-record erasure or subscription cancellation. No completion/erasure API exists yet.
- `accountPrivacy.processingInventory`, `recordProcessingNote`: platform-owner-only selected direct-link counts and categorized restricted evidence for access-revoked `processing` requests. The read-only inventory currently has 80 counts covering all 73 directly named Prisma user-ID fields plus seven selected member-linked categories, including contributions, payment receipts, financing requests, facilities and repayments. It includes operational, onboarding, support, software billing, retained-request and post-revocation categories. Overlapping categories and missing other indirect/content/processor data prevent an erasure conclusion. Notes are append-only through serializable updates and audited; neither endpoint completes erasure or changes request status.


### Versioned platform documents
`legal.current` and marketing `GET /api/legal` return availability, whether publication requires acceptance, and the complete effective approved terms/privacy snapshots with hashes. Draft/incomplete bundles expose no acceptance documents. `legal.accept` requires an active tenant session and exact confirmed references; web onboarding submits `legalAcknowledgement` to `/api/onboarding` and persists it atomically during bootstrap when publication is required.
An effective Terms/Privacy snapshot must also match its configured `approvedSnapshotHash` across document type, version, effective/approval dates, approval reference and exact policy text. Effective dates before approval are invalid. Mismatch withholds the document and keeps acceptance fail-closed; see [`../decisions/ADR-20260925-approved-legal-snapshot-binding.md`](../decisions/ADR-20260925-approved-legal-snapshot-binding.md).


`legal.accepted` lists up to 20 acceptance summaries belonging to the signed user in the active tenant after database membership revalidation. It omits private content snapshots and other users’ records. Mobile `/legal-agreements` uses it alongside `legal.current` to show current acceptance state.


### External account deletion
`POST /api/delete-account/request` accepts account email and workspace slug; it always gives a neutral matching/nonmatching response after rate limiting and sends a short-lived verification link to matching active accounts only when the identifier resolves to exactly one tenant for that user. Multiple roles in that one tenant remain valid; a slug/domain collision across two of the user's tenants issues no challenge. `GET /delete-account/verify` displays the review screen. `POST /api/delete-account/verify` requires challenge UUID, 32-byte random token, current notice version and explicit confirmation, then atomically consumes the link and creates or reuses a tracked AccountPrivacyRequest. No authenticated session is required for the email-verified web path. Platform-owner `/platform/privacy-requests` reads `accountPrivacy.operatorQueue`, records verification, and offers a separate typed-confirmation revocation step. The page does not mark erasure complete.

Email transport failures on this and other notification routes expose only a generic delivery error to audit consumers; provider response bodies, recipient addresses and arbitrary causes are omitted from retry logs. See [`../decisions/ADR-20260925-minimise-email-failure-evidence.md`](../decisions/ADR-20260925-minimise-email-failure-evidence.md).

For production `POST /api/delete-account/request`, a configured non-local HTTPS marketing root origin is required before challenge creation; the incoming request host is never used to construct the email link. Missing/invalid configuration returns an error without issuing a link.
When `APP_ENV=preview`, the configured deletion-email origin additionally rejects `halaalvest.com`, `www.halaalvest.com`, `app.halaalvest.com` and `api.halaalvest.com`. Both request-form readiness and the POST route use this rule before any challenge is created; an isolated Preview marketing origin must be configured for QA.

### Dashboard evidence uploads

`POST /api/uploads` remains local-development-only and accepts up to 10 MiB. Production/Vercel refuses it with 503. `POST /api/uploads/intent` authenticates active tenant membership, purpose, MIME and size, and returns a server-generated private pathname plus signed 30-minute intent when private storage is enabled. `POST /api/uploads/token` verifies intent against the current session/path and issues a private Blob client token restricted to allowed MIME and 10 MiB. `POST /api/uploads/finalize` verifies the stored private object before returning `/api/uploads/[id]`. `GET /api/uploads/[id]` requires an active membership and a linked tenant business record; staff can read linked tenant records and members only their own linked document, receipt or support attachment. An unlinked upload returns 404. The path is disabled until `DASHBOARD_PRIVATE_BLOB_ENABLED=1` with required secrets; approved retention/deletion and live QA remain gates in [`../runbooks/private-upload-storage-readiness.md`](../runbooks/private-upload-storage-readiness.md).
The emailed link sends the challenge ID as a query parameter and the token as a URL fragment; the verification page reads and clears the fragment client-side before POSTing it. The server-rendered GET does not receive the token.

`GET /api/cron/upload-orphans` is a bearer-secret protected, explicitly disabled cleanup endpoint. When enabled, it claims at most ten pending intents older than two hours or retries prior failed deletes, removes private Blob bytes, then marks metadata deleted. Intent creation and token issuance reject a tenant after QA purge marking. No production schedule is configured.

`GET /api/uploads/[id]` now requires the uploaded metadata row to name the exact same-purpose business record type and UUID; the saved record must still contain that upload URL and pass the staff/member ownership check. Saving a private URL claims it once in the member-document, opening-balance, receipt or support-message transaction. A cross-purpose or second-record claim fails the save.

## Logly attribution — 1 October 2026

- Dashboard `GET /api/analytics/context`: host-derived tenant plus verified session/membership account attribution, private/no-store; public tenant pages receive group-only context. No request tenant/account parameter is accepted.
- Existing `auth.mobile.signIn`, `auth.mobile.me`, `auth.mobile.switchRole`, and profile refresh paths return optional signed `analyticsContext` via the shared profile builder.
- Existing browser/native ingest routes verify each event's capture context before forwarding. No merchant reporting/read route was added. [Contract](contracts.md#logly-generic-business-attribution--1-october-2026).
