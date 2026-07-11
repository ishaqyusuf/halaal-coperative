# Progress

## 2026-07-11

### Mobile Role Resolver And Workspace Switcher

- Source mode: `$implement` continuation from `brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md` using fast Bun monorepo command discipline.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/9`.
- Changed source files: `packages/auth/src/index.ts`, `packages/db/src/queries/auth.ts`, `apps/api/src/context.ts`, `apps/api/src/context.test.ts`, `apps/api/src/routers/mobile-auth.route.ts`, `apps/api/src/routers/mobile-auth.route.test.ts`, `apps/mobile/src/lib/mobile-auth-api.ts`, `apps/mobile/src/lib/session-store.ts`, `apps/mobile/src/hooks/use-auth.tsx`, `apps/mobile/src/screens/more-screen.tsx`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Added selected-membership mobile sessions and a server-owned role switcher. Signed tokens can now carry `membershipId`, API context resolves that selected membership without falling back to another role when it is invalid, `auth.mobile.switchRole` issues a new resumable token for memberships owned by the signed-in user, and the mobile More screen now exposes a compact workspace switcher for multi-role accounts.
- Scope note: This completes the first production role resolver/switcher seam for Phase 1. Member/admin production DTO reads, role-specific dashboard content, and mobile UI smoke testing remain separate MVP slices.
- Checks run: `bun test apps/api/src/context.test.ts apps/api/src/routers/mobile-auth.route.test.ts`; touched-file `prettier --check`; scoped `git diff --check`.
- Skipped checks: Broad typecheck, build, Expo smoke testing, dev server, browser/device QA, and full test suite were skipped under fast Bun monorepo command discipline.

### Mobile Session Resume And Tenant Bootstrap

- Source mode: `$implement` continuation from `brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md` using fast Bun monorepo command discipline.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/9`.
- Changed source files: `packages/auth/src/index.ts`, `apps/api/src/context.ts`, `apps/api/src/context.test.ts`, `apps/api/src/routers/mobile-auth.route.ts`, `apps/api/src/routers/mobile-auth.route.test.ts`, `apps/mobile/src/lib/mobile-auth-api.ts`, `apps/mobile/src/lib/session-store.ts`, `apps/mobile/src/hooks/use-auth.tsx`, `apps/mobile/src/components/app/profile-header.tsx`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Mobile startup now verifies signed bearer sessions through `auth.mobile.me` before routing, clears stale or forged native sessions, preserves mock sessions only in non-production development mode, and carries server-shaped tenant bootstrap fields into the mobile profile. Signed session tokens can now include selected tenant context, bearer sessions ignore client user/role/tenant override headers, and platform-owner selected-tenant sessions resume with a server-derived super-admin role.
- Scope note: This completes more of Phase 1 session/bootstrap hardening. Role switching UI, production member/admin DTO reads, offline stale markers, and device/update release hardening remain separate MVP slices.
- Checks run: `bun test apps/api/src/context.test.ts apps/api/src/routers/mobile-auth.route.test.ts`; touched-file `prettier --check`.
- Skipped checks: Broad typecheck, build, Expo smoke testing, dev server, browser/device QA, and full test suite were skipped under fast Bun monorepo command discipline.

### Mobile Auth Session Foundation

- Source mode: `$implement` from `brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md` using fast Bun monorepo command discipline.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/9`.
- Changed source files: `packages/auth/src/index.ts`, `apps/api/src/context.ts`, `apps/api/src/index.ts`, `apps/api/src/routers/_app.ts`, `apps/api/src/routers/mobile-auth.route.ts`, `apps/api/src/context.test.ts`, `apps/mobile/src/lib/mobile-auth-api.ts`, `apps/mobile/src/lib/session-store.ts`, `apps/mobile/src/hooks/use-auth.tsx`, `apps/mobile/src/screens/sign-in-screen.tsx`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Added the first production mobile auth seam. The API now verifies signed bearer sessions from mobile requests, exposes `auth.mobile.signIn/me/signOut` tRPC procedures, supports `/api/trpc` on the standalone Hono API for the existing mobile client path, and the mobile sign-in screen now submits cooperative code, email, and password while keeping mock member/admin shortcuts development-only.
- Scope note: This slice establishes Phase 1 auth plumbing only. It does not yet replace all startup hydration with server `me`, add role switching UI, or connect member/admin tabs to production DTOs.
- Checks run: `bun test apps/api/src/context.test.ts`; `git diff --check` scoped to touched files.
- Skipped checks: Broad typecheck, build, Expo smoke testing, dev server, browser/device QA, and full test suite were skipped under fast Bun monorepo command discipline.

### Halaalvest Mobile App MVP Spec

- Source mode: `$to-spec` synthesis from the current Halaalvest mobile starter, client-fit cooperative operations scope, Halaal cooperative domain docs, and EwaTrade mobile Brain/source patterns.
- Source spec: `brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md`.
- Published issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/9`.
- GitHub labels applied: `ready-for-agent`.
- Brain files updated: `brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md`, `brain/progress.md`.
- Current status: Published a production mobile MVP spec that preserves the existing Halaalvest Expo starter, follows the EwaTrade mobile architecture principle, requires signed mobile sessions before production data, and scopes member self-service plus safe admin operations around server-owned cooperative finance rules.
- Checks run: `git diff --check -- brain/specs/2026-07-11-halaalvest-mobile-app-mvp.md`; GitHub issue publication.
- Skipped checks: Runtime tests, typecheck, build, Expo smoke testing, and device QA were not needed for this docs-only spec publication.

## 2026-07-10

### GND-Style Root Dev Router

- Source mode: Main-branch dev workflow update requested after the client-fit cleanup work.
- Changed source files: `package.json`, `scripts/dev.ts`, `scripts/dev-run.ts`, `scripts/dev.test.ts`, `scripts/with-workspace-env.mjs`, `turbo.json`, `README.md`.
- Brain files updated: `brain/system/tech-stack.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Added a GND-style root `bun run dev` router with `--local`, `--remote-dev`, `--prod`, and Turbo filter aliases. The remote-dev profile now has first-class env-file support through `.env.remote-dev` / `.env.remote-dev.local`, while production dev continues to require a non-localhost production database URL and skips local prepare/migration.
- Scope note: This updates developer workflow only. It does not start a dev server, change app runtime behavior, or introduce GND's DB/Redis service manager.
- Checks run: `bun test scripts/dev.test.ts`; `git diff --check`.
- Skipped checks: Broad typecheck, build, browser QA, and dev server will remain skipped under fast Bun monorepo command discipline unless explicitly requested.

### Client-Fit Completion Audit

- Source mode: Goal-feature-checklist completion audit for the client-fit cooperative operations expansion goal.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `brain/audits/2026-07-10-client-fit-completion-audit.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Brain files updated: `brain/audits/2026-07-10-client-fit-completion-audit.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Audited the 93 client-fit spec stories against the shipped implementation evidence and recorded the result as 13/13 non-deferred checklist items done. No additional in-scope implementation gap was found; remaining items are documented as deferred, future-channel, legal/infrastructure, or open-policy-confirmation work.
- Scope note: Documentation/audit update only. No runtime behavior changed in this pass.
- Checks run: `git diff --check -- brain/audits/2026-07-10-client-fit-completion-audit.md brain/progress.md brain/tasks/done.md`.
- Skipped checks: Runtime tests, typecheck, build, browser QA, and dev server were not needed for this docs-only audit update.

### Dashboard Route Loader Standards Cleanup

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec after code-review standards findings.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/page.tsx`, client-fit dashboard workspace pages, client-fit report export routes, `apps/dashboard/src/lib/dashboard/load-tenant-home-page.ts`, `apps/dashboard/src/lib/food-purchase/load-food-purchase-page.ts`, `apps/dashboard/src/lib/procurement/load-procurement-page.ts`, `apps/dashboard/src/lib/project-financing/load-project-financing-page.ts`, `apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.ts`, `apps/dashboard/src/lib/support/load-support-page.ts`, `apps/dashboard/src/lib/shares/load-member-shares-page.ts`, `apps/dashboard/src/lib/guarantor-approvals/load-guarantor-approvals-page.ts`, `apps/dashboard/src/lib/settings/load-trust-readiness-page.ts`, `apps/dashboard/src/lib/reports/csv.ts`, and `apps/dashboard/src/lib/reports/client-fit-export-builders.ts`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Moved client-fit dashboard page data loading and shaping out of route files into feature-owned `lib/<domain>/load-*-page.ts` modules. The tenant home/member portal loader now owns member dashboard data loading, and the client-fit CSV exports now delegate row building/query loading to `lib/reports` builders while route handlers keep only auth, URL filter parsing, and response creation.
- Scope note: This cleanup targets the hard route-thinning standards finding from code review. It does not change end-user workflow behavior or resolve the separate future file-storage/upload enhancement.
- Checks run: `bun --cwd apps/dashboard typecheck`; `git diff --check` scoped to the edited dashboard app and lib files; targeted `rg` scans confirming the refactored client-fit page routes no longer import DB query helpers directly.
- Skipped checks: Full monorepo build, full test suite, browser QA, and dev server were skipped under fast Bun monorepo command discipline.

### Member Evidence Upload And Document Submission

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec after completion-audit gaps for receipt proof upload, opening-balance supporting documents, support attachments, and member document update submission.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `.gitignore`, `apps/dashboard/src/app/api/uploads/route.ts`, `apps/dashboard/src/app/api/uploads/[id]/route.ts`, `apps/dashboard/src/lib/uploads/local-upload-storage.ts`, `apps/dashboard/src/components/upload-evidence-input.tsx`, receipt/support/member-document/backfill dashboard forms, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, and member portal components.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Added an authenticated local upload adapter that stores evidence files outside git under `.local/uploads`, records `file.uploaded` audit evidence when the database runtime is available, and serves tenant-scoped files through `/api/uploads/:id`. Payment receipt proof fields, support attachments, member KYC documents, and brought-forward opening-balance source documents can now upload files and save the generated app URL. Members can also submit their own pending member documents directly from the portal for staff review through the existing member-document review workflow.
- Scope note: This is a local authenticated storage seam for pilot evidence, not cloud object storage, virus scanning, direct bank reconciliation, or final production retention policy.
- Checks run: `bun --cwd apps/api typecheck`; `bun --cwd apps/dashboard typecheck`; `git diff --check` scoped to upload/document changes.
- Skipped checks: Full monorepo build, full test suite, browser QA, and dev server were skipped under fast Bun monorepo command discipline.

### Receipt Audit And Settlement Cleanup

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec after code review.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/contributions.ts`, `packages/db/src/queries/loans.ts`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Receipt review audit metadata now records previous and next allocation snapshots when admin approval changes member-submitted receipt allocations. Receipt-approved loan payoff now shares the direct repayment settlement behavior by completing cleared loans, waiving remaining unpaid schedule rows, and writing `loan.early_settled` audit evidence with waived schedule item details.
- Scope note: This cleanup closes concrete review findings in the payment receipt posting path. It does not add bank integration, automatic reconciliation, or document file storage.
- Checks run: `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; `git diff --check -- packages/db/src/queries/contributions.ts packages/db/src/queries/loans.ts packages/db/src/queries/payment-receipts.ts packages/db/src/queries/payment-receipts.test.ts`; `../../node_modules/.bin/tsc --noEmit` from `packages/db`.
- Skipped/failed checks: `bun --cwd packages/db typecheck` was attempted, but the scripted `prisma generate` step stayed silent until manually stopped. Full monorepo build, full test suite, browser QA, and dev server were skipped under fast Bun monorepo command discipline.

### Dashboard Verification Cleanup

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx`, `apps/dashboard/src/lib/members/load-member-backfill-workflow.ts`, `apps/dashboard/src/lib/navigation/icons.tsx`, `apps/dashboard/package.json`, `packages/site-nav/src/components/nav-link.tsx`, `packages/ui/src/components/command.tsx`, `packages/ui/src/components/progress.tsx`, `bun.lock`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Cleaned up the dashboard verification blockers tied to the client-fit work by registering the newer share review, support/customer-service, and member receipt actions in the API action handler map; adding missing demo financing policy/product fields for procurement and Foodstuff Purchase payback settings; serializing opening-balance reversal notes for the member backfill UI; declaring dashboard's direct `react-day-picker` and `react-hook-form` type imports; and narrowing wrapper prop types in navigation/UI primitives so React `key`/`ref` types are not forwarded across package type boundaries.
- Scope note: This cleanup targets source-level dashboard verification issues introduced or exposed by the client-fit feature set. The stale generated `.next` type output was removed locally before rerunning typecheck; no generated cache files are committed.
- Checks run: `bun install --offline`; `git diff --check -- apps/api/src/routers/dashboard-actions.route.ts apps/dashboard/src/lib/members/load-member-backfill-workflow.ts 'apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx' apps/dashboard/package.json bun.lock`; `git diff --check -- apps/dashboard/src/lib/navigation/icons.tsx packages/site-nav/src/components/nav-link.tsx packages/ui/src/components/command.tsx packages/ui/src/components/progress.tsx`; `bun --cwd apps/dashboard typecheck`.
- Skipped checks: Full build, browser QA, dev server, and full monorepo test suite were not run under fast Bun monorepo command discipline.

### Member Dividend Statement Visibility

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/members.ts`, `packages/db/src/queries/members.test.ts`, member statement export/view/dashboard files, member statements CSV export route, and focused nullable/type-guard fixes in finance query files.
- Brain files updated: `brain/features/member-self-service-dashboard.md`, `brain/features/core-cooperative-platform.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Published dividend allocations now appear in member statement data, member text statement downloads, staff printable member statements, member portal dashboard cards, and the member statements CSV export. Statement summaries include total published dividends, allocation count, and last allocation timestamp; detail views include period name, published status/date, savings basis, and allocated amount.
- Scope note: This slice exposes already-published dividend-period allocations to members and staff. It does not distribute Foodstuff Purchase profit or create a dedicated dividend-only report page.
- Checks run: `bun --cwd packages/db test src/queries/members.test.ts src/queries/tenant-finance.test.ts`; `bun --cwd packages/db typecheck`.
- Skipped/failed checks: `bun --cwd apps/dashboard typecheck` was attempted and still fails on existing broad dashboard/API/Next generated type issues, missing `react-day-picker`/`react-hook-form` declarations, and React type duplication. No new member statement component errors were reported before those broader failures stopped the check. Full build, browser QA, and dev server were skipped under fast Bun monorepo command discipline.

### Dividend Period Publication Totals

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/tenant-finance.ts`, `packages/db/src/queries/tenant-finance.test.ts`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Publishing share-profit allocations now rebuilds the linked dividend period's member allocations from all published profit entries in that reviewed season, so multiple business profit rows accumulate into member-level season totals instead of overwriting each other. A dividend period moves to `published` with `publishedAt` only after every linked non-archived profit entry has published allocations; partial publication keeps the period in review while still preserving current published allocation evidence.
- Scope note: This slice closes the calculation/publication integrity gap for reviewed business-profit seasons. Foodstuff Purchase profit distribution remains separate until those semantics are confirmed.
- Checks run: `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; `bun --cwd packages/db typecheck`; `git diff --check`.
- Skipped checks: Full monorepo build, full test suite, browser QA, dev server, and manual dividend UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Opening Balance Active Financing Posting

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/backfill.prisma`, `packages/db/prisma/models/loans.prisma`, `packages/db/prisma/migrations/20260710001000_link_opening_balance_loan/migration.sql`, `packages/db/src/queries/opening-balances.ts`, `packages/db/src/queries/opening-balances.test.ts`, member backfill dashboard surfaces, and the opening-balances CSV export route.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Approved brought-forward opening balances can now apply when they contain active financing outstanding. Applying the row creates a tenant-scoped brought-forward loan product when needed, an approved loan request, loan approval evidence, an active loan, one opening repayment schedule item for the outstanding principal, stores the generated loan id on the opening balance, and records audit evidence. Reversal closes the linked opening loan and waives its schedule only when no repayment activity exists.
- Scope note: Opening financing uses the current outstanding amount as a one-row principal-only opening obligation because the brought-forward form does not capture original loan label, original principal, or month-by-month repayment history. Richer loan history still belongs to the full historical backfill path.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/opening-balances.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full test suite, browser QA, dev server, and manual opening-balance/loan UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Opening Balance Procurement Obligation Posting

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/backfill.prisma`, `packages/db/prisma/models/procurement.prisma`, `packages/db/prisma/migrations/20260709234500_link_opening_balance_procurement/migration.sql`, `packages/db/src/queries/opening-balances.ts`, `packages/db/src/queries/opening-balances.test.ts`, member backfill dashboard surfaces, and the opening-balances CSV export route.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/features/procurement-requests.md`, `brain/database/schema.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Approved brought-forward opening balances can now apply when they contain procurement outstanding but no active financing outstanding. Applying the row posts savings/share opening records as before, creates a linked active procurement request labeled as a brought-forward procurement balance, creates one opening repayment schedule item for the outstanding amount, stores the generated procurement request id on the opening balance, and records audit evidence. Reversal cancels the linked opening procurement obligation and waives its schedule only when no repayment activity exists.
- Scope note: Active financing outstanding remains blocked from the opening-balance apply path until the dedicated loan-opening posting semantics are implemented.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/opening-balances.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full test suite, browser QA, dev server, and manual opening-balance/procurement UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

## 2026-07-09

### Procurement And Foodstuff Payback Policy

- Source mode: Goal continuation from the client-fit cooperative operations expansion spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/models/procurement.prisma`, `packages/db/prisma/models/food-purchase.prisma`, `packages/db/prisma/migrations/20260709233000_add_product_payback_policy/migration.sql`, `packages/db/src/queries/financing-cycles.ts`, `packages/db/src/queries/procurement.ts`, `packages/db/src/queries/food-purchase.ts`, `packages/db/src/queries/contributions.ts`, focused query tests, dashboard finance/foodstuff/procurement/report surfaces, and notification copy.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/food-purchase-operations.md`, `brain/features/financing-policy-guards.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/database/schema.md`, `brain/progress.md`, `brain/tasks/done.md`.
- Current status: Procurement and Foodstuff Purchase now have tenant-level max payback month settings and fixed/flexible commitment-reduction settings separate from loan policy and from each other. Procurement request submission/review and Foodstuff Purchase application submission/review enforce those caps, approved obligations snapshot the applicable policy, and commitment reductions are blocked while fixed-policy procurement or Foodstuff Purchase obligations are active/unpaid. Product-facing dashboard/report/notification labels now use Foodstuff Purchase while keeping `/food-purchase` routes and `food_purchase` categories stable.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/procurement.test.ts src/queries/food-purchase.test.ts src/queries/contributions.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full test suite, browser QA, and dev server were intentionally skipped under fast Bun monorepo command discipline.

### Procurement And Foodstuff Policy Spec Update

- Source mode: User discovery update after the cooperative client meeting.
- Changed source files: `brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md`, `brain/features/food-purchase-operations.md`, `brain/features/procurement-requests.md`, `brain/features/financing-policy-guards.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`.
- Brain files updated: `brain/progress.md`, `brain/tasks/done.md`.
- Current status: The client-fit spec and Brain now use Foodstuff Purchase as the product-facing label for staple food purchases such as rice, beans, yam, garri, and grains, while preserving current `/food-purchase` route/module references. Procurement and Foodstuff Purchase are documented as needing separate tenant configuration from loans and from each other, including maximum payback months and a fixed/flexible commitment policy during payback.
- Scope note: Documentation update only. No schema, API, router, UI, or authorization behavior changed in this pass.
- Checks run: `git diff --check -- brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md brain/features/food-purchase-operations.md brain/features/procurement-requests.md brain/features/financing-policy-guards.md brain/features/core-cooperative-platform.md brain/features/member-commitments-and-payment-allocation.md brain/progress.md brain/tasks/done.md`.
- Skipped checks: Runtime tests, typecheck, build, browser QA, and dev server were not needed for this docs-only spec/Brain update.

### Food Purchase Permission Matrix Split

- Source mode: Goal continuation from the client-fit cooperative operations spec after opening balances CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/auth/src/roles.ts`, `packages/auth/src/roles.test.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: The role permission matrix now separates food-purchase responsibilities into fund release, committee application review, committee accounting submission, accounting review, and member application. This makes the existing route/action gates visible on the Roles page: finance roles own fund release and accounting review, staff roles can review applications and submit committee accounting, and members can apply.
- Scope note: This slice updates permission guidance only. It does not add a dedicated committee-staff role or change the existing route/action authorization behavior.
- Checks run: `bun test packages/auth/src/roles.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual Roles page walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Opening Balances CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after trust page internal crash evidence.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/opening-balances.ts`, `packages/db/src/queries/opening-balances.test.ts`, `apps/dashboard/src/app/(app)/(sidebar)/reports/opening-balances-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Workspace admins can now export brought-forward opening balances from `/reports/opening-balances-export`. The export supports opening-date, status, and member filters, includes source document evidence, commitment/special-savings/share balances, unresolved financing/procurement obligation amounts, review evidence, apply evidence, and reversal evidence, and appears in the Reports catalog as “Opening balances CSV.”
- Scope note: This slice adds migration audit/export visibility only. It does not change opening-balance apply behavior or post active financing/procurement opening obligations.
- Checks run: `bun --cwd packages/db test src/queries/opening-balances.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual opening-balances CSV download were intentionally skipped under fast Bun monorepo command discipline.

### Trust Page Internal Crash Evidence

- Source mode: Goal continuation from the client-fit cooperative operations spec after special savings CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/settings/trust/page.tsx`.
- Brain files updated: `brain/features/operational-trust-readiness.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Trust readiness now separates external Sentry-compatible monitoring from internal crash evidence. The page shows an “Internal crash evidence” readiness item that links admins to the activity report where `application.error_captured` audit entries appear when database-backed tenant context is available.
- Scope note: This slice updates readiness visibility only. It does not install an external monitoring SDK, add alert routing, or change the crash-report capture route.
- Checks run: `git diff --check -- apps/dashboard/src/app/(app)/(sidebar)/settings/trust/page.tsx brain/features/operational-trust-readiness.md brain/progress.md brain/tasks/done.md`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual trust-page walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Special Savings CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after guarantor approval email link target.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/contributions.ts`, `packages/db/src/queries/contributions.test.ts`, `apps/dashboard/src/app/(app)/(sidebar)/reports/special-savings-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Workspace admins can now export special-savings contribution rows from `/reports/special-savings-export`. The report reuses tenant-scoped contribution data, filters to rows where `extraSavingsAmount` is above zero, includes member/period/reference evidence, and appears in the Reports catalog as “Special savings CSV.”
- Scope note: This slice adds export/backup visibility only. It does not change contribution posting, special-savings eligibility policy, payment receipt approval, or member balance math.
- Checks run: `bun --cwd packages/db test src/queries/contributions.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual special-savings CSV download were intentionally skipped under fast Bun monorepo command discipline.

### Guarantor Approval Email Link Target

- Source mode: Goal continuation from the client-fit cooperative operations spec after feature-request support summary visibility.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/finance.ts`, `packages/notifications/src/types/member-request-status.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/financing-guarantor-approval.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Guarantor approval request emails now default to and are emitted with the tenant `/guarantor-approvals` action URL, matching the member self-service response surface instead of sending guarantors to the staff loan queue. The email body now tells guarantors to respond from their guarantor approvals page.
- Scope note: This slice corrects the authenticated member approval link only. It does not add signed no-login approval links, WhatsApp approvals, or escalation timers.
- Checks run: `bun test packages/notifications/src/types/member-request-status.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and live email delivery verification were intentionally skipped under fast Bun monorepo command discipline.
- Note: `bun --cwd packages/notifications test src/types/member-request-status.test.ts` was attempted first, but the notifications package has no `test` script; the direct Bun file test was used instead.

### Feature Request Support Summary

- Source mode: Goal continuation from the client-fit cooperative operations spec after dashboard error report capture.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/dashboard/src/components/support-cases-view.tsx`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Support case summaries now include open feature-request counts, and staff/member support dashboards show a dedicated “Feature requests” tile so product feedback has a visible triage queue alongside open, priority, urgent, resolved, and total case metrics.
- Scope note: This slice improves feature-request visibility only. It does not add a separate product-management board, voting, public roadmap, or non-email notification channel.
- Checks run: `bun --cwd packages/db test src/queries/support.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual support dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Dashboard Error Report Capture

- Source mode: Goal continuation from the client-fit cooperative operations spec after loan product short codes.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/lib/error-reporting.ts`, `apps/dashboard/src/lib/error-reporting.test.ts`, `apps/dashboard/src/app/api/error-report/route.ts`, `apps/dashboard/src/app/error.tsx`.
- Brain files updated: `brain/features/operational-trust-readiness.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: The dashboard error boundary now posts a sanitized crash report to `/api/error-report`. Database-backed tenant workspaces record `application.error_captured` audit entries with digest, route path, redacted message/stack evidence, source, and user-agent metadata when tenant context is available, while the user-facing crash screen still hides raw technical details.
- Scope note: This slice adds internal audit-backed error capture. It does not install or configure the external Sentry SDK, create alert routing, or promise production incident-response SLAs.
- Checks run: `bun test apps/dashboard/src/lib/error-reporting.test.ts`; `git diff --check -- apps/dashboard/src/lib/error-reporting.ts apps/dashboard/src/lib/error-reporting.test.ts apps/dashboard/src/app/error.tsx apps/dashboard/src/app/api/error-report/route.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, external Sentry verification, and manual crash-flow walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Project Financing Disbursement Evidence

- Source mode: Goal continuation from the client-fit cooperative operations spec after project financing receipt repayment posting.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/project-financing.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/migrations/20260709230000_add_project_financing_disbursement_evidence/migration.sql`, `packages/db/src/queries/project-financing.ts`, `packages/db/src/queries/project-financing.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/project-financing-requests-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/project-financing-export/route.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Finance staff can record disbursement evidence for approved project financing requests with disbursed date, reference, notes, and actor attribution. Recording disbursement moves the request to active, writes audit evidence, displays the disbursement details to staff and linked members, and adds disbursement columns to the project-financing CSV export.
- Scope note: This slice records funding evidence only. It does not create bank ledger entries, perform bank transfers, create loan records, or post profit-sharing allocations.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/project-financing.test.ts`; `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual project-financing disbursement UI/export walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Project Financing Receipt Repayment Posting

- Source mode: Goal continuation from the client-fit cooperative operations spec after food-purchase payment visibility.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/contributions.prisma`, `packages/db/prisma/models/project-financing.prisma`, `packages/db/prisma/models/contributions.prisma`, `packages/db/prisma/migrations/20260709220000_add_project_financing_receipt_targets/migration.sql`, `packages/db/src/queries/project-financing.ts`, `packages/db/src/queries/project-financing.test.ts`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/payment-receipts/page.tsx`, `apps/dashboard/src/components/payment-receipts-view.tsx`, `apps/dashboard/src/components/project-financing-requests-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/payment-receipts-export/route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/reports/project-financing-export/route.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/features/member-payment-receipts.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Payment receipt allocations now support `project_financing` targets for approved/active repayable-facility requests. Finance approval validates tenant/member ownership, approved repayable structure, payable status, and unpaid balance, blocks overpayment, updates paid amount/date evidence, moves partial repayments to active, and marks fully repaid facilities completed. Staff/member receipt forms expose outstanding repayable project-financing targets, project-financing cards show paid/outstanding evidence, and CSV exports include project-financing payment target/evidence columns.
- Scope note: This slice does not disburse project financing, create loan records, create repayment schedules, post profit-sharing allocations, or make investment-partnership/profit-sharing approvals payable.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts src/queries/project-financing.test.ts`; `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual receipt/project-financing UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Payment Visibility

- Source mode: Goal continuation from the client-fit cooperative operations spec after food purchase receipt posting.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/components/food-purchase-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/food-purchase-export/route.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Food-purchase application cards now show paid amount, outstanding amount, and settled date evidence for staff and linked members. The food-purchase CSV export now includes paid amount, outstanding amount, and paid-at columns for application rows.
- Scope note: This slice is read-only visibility. It does not add new posting behavior beyond the existing receipt approval path.
- Checks run: `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase UI/export walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Receipt Posting

- Source mode: Goal continuation from the client-fit cooperative operations spec after tenant trust readiness profile.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/food-purchase.prisma`, `packages/db/prisma/models/contributions.prisma`, `packages/db/prisma/migrations/20260709210000_add_food_purchase_receipt_targets/migration.sql`, `packages/db/src/queries/food-purchase.ts`, `packages/db/src/queries/food-purchase.test.ts`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/payment-receipts/page.tsx`, `apps/dashboard/src/components/payment-receipts-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/payment-receipts-export/route.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/member-payment-receipts.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Approved food purchase applications now track paid amount and paid date evidence. Payment receipt allocations can target approved food purchase applications, finance approval validates member ownership and unpaid balance, blocks overpayment, and updates application paid evidence. Staff/member receipt forms expose payable food purchase application options, and payment receipt CSV exports include the food purchase application target.
- Scope note: This slice settles approved application amounts only. It does not distribute food-purchase profit, post a separate food-purchase accounting ledger, or create new member savings/share movements from food-purchase accounting.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts src/queries/food-purchase.test.ts`; `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual payment receipt UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Tenant Trust Readiness Profile

- Source mode: Goal continuation from the client-fit cooperative operations spec after workspace role permission matrix.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260709200000_add_tenant_trust_profile/migration.sql`, `packages/db/src/queries/tenants.ts`, `packages/db/src/queries/tenants.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/forms/settings-forms.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/trust/page.tsx`.
- Brain files updated: `brain/features/operational-trust-readiness.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-level trust readiness profile fields for legal terms, privacy, data-processing evidence, incident contact, backup-retention note, recovery point objective, recovery time objective, and review metadata. The trust page now loads/saves the audited profile and uses saved legal/restore evidence to update readiness status.
- Scope note: This slice records readiness evidence for pilot discussions. It does not provide final legal text, configure a monitoring SDK, execute database restores, or promise a formal uptime SLA.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenants.test.ts`; `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual trust-profile form walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Workspace Role Permission Matrix

- Source mode: Goal continuation from the client-fit cooperative operations spec after payment receipts CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/auth/src/roles.ts`, `packages/auth/src/roles.test.ts`, `apps/dashboard/src/app/(app)/(sidebar)/settings/roles/page.tsx`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a shared cooperative role permission matrix covering members, payments, financing, procurement, shares, food purchase, project financing, support, reports, and settings. The workspace roles page now keeps tenant-user provisioning/default-role visibility and also renders module/action permissions with allowed role badges for admin review.
- Scope note: This slice publishes a typed permission matrix and governance view for the existing role model. It does not add custom per-tenant permission overrides or a new HR employee profile table.
- Checks run: `bun test packages/auth/src/roles.test.ts`; `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual roles-page walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Payment Receipts CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after share positions CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `apps/dashboard/src/app/(app)/(sidebar)/reports/payment-receipts-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/member-payment-receipts.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin payment receipts CSV export with submitted-date filters, member proof metadata, review status, receipt totals, allocation category/period intent, target links, and posted contribution/repayment/share/procurement links. The receipt list query now supports custom limits and submitted-date windows for exports while preserving the existing default.
- Scope note: This slice adds export/reconciliation visibility only. It does not add bank integration, automatic reconciliation, or posting for still-unsupported food purchase/other receipt allocations.
- Checks run: `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual payment receipt export download were intentionally skipped under fast Bun monorepo command discipline.

### Share Positions CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after member register CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/reports/shares-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin share positions CSV export with tenant scope, joined-date filters, share balance as-of reporting, active share model, unit amount, compulsory/optional unit totals when unit-based shareholding is selected, and pending/approved/rejected/cancelled share-request counts. The export is visible in the Reports catalog.
- Scope note: This slice adds read-only share-position export evidence only. It does not change share application review, share capital posting, dividend allocation, or share transfer/withdrawal behavior.
- Checks run: `git diff --cached --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual share export download were intentionally skipped under fast Bun monorepo command discipline.

### Member Register CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after procurement export schedule risk columns.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/reports/members-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin member register CSV export with tenant scope, joined-date filters, pagination across the full member list, contact details, KYC status/evidence fields, deduction source, member status, payment-allocation preference, savings snapshot, and linked-login evidence. The export is visible in the Reports catalog.
- Scope note: This slice adds offline member-register evidence only. It does not add managed backup/restore automation, new member edit workflows, or broader role-matrix changes.
- Checks run: `git diff --check -- apps/dashboard/src/app/(app)/(sidebar)/reports/members-export/route.ts apps/dashboard/src/components/reports/reports-utils.ts brain/features/core-cooperative-platform.md brain/features/dashboard-navigation-and-roles.md brain/tasks/done.md brain/progress.md`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member export download were intentionally skipped under fast Bun monorepo command discipline.

### Procurement Export Schedule Risk Columns

- Source mode: Goal continuation from the client-fit cooperative operations spec after procurement due/overdue dashboard visibility.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/reports/procurement-export/route.ts`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Procurement CSV exports now include due schedule item count, overdue schedule item count, and a compact schedule risk label alongside outstanding amount and the full repayment schedule summary.
- Scope note: This slice only expands the export read model. It does not add procurement default/escalation workflows or procurement-specific accounting ledger entries.
- Checks run: `git diff --check -- apps/dashboard/src/app/(app)/(sidebar)/reports/procurement-export/route.ts brain/features/procurement-requests.md brain/tasks/done.md brain/progress.md`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual procurement export download were intentionally skipped under fast Bun monorepo command discipline.

### Procurement Schedule Due And Overdue Visibility

- Source mode: Goal continuation from the client-fit cooperative operations spec after procurement receipt repayment posting.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/procurement.ts`, `packages/db/src/queries/procurement.test.ts`, `apps/dashboard/src/components/procurement-requests-view.tsx`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Procurement request reads now derive effective due/overdue installment status from schedule due dates, procurement summaries include due/overdue/outstanding servicing totals, and staff/member procurement views show those risk counts.
- Scope note: This slice adds reporting/read-model visibility only. It does not post procurement cash/bank disbursement ledger entries, create formal default/escalation workflows, or add procurement-specific accounting ledger entries.
- Checks run: `bun --cwd packages/db test src/queries/procurement.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual procurement dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Procurement Receipt Repayment Posting

- Source mode: Goal continuation from the client-fit cooperative operations spec after procurement purchase activation.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/contributions.prisma`, `packages/db/prisma/models/procurement.prisma`, `packages/db/prisma/migrations/20260709190000_add_receipt_procurement_schedule_target/migration.sql`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/payment-receipts/page.tsx`, `apps/dashboard/src/components/payment-receipts-view.tsx`.
- Brain files updated: `brain/features/member-payment-receipts.md`, `brain/features/procurement-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Payment receipt allocations can now target active procurement repayment schedule items. Finance approval validates the selected member schedule, rejects overpayment, updates the schedule paid amount/status, exposes active procurement installments in staff/member receipt forms, and marks the procurement request completed when no payable schedule rows remain.
- Scope note: This slice does not post procurement cash/bank disbursement ledger entries, default handling, food-purchase receipt posting, or procurement-specific accounting ledger entries.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual payment receipt walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Procurement Purchase Activation

- Source mode: Goal continuation from the client-fit cooperative operations spec after opening-balance reversal.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/procurement.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260709180000_add_procurement_purchase_schedule/migration.sql`, `packages/db/src/queries/procurement.ts`, `packages/db/src/queries/procurement.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/procurement-requests-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/procurement-export/route.ts`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Approved procurement requests can now be recorded as purchased/fulfilled with purchase date, first due date, optional reference, and notes. Recording purchase marks the request active, stores purchase metadata, generates monthly procurement repayment schedule rows, shows outstanding amount in staff/member views, and includes purchase/schedule evidence in procurement CSV export.
- Scope note: This slice does not yet post procurement cash/bank disbursement ledger entries, accept procurement repayment receipts, mark schedule rows paid/defaulted, or create procurement-specific accounting ledger entries.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/procurement.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual procurement purchase walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Opening Balance Reversal

- Source mode: Goal continuation from the client-fit cooperative operations spec after payment receipt share posting.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/backfill.prisma`, `packages/db/prisma/models/backfill.prisma`, `packages/db/prisma/migrations/20260709170000_add_member_opening_balance_reversal/migration.sql`, `packages/db/src/queries/opening-balances.ts`, `packages/db/src/queries/opening-balances.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/members/member-backfill-page-view.tsx`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a finance/admin reversal workflow for applied brought-forward opening balances. Reversal requires notes, posts opposite savings ledger entries, decrements the member savings snapshot, posts a negative brought-forward share ledger entry, marks the row as `reversed`, records reversal metadata, and exposes a reverse form for applied rows in the member baseline step.
- Scope note: Reversal only covers applied opening balances that posted savings/share capital. Active financing and procurement opening obligations remain blocked until their dedicated ledgers are implemented.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/opening-balances.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual opening-balance reversal walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Payment Receipt Share Posting

- Source mode: Goal continuation from the client-fit cooperative operations spec after member guarantor self-service.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/models/contributions.prisma`, `packages/db/prisma/models/share-business.prisma`, `packages/db/prisma/migrations/20260709160000_add_payment_receipt_share_posting/migration.sql`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `packages/db/src/queries/tenant-finance.ts`.
- Brain files updated: `brain/features/member-payment-receipts.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Approved member payment receipts can now post `shares` allocations into the member share ledger with source type `payment_receipt`, source id set to the receipt allocation, reviewer attribution, receipt notes, and a posted share-ledger reference stored back on the allocation.
- Scope note: Procurement, food purchase commitment, and generic other receipt categories remain staged/blocked until their dedicated servicing/accounting ledgers are implemented.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual payment receipt walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Guarantor Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec after approved opening-balance apply.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/loans.ts`, `packages/db/src/queries/loans.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/guarantor-approvals/page.tsx`, `apps/dashboard/src/components/member-guarantor-approvals-view.tsx`, `apps/dashboard/src/components/member-portal-overview.tsx`.
- Brain files updated: `brain/features/financing-guarantor-approval.md`, `brain/features/member-self-service-dashboard.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added member-scoped guarantor approval listing and response. Linked guarantor members can open `/guarantor-approvals`, see only requests tied to their member profile, and approve or reject pending guarantor requests with audit metadata.
- Scope note: This slice adds authenticated member-portal guarantor self-service only. Signed external approval links, WhatsApp approval, automatic expiry/escalation timers, and borrower/staff follow-up notifications remain future channels/workflows.
- Checks run: `bun --cwd packages/db test src/queries/loans.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual guarantor approval walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Approved Opening Balance Apply

- Source mode: Goal continuation from the client-fit cooperative operations spec after food-purchase accounting notifications.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/backfill.prisma`, `packages/db/prisma/models/backfill.prisma`, `packages/db/prisma/migrations/20260709150000_apply_member_opening_balances/migration.sql`, `packages/db/src/queries/opening-balances.ts`, `packages/db/src/queries/opening-balances.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/members/load-member-backfill-workflow.ts`, `apps/dashboard/src/components/members/member-backfill-page-view.tsx`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added an `applied` opening-balance state and a finance-staff apply action for approved brought-forward rows that contain only savings/share capital. Applying posts commitment plus special savings as a brought-forward ledger adjustment, increments the member savings snapshot, posts share capital through the member share ledger, records applied metadata, and writes audit evidence.
- Scope note: Opening balances with active financing or procurement outstanding are intentionally blocked from this first apply path until their obligation posting/servicing semantics are implemented. Reversal of applied opening positions remains future work.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/opening-balances.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual opening-balance apply walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Accounting Review Notifications

- Source mode: Goal continuation from the client-fit cooperative operations spec after member self-service statement export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/food-purchase.ts`, `packages/notifications/src/types/registry.ts`, `packages/notifications/src/types/member-request-status.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a registered `food_purchase.accounting_status_changed` notification type and direct audited committee emails when finance/admin review accepts submitted food-purchase accounting or requests correction and the submitting user has an email address.
- Scope note: This slice adds email/audit delivery for food-purchase accounting review decisions only. It does not post food-purchase obligations, fulfillment, member payments, accounting ledger entries, or profit distribution.
- Checks run: `bun test packages/notifications/src/types/member-request-status.test.ts`; targeted `rg` for food-purchase accounting notification symbols.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase accounting notification walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Self-Service Statement Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after food-purchase review notifications.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/lib/members/statement-export.ts`, `apps/dashboard/src/app/(app)/(sidebar)/members/[memberId]/statement-export/route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/member-statement-export/route.ts`, `apps/dashboard/src/components/member-portal-overview.tsx`.
- Brain files updated: `brain/features/member-self-service-dashboard.md`, `brain/features/core-cooperative-platform.md`, `brain/progress.md`.
- Current status: Added a self-service member statement download that resolves the statement from the authenticated member account and tenant, reuses the staff statement text formatter, and exposes dashboard actions for members.
- Scope note: This slice adds a text statement download only. It does not add PDF generation, managed document storage, member profile edits, or new ledger posting behavior.
- Checks run: Targeted route/component symbol searches and `git diff --check` on touched tracked files plus no-diagnostic new-file whitespace checks.
- Check note: Targeted ESLint attempts did not run successfully because the available `bunx eslint` invocations either loaded an incompatible ESLint 10 React rule path or parsed the app files without the Next.js module/parser config.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual statement download walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Application Review Notifications

- Source mode: Goal continuation from the client-fit cooperative operations spec after procurement review notifications.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/food-purchase.ts`, `packages/notifications/src/types/registry.ts`, `packages/notifications/src/types/member-request-status.test.ts`, `packages/db/src/queries/food-purchase.ts`, `packages/db/src/queries/food-purchase.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a registered `food_purchase.application_status_changed` notification type and direct audited member emails when committee/staff review moves a food purchase application to under review, approved, or rejected and the linked member has an email address.
- Scope note: This slice does not post food-purchase obligations, fulfillment, member payments, accounting ledger entries, or profit distribution.
- Checks run: `bun test packages/notifications/src/types/member-request-status.test.ts`; `bun --cwd packages/db test src/queries/food-purchase.test.ts`; targeted `rg` for food-purchase notification symbols; `git diff --check`; `git diff --check --no-index /dev/null packages/notifications/src/types/food-purchase.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase notification walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Procurement Review Notifications

- Source mode: Goal continuation from the client-fit cooperative operations spec after food-purchase accounting review.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/procurement.ts`, `packages/notifications/src/types/registry.ts`, `packages/notifications/src/types/member-request-status.test.ts`, `packages/db/src/queries/procurement.ts`, `packages/db/src/queries/procurement.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a registered `procurement.request_status_changed` notification type and direct audited member emails when finance reviews move a procurement request to under review, approved, or rejected and the linked member has an email address.
- Scope note: This slice does not post procurement disbursement, fulfillment, repayment schedules, repayment receipts, defaults, or procurement ledger entries.
- Checks run: `bun test packages/notifications/src/types/member-request-status.test.ts`; `bun --cwd packages/db test src/queries/procurement.test.ts`; targeted `rg` for procurement notification symbols; `git diff --check`; `git diff --check --no-index /dev/null packages/notifications/src/types/procurement.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual procurement notification walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Accounting Review

- Source mode: Goal continuation from the client-fit cooperative operations spec after food-purchase export support.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/food-purchase.ts`, `packages/db/src/queries/food-purchase.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/food-purchase-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/food-purchase/page.tsx`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added finance/admin review for submitted food-purchase accounting. Review can approve submitted accounting as accepted evidence or reject it for correction, writes audit metadata, and exposes approve/request-correction controls on submitted monthly cycles.
- Scope note: This slice does not post food-purchase obligations, fulfillment, member payments, accounting ledger entries, or profit distribution.
- Checks run: `bun --cwd packages/db test src/queries/food-purchase.test.ts`; targeted `rg` for food-purchase accounting review symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase accounting review walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after procurement CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/reports/food-purchase-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin CSV export for food purchase operations with cycle release rows, member application rows, approval evidence, committee accounting totals, and profit evidence. The export is visible from the Reports catalog.
- Scope note: This slice does not post food-purchase obligations, fulfillment, member payments, accounting approval/rejection, or profit distribution.
- Checks run: `bun --cwd packages/db test src/queries/food-purchase.test.ts`; targeted `rg` for food-purchase export route/catalog/Brain symbols; `git diff --check`; `git diff --check --no-index /dev/null apps/dashboard/src/app/(app)/(sidebar)/reports/food-purchase-export/route.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase export download were intentionally skipped under fast Bun monorepo command discipline.

### Procurement CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after project financing review notifications.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/reports/procurement-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin CSV export for procurement requests with member identity, item/vendor details, request status, requested and approved costs, repayment months, monthly repayment estimates, reviewer, review notes, and created-by evidence. The export is visible from the Reports catalog.
- Scope note: This slice does not post procurement disbursement, fulfillment, repayment schedules, repayment receipts, defaults, or procurement ledger entries.
- Checks run: targeted `rg` for procurement export route/catalog/Brain symbols; `git diff --check`; `git diff --check --no-index /dev/null apps/dashboard/src/app/(app)/(sidebar)/reports/procurement-export/route.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual procurement export download were intentionally skipped under fast Bun monorepo command discipline.

### Project Financing Review Notifications

- Source mode: Goal continuation from the client-fit cooperative operations spec after project financing CSV export.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/project-financing.ts`, `packages/notifications/src/types/registry.ts`, `packages/notifications/src/types/member-request-status.test.ts`, `packages/db/src/queries/project-financing.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a registered `project_financing.request_status_changed` notification type and direct audited member emails when finance reviews move a project financing request to under review, approved, or rejected and the linked member has an email address.
- Scope note: This slice does not post project financing accounting, create member obligations, send staff/project committee notifications, or add WhatsApp/push delivery.
- Checks run: `bun test packages/notifications/src/types/member-request-status.test.ts`; `bun --cwd packages/db test src/queries/project-financing.test.ts`; targeted `rg` for project-financing notification symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual project-financing notification walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Project Financing CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec after member project-financing self-service.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/reports/project-financing-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin CSV export for project financing requests with member identity, business details, request status, proposed and approved structure, requested/approved amounts, payback evidence, reviewer, review notes, and created-by evidence. The export is visible from the Reports catalog.
- Scope note: This slice does not post project financing accounting, create member obligations, or send project-financing notifications.
- Checks run: targeted `rg` for project-financing export route/catalog/Brain symbols; `git diff --check`; `git diff --check --no-index /dev/null apps/dashboard/src/app/(app)/(sidebar)/reports/project-financing-export/route.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual project-financing export download were intentionally skipped under fast Bun monorepo command discipline.

### Member Project Financing Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec after member procurement self-service.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/project-financing/page.tsx`, `apps/dashboard/src/components/project-financing-requests-view.tsx`, `apps/dashboard/src/components/member-portal-overview.tsx`, `apps/dashboard/src/lib/navigation/registry.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/features/member-self-service-dashboard.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a member-scoped `/project-financing` experience. Linked members can submit their own business funding requests with proposed structure, amount, purpose, description, and optional payback months without a member picker, and view only their own request history; staff keep the tenant-wide project financing queue and finance review controls.
- Scope note: This slice does not disburse funds, post obligations, create loan ledgers, create profit-sharing allocations, or emit notifications. Approval remains staged review evidence until project financing accounting semantics are confirmed.
- Checks run: `bun --cwd packages/db test src/queries/project-financing.test.ts`; targeted `rg` for member project-financing action/route symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member project-financing walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Procurement Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec after member food purchase self-service.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/procurement/page.tsx`, `apps/dashboard/src/components/procurement-requests-view.tsx`, `apps/dashboard/src/components/member-portal-overview.tsx`, `apps/dashboard/src/lib/navigation/registry.ts`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/member-self-service-dashboard.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a member-scoped `/procurement` experience. Linked members can submit their own item/vendor/cost/repayment-month requests without a member picker and view only their own request history; staff keep the tenant-wide procurement queue and finance review controls.
- Scope note: This slice does not post procurement disbursement, item fulfillment, repayment schedules, repayment receipts, defaults, or procurement ledger entries. Finance approval remains review evidence until procurement servicing/posting semantics are implemented.
- Checks run: `bun --cwd packages/db test src/queries/procurement.test.ts`; targeted `rg` for member procurement action/route symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member procurement walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Food Purchase Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec after member profile/document update requests.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/food-purchase/page.tsx`, `apps/dashboard/src/components/food-purchase-view.tsx`, `apps/dashboard/src/components/member-portal-overview.tsx`, `apps/dashboard/src/lib/navigation/registry.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/member-self-service-dashboard.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a member-scoped `/food-purchase` experience. Linked members can select an open food-purchase cycle, submit their own item/amount request without a member picker, and view only their own application history; staff keep the existing committee release, application review, and accounting workspace.
- Scope note: This slice does not post food-purchase obligations, payments, fulfillment, or profit distribution. Committee approval remains review evidence until food-purchase posting semantics are confirmed.
- Checks run: `bun --cwd packages/db test src/queries/food-purchase.test.ts`; targeted `rg` for member food-purchase action/route symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member food-purchase walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Profile And Document Update Requests

- Source mode: Goal continuation from the client-fit cooperative operations spec after the member self-service dashboard slice.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/support/page.tsx`, `apps/dashboard/src/components/support-cases-view.tsx`, `apps/dashboard/src/components/member-portal-overview.tsx`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/member-self-service-dashboard.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a support-backed member profile/document update request path. Members can start a prefilled `account_update` case from their dashboard profile card, support case creation can carry an optional attachment URL on the initial message, and staff/member timelines render the attachment link for review evidence.
- Scope note: This slice does not directly mutate member profile, KYC, or document records and does not add managed file storage. Staff still approve or resolve the request through support and existing member/KYC tools.
- Checks run: `bun --cwd packages/db test src/queries/support.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual support/member-dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Self-Service Dashboard

- Source mode: Goal continuation from the client-fit cooperative operations spec after member receipt/share/support self-service foundations.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/page.tsx`, `apps/dashboard/src/components/member-portal-overview.tsx`.
- Brain files updated: `brain/features/member-self-service-dashboard.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a member-role dashboard root that derives the member profile from the authenticated user and shows profile/KYC status, commitment, savings, special savings, financing exposure, active obligations, recent receipts, support cases, share position/applications, procurement requests, project financing requests, food purchase applications, and recent ledger activity.
- Scope note: This slice is read-only. It does not add member profile edit submissions, document update requests, member-facing procurement/project/food-purchase application forms, notifications, or a self-scoped printable statement/download route.
- Checks run: targeted `rg` for member portal symbols and self-service routes; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Project Financing Dashboard Workspace

- Source mode: Goal continuation from the client-fit cooperative operations spec after the project financing request foundation.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/project-financing/page.tsx`, `apps/dashboard/src/components/project-financing-requests-view.tsx`, `packages/db/src/queries/dashboard.ts`, `packages/db/src/queries/dashboard.test.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a `/project-financing` staff workspace for member business funding request creation, review status changes, approval structure selection, approved amount/payback evidence, Finance navigation, and overview action-queue visibility for submitted/under-review requests.
- Scope note: This slice does not add disbursement, loan/repayment ledgers, profit-sharing accounting, member self-service applications, exports, notifications, or member obligations. The page surfaces review evidence only until accounting semantics are confirmed.
- Checks run: `bun --cwd packages/db test src/queries/project-financing.test.ts src/queries/dashboard.test.ts`; targeted `rg` for project-financing route/action symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual project financing dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Project Financing Request Foundation

- Source mode: Goal continuation from the client-fit cooperative operations spec after food-purchase workflow clarification.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/project-financing.prisma`, `packages/db/prisma/models/project-financing.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260709140000_add_project_financing_requests/migration.sql`, `packages/db/src/index.ts`, `packages/db/src/queries/project-financing.ts`, `packages/db/src/queries/project-financing.test.ts`.
- Brain files updated: `brain/features/project-financing-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-scoped staged project financing requests for member business funding discussions, including requested amount, optional proposed structure, principal-only payback estimate when months are provided, review decisions, approval structure clarification, approved amount/payback evidence, and audit entries.
- Scope note: This slice does not add disbursement, loan/repayment ledgers, profit-sharing accounting, dividend allocation, member obligations, dashboard/API/member portal surfaces, exports, or notifications. Those remain blocked on the cooperative confirming whether approved project financing should post as a repayable facility, investment partnership, profit-sharing arrangement, or selectable mix per request.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/project-financing.test.ts`; targeted `rg` for project-financing symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual project financing workflow walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Dashboard Workspace

- Source mode: Goal continuation from the client-fit cooperative operations spec plus food-purchase clarification from the client meeting follow-up.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/food-purchase/page.tsx`, `apps/dashboard/src/components/food-purchase-view.tsx`, `packages/db/src/queries/dashboard.ts`, `packages/db/src/queries/dashboard.test.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a `/food-purchase` finance workspace for monthly committee fund releases, member food-purchase applications, staff review decisions, and end-of-month accounting/profit capture. Pending food-purchase applications and submitted accounting now appear in the overview action queue.
- Scope note: This slice does not add member self-service food-purchase application forms, receipt posting, fulfillment tracking, accounting approval/rejection, file evidence upload, role-specific committee staff permissions, or profit distribution.
- Checks run: `bun --cwd packages/db test src/queries/food-purchase.test.ts src/queries/dashboard.test.ts`; targeted `rg` for food-purchase route/action symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Food Purchase Committee Workflow Foundation

- Source mode: Goal continuation from the client-fit cooperative operations spec plus food-purchase clarification from the client meeting follow-up.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/food-purchase.prisma`, `packages/db/prisma/models/food-purchase.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260709130000_add_food_purchase_workflow/migration.sql`, `packages/db/src/index.ts`, `packages/db/src/queries/food-purchase.ts`, `packages/db/src/queries/food-purchase.test.ts`.
- Brain files updated: `brain/features/food-purchase-operations.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a tenant-scoped food purchase workflow foundation with monthly committee fund-release cycles, member food-purchase applications, committee review decisions, released-fund capacity checks, end-of-month accounting capture, computed profit, and audit entries.
- Scope note: This slice does not add dashboard/API screens, member fulfillment, repayment/commitment posting, receipt posting, accounting review, or profit distribution. Committee staff permissions still map to existing tenant user membership until a dedicated permission matrix is implemented.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db prisma format`; `bun --cwd packages/db test src/queries/food-purchase.test.ts`; targeted `rg` for food-purchase symbols; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual food-purchase walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Opening Balance Action Queue Visibility

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/dashboard.ts`, `packages/db/src/queries/dashboard.test.ts`.
- Brain files updated: `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added pending brought-forward opening balance reviews to the overview action queue so finance staff can see staged opening positions that still need approval/rejection.
- Scope note: The queue links to the members workspace because pending opening balances are still resolved from member-level backfill baseline screens; a dedicated tenant-wide opening-balance review route remains future UI polish.
- Checks run: `bun --cwd packages/db test src/queries/dashboard.test.ts`; targeted `rg` for opening-balance queue symbols; `git diff --check` scoped to touched files.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Brought-Forward Opening Balance Review UI

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/members/load-member-backfill-workflow.ts`, `apps/dashboard/src/components/members/member-backfill-page-view.tsx`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added finance-staff dashboard actions and member backfill baseline UI for brought-forward opening positions. Staff can stage member opening balances with separate savings/share/obligation fields, source references, and notes, then approve or reject pending rows with review notes from the same member baseline screen.
- Scope note: Review remains non-posting governance evidence. Approved opening positions still need a separate apply/reversal workflow before they affect live contributions, share capital, financing, procurement, or ledger records.
- Checks run: Targeted `rg` for opening-balance action and UI symbols; `git diff --check` scoped to touched files; focused DB query test rerun for opening-balance semantics.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member backfill walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Brought-Forward Opening Balance Staging

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/backfill.prisma`, `packages/db/prisma/models/backfill.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260709120000_add_member_opening_balances/migration.sql`, `packages/db/src/index.ts`, `packages/db/src/queries/opening-balances.ts`, `packages/db/src/queries/opening-balances.test.ts`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a staged member opening-balance model for brought-forward onboarding. Staff can create and list tenant-scoped opening positions with separate commitment savings, special savings, share capital, optional share units, active financing outstanding, procurement outstanding, source document metadata, review status, reviewer notes, and audit evidence.
- Scope note: This slice intentionally does not post approved opening balances into live contribution, share, repayment, procurement, or ledger records. The apply/reversal workflow and dashboard/API review surfaces remain separate implementation slices.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/opening-balances.test.ts`; targeted `rg` for opening-balance symbols; `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for new query, test, and migration files.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual brought-forward UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Support Financial Adjustment Approval Gate

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/support.prisma`, `packages/db/prisma/migrations/20260709110000_add_support_financial_adjustment_approval/migration.sql`, `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/support/page.tsx`, `apps/dashboard/src/components/support-cases-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/support-export/route.ts`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added financial-adjustment approval evidence for money-impact support cases. Cases that require financial adjustment cannot be resolved or closed until approved; approval/rejection records reviewer, timestamp, and notes, and support export includes the review evidence.
- Scope note: This slice does not post financial adjustments. Actual corrections still need the appropriate audited finance workflow for contributions, repayments, charges, procurement, or ledger entries.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`; targeted `rg` for financial-adjustment approval symbols; `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for the new migration file.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual support UI walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Exclusive Share Model Selection UI

- Source mode: Follow-up clarification during share configuration implementation.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`, `apps/dashboard/src/components/share-model-workspace.tsx`, `apps/dashboard/src/components/getting-started-page-view.tsx`, `apps/dashboard/src/components/tenant-finance-page-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/shares/page.tsx`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Tightened share setup presentation so cooperatives select exactly one active share model. If staff change the selected model before saving, inactive model workflows are hidden behind a save-first notice instead of showing monthly share history and unit-based shareholding setup side by side.
- Scope note: This is a UI/workflow clarification over the existing tenant share policy model; it does not add new share tables, posting behavior, or migration rules.
- Checks run: Targeted `rg` for share model wrapper/control symbols; `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for the new share model workspace component.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual browser walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Operational Trust Readiness

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/settings/trust/page.tsx`, `apps/dashboard/src/app/error.tsx`, `apps/dashboard/src/lib/navigation/registry.ts`.
- Brain files updated: `brain/features/operational-trust-readiness.md`, `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a tenant-admin Trust Readiness settings page covering backup/export confidence, restore posture, legal/terms readiness, Sentry-compatible monitoring detection, feature-request intake, beta reliability expectations, and safe error disclosure. Added a dashboard app error boundary that gives users a generic retry path without rendering raw stack traces or infrastructure details.
- Scope note: This slice does not provide final legal text, configure a monitoring provider SDK, create database restore automation, or promise a formal uptime SLA. It creates the product-facing readiness posture requested for pilot discussions.
- Checks run: Targeted `rg` for Trust Readiness, Sentry DSN detection, safe error boundary, and feature-request references; `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for new trust page, error boundary, and Brain feature doc.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual trust-readiness walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Support Feature Request Intake

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/migrations/20260709100000_add_support_feature_request_category/migration.sql`, `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/app/(app)/(sidebar)/support/page.tsx`, `apps/dashboard/src/components/support-cases-view.tsx`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added `feature_request` as a dedicated support case category so staff and members can capture product feedback inside the existing audited support workflow. Feature requests inherit tenant/member scoping, assignment, replies, status tracking, notifications, and support CSV export without creating any financial posting behavior.
- Scope note: This slice does not add a separate public product-roadmap board, voting workflow, or GitHub issue automation. It creates the in-product intake and triage path requested by the client.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual support feature-request walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Payment Receipt Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `packages/db/src/queries/contributions.ts`, `packages/db/src/queries/loans.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/payment-receipts/page.tsx`, `apps/dashboard/src/components/payment-receipts-view.tsx`.
- Brain files updated: `brain/features/member-payment-receipts.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added member self-service payment receipts on `/payment-receipts` for users with linked member profiles. Members can submit transfer/cash/payroll/manual receipts, split allocations by category and period intent, link their own plans or active loans, and view only their own review statuses and notes. Staff keep the tenant-wide receipt staging and finance review queue.
- Scope note: This slice does not add file upload storage or posting for unsupported ledgers such as procurement, food purchase commitment, shares, or other categories. Receipt-linked support cases and receipt status notifications were added in follow-up slices.
- Checks run: `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member receipt walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Member Support Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `packages/db/src/queries/members.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/support/page.tsx`, `apps/dashboard/src/components/support-cases-view.tsx`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added member self-service support cases on `/support` for users with linked member profiles. Members can open cases, see only their own cases and message history, and add replies; staff continue to use the full tenant-scoped queue with assignment, priority, status, and resolution controls.
- Scope note: This slice does not add support exports, attachments, or member-facing finance correction workflows. Receipt-linked cases, support exports, and support notification events were added in follow-up slices.
- Checks run: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member support walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Receipt-Linked Support Cases

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/components/payment-receipts-view.tsx`, `apps/dashboard/src/components/support-cases-view.tsx`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/member-payment-receipts.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added receipt-linked support case creation from staff and member receipt rows. Member-created receipt links are validated against the logged-in member profile, linked receipt context appears in support queues, and support records remain non-posting evidence for payment mistakes.
- Scope note: This slice does not add support exports, attachments, or automated finance adjustment requests from support resolutions. Support exports and notification events were added in follow-up slices.
- Checks run: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual receipt-support walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Support Case CSV Export

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/dashboard/src/app/(app)/(sidebar)/reports/support-export/route.ts`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a workspace-admin support-case CSV export with tenant scope, date filters, member details, linked record fields, money-impact and finance-adjustment flags, assignment, resolution timestamps, message count, and latest message timestamp. The export is visible in the Reports export catalog.
- Scope note: This slice does not add support attachment storage or automatic finance-adjustment generation from support resolutions. Support notification events were added in a follow-up slice.

### Support Case Notification Events

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/support.ts`, `packages/notifications/src/types/registry.ts`, `packages/notifications/src/types/support.test.ts`, `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/support-cases-and-customer-service.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added registered support notification events for case creation, replies, and status updates. Member-created cases and member replies notify staff roles through tenant notification preferences; staff-created cases, staff replies, and support status updates send direct audited email drafts to linked members when an email address exists.
- Scope note: This slice adds email/audit delivery events only. WhatsApp, mobile push, in-app persistence, attachment storage, and automated finance-adjustment requests remain future channels/workflows.
- Checks run: `bun test packages/notifications/src/types/support.test.ts`; `bun --cwd packages/db test src/queries/support.test.ts`; targeted ESLint for notifications, DB support, and API dashboard actions with warnings only for existing `any` usage.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual notification delivery walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Payment Receipt Status Notifications

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/payment-receipts.ts`, `packages/notifications/src/types/payment-receipts.test.ts`, `packages/notifications/src/types/registry.ts`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/member-payment-receipts.md`, `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added a registered `member_payment_receipt.status_changed` notification event and wired receipt review actions to send audited direct email drafts to linked members when their receipt status changes and their profile has an email address.
- Scope note: This slice adds email/audit delivery for receipt review status only. WhatsApp, mobile push, persisted in-app delivery, file upload storage, and posting unsupported receipt categories remain future work.
- Checks run: `bun test packages/notifications/src/types/payment-receipts.test.ts`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual receipt notification walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Loan And Share Request Status Notifications

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/notifications/src/types/finance.ts`, `packages/notifications/src/types/share-applications.ts`, `packages/notifications/src/types/member-request-status.test.ts`, `packages/notifications/src/types/registry.ts`, `packages/db/src/queries/loans.ts`, `packages/db/src/queries/tenant-finance.ts`, `apps/api/src/routers/dashboard-actions.route.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added borrower-facing loan request status emails and member-facing optional share request status emails after finance review succeeds, using registered notification events and audited delivery records when the linked member profile has an email address.
- Scope note: This slice adds email/audit delivery for loan and share request review status only. WhatsApp, mobile push, persisted in-app delivery, and share payment-backed posting remain future work.
- Checks run: `bun test packages/notifications/src/types/member-request-status.test.ts`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; `bun --cwd packages/db test src/queries/loans.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual loan/share notification walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Activity Report Governance Fields

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/audit.ts`, `packages/db/src/queries/audit.test.ts`, `apps/dashboard/src/app/(app)/(sidebar)/reports/audit/page.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/reports/audit-export/route.ts`, `apps/dashboard/src/components/reports/reports-view.tsx`, `apps/dashboard/src/components/reports/reports-utils.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/dashboard-navigation-and-roles.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Upgraded the existing reports audit route into a staff-facing activity report that normalizes actor, authorizer/reviewer, timestamp, affected entity, and compact metadata summaries from audit logs. The activity CSV export now includes performer, authorizer role, authorizer, and detail summary columns.
- Scope note: This slice does not add a new audit-log table or guarantee every historic event has a separate authorizer; when no explicit authorizer metadata exists, approval/review/posting actions fall back to the actor as the authorizing user.
- Checks run: `bun --cwd packages/db test src/queries/audit.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual reports walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Financing Early Settlement

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/loans.ts`, `packages/db/src/queries/loans.test.ts`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added repayment settlement behavior so a repayment that clears outstanding financing principal completes the loan, waives any remaining unpaid schedule servicing rows, and records an auditable `loan.early_settled` activity with repayment and waived-schedule metadata.
- Scope note: This slice does not add member-facing payoff quotes, overpayment acceptance beyond the current outstanding-balance guard, or financing restructure/write-off workflows.
- Checks run: `bun --cwd packages/db test src/queries/loans.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual repayment dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

## 2026-07-08

### Client Demo Visit Feature Discovery

- Source mode: Post-demo client discovery report.
- Source Brain record: `brain/intake/2026-07-08-client-demo-visit-feature-discovery.md`.
- Related report: `outputs/client-demo-visit-report.md`.
- Brain files updated: `brain/intake/2026-07-08-client-demo-visit-feature-discovery.md`, `brain/progress.md`.
- Current status: Captured client pain points and requested capabilities covering share configuration, loan policy settings, guarantor approval, procurement financing, special savings, project financing, member receipt uploads, brought-forward onboarding, staff roles/permissions, activity reporting, and backup/export.
- Next step: Convert Priority A/B/C discovery items into a phased implementation plan after confirming open questions.
- Checks run: Documentation-only update; no code checks required.

### Client Demo Supplemental Operations And Support

- Source mode: Supplemental post-demo discovery notes.
- Source Brain record: `brain/intake/2026-07-08-client-demo-supplemental-operations-and-support.md`.
- Brain files updated: `brain/intake/2026-07-08-client-demo-supplemental-operations-and-support.md`, `brain/progress.md`.
- Current status: Captured separate supplemental themes covering data safety, legal/terms assurance, Sentry/error reporting, feature request workflow, customer service cases, member issue resolution, future/back payment allocation, and food purchase commitment.
- Next step: Use the dedicated recording-derived intake for transcript evidence, then convert both supplemental and recording-derived notes into implementation plans after core client-fit MVP scoping.
- Checks run: Documentation-only update; no code checks required.

### Client Demo Recording-Derived Notes

- Source mode: Screen-recording audio transcription and cleaned product-note extraction.
- Source Brain record: `brain/intake/2026-07-08-client-demo-recording-derived-notes.md`.
- Source artifacts: `outputs/client-demo-recordings/2026-07-08-demo-main-transcript.txt`, `outputs/client-demo-recordings/2026-07-08-demo-main-transcript.srt`, `outputs/client-demo-recordings/2026-07-08-demo-main-transcript.json`, `outputs/client-demo-recordings/2026-07-08-demo-prelude-transcript.txt`, `outputs/client-demo-recordings/2026-07-08-demo-prelude-transcript.srt`, `outputs/client-demo-recordings/2026-07-08-demo-prelude-transcript.json`.
- Brain files updated: `brain/intake/2026-07-08-client-demo-recording-derived-notes.md`, `brain/progress.md`.
- Current status: Created a separate transcript-derived Brain intake covering share unit policy, yearly profit/dividend distribution, backfill/brought-forward onboarding, legal/security/reliability concerns, reports/export, role-based access, activity records, customer service cases, loan settings, early offset, special savings from overpayment, future/back payments, emergency/procurement products, and charge/product code questions.
- Transcript quality note: Mixed English/Yoruba audio was translated locally; the first 30 to 31 minutes are most useful, while later repeated transcript artifacts were filtered from the product notes.
- Next step: Use the recording-derived intake as supporting evidence when drafting the implementation plan; confirm ambiguous 200/500 and charge-code details with the client.
- Checks run: Documentation-only update; no code checks required.

### Client-Fit Cooperative Operations PRD

- Source mode: `$to-prd` synthesis from first discovery, supplemental operations/support notes, recording-derived notes, and Halaal cooperative domain docs.
- Source PRD: `brain/prds/2026-07-08-client-fit-cooperative-operations-expansion.md`.
- Published issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/3`.
- GitHub labels updated: Created and applied `ready-for-agent`.
- Brain files updated: `brain/prds/2026-07-08-client-fit-cooperative-operations-expansion.md`, `brain/progress.md`.
- Current status: Published an umbrella PRD covering client-fit share policy, brought-forward onboarding, financing settings, guarantor approval, procurement/emergency financing, receipt submission, future/back payment allocation, special savings, support cases, roles/permissions, activity reporting, exports/backups, legal/security/reliability posture, and future notification/domain expansion.
- Checks run: Documentation-only PRD update and GitHub issue publication; no code checks required.

### Client-Fit Cooperative Operations Spec

- Source mode: `$to-spec` conversion from the published PRD and current discovery context.
- Source spec: `brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md`.
- Source PRD: `brain/prds/2026-07-08-client-fit-cooperative-operations-expansion.md`.
- Published issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- GitHub labels applied: `ready-for-agent`.
- Brain files updated: `brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md`, `brain/progress.md`.
- Current status: Published a spec issue preserving the full client-fit cooperative operations scope, user stories, implementation decisions, testing seams, out-of-scope items, and open clarifications.
- Checks run: Documentation-only spec update and GitHub issue publication; no code checks required.

### Brought-Forward Onboarding Entry Point

- Source mode: `$implement` from `brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md` using fast Bun monorepo command discipline.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `apps/dashboard/src/components/getting-started-page-view.tsx`, `apps/dashboard/src/components/members/member-backfill-page-view.tsx`, `apps/dashboard/src/components/members/member-backfill-baseline-edit-dialog.tsx`.
- Brain files updated: `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/progress.md`.
- Current status: Added the first client-fit onboarding slice by making Getting Started and the member baseline workflow explicitly present both full historical backfill and brought-forward opening-position migration paths. This is a UX entrypoint only; the finance posting model for staged brought-forward balances remains future work.
- Checks run: `git diff --check` scoped through the repo.
- Skipped checks: Dev server, build, typecheck, full tests, browser QA, and broad verification were intentionally skipped under fast Bun monorepo command discipline.

### Loan Policy And Monthly Financing Cycle Model

- Source mode: Brain intake direct work.
- Source Brain record: `brain/plans/2026-07-08-feature-loan-policy-and-monthly-financing-cycle-model.md`.
- Changed source files: `packages/db/prisma/enums/loans.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/models/loans.prisma`, `packages/db/prisma/migrations/20260708120000_add_financing_cycles/migration.sql`, `packages/db/src/queries/financing-cycles.ts`, `packages/db/src/queries/financing-cycles.test.ts`, `packages/db/src/index.ts`, `packages/db/src/test-utils.ts`, `packages/db/prisma/seed.ts`.
- Brain files updated: `brain/plans/2026-07-08-feature-loan-policy-and-monthly-financing-cycle-model.md`, `brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md`, `brain/tasks/roadmap.md`, `brain/tasks/done.md`, `brain/database/schema.md`, `brain/features/core-cooperative-platform.md`, `brain/progress.md`.
- Current status: Added tenant financing-cycle policy defaults, monthly cycle schema and migration, preview/open/status/policy DB helpers, cycle usage summaries by quick/normal loan type, and focused tests for capacity math, tenant scoping, snapshots, and audit behavior.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`.
- Skipped checks: Full monorepo typecheck, build, lint, browser QA, and dev server were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: None for this phase. Request intake enforcement and dashboard/settings UI remain in the next two intake phases.

### Financing Settings Workspace

- Source mode: Brain intake direct work.
- Source Brain record: `brain/plans/2026-07-08-feature-financing-settings-workspace.md`.
- Changed source files: `packages/db/src/queries/financing-cycles.ts`, `packages/db/src/queries/financing-cycles.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx`, `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`, `apps/dashboard/src/components/tenant-finance-page-view.tsx`.
- Brain files updated: `brain/plans/2026-07-08-feature-financing-settings-workspace.md`, `brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md`, `brain/tasks/roadmap.md`, `brain/tasks/done.md`, `brain/features/core-cooperative-platform.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/progress.md`.
- Current status: Added the live `/settings/finance/loan` workspace with current-month projected-capacity preview, policy/product forms, audited financing policy updates, audited loan product settings, current-cycle open/pause/close controls, and a separated historical loan migration section.
- Checks run: `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`.
- Skipped checks: Full monorepo typecheck, build, lint, browser QA, dev server, and manual dashboard role checks were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: None for this phase. Loan intake quota enforcement, disbursement blocking by deployable funds, and dashboard/loan workspace capacity visibility remain in the final intake phase.

### Loan Intake Capacity Enforcement And Dashboard Visibility

- Source mode: Brain intake direct work.
- Source Brain record: `brain/plans/2026-07-08-feature-loan-intake-capacity-enforcement-and-dashboard-visibility.md`.
- Changed source files: `packages/db/src/queries/financing-cycles.ts`, `packages/db/src/queries/financing-cycles.test.ts`, `packages/db/src/queries/loans.ts`, `packages/db/src/queries/loans.test.ts`, `packages/db/src/queries/dashboard.ts`, `apps/dashboard/src/lib/loans/load-loans-page.ts`, `apps/dashboard/src/components/loans-page-view.tsx`, `apps/dashboard/src/components/forms/finance-forms.tsx`.
- Brain files updated: `brain/plans/2026-07-08-feature-loan-intake-capacity-enforcement-and-dashboard-visibility.md`, `brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md`, `brain/tasks/roadmap.md`, `brain/tasks/done.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/progress.md`.
- Current status: Added current-month financing-cycle intake enforcement, quick/normal quota blocking, released capacity for rejected/cancelled/expired requests, deployable-funds disbursement blocking, loan workspace capacity cards/warnings, and overview financing-cycle action queue warnings.
- Checks run: `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`.
- Skipped checks: Full monorepo typecheck, build, lint, browser QA, dev server, and manual dashboard quota walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: None for this intake.

### Share Configuration Option

- Source mode: `$implement` from client-fit cooperative operations spec using fast Bun monorepo command discipline.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708143000_add_tenant_share_policy/migration.sql`, `packages/db/src/queries/tenant-finance.ts`, `packages/db/src/queries/tenant-finance.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`, `apps/dashboard/src/components/tenant-finance-page-view.tsx`, `apps/dashboard/src/components/getting-started-page-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/shares/page.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/getting-started/page.tsx`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-level share unit cost, compulsory share unit count, and maximum share unit count to `tenant_policies`, with database constraints, normalized defaults, audited update helper, server action, dashboard form, and settings surfaces in Getting Started plus finance share pages.
- Scope note: This slice configures the share policy only. Member additional-share applications, approval workflow, and payment-backed share purchase posting remain future slices.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual share settings walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: None for this slice.

### Share Model Selection

- Source mode: Follow-up client-fit implementation correction.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708150000_add_share_configuration_mode/migration.sql`, `packages/db/src/queries/tenant-finance.ts`, `packages/db/src/queries/tenant-finance.test.ts`, `packages/db/src/queries/backfill.ts`, `packages/db/src/queries/backfill-migration-input.test.ts`, `packages/db/src/queries/migration.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`, `apps/dashboard/src/components/tenant-finance-page-view.tsx`, `apps/dashboard/src/components/getting-started-page-view.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/shares/page.tsx`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/database/schema.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-selected share configuration mode so cooperatives choose either monthly share history or unit-based shareholding. The dashboard now shows the selected model instead of configuring both side by side, policy saves ignore inactive model fields, and unit-based mode blocks dated share history mutations while excluding monthly share history from generated member backfill.
- Follow-up clarification (2026-07-09): Tightened dashboard/settings/onboarding wording to call this the active share model and explicitly state that the two share configurations are not used side by side. Renamed the DB regression test to document that inactive unit fields are ignored when monthly share history is selected.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts src/queries/backfill-migration-input.test.ts`; `bun --cwd packages/db test src/queries/migration.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual share settings walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: None for this correction.

### Member Share Application Workflow

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/models/share-business.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708160000_add_member_share_applications/migration.sql`, `packages/db/src/queries/tenant-finance.ts`, `packages/db/src/queries/tenant-finance.test.ts`, `packages/db/src/queries/dashboard.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/shares/page.tsx`, `apps/dashboard/src/components/share-applications-panel.tsx`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added unit-based optional share applications with pending/approved/rejected status, unit/value snapshots, tenant/member scoping, audited create/review helpers, finance-role dashboard actions, a shares settings approval queue, and overview action-queue visibility for pending share applications.
- Scope note: This slice does not yet add member self-service submission screens or payment-receipt matching for share purchases.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual share application walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: Member-facing share request screens were added in a follow-up slice; payment-backed share purchase posting remains future work.

### Member Share Self-Service

- Source mode: Goal continuation from the client-fit cooperative operations spec and follow-up share-model clarification.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/src/queries/tenant-finance.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/shares/page.tsx`, `apps/dashboard/src/components/member-shares-view.tsx`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added member-scoped `/shares` self-service for linked member profiles. The page shows compulsory, approved optional, pending optional, and available units, lets members submit optional share requests, and lists their own application history only when the tenant-selected share model is unit-based shareholding.
- Scope note: Cooperatives still select one active share model. Monthly share history tenants see no unit request form, and finance staff still review/approve applications from the finance shares settings workspace before share capital is posted.
- Checks run: `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual member-share walkthrough are intentionally skipped under fast Bun monorepo command discipline unless explicitly requested.
- Unresolved issues: Payment-backed share purchase posting remains future work.

### Support Case Workflow

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/models/support.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708170000_add_support_cases/migration.sql`, `packages/db/src/queries/support.ts`, `packages/db/src/queries/support.test.ts`, `packages/db/src/queries/dashboard.ts`, `packages/db/src/index.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/support/page.tsx`, `apps/dashboard/src/components/support-cases-view.tsx`.
- Brain files updated: `brain/features/core-cooperative-platform.md`, `brain/features/support-cases-and-customer-service.md`, `brain/database/schema.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added staff-managed support cases with messages, assignment, priority/status transitions, money-impact and finance-adjustment-needed flags, resolution summaries, audit logs, `/support` workspace, navigation entry, and overview action-queue count.
- Scope note: This slice did not add member self-service support screens, receipt-linked cases, support notifications, or support exports. Those were completed in later follow-up slices.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual support workflow walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: Member-facing support case creation/status, receipt linking, support exports, and support notification events were added in follow-up slices. Attachment storage and automated finance-adjustment requests remain future work.

### Member Payment Receipt Submission And Review

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/contributions.prisma`, `packages/db/prisma/models/contributions.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/loans.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708180000_add_member_payment_receipts/migration.sql`, `packages/db/src/queries/payment-receipts.ts`, `packages/db/src/queries/payment-receipts.test.ts`, `packages/db/src/queries/contributions.ts`, `packages/db/src/queries/dashboard.ts`, `packages/db/src/index.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/payment-receipts/page.tsx`, `apps/dashboard/src/components/payment-receipts-view.tsx`.
- Brain files updated: `brain/features/member-payment-receipts.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/features/core-cooperative-platform.md`, `brain/database/schema.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added staged member payment receipts with proof metadata, duplicate non-rejected reference/proof checks, category-aware allocations, target-period intent for current/future/back payments, finance review decisions, audited allocation adjustments, `/payment-receipts` workspace, navigation entry, and overview action-queue count.
- Scope note: Approval posts supported commitment, special-savings, scheduled loan-servicing, and extra loan-payment allocations through existing contribution/repayment ledgers. Procurement, food purchase, shares, and other categories remain staged/blocked until their dedicated posting semantics exist.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts src/queries/contributions.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual receipt workflow walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: Member-facing receipt submission/status views, receipt-linked support cases, and receipt status notifications were added in follow-up slices. Share/procurement/food posting ledgers remain future work.

### Financing Policy Guards

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708190000_add_financing_policy_guards/migration.sql`, `packages/db/src/queries/financing-cycles.ts`, `packages/db/src/queries/financing-cycles.test.ts`, `packages/db/src/queries/loans.ts`, `packages/db/src/queries/loans.test.ts`, `packages/db/src/queries/contributions.ts`, `packages/db/src/queries/contributions.test.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`.
- Brain files updated: `brain/features/financing-policy-guards.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/database/schema.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-configurable financing guardrails for special-savings eligibility, strict commitment during active financing, active-financing emergency/quick overlap blocking, and future procurement overlap policy. Loan requests now respect special-savings eligibility and quick-overlap blocking, while commitment-plan reductions are blocked during active financing when strict mode is enabled.
- Scope note: This slice persists procurement overlap policy but does not implement procurement financing.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts src/queries/contributions.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual finance settings walkthrough were intentionally skipped under fast Bun monorepo command discipline.
- Unresolved issues: Procurement request enforcement waits for procurement workflow implementation.

### Financing Guarantor Approval

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/loans.prisma`, `packages/db/prisma/models/loans.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708200000_add_loan_guarantor_approvals/migration.sql`, `packages/db/src/queries/loans.ts`, `packages/db/src/queries/loans.test.ts`, `packages/notifications/src/types/finance.ts`, `packages/notifications/src/types/registry.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/loans/load-loans-page.ts`, `apps/dashboard/src/components/forms/finance-forms.tsx`, `apps/dashboard/src/components/tables/loans/requests-table.tsx`.
- Brain files updated: `brain/features/financing-guarantor-approval.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/database/schema.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-scoped guarantor approval records for loan requests, optional guarantor selection on loan submission, direct email request drafts for guarantors with email addresses, finance-staff response recording, audit logs, dashboard visibility, and a final approval gate that blocks loan materialization until every selected guarantor has approved.
- Scope note: This slice records staff-entered guarantor evidence and sends email requests; signed external approval links, member-portal guarantor self-service, WhatsApp approval, and escalation timers remain future work.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/loans.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual guarantor email/dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

### Procurement Request Workflow

- Source mode: Goal continuation from the client-fit cooperative operations spec.
- Source issue: `https://github.com/ishaqyusuf/halaal-coperative/issues/4`.
- Changed source files: `packages/db/prisma/enums/procurement.prisma`, `packages/db/prisma/models/procurement.prisma`, `packages/db/prisma/models/auth.prisma`, `packages/db/prisma/models/member.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260708210000_add_procurement_requests/migration.sql`, `packages/db/src/queries/procurement.ts`, `packages/db/src/queries/procurement.test.ts`, `packages/db/src/queries/dashboard.ts`, `packages/db/src/index.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/lib/navigation/registry.ts`, `apps/dashboard/src/app/(app)/(sidebar)/procurement/page.tsx`, `apps/dashboard/src/components/procurement-requests-view.tsx`.
- Brain files updated: `brain/features/procurement-requests.md`, `brain/features/core-cooperative-platform.md`, `brain/features/member-commitments-and-payment-allocation.md`, `brain/database/schema.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Current status: Added tenant-scoped procurement requests with item/vendor details, requested cost, repayment months, monthly repayment estimate, finance review status, approved cost/months, audit entries, active-financing procurement policy enforcement, `/procurement` workspace, Finance navigation entry, and overview action queue visibility.
- Scope note: Procurement disbursement, item purchase fulfillment, repayment schedules, procurement repayment posting, defaults, and procurement ledger entries remain future work.
- Checks run: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/procurement.test.ts`.
- Skipped checks: Full monorepo typecheck, build, full tests, browser QA, dev server, and manual procurement dashboard walkthrough were intentionally skipped under fast Bun monorepo command discipline.

## 2026-07-02

### Halaalvest Mobile Initialization

- Source mode: Direct implementation from approved plan.
- Source Brain record: `brain/intake/2026-07-02-white-label-mobile-application.md`.
- Changed source files: `apps/mobile/**`, `.gitignore`, `bun.lock`.
- Brain files updated: `brain/tasks/in-progress.md`, `brain/tasks/done.md`, `brain/progress.md`, `brain/PROJECT_INDEX.md`.
- Current status: Created the managed Expo mobile workspace from the reusable GND shell, renamed it for Halaalvest, removed generated/native and domain-specific GND surface area, added warm cooperative design tokens, mock member/admin SecureStore sessions, member tabs, admin tabs, and starter screens.
- Checks run: `bun install`; `bun --cwd apps/mobile typecheck`; `bun --cwd apps/mobile lint`; `bun --cwd apps/mobile expo start --port 3003` smoke test; `git diff --check`.
- Residual issue: `bunx expo-doctor` passes 17/18 checks and only flags monorepo duplicate `react` / `react-dom` versions because the web apps use React 19.2 while Expo SDK 54 is pinned to React 19.1.

### Pricing And Public Landing

- Source mode: Goal continuation.
- Source Brain record: `brain/product/pricing-and-packaging.md`.
- Changed source files: `apps/web/src/components/marketing/pricing-section.tsx`, `apps/web/src/components/marketing/launch-landing.tsx`, `apps/web/src/components/marketing/prelaunch-landing.tsx`.
- Brain files updated: `brain/product/pricing-and-packaging.md`, `brain/product/vision.md`, `brain/PROJECT_INDEX.md`, `brain/progress.md`.
- Checks run: `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for new Brain and pricing-section files; targeted `rg` for Free Beta, pricing-section rendering, pricing plan values, no-percentage messaging, member login, custom domain, email notification, WhatsApp notification, and white label app messaging.
- Skipped checks: Full web typecheck, build, dev server, and browser QA are intentionally skipped unless requested under fast Bun monorepo command discipline.
- Unresolved issues: None.

#### Plan Feature Packaging Update

- Added a plan feature matrix to Brain covering member login, custom domain, email notifications, WhatsApp notifications, white label app, roles, reports, and core finance availability.
- Updated the website pricing cards so Starter is admin-only by default, Standard includes member login/custom domain/member email notifications, Growth includes WhatsApp setup and advanced notification templates, and Enterprise carries white-label/custom branding.
- Added a public feature-availability matrix under the pricing cards.

### Business Profit Policy Settings

- Source mode: Intake Mode.
- Source Brain record: `brain/plans/2026-07-02-feature-business-profit-policy-settings.md`.
- Changed source files: `packages/db/prisma/enums/operations.prisma`, `packages/db/prisma/models/tenant.prisma`, `packages/db/prisma/migrations/20260702120000_add_tenant_business_policy/migration.sql`, `packages/db/src/queries/tenant-finance.ts`, `packages/db/src/queries/migration.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/dashboard-actions.ts`, `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/business/page.tsx`.
- Brain files updated: `brain/plans/2026-07-02-feature-business-profit-policy-settings.md`, `brain/intake/2026-07-02-business-profit-and-policy-workspaces.md`, `brain/tasks/roadmap.md`, `brain/tasks/done.md`, `brain/progress.md`.
- Checks run: `git diff --check` scoped to touched files; `bun --cwd packages/db test src/queries/tenant-finance.test.ts src/queries/migration.test.ts`.
- Skipped checks: Full dashboard/API typechecks were not run under fast Bun monorepo command discipline.
- Unresolved issues: None.

### Business Profit Operations Workspace

- Source mode: Intake Mode.
- Source Brain record: `brain/plans/2026-07-02-feature-business-profit-operations-workspace.md`.
- Changed source files: `apps/dashboard/src/app/(app)/(sidebar)/business/page.tsx`, `apps/dashboard/src/lib/business/load-business-page.ts`, `apps/dashboard/src/lib/business/index.ts`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/business/page.tsx`, `apps/dashboard/src/lib/navigation/registry.ts`.
- Brain files updated: `brain/plans/2026-07-02-feature-business-profit-operations-workspace.md`, `brain/intake/2026-07-02-business-profit-and-policy-workspaces.md`, `brain/tasks/roadmap.md`, `brain/tasks/done.md`, `brain/PROJECT_INDEX.md`, `brain/product/admin-dashboard-kpi-framework.md`, `brain/progress.md`.
- Checks run: `git diff --check` scoped to touched files.
- Skipped checks: Full dashboard typecheck and browser QA were not run under fast Bun monorepo command discipline.
- Unresolved issues: None.

### Business Profit Live Operations And Seasons

- Source mode: Goal continuation.
- Source Brain record: `brain/intake/2026-07-02-business-profit-and-policy-workspaces.md`, Follow-Up Intake: Live Business Operations And Profit Seasons.
- Changed source files: `packages/db/src/queries/tenant-finance.ts`, `apps/api/src/routers/dashboard-actions.route.ts`, `apps/dashboard/src/lib/business/load-business-page.ts`, `apps/dashboard/src/app/(app)/(sidebar)/business/page.tsx`, `apps/dashboard/src/components/sheets/business-sheet.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/getting-started/page.tsx`, `apps/dashboard/src/components/getting-started-page-view.tsx`, `packages/db/src/queries/backfill.ts`, `packages/domain/src/modules/migration.ts`, `packages/db/src/queries/migration.ts`.
- Brain files updated: `brain/intake/2026-07-02-business-profit-and-policy-workspaces.md`, `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, `brain/progress.md`.
- Checks run: `git diff --check` scoped to touched files; `bun test packages/domain/src/modules/migration.test.ts packages/db/src/queries/migration.test.ts packages/db/src/queries/tenant-finance.test.ts packages/db/src/queries/backfill-migration-input.test.ts`.
- Skipped checks: Full dashboard/API typechecks, full test suite, and browser QA were not run under fast Bun monorepo command discipline.
- Unresolved issues: None.

#### Dividend Season Review Update

- Added a Getting Started `profit-seasons` phase after business history and before member migration.
- Added reviewed dividend-season persistence using `DividendPeriod` deduction amount/reason metadata.
- The season save action recomputes seasons from current business profit rows, saves or updates dividend periods, links profit entries to the reviewed period, and proportionally applies season deductions to profit entry allocatable amounts.
- Member backfill prerequisite checks and preview guards now include `business_profit_seasons`, so member migration waits until profit seasons are reviewed.
- Member migration profit adjustment rows now show the linked reviewed dividend season label and period end when available.
- Additional touched files for this update: `packages/db/prisma/models/dividends.prisma`, `packages/db/prisma/migrations/20260702143000_add_dividend_period_deductions/migration.sql`, `packages/db/src/queries/migration.test.ts`, `apps/dashboard/src/components/initial-migration-preview.tsx`, `apps/dashboard/src/app/(app)/(sidebar)/settings/finance/finance-route.tsx`.
- Checks run for this update: `git diff --check` scoped to touched files; `bun test packages/domain/src/modules/migration.test.ts packages/db/src/queries/migration.test.ts`; `bun test packages/db/src/queries/tenant-finance.test.ts`; `bun test packages/db/src/queries/migration-profit-adjustments.test.ts`.
