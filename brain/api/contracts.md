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
  - `auditPreview` and `collectionsPreview`: compact evidence rows for the report landing page; CSV generation stays in dedicated export routes.
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
- `POST /api/signup`
  - Request validates `cooperativeName`, `primaryContactFullName`, and `primaryContactEmail`.
  - Response returns `expiresAt`, `onboardingUrl`, delivery metadata, and the verification email draft.
- `POST /api/onboarding`
  - Request validates `cooperativeName`, `primaryContactFullName`, `primaryContactEmail`, selected cooperative size range in `currentSize`, `officeAddress`, required `city`, `state`, `country`, `startDate`, and the signed `token`.
  - The route derives the slug from `cooperativeName` and applies server-side tenant policy defaults instead of asking for public policy fields.
  - The selected `currentSize` range is persisted as the existing representative integer, while `officeAddress`, `city`, `state`, `country`, and `startDate` are persisted directly on the tenant record during workspace bootstrap; `region` is also written from `state` for legacy readers.
- `trpc.notifications.list`
  - array of shared notification payloads built from `@halaalvest/notifications` types.
- `trpc.members.list`
  - paginated tenant member result with `items`, `total`, `page`, and `pageSize`.
- `trpc.contributions.list`
  - paginated contribution result with joined member display fields.
- `trpc.charges.listDefinitions`
  - array of tenant charge definitions with amount, kind, active state, and applicability flags.

## Starter Contract Template
- Endpoint:
- Request fields:
- Response fields:
- Validation rules:
- Error cases:
