# Progress

## 2026-07-02

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
