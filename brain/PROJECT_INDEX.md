# Project Index

## Purpose
This file is a fast map of the repository so contributors can quickly find important code and documentation.

## How To Use
- Update this when new major app folders, packages, or services are added.
- Keep entries short and practical.

## Current Repository Map
- `brain/`: project memory and planning system.
- `brain/plans/ongoing.md`: active resumable execution plans for long-running implementation tracks.
- `brain/product/halaal-cooperative-operating-model.md`: durable domain model for Halaal cooperative finance, admin operations, compliance, and trust decisions.
- `brain/product/admin-dashboard-kpi-framework.md`: source of truth for admin dashboard metrics, sections, and exception-led content hierarchy.
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
- `apps/web/src/components/signup/*.tsx`: public signup and onboarding forms now consume the shared `@halaalvest/ui/hooks/use-zod-form` hook instead of a web-local duplicate.
- `apps/dashboard/`: Next.js tenant application serving the public tenant homepage, shared login/signup, and protected workspace routes on the same host.
- `apps/dashboard/src/`: Midday-style dashboard application root with grouped routes, shell components, domain tables, forms, and route/data helpers.
- `apps/dashboard/src/app/page.tsx`: tenant-root entrypoint that chooses between the public tenant homepage and the authenticated dashboard overview.
- `apps/dashboard/src/app/(app)/(sidebar)/layout.tsx`: protected shell layout for the authenticated workspace routes.
- `apps/dashboard/src/app/(public)/login/page.tsx`: public dashboard login chooser that lists available workspace accounts for the current tenant or platform host.
- `apps/dashboard/src/app/(public)/signup/members/page.tsx`: canonical member signup route that enforces tenant signup access policy and accepts staff-issued signed signup-link tokens.
- `apps/dashboard/src/app/(public)/signup/members/verify/page.tsx`: canonical member-signup verification route for the pluralized signup path.
- `apps/dashboard/src/app/auth/login/route.ts`: scoped tenant sign-in endpoint that sets the session token and user-id cookies for the current tenant or platform host.
- `apps/dashboard/src/app/auth/logout/route.ts`: scoped dashboard sign-out endpoint that clears both session and user-id cookies before returning to `/login`.
- `apps/dashboard/src/app/(app)/(sidebar)/members/page.tsx`: Midday-style members list route using the invoice/customers page anatomy of summary strip, compact toolbar, and direct table surface.
- `apps/dashboard/src/app/(app)/(sidebar)/member-signup-links/page.tsx`: dedicated staff workspace for member-signup access mode, link generation, lifecycle controls, and per-link analytics.
- `apps/dashboard/src/app/(app)/(sidebar)/members/[memberId]/page.tsx`: member-level dashboard statement view for commitment history, savings activity, loans, schedules, repayments, and multi-document KYC review.
- `apps/dashboard/src/app/(app)/(sidebar)/loans/page.tsx`: loan request, review, approval, and disbursement workspace inside the shared dashboard shell.
- `apps/dashboard/src/app/(app)/(sidebar)/repayments/page.tsx`: repayment posting, schedule visibility, overdue collections follow-up, and collections-status workspace.
- `apps/dashboard/src/app/(app)/(sidebar)/contributions/page.tsx`: commitment-plan management and split member-payment allocation workspace.
- `apps/dashboard/src/app/(app)/(sidebar)/notifications/page.tsx`: notification delivery history, shared template previews, and tenant-level per-role preference toggles.
- `apps/dashboard/src/app/(app)/(sidebar)/domains/page.tsx`: tenant hostname review, DNS-backed verification details, and primary-domain promotion workspace.
- `apps/dashboard/src/app/(app)/(sidebar)/reports/page.tsx`: admin audit and reporting workspace for finance snapshots, collections follow-up activity, and recent audit activity.
- `apps/dashboard/src/app/(app)/(sidebar)/reports/audit/page.tsx`: filterable audit viewer route for deeper admin event review.
- `apps/dashboard/src/app/(app)/(sidebar)/settings/profile/page.tsx`: cooperative profile update form and persisted onboarding-profile summary.
- `apps/dashboard/src/app/(app)/(sidebar)/settings/roles/page.tsx`: tenant-user role provisioning and current-role visibility workspace.
- `apps/dashboard/src/app/(app)/(sidebar)/settings/imports/page.tsx`: centralized staff import and migration workspace for members, records, and legacy finance data.
- `apps/dashboard/src/components/dashboard/`: canonical Midday-style dashboard shell, topbar, sidebar, page frame, summary helpers, and section/surface components.
- `.codex/skills/halaal-cooperative-domain/`: project-local Codex skill for applying the Halaal cooperative domain lens in future planning, review, dashboard, and finance tasks.
- `apps/dashboard/src/components/search-filter/`: reusable Midday-style list search/filter module with typed wrapper, panel, field renderer, active filter pills, and label utilities.
- `apps/dashboard/src/components/members/`: member-list page widgets including the search toolbar and summary cards.
- `apps/dashboard/src/components/tables/`: domain-specific table/page compositions plus shared table atoms in `core/`.
- `apps/dashboard/src/components/forms/`: reusable dashboard client forms built on shared shadcn-style primitives and `useZodForm`.
- `apps/dashboard/src/components/signup-links/`: member-signup access mode, link creation, copying, rotation, and per-link management UI.
- `apps/dashboard/src/lib/dashboard-actions.ts`: server actions for dashboard member, contribution, charge, loan, and repayment workflows.
- `apps/dashboard/src/lib/member-signup-access.ts`: shared server-side gate resolver for public member signup access.
- `apps/dashboard/src/lib/member-signup-link-token.ts`: signed token helper for staff-issued member signup links.
- `apps/dashboard/src/lib/auth-redirect.ts`: login/logout redirect sanitization helper for safe dashboard auth transitions.
- `apps/dashboard/src/lib/import-csv.ts`: shared dashboard-side CSV parsing and import schema normalization used by both client previews and server actions.
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
- `packages/db/src/queries/member-signup-links.ts`: tenant signup-access policy and member-signup-link query layer for gating, analytics, lifecycle controls, and token rotation.
- `packages/db/src/queries/auth.ts`: tenant user, membership, and role-provisioning query layer for the simplified workspace role system.
- `packages/db/src/queries/audit.ts`: tenant audit-log listing and reporting-summary query layer for admin reporting routes.
- `packages/db/src/queries/imports.ts`: bulk import, staged import-batch persistence, and historical migration query layer for members, deduction sources, loan products, contributions, charges, loans, and repayments.
- `packages/db/src/prisma.ts`: optional Prisma 7 runtime singleton using the Postgres driver adapter when `DATABASE_URL` is configured.
- `packages/domain/src/modules/`: platform, policy, finance, product, marketing, and dashboard modules.

## Notes
- The repository now uses a simplified surface model: marketing app, one tenant-hosted dashboard/public app, and a shared API.
- Keep this document synchronized with real folder structure, not aspirational structure alone.
