# API Contracts

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
- `POST /api/signup`
  - Request validates `cooperativeName`, `primaryContactFullName`, `primaryContactEmail`, `primaryContactMemberNumber`, `memberNumberPrefix`, `workspaceSlug`, and optional `approvalToken`.
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
- `POST /api/onboarding`
  - Request validates `cooperativeName`, `primaryContactFullName`, `primaryContactEmail`, selected cooperative size range in `currentSize`, `officeAddress`, required `city`, `state`, `country`, `startDate`, and the signed `token`.
  - The signed token is authoritative for cooperative name, workspace slug, cooperative admin identity, and membership number. The route returns HTTP 410 with `The verification link has expired.` when that verified cooperative/workspace identity is no longer available after tenant creation.
  - The route applies server-side tenant policy defaults instead of asking for public policy fields.
  - The selected `currentSize` range is persisted as the existing representative integer, while `officeAddress`, `city`, `state`, `country`, and `startDate` are persisted directly on the tenant record during workspace bootstrap; `region` is also written from `state` for legacy readers.
- `trpc.notifications.list`
  - array of shared notification payloads built from `@halaalvest/notifications` types.
- `trpc.members.list`
  - Staff-only infinite result with a `data` array and `meta.cursor`, `meta.hasNextPage`, and `meta.hasPreviousPage`; tenant scope is derived from authenticated context and list input accepts optional cursor, page size, search, member type, status, KYC status, joined-date range, sort fields, and mode-aware `migrationStatus` (`pending` or `finalized`).
  - Migration filtering uses the same derived member-readiness contract as member verification: every brought-forward member requires an applied opening position, while historical members who joined before the current month require complete backfill and current-month members have no historical work due.
- `trpc.members.get`
  - Staff-only tenant-scoped member profile lookup by `memberId`; returns no cross-tenant or member-role directory access.
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
- `trpc.contributions.list`
  - paginated contribution result with joined member display fields.
- `trpc.charges.listDefinitions`
  - array of tenant charge definitions with amount, kind, active state, and applicability flags.
- `trpc.paymentReceipts.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, `submittedFrom`, `submittedTo`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `MemberPaymentReceiptRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `memberName`, `paidAt`, `paymentReference`, `status`, `submittedAt`, and `totalAmount`.
- `trpc.paymentReceipts.get`
  - Request fields: `receiptId`.
  - Response fields: one `MemberPaymentReceiptRow` or `null` when the receipt is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed payment receipt sheets so filtered and infinite-loaded table rows can hydrate their review/support detail state independently of the first server-rendered list page.
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
  - Response fields: `data` array of `FoodPurchaseApplicationRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `memberName`, `status`, `requestedAmount`, `approvedAmount`, `paidAmount`, `requestedAt`, and `itemDescription`.
- `trpc.foodPurchase.get`
  - Request fields: `foodPurchaseApplicationId`.
  - Response fields: one `FoodPurchaseApplicationRow` or `null` when the application is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed Foodstuff Purchase application review sheets so filtered and infinite-loaded table rows can hydrate their selected application independently of the first server-rendered list page.
- `trpc.projectFinancing.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `ProjectFinancingRequestRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `businessName`, `memberName`, `status`, `requestedAmount`, `approvedAmount`, `estimatedMonthlyPayback`, `requestedAt`, and `disbursedAt`.
- `trpc.projectFinancing.get`
  - Request fields: `projectFinancingRequestId`.
  - Response fields: one `ProjectFinancingRequestRow` or `null` when the request is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed project financing review/disbursement sheets so filtered and infinite-loaded table rows can hydrate their selected request independently of the first server-rendered list page.
- `trpc.shareApplications.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `sort`, and staff-only `memberId` filter; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `MemberShareApplicationRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `memberName`, `status`, `requestedUnits`, `shareValueSnapshot`, `createdAt`, and `reviewedAt`.
- `trpc.shareApplications.get`
  - Request fields: `memberShareApplicationId`.
  - Response fields: one `MemberShareApplicationRow` or `null` when the application is absent, outside the tenant, or outside the member's own profile scope.
  - Used by URL-backed additional share application review sheets so filtered and infinite-loaded table rows can hydrate their selected application independently of the first server-rendered list page.
- `trpc.support.list`
  - Request fields: optional `cursor`, `pageSize`, `q`, `status`, `priority`, `sort`, and staff-only `memberId`, `assignedToUserId`, and `category` filters; tenant and member scoping are derived from authenticated context.
  - Response fields: `data` array of `SupportCaseRow` records plus `meta.cursor` for infinite loading and `meta.total` for the filtered tenant/member result count.
  - Supported sort fields: `subject`, `status`, `category`, `priority`, `assignedToUser`, `latestReply`, `linkedRecord`, `createdAt`, and `updatedAt`.
- `trpc.support.get`
  - Request fields: `supportCaseId`.
  - Response fields: one `SupportCaseRow` or `null` when the case is absent, outside the tenant, or outside the member's own profile scope. A completed special-savings refund includes its amount, payment date, and reference.
  - Used by URL-backed support update/reply/financial-adjustment sheets so filtered and infinite-loaded table rows can hydrate their selected case independently of the first server-rendered list page.
- Dashboard `settleSupportCaseSpecialSavingsRefundAction`
  - Request fields: `supportCaseId`, positive `amount`, `paidAt`, required external `reference`, and optional `notes`.
  - Requires a finance-management role, live financial writes, a linked member, money-impact intent, approved financial-adjustment review, sufficient special savings, and no prior withdrawal for the case.
  - Posts the member withdrawal and balanced ledger adjustment, records audit evidence, and resolves the support case atomically.
- `trpc.mobile.member.procurement.list`
  - Response includes `canCreateRequest`, derived from the tenant Operation Profile procurement service mode, so mobile clients can hide or disable member self-service procurement submission while still showing existing request history.
- Dashboard procurement create actions
  - Staff-created procurement requests send `requestSource: "staff"` to the shared DB workflow and require Operation Profile staff create access.
  - Member-created procurement requests, including mobile member requests, send `requestSource: "member_self_service"` and require Operation Profile member create access.
  - Existing procurement request listing, review, purchase evidence, and repayment schedule visibility remain available for historical records when create access is disabled or read-only.
- `trpc.mobile.member.foodPurchase.list`
  - Response includes `canCreateApplication`, derived from the tenant Operation Profile `food_purchase` service mode, so mobile clients can hide or disable member self-service Foodstuff Purchase submission while still showing existing application history.
- Dashboard Foodstuff Purchase create actions
  - Staff-created Foodstuff Purchase cycles and applications send `requestSource: "staff"` to the shared DB workflow and require Operation Profile staff create access.
  - Member-created Foodstuff Purchase applications, including mobile member applications, send `requestSource: "member_self_service"` and require Operation Profile member create access.
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

## Starter Contract Template

- Endpoint:
- Request fields:
- Response fields:
- Validation rules:
- Error cases:

# QA maintenance contract

- Candidate discovery never grants purge eligibility; adoption stores the QA marker.
- A purge start revalidates the signed preview fingerprint and rejects empty, stale, or provider-blocked work.
- Run responses contain status and aggregate counts only.

# Shared error contract

- REST failures return `{ error: { code, message, referenceId, retryable, action? } }` with an HTTP status derived from the classified transport code.
- tRPC failures replace arbitrary transport messages with professional public copy and include the same envelope at `data.appError`.
- API responses expose `x-request-id`; a valid inbound value is preserved and an invalid or absent value is replaced with a generated UUID.
- Database, provider, stack, query, payload, tenant, member, financial, and identity details never appear in the public envelope.
- Marketing form APIs use the same `{ error: PublicError }` envelope, including deliberately authored validation, conflict, expired-link, and provider-unavailability branches. Form clients read public guidance from `error.message`.
- `POST /api/error-report` accepts only an allowlisted dashboard source plus a valid shared error code and `ERR-*` reference from an authenticated user with an active membership in the resolved tenant. Its audit metadata excludes message, stack, path, component stack, user agent, payload, and identity.
