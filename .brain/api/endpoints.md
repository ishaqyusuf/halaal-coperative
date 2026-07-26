# API Endpoints

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
- `POST /api/signup`
  - Purpose: validate the private cooperative setup intent, verify early access approval when `MARKETING_EARLY_ACCESS_ENABLED=true`, mint a signed onboarding token, and build the verification email draft for the cooperative primary contact.
  - Notes: implemented as `apps/marketing/app/api/signup/route.ts` because the full auth/session stack is not in place yet.
- `POST /api/early-access`
  - Purpose: capture accountable contact details plus structured cooperative size, current record system, setup timeline, and setup needs, then email configured platform admins a signed approval API link.
  - Notes: production requires email delivery plus `MARKETING_ADMIN_EMAILS`.
- `GET /api/early-access/approve?token=...`
  - Purpose: verify the signed admin approval token and send the cooperative primary contact an approved setup link.
  - Notes: the link is bearer-style and sends the approval email when opened. Local development links should use the configured marketing host, e.g. `http://halaalvest.localhost/api/early-access/approve?...`.
- `POST /api/onboarding`
  - Purpose: verify the signed signup token and provision the tenant workspace from a simplified cooperative profile payload.
  - Notes: implemented as `apps/marketing/app/api/onboarding/route.ts` and backed directly by `createTenantWorkspaceBootstrap`.
- `TRPC /trpc/notifications.list`
  - Purpose: return sample notification payloads using the shared notification registry.
- `TRPC /trpc/members.list|get|create|update|updateStatus`
  - Purpose: list and manage tenant member records.
- `TRPC /trpc/contributions.list|record|memberHistory|memberSavings`
  - Purpose: list and post contributions plus retrieve member savings history.
- `TRPC /trpc/charges.listDefinitions|createDefinition|updateDefinition`
  - Purpose: manage tenant charge definitions.
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
- `TRPC /trpc/shareApplications.list|get`
  - Purpose: list tenant/member additional share applications for the Midday-style dashboard table and hydrate URL-selected review sheets.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member, status, and search text.
- `TRPC /trpc/support.list|get`
  - Purpose: list tenant/member support cases for the Midday-style dashboard table and hydrate URL-selected update/reply/financial-adjustment sheets.
  - Notes: member-role requests are scoped to the signed-in user's linked member profile; staff requests are tenant-scoped and may filter by member, assignee, status, and priority. Completed special-savings refunds include compact withdrawal evidence.
- Dashboard action `settleSupportCaseSpecialSavingsRefundAction`
  - Purpose: let finance post a one-time, support-linked special-savings refund after financial-adjustment approval.
  - Notes: validates live-write and tenant/member boundaries, available special savings, payment evidence, and duplicate settlement before posting the balanced ledger transaction and resolving the case.

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
