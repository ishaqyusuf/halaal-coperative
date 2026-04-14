# Dashboard Navigation And Roles

## Summary
- The dashboard now uses a role-filtered navigation registry and shared shell so cooperative routes can scale beyond the initial scaffold page.
- The authenticated workspace now also uses a Midday-inspired UI slice with dedicated shell and primitive components so route pages can share a denser operational dashboard language.

## Goal
- Create a structured workspace navigation system for members, finance, experience, and settings routes without introducing a full permission matrix yet.

## Flow
- `apps/dashboard/app/layout.tsx` loads tenant and auth context server-side.
- `apps/dashboard/components/dashboard-shell-client.tsx` resolves the current pathname and active role client-side.
- `apps/dashboard/components/dashboard/shell/` owns the sidebar, topbar, and page frame for the authenticated dashboard.
- `apps/dashboard/components/dashboard/primitives/` owns reusable KPI, section-card, trend-pill, and data-table building blocks for route pages.
- `apps/dashboard/features/navigation/registry.ts` defines modules, sections, and route links.
- `apps/dashboard/features/navigation/lib.ts` filters links by role and resolves the active route/module state.
- `apps/dashboard/features/workspace/page-shell.tsx` adapts the route pages onto the shared primitive layer.
- Individual route pages still own their data loading and render inside the shared shell.

## Roles
- `super_admin`
- `tenant_admin`
- `finance_officer`
- `operations_officer`
- `member`

## Current Routes
- `/`
- `/members`
- `/contributions`
- `/charges`
- `/loans`
- `/repayments`
- `/notifications`
- `/tenant-site`
- `/domains`
- `/settings/profile`
- `/settings/roles`

## Notes
- The role model is intentionally simple for now.
- UI visibility is role-based; a deeper permission system is deferred.
- The shell now uses a Midday-style density target: fixed hover-expand sidebar, compact sticky topbar, tokenized section cards, KPI strips, and flatter table/list surfaces.
- `/` now acts as the primary UI reference page for the dashboard system, while the main operational, reporting, experience, settings, and member-detail routes now reuse the same primitives.
- Member detail, printable statement, and the audit viewer now also follow the same Midday-inspired drill-down layout language instead of falling back to the earlier page-specific card stack.
- Members, contributions, charges, loans, and repayments now include server-action-backed operator flows inside the new shell.
- Loans now support request submission, review state changes, approval, and disbursement from `/loans`.
- Repayments now support repayment posting and schedule visibility from `/repayments`.
- Notifications now surface persisted outbox delivery history when the database runtime is configured, while keeping shared template previews visible as a fallback.
- Notifications now include tenant-level per-role preference toggles for the shared email notification types.
- Domains now list tenant hostnames, allow admin roles to register additional custom domains, and let admins choose the primary hostname within a domain kind.
- Domains now track verification state and allow admins to explicitly move custom domains between pending DNS and verified states before primary promotion.
- Settings now allow cooperative profile updates and tenant-user role provisioning through the same simplified role-based architecture.
- The primary dashboard create/update/filter forms now share a shadcn-style form system, `useZodForm` validation, and dev-only quick-fill helpers instead of mixed raw HTML form markup.
- Repayments now include a collections follow-up section plus an action to refresh overdue schedule statuses.
- Reports now surface audit activity, finance snapshots, and notification delivery totals from one admin route.
- Reports now also provide downloadable CSV exports for audit activity, collections status, and notification delivery history.
- Reports now also provide downloadable CSV exports for contributions, loans, and member statement summaries so finance teams can review commitment, savings, and loan exposure without leaving the dashboard.
- Members now also have a detail route that turns the same statement data into an in-dashboard profile view with commitment history, contributions, loans, schedules, and repayments.
- Members now also have a printable statement route, while reports add deeper exports for charges, repayments, and member-ledger activity plus a separate audit viewer route.
- Contributions now support active-plan updates, explicit plan closure, and member-level payment allocation presets.
- Charges now expose recent charge applications and allow finance staff to waive or reverse posted charges.
- Repayments now allow collections follow-up notes to be captured from overdue items, and the resulting events can surface through audit/reporting.
- Key finance actions now queue tenant-role notification outbox entries so existing preference and delivery surfaces can evolve from passive history into workflow alerts.
- Domains now include a manual `Run check` verification workflow that keeps platform domains verified, flags invalid custom hostnames as failed, and keeps valid-but-unverified custom hostnames in a pending DNS state until stronger verification automation is added.
- Domains now expose routing scope, expected DNS target guidance, and primary promotion rules by routing surface, so a verified custom site hostname can replace the platform site primary and a verified dashboard-style custom hostname can replace the platform dashboard primary.
- Domains now also persist verification details from DNS checks so the dashboard can explain the last lookup method, resolved records, and failure reason instead of only showing a coarse status.
- Repayments now persist collections follow-up records with notes and optional next-action dates, and reporting can surface those records directly rather than inferring everything from audit logs alone.
- Notifications now support filtering the delivery history view and cover more internal workflow events such as repayments, charge corrections, and domain verification changes.
- Members now also capture richer KYC review context, including document type, uploaded timestamp, and review notes.
- The next dashboard slice should deepen exports and statements further, then move collections and KYC from richer records into fuller operational case-management behavior.
