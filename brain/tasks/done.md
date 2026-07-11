# Done

## Purpose

This file records completed work and important outcomes.

## How To Use

- Add a dated note when meaningful work completes.
- Prefer concise outcomes over long narratives.

## Completed

- 2026-07-11: Added the first production mobile auth seam for the Halaalvest mobile MVP: signed bearer session handling in API context, `auth.mobile` tRPC sign-in/me/sign-out procedures, standalone API `/api/trpc` support, and a real mobile sign-in form with development-only mock role shortcuts.
- 2026-07-10: Added a GND-style root dev router on `main` so `bun run dev` supports local, remote-dev, production, and Turbo filter aliases while documenting the remote-dev env-file flow.
- 2026-07-10: Completed the client-fit cooperative operations completion audit, covering all 93 spec stories and recording the 13/13 non-deferred roadmap result with deferred/out-of-scope boundaries.
- 2026-07-10: Added authenticated evidence upload support for receipt proofs, support attachments, member KYC documents, and brought-forward source documents, plus member self-service document submission into the existing staff review workflow.
- 2026-07-10: Cleaned up client-fit dashboard route standards drift by moving workspace page loaders, member portal data loading, and CSV export row builders out of route files into feature-owned dashboard `lib` modules while preserving a passing dashboard typecheck.
- 2026-07-10: Fixed receipt review audit and loan payoff settlement gaps so allocation changes keep before/after snapshots and receipt-approved loan payoffs waive remaining unpaid schedule rows with early-settlement audit evidence.
- 2026-07-10: Cleaned up dashboard verification blockers for the client-fit work by completing the API action handler map, refreshing finance demo policy defaults, serializing opening-balance reversal notes, declaring dashboard's direct form/date type dependencies, narrowing shared React wrapper props, and restoring a passing dashboard typecheck.
- 2026-07-10: Added member-facing published dividend visibility to statement data, member text statement downloads, printable staff statements, member dashboard cards, and member statements CSV export.
- 2026-07-10: Fixed dividend period publication totals so linked business-profit allocations rebuild member-level season totals across all published profit entries and only publish the period once every linked entry is published.
- 2026-07-10: Added brought-forward active financing opening posting so approved opening balances can create a linked active loan and one opening repayment schedule item, while reversal closes it only before repayment activity exists.
- 2026-07-10: Added brought-forward procurement opening posting so approved opening balances can create a linked active procurement request and one opening repayment schedule item, while reversal cancels it only before repayment activity exists.
- 2026-07-09: Implemented separate Procurement and Foodstuff Purchase payback policies with tenant caps, fixed/flexible commitment guards, policy snapshots, Foodstuff Purchase application payback months, exports, dashboard settings, and Foodstuff Purchase product-facing labels.
- 2026-07-09: Updated the client-fit spec and Brain notes so Procurement and Foodstuff Purchase each require separate tenant configuration for maximum payback months and fixed/flexible commitment policy, with Foodstuff Purchase used as the product-facing label for staple food purchases.
- 2026-07-09: Split food-purchase permissions in the role matrix so committee application/accounting work is visible separately from finance fund release and accounting review.
- 2026-07-09: Added an opening balances CSV export so brought-forward current-book positions, source documents, review/apply/reversal evidence, and unresolved obligations can be reviewed offline.
- 2026-07-09: Added trust-readiness visibility for internal crash evidence captured as `application.error_captured` audit activity.
- 2026-07-09: Added a special savings CSV export so voluntary extra-savings contribution rows can be reviewed separately from general contributions.
- 2026-07-09: Updated guarantor approval request emails so guarantors are sent to the member `/guarantor-approvals` response page instead of the staff loans route.
- 2026-07-09: Added feature-request support summary visibility so open product feedback appears as its own staff/member support dashboard metric.
- 2026-07-09: Added dashboard error report capture so safe crash screens send sanitized evidence to tenant audit logs when a database-backed workspace context is available.
- 2026-07-09: Added project-financing disbursement evidence so finance staff can record funding date/reference/notes, move approved requests active, and expose the evidence in cards and CSV exports.
- 2026-07-09: Added project-financing receipt repayment posting so approved/active repayable facilities can be selected from payment receipts, paid/outstanding amounts are tracked, partial repayments become active, and full repayments complete the request.
- 2026-07-09: Added food-purchase payment visibility so staff/member cards and CSV exports show paid, outstanding, and settled-date evidence for approved applications.
- 2026-07-09: Added food-purchase receipt posting so approved applications can be selected from payment receipts, paid amounts are tracked, and overpayment is blocked without distributing profit.
- 2026-07-09: Added a tenant trust readiness profile so admins can save audited legal, incident-contact, backup-retention, and recovery-objective evidence from `/settings/trust`.
- 2026-07-09: Added a workspace role permission matrix so admins can provision tenant users and review module/action access boundaries for each cooperative role.
- 2026-07-09: Added a payment receipts CSV export so workspace admins can download proof metadata, review status, allocation intent, and posted ledger/schedule links from Reports.
- 2026-07-09: Added a share positions CSV export so workspace admins can download member share ledger balances, active share model, unit totals, and pending/approved/rejected/cancelled share-request counts from Reports.
- 2026-07-09: Added a member register CSV export so workspace admins can download contact, KYC, deduction source, status, payment-allocation preference, savings snapshot, and linked-login evidence from Reports.
- 2026-07-09: Added procurement export schedule risk columns so workspace admins can filter due item counts, overdue item counts, and risk status from the CSV report.
- 2026-07-09: Added procurement due/overdue servicing visibility so active item-purchase schedules show due, overdue, and outstanding repayment risk in staff and member procurement views.
- 2026-07-09: Added procurement repayment receipt posting so finance-approved receipt allocations can pay selected active procurement schedule rows and complete procurement requests when all installments are closed.
- 2026-07-09: Added procurement purchase activation so approved item-purchase requests can be marked active with purchase evidence and generated monthly repayment schedule rows.
- 2026-07-09: Added applied opening-balance reversal so finance staff can undo brought-forward savings/share postings with required notes, opposite ledger entries, snapshot decrement, negative share correction, reversed status, and audit evidence.
- 2026-07-09: Added payment-backed share receipt posting so approved `shares` receipt allocations create auditable member share ledger entries and keep the posted ledger reference on the receipt allocation.
- 2026-07-09: Added member self-service guarantor approvals so linked guarantor members can approve or reject their own pending financing guarantor requests with audit evidence.
- 2026-07-09: Added the first approved opening-balance apply workflow for brought-forward savings and share capital, with applied status metadata, ledger/share posting, member savings snapshot updates, and audit evidence.
- 2026-07-09: Added food-purchase accounting review notification support so the submitting committee user receives audited direct emails when finance accepts accounting or requests correction.
- 2026-07-09: Added food-purchase application review notification support so linked members receive audited direct emails when committee staff change their application status.
- 2026-07-09: Added procurement review notification support so linked members receive audited direct emails when finance changes their item-purchase request status.
- 2026-07-09: Added finance/admin review for submitted food-purchase accounting so month-end committee reports can be accepted or rejected for correction with audit evidence.
- 2026-07-09: Added a food purchase CSV export so workspace admins can download monthly released funds, member applications, approval evidence, accounting totals, and profit evidence from Reports.
- 2026-07-09: Added a procurement CSV export so workspace admins can download item-purchase requests, requested and approved costs, repayment estimates, and review notes from Reports.
- 2026-07-09: Added project financing review notification support so linked members receive audited direct emails when finance changes their business funding request status.
- 2026-07-09: Added a project financing CSV export so workspace admins can download member business funding requests, approval structures, payback evidence, and review notes from Reports.
- 2026-07-09: Added member-scoped project financing self-service so linked members can submit business funding requests from `/project-financing` and track only their own review history.
- 2026-07-09: Added member-scoped procurement self-service so linked members can submit item-purchase requests from `/procurement` and track only their own review history.
- 2026-07-09: Added member-scoped food purchase self-service so linked members can submit applications for open cycles from `/food-purchase` and track only their own application history.
- 2026-07-09: Added support-backed member profile/document update requests with a dashboard profile quick link, `account_update` prefill, optional initial attachment URL, and attachment links in support timelines.
- 2026-07-09: Added a member-role dashboard root that shows linked members their profile status, savings, special savings, financing/procurement/project/food-purchase activity, receipts, support cases, shares, and recent ledger activity without exposing staff overview data.
- 2026-07-09: Added a `/project-financing` staff workspace, dashboard actions, Finance navigation entry, and overview action-queue visibility for staged project financing request review.
- 2026-07-09: Added a tenant-scoped project financing request foundation with staged member business funding requests, structure clarification on approval, principal-only payback evidence for repayable facilities, and audit entries; accounting/posting remains future work.
- 2026-07-09: Added a `/food-purchase` dashboard workspace and action queue visibility for monthly committee fund releases, member applications, staff reviews, and month-end accounting/profit capture.
- 2026-07-09: Added a tenant-scoped food purchase workflow foundation with monthly committee fund-release cycles, member applications, committee review, released-fund capacity checks, end-of-month accounting, computed profit, and audit entries.
- 2026-07-09: Added pending brought-forward opening balance reviews to the overview action queue so finance staff can see unresolved opening-position approvals.
- 2026-07-09: Added member backfill baseline UI and dashboard actions for finance staff to stage, inspect, approve, and reject brought-forward opening balances without posting them to live financial records.
- 2026-07-09: Added staged brought-forward member opening balances with review/audit evidence for current book balances and active obligations; approval remains non-posting until a dedicated apply workflow is implemented.
- 2026-07-09: Added a support financial-adjustment approval gate so money-impact support cases requiring finance correction cannot be resolved until approved; review evidence is audited and exportable, without posting money from support.
- 2026-07-09: Tightened share configuration surfaces so monthly share history and unit-based shareholding are treated as mutually exclusive active models; unsaved model changes now hide inactive workflow panels until the selected model is saved.
- 2026-07-02: Initialized `apps/mobile` as the Halaalvest managed Expo starter from the reusable GND mobile shell, with Halaalvest app identity/assets, trimmed UI primitives, mock member/admin SecureStore sessions, member/admin tab surfaces, warm cooperative mobile tokens, and typed tRPC client wiring prepared for the future API-backed auth/workflow phase.
- 2026-03-21: Initialized Project Brain scaffold for the cooperative savings and loans SaaS repository, including system, product, engineering, database, API, task, and template documentation.
- 2026-04-10: Scaffolded the application codebase as a Bun and Turbo monorepo with `apps/web`, `apps/api`, and shared `auth`, `db`, `domain`, `ui`, `utils`, `eslint-config`, and `tsconfig` packages. Added a Next.js dashboard shell, sample domain scaffolds, and synchronized Brain documentation.
- 2026-04-10: Implemented a full Prisma 7 cooperative schema in `packages/db` using a file-grouped layout for enums and models, then validated the schema successfully with Prisma.
- 2026-04-13: Re-scoped the product as a generic cooperative SaaS platform, aligned the multi-app architecture to `plot-keys`, and added tenant host resolution, Next proxy entry points, and `portless` local named-host support.
- 2026-04-13: Completed phases 1-5 foundation work with seed-backed tenant resolution, scoped session/auth helpers, DB query ownership scaffolding, platform identity modules, and shared domain modules.
- 2026-04-13: Completed phase 6 bridge work by generating the Prisma client, adding an optional Prisma runtime adapter, and wiring dashboard and tenant-site pages to server-side tenant context loaders.
- 2026-04-13: Verified Phase 7.7 as complete for the DB-backed runtime path: `apps/api/src/routers/workspace.route.ts` now uses repository-backed dashboard metrics when the database is configured, with seed-mode fallback kept for local scaffold operation.
- 2026-04-13: Completed Phase 8 by adding tenant onboarding bootstrap queries in `packages/db/src/queries/onboarding.ts`, exposing `trpc/onboarding.status` and `trpc/onboarding.bootstrap`, and surfacing onboarding progress plus routing defaults in the dashboard.
- 2026-04-13: Redesigned the main `apps/web` landing page, added a distinct pre-launch variant, and introduced `MARKETING_STAGE` to switch between pre-launch and launch marketing states without changing routes.
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
- 2026-06-30: Completed Phase 0-2 of the Midday dashboard table-core parity rollout by auditing the table contract, adding Midday table runtime dependencies, restoring the advanced `tables/core` surface, splitting legacy static table wrappers into `components/dashboard/static-table.tsx`, and adding initial table settings/config support primitives.
- 2026-06-30: Completed Phase 3 of the Midday dashboard table-core parity rollout by adding Midday-style settings persistence, initial settings loading, DnD, horizontal scroll, infinite scroll, sort URL params, scroll-header behavior, draggable headers, resize handles, and horizontal pagination primitives.
- 2026-06-30: Completed Phase 4 of the Midday dashboard table-core parity rollout by tightening table ID/config coverage for operational table migration targets, including default hidden columns, sticky columns, sort maps, non-reorderable columns, row heights, and summary heights.

### Add automatic local database readiness to dev starters

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-20-feature-automatic-local-database-readiness-for-dev-starters.md`.
- Related Feature: Automatic Local Database Readiness for Dev Starters
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-20-feature-automatic-local-database-readiness-for-dev-starters.md
- Created Date: 2026-06-20

### Add Midday Finance Secondary Menu

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-21-feature-midday-finance-secondary-menu.md`.
- Related Feature: Midday Finance Secondary Menu
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-21-feature-midday-finance-secondary-menu.md
- Created Date: 2026-06-21

### Staged Monthly Contribution Generation

- Priority: High
- Description: Implemented current-month staged contribution visibility backed by generated monthly-record member rows.
- Related Feature: Monthly contribution generation
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-staged-monthly-contribution-generation.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Password Signup And Reset Flow

- Priority: High
- Description: Added tenant-admin password setup during onboarding and verified the existing non-enumerating reset flow.
- Related Feature: Authentication
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-password-signup-and-reset.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Admin Controlled Signup Visibility And Approval

- Priority: High
- Description: Added hidden and disabled signup modes while preserving admin approval for member applicants.
- Related Feature: Member signup and approvals
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-admin-controlled-signup-approval.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Marketing And Auth Experience Redesign

- Priority: Medium
- Description: Cleaned public/auth positioning, removed fake proof claims, and made signup CTA visibility policy-aware.
- Related Feature: Public marketing and auth UX
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-ux-ui-marketing-and-auth-redesign.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### First Run Onboarding Wizard

- Priority: High
- Description: Added an empty-workspace onboarding route and admin redirect that guides charges, shares, business, members, migration, loans, and commitments.
- Related Feature: Tenant onboarding
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-first-run-onboarding-wizard.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Business Profit Policy Settings

- Priority: High
- Description: Added tenant business profit policy storage, settings form, audit-backed update action, and migration readiness support for explicit no-historical-profit mode.
- Related Feature: Business profit policy
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-02-feature-business-profit-policy-settings.md
- Intake File: brain/intake/2026-07-02-business-profit-and-policy-workspaces.md
- Created Date: 2026-07-02
- Completed Date: 2026-07-02

### Business Profit Operations Workspace

- Priority: High
- Description: Added `/business` as the operational business profit workspace with Finance sidebar navigation, members-style summary/header/table structure, and moved the business registry table out of settings.
- Related Feature: Business profit operations
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-02-feature-business-profit-operations-workspace.md
- Intake File: brain/intake/2026-07-02-business-profit-and-policy-workspaces.md
- Created Date: 2026-07-02
- Completed Date: 2026-07-02

### Inclusive Interest-Free Cooperative Positioning

- Priority: Medium
- Description: Track plan in `brain/plans/2026-07-03-feature-inclusive-interest-free-cooperative-positioning.md`.
- Related Feature: Inclusive interest-free cooperative positioning
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-03-feature-inclusive-interest-free-cooperative-positioning.md
- Created Date: 2026-07-03

### Loan Policy And Monthly Financing Cycle Model

- Priority: High
- Description: Added tenant financing-cycle policy fields, monthly cycle snapshots, preview/open/status/policy DB helpers, seed/test defaults, and focused query tests.
- Related Feature: Monthly financing cycle loan settings
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-08-feature-loan-policy-and-monthly-financing-cycle-model.md
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`

### Financing Settings Workspace

- Priority: High
- Description: Added the live `/settings/finance/loan` financing settings workspace with current-month capacity preview, audited tenant policy/product/cycle actions, client forms, and a separated legacy loan migration section.
- Related Feature: Monthly financing cycle loan settings
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-08-feature-financing-settings-workspace.md
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`

### Loan Intake Capacity Enforcement And Dashboard Visibility

- Priority: High
- Description: Added current-cycle quota enforcement for quick/normal financing request intake, deployable-funds disbursement blocking, loan workspace capacity visibility, and overview financing-cycle warning counts.
- Related Feature: Monthly financing cycle loan settings
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-08-feature-loan-intake-capacity-enforcement-and-dashboard-visibility.md
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`

### Share Configuration Option

- Priority: High
- Description: Added tenant-level share unit amount, compulsory share units, and maximum share units with audited admin settings surfaces in Getting Started and finance share settings.
- Related Feature: Client-fit share policy
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`

### Share Model Selection

- Priority: High
- Description: Added a tenant share configuration mode so each cooperative chooses either monthly share history or unit-based shareholding, with dashboard surfaces, backfill behavior, and policy saves honoring only the selected model.
- Related Feature: Client-fit share policy
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts src/queries/backfill-migration-input.test.ts`; `bun --cwd packages/db test src/queries/migration.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`

### Member Share Application Workflow

- Priority: High
- Description: Added tenant-scoped optional share applications for unit-based shareholding, with pending/reviewed statuses, approval posting to share capital, audit metadata, finance-role actions, and a shares settings review queue.
- Related Feature: Client-fit share policy
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Support Case Workflow

- Priority: High
- Description: Added staff-managed support cases with tenant/member scoping, messages, assignment, priority/status updates, resolution summaries, money-impact flags, audit entries, `/support` workspace, navigation, and dashboard action-queue visibility.
- Related Feature: Client-fit customer service and activity reporting
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Support Feature Request Intake

- Priority: High
- Description: Added a dedicated `feature_request` support case category so staff and members can capture, assign, discuss, export, and audit product feedback inside the existing support workflow.
- Related Feature: Client-fit feature request capture and triage
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`

### Operational Trust Readiness

- Priority: High
- Description: Added a tenant-admin Trust Readiness settings page for pilot posture across exports, restore/legal readiness, monitoring, feature-request intake, beta reliability expectations, and safe error disclosure, plus a generic dashboard error boundary that hides raw crash details.
- Related Feature: Client-fit legal/security/reliability posture
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: Targeted `rg` for Trust Readiness, Sentry DSN detection, safe error boundary, and feature-request references; `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for new files

### Member Support Self-Service

- Priority: High
- Description: Added member-scoped support case creation, status visibility, message history, and member replies on `/support` for users with linked member profiles, while preserving the staff tenant-wide support queue.
- Related Feature: Client-fit customer service and activity reporting
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint

### Member Payment Receipt Submission And Review

- Priority: High
- Description: Added staged payment receipts with proof/reference metadata, category and target-period allocations, finance review decisions, audited allocation adjustments, duplicate non-rejected reference/proof checks, supported approval posting through contribution/repayment ledgers, `/payment-receipts` workspace, navigation, and dashboard action-queue visibility.
- Related Feature: Client-fit receipt submission and future/back payment allocation
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts src/queries/contributions.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Member Payment Receipt Self-Service

- Priority: High
- Description: Added member-scoped payment receipt submission, allocation splitting, status visibility, review-note visibility, and member-only plan/loan option loading on `/payment-receipts` for linked member profiles.
- Related Feature: Client-fit receipt submission and future/back payment allocation
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint

### Receipt-Linked Support Cases

- Priority: High
- Description: Added receipt-linked support case creation from staff and member payment receipt rows, with member receipt-link validation, support queue linked-record context, and audit-backed non-posting resolution evidence for payment mistakes.
- Related Feature: Client-fit customer service and member payment receipt issue resolution
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Support Case CSV Export

- Priority: High
- Description: Added workspace-admin support-case CSV export with tenant scope, date filters, linked record fields, money-impact flags, assignment, resolution evidence, message counts, and Reports catalog access.
- Related Feature: Client-fit exportable support and governance records
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB and clean dashboard lint; `git diff --check`

### Support Case Notification Events

- Priority: High
- Description: Added registered support notification events for case creation, replies, and status updates, with staff role emails for member-created activity and direct audited member emails for staff-created cases, staff replies, and status changes when member email is available.
- Related Feature: Client-fit customer service notifications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun test packages/notifications/src/types/support.test.ts`; `bun --cwd packages/db test src/queries/support.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage

### Payment Receipt Status Notifications

- Priority: High
- Description: Added the registered `member_payment_receipt.status_changed` notification event and direct audited member emails when finance reviews move a receipt to approved, rejected, correction-requested, or under-review status and the linked member has an email address.
- Related Feature: Client-fit receipt submission notifications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun test packages/notifications/src/types/payment-receipts.test.ts`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage

### Loan And Share Request Status Notifications

- Priority: High
- Description: Added direct audited member emails for financing request review status changes and optional share application review status changes, backed by registered notification events and member-email contact from the reviewed tenant-scoped records.
- Related Feature: Client-fit member request status notifications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun test packages/notifications/src/types/member-request-status.test.ts`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; `bun --cwd packages/db test src/queries/loans.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage

### Member Share Self-Service

- Priority: High
- Description: Added member-scoped `/shares` self-service for linked member profiles, with unit-share position summary, optional share request submission, application history, and selected-model gating so monthly-history cooperatives do not expose unit-share requests.
- Related Feature: Client-fit share configuration and member optional share applications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Financing Policy Guards

- Priority: High
- Description: Added tenant-configurable financing guardrails for special-savings eligibility, strict commitment during active financing, active-financing quick/emergency blocking, and future procurement overlap policy, with enforcement in loan request submission and contribution-plan updates plus audited finance settings controls.
- Related Feature: Client-fit financing policy settings
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts src/queries/contributions.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Financing Guarantor Approval

- Priority: High
- Description: Added tenant-scoped guarantor approval evidence for loan requests, optional guarantor selection on loan submission, direct email requests for guarantors with email addresses, finance-staff response recording, audit entries, dashboard visibility, and a final approval gate that blocks loan materialization until selected guarantors approve.
- Related Feature: Client-fit guarantor approval workflow
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/loans.test.ts`

### Procurement Request Workflow

- Priority: High
- Description: Added tenant-scoped procurement requests with item/vendor details, requested and approved cost, repayment months, monthly repayment estimate, finance review status, audit entries, active-financing policy enforcement, `/procurement` workspace, Finance navigation, and overview action-queue visibility.
- Related Feature: Client-fit procurement financing
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/procurement.test.ts`

### Financing Early Settlement

- Priority: High
- Description: Added repayment settlement behavior so a repayment that clears outstanding financing principal completes the loan, stops remaining unpaid schedule servicing through waived schedule rows, and records audit metadata for the settlement.
- Related Feature: Client-fit financing repayment controls
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/loans.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`

### Activity Report Governance Fields

- Priority: High
- Description: Upgraded the reports audit route into a clearer activity report with normalized performer, authorizer/reviewer, entity, timestamp, and compact metadata-summary fields, plus matching CSV export columns.
- Related Feature: Client-fit activity reporting
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/audit.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`
