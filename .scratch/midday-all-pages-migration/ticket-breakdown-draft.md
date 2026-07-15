# Exact Midday Implementation Migration Ticket Breakdown

Status: draft for approval  
Scope: dashboard app pages, dashboard shell/header/sidebar/navigation, forms, sheets, modals, tables, settings pages, public auth/signup pages  
Local only: do not publish to GitHub unless explicitly requested

## Migration Rule

Business is the accepted local baseline because it already follows the approved Midday invoices-style implementation split. Midday remains the external source of truth.

"Exact implementation" means each migrated route must use the same Midday architecture and interaction contract:

- Thin server page owns search params, filter loaders, sort loaders, initial table settings, server prefetch/hydration, and Suspense/error composition.
- Header owns search/filter, column visibility, and open sheet action.
- Create/edit/detail/review flows use URL-param driven sheets, not inline page forms or page-freezing modals.
- Sheets are split into `<domain>-sheet.tsx`, `<domain>-sheet-header.tsx`, `<domain>-content.tsx`, `<domain>/form-context.tsx`, and `open-<domain>-sheet.tsx` when Midday uses that split.
- Tables use the Midday table runtime: TanStack table, virtual rows, DnD headers, sticky columns, resize, persisted table settings, empty/no-results/skeleton states, row actions, row-click URL state, and bottom bars where selection/bulk actions exist.
- Forms use the shared shadcn-style `Form`, `FormField`, validation, mutation, error, loading, and invalidation patterns.
- Any deviation must be called out explicitly and justified by a Halaalvest domain rule.

## Route Coverage

Accepted baseline, no rewrite target:

- `/business`

Protected routes to migrate or touch:

- `/`
- `/analytics`
- `/charges`
- `/contributions`
- `/domains`
- `/food-purchase`
- `/getting-started`
- `/guarantor-approvals`
- `/loans`
- `/member-signup-links`
- `/members`
- `/members/[memberId]`
- `/members/[memberId]/backfill`
- `/members/[memberId]/statement`
- `/membership-approvals`
- `/membership-approvals/[requestId]`
- `/monthly-records`
- `/notifications`
- `/onboarding`
- `/payment-receipts`
- `/procurement`
- `/project-financing`
- `/repayments`
- `/reports`
- `/reports/audit`
- `/settings/finance`
- `/settings/finance/business`
- `/settings/finance/business/profits/[profitEntryId]/migration`
- `/settings/finance/charges`
- `/settings/finance/loan`
- `/settings/finance/migration`
- `/settings/finance/migration/[memberId]`
- `/settings/finance/shares`
- `/settings/imports`
- `/settings/imports/batches`
- `/settings/imports/charges`
- `/settings/imports/contributions`
- `/settings/imports/deduction-sources`
- `/settings/imports/loan-migrations`
- `/settings/imports/loan-products`
- `/settings/imports/members`
- `/settings/imports/repayment-migrations`
- `/settings/operation-profile`
- `/settings/profile`
- `/settings/roles`
- `/settings/trust`
- `/shares`
- `/support`

Public/auth/signup routes to standardize:

- `/awaiting-approval`
- `/login`
- `/login/reset`
- `/login/reset/confirm`
- `/signup/member`
- `/signup/member/verify`
- `/signup/members`
- `/signup/members/verify`
- tenant root `/`

## Draft Tickets

### 1. Define The Exact Midday Parity Contract And Audit Harness

Blocked by: none

Delivers:

- A local migration contract that names the exact Midday files and implementation features every page must copy structurally.
- A route inventory and audit checklist covering every route above.
- A “done means exact parity” acceptance checklist: thin page, prefetch/hydration, header/open button, URL sheet, table runtime, store, hooks, API query, tests, and browser QA.
- A page classification matrix so implementers know whether each route follows Midday invoices, customers, transactions, settings, import, reports, or auth patterns.

### 2. Rebuild Dashboard Header, Sidebar, Navigation, And Icons To Midday Parity

Blocked by: Ticket 1

Delivers:

- Rework `dashboard-shell`, topbar/header, sidebar, mobile sidebar sheet, and navigation registry to match Midday’s sidebar/header implementation contract.
- Replace repeated handmade module icons with a per-link icon map using standard UI icon primitives, with icons chosen for every navigation item.
- Preserve tenant-aware links, role filtering, operation-profile route hiding, active states, mobile behavior, local URL switcher placement, sign-out, theme toggle, and user/tenant identity display.
- Add coverage for icon choice, active state, collapsed/expanded sidebar, mobile sheet, and keyboard/navigation behavior.

### 3. Touch Up Members To Customers Exact Parity

Blocked by: Tickets 1 and 2

Delivers:

- Keep the current members business behavior, but replace remaining modal/create/import rough edges with the Midday customers/invoices split.
- Add or complete `open-member-sheet.tsx`, `member-sheet.tsx`, `member-sheet-header.tsx`, `member-content.tsx`, `member/form-context.tsx`, and URL params for create/edit/detail/import modes.
- Convert `MemberCreateModal` and member import modal behavior into sheet flows.
- Keep the existing members table, but complete exact table parity: row actions, row click sheet/detail behavior, stop-propagation, bottom bar where bulk member actions exist, skeleton/no-results/empty states, column visibility, DnD, resize, sticky columns, and persisted settings.
- Cover `/members`, `/members/[memberId]`, and `/members/[memberId]/statement`.

### 4. Rebuild Contribution, Charges, Shares, And Payment Receipt Finance Tables

Blocked by: Tickets 1 and 2

Delivers:

- Migrate `/contributions`, `/charges`, `/shares`, `/payment-receipts`, and `/settings/finance/charges` to the exact Midday invoices/transactions table implementation.
- Remove inline page forms and static `DashboardDataTable` surfaces from these routes.
- Add domain headers, search filters, column visibility components, open sheet buttons, URL params, sheet wrappers, sheet headers, content routers, form contexts, stores, table folders, row actions, bottom bars, skeletons, empty states, and API-backed infinite queries.
- Preserve financial permissions, tenant scoping, server actions only where still justified, and money/audit safety.

### 5. Rebuild Loans, Repayments, Monthly Records, And Migration Finance Workflows

Blocked by: Tickets 1, 2, and 4

Delivers:

- Migrate `/loans`, `/repayments`, `/monthly-records`, `/settings/finance`, `/settings/finance/loan`, `/settings/finance/migration`, `/settings/finance/migration/[memberId]`, `/settings/finance/business`, `/settings/finance/business/profits/[profitEntryId]/migration`, and `/settings/finance/shares`.
- Use Midday transactions/invoices patterns for ledger-like pages and Midday import/settings patterns for migration worksheets.
- Move repayment posting, loan review, monthly record generation, migration edit, and historical backfill controls into URL-driven sheets or dedicated detail subflows instead of inline form clusters.
- Add exact API query/mutation, invalidation, optimistic/error, skeleton, no-results, and browser QA coverage.

### 6. Rebuild Procurement, Foodstuff Purchase, Project Financing, Support, And Guarantor Queues

Blocked by: Tickets 1 and 2

Delivers:

- Migrate `/procurement`, `/food-purchase`, `/project-financing`, `/support`, and `/guarantor-approvals`.
- Use Midday invoices table/sheet pattern for application/request workspaces and Midday customers/detail pattern where member context is primary.
- Split member-facing create/request flows and staff-facing review/approval flows into explicit URL-param sheet modes.
- Add headers, filters, open buttons, detail/review sheets, row actions, status actions, bottom bars where batch review exists, and exact empty/restricted/service-disabled states.
- Preserve operation-profile feature gating and member-vs-staff permissions.

### 7. Rebuild Membership Approval, Signup Links, Onboarding, And Getting Started Admin Flows

Blocked by: Tickets 1 and 2

Delivers:

- Migrate `/membership-approvals`, `/membership-approvals/[requestId]`, `/member-signup-links`, `/onboarding`, and `/getting-started`.
- Replace static approval tables and inline link/config forms with exact Midday table + sheet/detail implementations.
- Keep getting-started operation-profile substeps, but align forms, controls, animations, and navigation with standard shadcn/Midday primitives.
- Add URL-state detail/review sheets for approval records and signup link editing.
- Preserve onboarding token, approval, operation-profile, and member-signup domain rules.

### 8. Rebuild Notifications, Reports, Audit, Analytics, Domains, And Dashboard Overview

Blocked by: Tickets 1 and 2

Delivers:

- Migrate `/`, `/analytics`, `/notifications`, `/reports`, `/reports/audit`, and `/domains`.
- Use Midday reports/transactions/dashboard patterns: thin server routes, summary Suspense cards, searchable table/list surfaces, filter headers, detail sheets where records can be inspected, and exact error/skeleton states.
- Convert notification preference toggles and audit/report filters away from one-off inline page forms where a sheet/detail/filter component is the Midday equivalent.
- Preserve admin dashboard KPI hierarchy, auditability, and tenant routing behavior.

### 9. Rebuild Settings Pages To Midday Settings Implementation

Blocked by: Tickets 1 and 2

Delivers:

- Migrate `/settings/profile`, `/settings/roles`, `/settings/trust`, and `/settings/operation-profile`.
- Replace large inline settings sections with Midday settings-style sections, action buttons, sheets, confirmation dialogs only where destructive, and shadcn `Form` controls.
- Keep finance/operation-profile domain configuration intact while standardizing form ownership, validation, mutation, loading/error states, and save feedback.
- Ensure operation-profile and getting-started use the same configuration vocabulary and component primitives.

### 10. Rebuild Import Workflows To Midday Import/Sheet Parity

Blocked by: Tickets 1, 2, and 5

Delivers:

- Migrate `/settings/imports`, `/settings/imports/batches`, `/settings/imports/members`, `/settings/imports/contributions`, `/settings/imports/charges`, `/settings/imports/deduction-sources`, `/settings/imports/loan-products`, `/settings/imports/loan-migrations`, and `/settings/imports/repayment-migrations`.
- Replace current import route clusters with exact Midday import modal/sheet/table behavior: upload/create sheet, batch detail sheet, apply/review sheet, import table, filters, status actions, skeletons, no-results, and error handling.
- Preserve CSV/Excel parsing, column mapping, finance safety checks, and migration constraints.

### 11. Standardize Public Auth, Password Reset, Signup, And Tenant Root Pages

Blocked by: Ticket 1

Delivers:

- Migrate `/login`, `/login/reset`, `/login/reset/confirm`, `/awaiting-approval`, `/signup/member`, `/signup/member/verify`, `/signup/members`, `/signup/members/verify`, and tenant root `/`.
- Apply exact shared auth form primitives, error/success handling, loading states, tenant-aware links, and portless dashboard URL behavior.
- Keep member onboarding email/password setup and approval flows intact.

### 12. Shared API, Query, Store, Hook, And Table Settings Parity

Blocked by: Tickets 3 through 11 as consumers are identified

Delivers:

- Add or complete tRPC routers/schemas/query functions for every migrated table/sheet flow.
- Add URL-param hooks, filter hooks, table stores, table IDs/configs, sticky column configs, and table settings defaults for every migrated domain.
- Remove duplicate client fetch paths and static table-only loaders once replacement pages are ready.
- Keep tenant scoping, role checks, audit events, and financial write safety close to API/service boundaries.

### 13. Global Cleanup: Retire Legacy Inline Forms, Modals, And Static Tables

Blocked by: Tickets 3 through 12

Delivers:

- Delete or replace obsolete `components/modals/*` and legacy inline form usage once every consumer has migrated.
- Replace remaining `DashboardDataTable` usages with Midday table runtime or deliberately named static display components where no interaction exists.
- Ensure all non-destructive create/edit/detail/review flows use URL-state sheets, and destructive actions use standard confirmation dialogs only.
- Remove dead hooks, stores, table IDs, and old view components that are no longer used.

### 14. Full Route QA, Visual QA, And Regression Gate

Blocked by: Tickets 2 through 13

Delivers:

- Run typecheck, lint, build, targeted tests, and `git diff --check`.
- Run local dev with the project rule: `bun run dev --local --filter dashboard marketing`.
- Use portless URLs for browser QA: `halaalvest.localhost` and `tenant.halaalvest-dash.localhost`.
- Exercise every protected/public route listed in this draft.
- Verify every open button, sheet mode, form submit, validation error, success close/reset, table filter, sort, row click, row action, bottom bar action, mobile sidebar, desktop sidebar, and nav icon active state.
- Capture failures as follow-up fix tickets before implementation is considered complete.

