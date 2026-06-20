# Done

## Purpose

This file records completed work and important outcomes.

## How To Use

- Add a dated note when meaningful work completes.
- Prefer concise outcomes over long narratives.

## Completed

- 2026-03-21: Initialized Project Brain scaffold for the cooperative savings and loans SaaS repository, including system, product, engineering, database, API, task, and template documentation.
- 2026-04-10: Scaffolded the application codebase as a Bun and Turbo monorepo with `apps/web`, `apps/api`, and shared `auth`, `db`, `domain`, `ui`, `utils`, `eslint-config`, and `tsconfig` packages. Added a Next.js dashboard shell, sample domain scaffolds, and synchronized Brain documentation.
- 2026-04-10: Implemented a full Prisma 7 cooperative schema in `packages/db` using a file-grouped layout for enums and models, then validated the schema successfully with Prisma.
- 2026-04-13: Re-scoped the product as a generic cooperative SaaS platform, aligned the multi-app architecture to `plot-keys`, and added tenant host resolution, Next proxy entry points, and `portless` local named-host support.
- 2026-04-13: Completed phases 1-5 foundation work with seed-backed tenant resolution, scoped session/auth helpers, DB query ownership scaffolding, platform identity modules, and shared domain modules.
- 2026-04-13: Completed phase 6 bridge work by generating the Prisma client, adding an optional Prisma runtime adapter, and wiring dashboard and tenant-site pages to server-side tenant context loaders.
- 2026-04-13: Verified Phase 7.7 as complete for the DB-backed runtime path: `apps/api/src/routers/workspace.route.ts` now uses repository-backed dashboard metrics when the database is configured, with seed-mode fallback kept for local scaffold operation.
- 2026-04-13: Completed Phase 8 by adding tenant onboarding bootstrap queries in `packages/db/src/queries/onboarding.ts`, exposing `trpc/onboarding.status` and `trpc/onboarding.bootstrap`, and surfacing onboarding progress plus routing defaults in the dashboard.
- 2026-04-13: Redesigned the main `apps/web` landing page, added a distinct pre-launch variant, and introduced `HALAAL_VEST_MARKETING_STAGE` to switch between pre-launch and launch marketing states without changing routes.
- 2026-04-14: Added a public `apps/web` signup and onboarding flow using a `midday`-style `useZodForm`, a shared dev autofill helper, signed verification tokens, and shared notification email drafts for verification and workspace-ready follow-up.
- 2026-04-14: Moved signup and onboarding email dispatch under the shared notification system by adding `NotificationService.email(...)`, a console email transport, and server-side notification service wiring in the web app.
- 2026-04-14: Added an env-driven Resend transport to the shared notification system, with console fallback for local development when mail credentials are absent.
- 2026-04-14: Added retry-aware notification email delivery with structured failure metadata; signup verification now fails closed on delivery errors, while post-onboarding workspace email failures are surfaced without rolling back tenant creation.
- 2026-04-14: Added reusable DB audit helpers and persisted tenant-scoped onboarding email delivery outcomes to `audit_logs`, leaving pre-tenant signup verification persistence as an explicitly documented future schema gap.
- 2026-04-14: Closed the pre-tenant email persistence gap by adding a `notification_outbox` Prisma model, migration, generated client update, DB query helpers, and route wiring so signup verification and onboarding workspace emails both record durable outbox entries.
- 2026-04-14: Simplified the public signup and onboarding flow to use `primary contact` language, collect a short cooperative profile, derive the workspace slug automatically, defer financial policy configuration to server-side defaults and later dashboard setup, and persist `currentSize`, `officeAddress`, and `startDate` on the tenant record.
- 2026-04-14: Added a role-filtered dashboard shell and navigation registry inspired by the local `gnd` site-nav architecture, wired dedicated routes for members, contributions, charges, loans, repayments, notifications, tenant-site, domains, and settings, and documented the rollout in Brain plus ADR-005.
- 2026-04-14: Added server-action-backed Phase 9-11 operator flows in the dashboard for member creation and status changes, contribution recording, and charge definition/apply/activation actions, all gated by the simplified role-based system.
- 2026-04-14: Added Phase 12-13 loan and repayment workflows through `packages/db/src/queries/loans.ts` and dashboard server actions, including loan request submission, review decisions, approval-to-loan conversion, disbursement, repayment schedule creation, and repayment posting on `/loans` and `/repayments`.
- 2026-04-14: Added Phase 15-18 dashboard follow-through for notifications, domains, tenant-site readiness, and settings by exposing notification outbox history, custom domain registration, tenant profile updates, and richer public-site readiness views inside the shared role-filtered shell.
- 2026-04-14: Reworked the finance model so members can have different monthly commitments, loan requests now capture chosen repayment months plus estimated monthly servicing and extra monthly savings, and payment posting can split one member payment across savings and loan servicing with support for overpayment allocation.
- 2026-04-14: Added internal admin workflows for tenant-user role provisioning and primary-domain management, keeping the architecture aligned to the simplified role-based system without introducing a separate permission matrix.
- 2026-04-14: Added tenant-level notification preference toggles and collections refresh/follow-up workflows so internal operators can control shared email notification routing and surface overdue repayment items more directly.
- 2026-04-14: Added an admin reporting route plus domain verification state management, so the dashboard now exposes audit visibility, finance snapshots, notification delivery totals, and explicit custom-domain verification before primary promotion.
- 2026-04-14: Added downloadable CSV exports for audit activity, collections status, and notification delivery history from the admin reporting surface.
- 2026-04-14: Expanded reporting exports with contributions, loans, and member statement summaries, and added a manual custom-domain verification-check workflow that validates hostname shape and updates verification state more explicitly.
- 2026-04-14: Added a member detail route in the dashboard that surfaces commitment history, contribution activity, loans, repayment schedules, and repayment history from the same statement-oriented finance model.
- 2026-04-14: Reworked domain management so verification guidance is routing-scope-aware, custom domains carry expected DNS target instructions, and primary promotion now applies across site-facing versus dashboard-facing hostnames instead of only within the raw `kind` bucket.
- 2026-04-14: Expanded the reporting surface with a printable member statement route, member ledger timeline visibility, an audit viewer page, date-windowed exports, and new CSV downloads for charges, repayments, and member ledgers.
- 2026-04-14: Added editable commitment-plan lifecycle, member payment allocation presets, charge waivers/reversals with savings restoration, dual-approval-aware loan review, collections follow-up logging, tenant-role notification triggers for key finance workflows, stricter tenant-user scoping in dashboard server context, and initial member KYC fields.
- 2026-04-14: Standardized the dashboard’s main create/update/filter forms and remaining visible-input inline forms on shared shadcn-style primitives and `useZodForm`, added reusable dashboard client form modules for settings, members, finance, domains, and reports, and introduced a dev-only quick-fill helper for local operator testing.
- 2026-04-14: Deepened the next dashboard phase by adding DNS-backed custom-domain verification with persisted verification details, persisted collections follow-up records plus next-action dates and reporting surfaces, notification filter UX plus broader workflow-triggered notifications, richer KYC review fields, and related reporting updates.
- 2026-04-14: Added the next reporting and operator-support slice by introducing member-specific statement downloads, detailed member-ledger exports, filterable contribution and repayment views, richer notification analytics, and stronger loan review/disbursement context.
- 2026-04-14: Added a reusable dashboard imports and migrations workspace under settings with shared CSV parsing, live preview validation, dev quick-fill samples, and server-action-backed import flows for members, deduction sources, loan products, contributions, charges, migrated loans, and migrated repayments.
- 2026-04-14: Deepened the import, collections, KYC, and hardening slice by adding live import reconciliation hints against existing workspace records, richer collections case metadata and assignee tracking, multi-document KYC support on member profiles, expanded member/KYC notification triggers, tighter report-route access, and updated reporting visibility for collections and document review.
- 2026-04-14: Added review-gated import confirmations for existing matches and in-file duplicates, plus queue-style open and resolved collections views with stage-, assignee-, and resolution-aware repayment filtering.
- 2026-04-14: Added persisted import batches and staged apply flow for the settings import workspace, including stored batch rows, recent batch history, and apply-from-batch actions for safer operator-led migrations.
- 2026-04-14: Introduced a Midday-inspired dashboard UI slice with dedicated authenticated shell and reusable primitives under `apps/dashboard/components/dashboard/`, then rebuilt the overview and charges routes on top of that denser page system while preserving server-first route ownership.
- 2026-04-14: Extended the Midday-inspired dashboard pass across the remaining main workspace routes plus member detail, printable statement, and audit drill-down pages, so the dashboard now uses one consistent shell, primitive layer, and page-composition language across overview, list, detail, and reporting surfaces.
- 2026-04-15: Collapsed the old split tenant-site/dashboard host model into one tenant-hosted app by moving protected workspace routes under `/app`, making `{slug}.halaalvest.com` the canonical tenant surface, keeping `dashboard.{slug}...` as a redirect alias, deleting `apps/tenant-site`, and updating onboarding, routing, env defaults, seeds, and docs to match the new single-site flow.
- 2026-04-15: Redesigned the tenant-root homepage in `apps/dashboard`, introduced the same `SHOW_HOME_PAGE` gate there so tenant `/` can redirect to `/login` when disabled, and moved homepage visibility parsing into a shared `packages/domain/src/modules/marketing.ts` module consumed by both apps.
- 2026-04-15: Started the Midday-style dashboard structure migration by introducing canonical `components/dashboard/layout`, `components/dashboard/data-display`, and `components/dashboard/feedback` folders with compatibility exports, moving auth redirect usage behind `features/auth/lib/auth-redirect.ts`, documenting folder ownership in `apps/dashboard/STRUCTURE.md`, and removing the duplicate web-local `useZodForm` hook in favor of `@halaalvest/ui/hooks/use-zod-form`.
- 2026-04-15: Continued the migration on public/auth entry flows by rebuilding `apps/web` signup and onboarding forms on shared `Form` / `FormField` primitives plus `@halaalvest/ui/hooks/use-zod-form`, and by switching the dashboard login screen to shared input and button components instead of raw styled controls.
- 2026-04-15: Took the `members` module through the next Midday-style slice by adding feature-owned `server/` loaders plus `data-display/` views, shrinking the member list/detail/statement route files down to orchestration and preserving the heavy UI in reusable member-specific surfaces.
- 2026-04-15: Reworked the members list page again to follow the Midday invoices pattern more closely, with separate summary widgets, a dedicated page-header/action row, and a dedicated members data-table module instead of one bundled registry block.
- 2026-04-15: Pushed the members list further toward the Midday reference by dropping the older shared dashboard `data-display` wrappers from the visible page UI and replacing them with page-owned Midday-style summary cards, badges, filter row, and table shell.
- 2026-04-15: Extended the same Midday-style route-thinning pattern to `contributions` by introducing feature-owned `server/` loaders and a contribution-specific `data-display/` view, leaving the route focused on database-runtime fallback and page composition.
- 2026-04-15: Extended the same pattern to `loans` by introducing feature-owned `server/` loaders and a loan-specific `data-display/` view, shrinking the route to runtime fallback plus orchestration while preserving review, liquidity, and disbursement workflows.
- 2026-04-15: Added an in-office-by-default member signup gate plus a dedicated `/app/member-signup-links` control page, with tenant-level access mode, staff-issued signed signup links, expiry/cap controls, link rotation, per-link analytics, and shortcut entry points from the members and membership approvals pages.
- 2026-05-01: Hardened dashboard auth against the `plot-keys` reference by adding a Next `proxy.ts` guard/header injector, signing host-scoped session tokens, ignoring spoofable auth headers in server context, and limiting passwordless dev quick-login to non-production.
- 2026-05-01: Refactored the members page search/filter architecture toward the Midday invoice search-filter pattern by introducing `components/search-filter`, moving member page widgets into `components/members`, preserving URL/server filter behavior, improving filter labels, and documenting the updated folder ownership.

### Add automatic local database readiness to dev starters
- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-20-feature-automatic-local-database-readiness-for-dev-starters.md`.
- Related Feature: Automatic Local Database Readiness for Dev Starters
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-20-feature-automatic-local-database-readiness-for-dev-starters.md
- Created Date: 2026-06-20
