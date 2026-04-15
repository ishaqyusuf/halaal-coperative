# Project Index

## Purpose
This file is a fast map of the repository so contributors can quickly find important code and documentation.

## How To Use
- Update this when new major app folders, packages, or services are added.
- Keep entries short and practical.

## Current Repository Map
- `brain/`: project memory and planning system.
- `brain/plans/ongoing.md`: active resumable execution plans for long-running implementation tracks.
- `brain/features/member-commitments-and-payment-allocation.md`: source of truth for member-specific commitments, loan servicing estimates, and split payment allocation.
- `apps/web/`: Next.js SaaS marketing application.
- `apps/web/app/signup/page.tsx`: public signup route that captures cooperative primary-contact details and prepares a verification link.
- `apps/web/app/onboarding/page.tsx`: verified onboarding route that finalizes tenant bootstrap from the signed signup token.
- `apps/web/app/api/signup/route.ts`: public signup API endpoint that issues the signed onboarding link and verification email draft.
- `apps/web/app/api/onboarding/route.ts`: public onboarding API endpoint that verifies the token and provisions the tenant workspace.
- `apps/web/src/app/`: main marketing route entrypoints for launch and pre-launch rendering.
- `apps/web/src/lib/marketing-config.ts`: web-app wrapper around the shared homepage and launch-stage config exported from `packages/domain`.
- `apps/web/src/lib/signup-flow.ts`: shared signup and onboarding schemas, defaults, and payload shaping.
- `apps/web/src/lib/dev-form-fill.ts`: central dev-mode random autofill generator for signup and onboarding forms.
- `apps/web/src/components/marketing/`: launch and pre-launch landing page sections for the public marketing surface.
- `apps/web/src/components/signup/`: shared shell and client forms for signup verification and onboarding bootstrap.
- `apps/dashboard/`: Next.js tenant application serving the public tenant homepage, shared login/signup, and protected `/app` workspace on the same host.
- `apps/dashboard/app/page.tsx`: tenant-root public homepage that now mirrors the polished marketing direction and redirects to `/login` when `SHOW_HOME_PAGE` is disabled.
- `apps/dashboard/app/app/layout.tsx`: protected `/app` shell layout that binds the shared site-nav package to the tenant workspace pages.
- `apps/dashboard/app/login/page.tsx`: public dashboard login chooser that lists available workspace accounts for the current tenant or platform host.
- `apps/dashboard/app/auth/login/route.ts`: scoped tenant sign-in endpoint that sets the session token and user-id cookies for the current tenant or platform host.
- `apps/dashboard/app/auth/logout/route.ts`: scoped dashboard sign-out endpoint that clears both session and user-id cookies before returning to `/login`.
- `apps/dashboard/components/dashboard-shell-client.tsx`: shared dashboard shell composition root that maps route metadata into the new Midday-inspired sidebar, topbar, and page-frame components.
- `apps/dashboard/components/dashboard/`: dashboard-only shell and primitive UI layer for the authenticated workspace, including sidebar/topbar/page-frame components and reusable KPI, section-card, trend-pill, and table building blocks.
- `apps/dashboard/features/navigation/registry.ts`: dashboard navigation registry built with the shared site-nav module/section/link builders and filtered by cooperative role.
- `apps/dashboard/features/navigation/lib.ts`: resolves visible modules, active links, and route metadata from the shared site-nav registry engine.
- `apps/dashboard/features/workspace/page-shell.tsx`: compatibility wrapper that maps route pages onto the new dashboard primitive layer while preserving existing feature-page call sites.
- `apps/dashboard/features/forms/`: reusable dashboard client forms built on shared shadcn-style primitives and `useZodForm`.
- `apps/dashboard/features/forms/import-forms.tsx`: reusable CSV import and migration forms with live preview, reconciliation hints, staging, validation, and dev quick-fill samples.
- `apps/dashboard/lib/dashboard-actions.ts`: server actions for dashboard member, contribution, charge, loan, and repayment workflows.
- `apps/dashboard/lib/auth-redirect.ts`: login/logout redirect sanitization helper for safe dashboard auth transitions.
- `apps/dashboard/lib/import-csv.ts`: shared dashboard-side CSV parsing and import schema normalization used by both client previews and server actions.
- `apps/dashboard/app/app/loans/page.tsx`: loan request, review, approval, and disbursement workspace inside the shared dashboard shell.
- `apps/dashboard/app/app/repayments/page.tsx`: repayment posting, schedule visibility, overdue collections follow-up, assignment-aware case tracking, queue-style open/resolved collections views, and collections status refresh workspace.
- `apps/dashboard/app/app/contributions/page.tsx`: commitment-plan management and split member-payment allocation workspace.
- `apps/dashboard/app/app/notifications/page.tsx`: notification delivery history, filterable delivery review, shared template previews, and tenant-level per-role preference toggles.
- `apps/dashboard/app/app/domains/page.tsx`: tenant hostname review, DNS-backed verification details, scope-aware custom-domain verification guidance, and primary promotion workspace.
- `apps/dashboard/app/app/reports/page.tsx`: admin audit and reporting workspace for finance snapshots, collections follow-up activity, notification totals, and recent audit activity.
- `apps/dashboard/app/app/reports/audit/page.tsx`: filterable audit viewer route for deeper admin event review, using the same stat and section-card layout language as the main reports page.
- `apps/dashboard/app/app/reports/audit-export/route.ts`: CSV export endpoint for recent tenant audit activity.
- `apps/dashboard/app/app/reports/collections-export/route.ts`: CSV export endpoint for repayment schedule and collections status.
- `apps/dashboard/app/app/reports/notifications-export/route.ts`: CSV export endpoint for notification delivery history.
- `apps/dashboard/app/app/reports/contributions-export/route.ts`: CSV export endpoint for member contribution, commitment, and extra-savings activity.
- `apps/dashboard/app/app/reports/loans-export/route.ts`: CSV export endpoint for loan requests and active-loan servicing details.
- `apps/dashboard/app/app/reports/member-statements-export/route.ts`: CSV export endpoint for per-member finance summaries across commitments, savings, loan exposure, and repayments.
- `apps/dashboard/app/app/reports/charges-export/route.ts`: CSV export endpoint for charge and levy application history.
- `apps/dashboard/app/app/reports/repayments-export/route.ts`: CSV export endpoint for repayment posting history.
- `apps/dashboard/app/app/reports/member-ledgers-export/route.ts`: CSV export endpoint for member-linked ledger transactions.
- `apps/dashboard/app/app/members/[memberId]/page.tsx`: member-level dashboard statement view for commitment history, savings activity, loans, schedules, repayments, and multi-document KYC review.
- `apps/dashboard/app/app/members/[memberId]/statement/page.tsx`: printable member statement route rebuilt on the same dashboard summary and table primitives for stronger visual parity with the authenticated workspace.
- `apps/dashboard/app/app/members/[memberId]/statement-export/route.ts`: downloadable per-member text statement export for staff workflows.
- `apps/dashboard/app/app/settings/profile/page.tsx`: cooperative profile update form and persisted onboarding-profile summary.
- `apps/dashboard/app/app/settings/roles/page.tsx`: tenant-user role provisioning and current-role visibility workspace.
- `apps/dashboard/app/app/settings/imports/page.tsx`: centralized staff import and migration workspace for members, records, and legacy finance data.
- `apps/api/`: Hono + tRPC backend foundation following the same structural standard used in `plot-keys`.
- `apps/dashboard/lib/server-context.ts`: server-side tenant, membership, and session loader for dashboard pages.
- `apps/api/src/routers/onboarding.route.ts`: tenant onboarding status and workspace bootstrap route.
- `packages/auth/`: cooperative roles and approval guard helpers.
- `packages/auth/src/index.ts`: auth cookie naming, session-scope helpers, and role utilities shared by the dashboard and API request contexts.
- `packages/db/`: tenant, domain, user, and membership repository scaffolding plus runtime boundaries for the future Prisma-backed data layer.
- `packages/domain/`: shared cooperative rules, platform identity, policies, finance helpers, and dashboard builders, intended to stay app-agnostic like the domain layer in `plot-keys`.
- `packages/domain/src/modules/marketing.ts`: shared env-driven homepage visibility and launch-stage config consumed by both `apps/web` and `apps/dashboard`.
- `packages/notifications/`: shared notification types, in-memory store, and service primitives.
- `packages/notifications/src/index.ts`: notification registry, delivery service, console email transport, and shared email-draft builders for signup verification and workspace-ready follow-up.
- `packages/notifications-react/`: React adapter for rendering shared notification events in web surfaces.
- `packages/site-nav/`: shared reusable sidebar-navigation package modeled on the `gnd` package boundary, including nav builders, access helpers, path matching, and shell components for app surfaces.
- `scripts/with-workspace-env.mjs`: shared environment bootstrap for root and workspace commands, including portless-based dev flows.
- `packages/eslint-config/`: shared lint configuration for apps and packages.
- `packages/tsconfig/`: shared TypeScript presets for Next.js and workspace packages.
- `packages/ui/`: shared shadcn/base UI components, styling tokens, and utilities.
- `packages/utils/`: shared formatting and low-level utilities.
- `packages/db/src/queries/`: tenant, domain, user, and membership repository scaffolding.
- `packages/db/src/queries/notifications.ts`: notification outbox persistence plus tenant notification preference query helpers.
- `packages/db/src/queries/ledger.ts`: ledger posting plus member-ledger transaction query helpers for reporting and statement views.
- `packages/db/src/queries/onboarding.ts`: tenant workspace bootstrap and onboarding progress query module.
- `packages/db/src/queries/members.ts`: member registry, status, member-document review, and member-statement summary query layer for dashboard member operations and reporting.
- `packages/db/src/queries/loans.ts`: loan products, requests, chosen repayment terms, disbursement, repayment schedule, repayment posting, and enriched collections follow-up query layer for the dashboard finance workflows.
- `packages/db/src/queries/contributions.ts`: member commitment plans, savings contributions, editable plan lifecycle, and split payment allocation query layer.
- `packages/db/src/queries/charges.ts`: charge definitions, applications, and waive/reverse correction flows.
- `packages/db/src/queries/tenants.ts`: tenant resolution plus tenant profile, scope-aware tenant-domain management, DNS guidance, stored verification details, and domain verification-check query helpers for dashboard settings and routing workflows.
- `packages/db/src/queries/auth.ts`: tenant user, membership, and role-provisioning query layer for the simplified workspace role system.
- `packages/db/src/queries/audit.ts`: tenant audit-log listing and reporting-summary query layer for admin reporting routes.
- `packages/db/src/queries/imports.ts`: bulk import, staged import-batch persistence, and historical migration query layer for members, deduction sources, loan products, contributions, charges, loans, and repayments.
- `packages/db/src/prisma.ts`: optional Prisma 7 runtime singleton using the Postgres driver adapter when `DATABASE_URL` is configured.
- `packages/domain/src/modules/`: platform, policy, finance, product, marketing, and dashboard modules.

## Notes
- The repository now uses a simplified surface model: marketing app, one tenant-hosted dashboard/public app, and a shared API.
- Keep this document synchronized with real folder structure, not aspirational structure alone.
