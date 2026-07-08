# Progress

## 2026-07-08

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
