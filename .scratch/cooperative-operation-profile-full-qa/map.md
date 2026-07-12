# Cooperative Operation Profile Full QA Map

## Destination

A release-grade QA report for the Cooperative Operation Profile implementation, with browser/mobile/API/database evidence, known blockers separated from new defects, critical bugs fixed or ticketed, and a clear ship/no-ship recommendation for this feature.

## Notes

- Domain: Halaalvest tenant Operation Profile, Getting Started, Settings, procurement, Foodstuff Purchase, payment receipts, Collection Sources, Collection Source batch posting, dashboard/member/mobile visibility, reports, overview queues, audit evidence, and tenant/role boundaries.
- This map is execution-oriented because the requested destination is full QA testing. Each ticket should run the relevant QA, fix critical/high defects found in that ticket when feasible, and record evidence. Do not broaden into unrelated product work.
- Consult `.brain/audits/2026-07-12-operation-profile-qa.md`, `.brain/product/halaal-cooperative-operating-model.md`, `.brain/features/procurement-requests.md`, `.brain/features/food-purchase-operations.md`, `.brain/features/member-commitments-and-payment-allocation.md`, `.brain/features/member-payment-receipts.md`, `.brain/api/contracts.md`, `.brain/api/permissions.md`, and `.scratch/cooperative-feature-configuration/spec.md`.
- Run QA in two phases: website/server first, then mobile. Browser QA must identify the app URL, login path, tenant/demo credentials, local DB state, migration status, and whether destructive DB reset is allowed before any UI evidence is trusted. Mobile QA should wait until website/server behavior is stable enough that mobile issues can be classified cleanly.
- Treat finance-safety defects as critical: cross-tenant reads/writes, unauthorized service activation, create actions bypassing Operation Profile, settlement paths disappearing for existing obligations, double posting, silent money mutation, missing audit evidence, or member/staff role leakage.
- Local tracker convention: child tickets live in `.scratch/cooperative-operation-profile-full-qa/issues/`.

## Decisions so far

- Published local tickets under `.scratch/cooperative-operation-profile-full-qa/issues/` using the approved website-first, mobile-second QA split.
- `01 — Establish QA Environment And Data Readiness` is complete. DB schema readiness is complete, the approved dev command starts, and Portless wildcard routing is available for `halaalvest.localhost`, `halaalvest-dash.localhost`, and the seeded QA tenant host `codex-qa-620c.halaalvest-dash.localhost`.
- `02 — Run Automated Regression And Classify Blockers` is complete for the focused Operation Profile automated baseline. No focused Operation Profile automated failures were found.
- `03 — QA Getting Started And Settings Operation Profile` is complete. Browser/server QA found and fixed: Getting Started no longer 500s when Operation Profile defaults initialize; invalid policy caps are rejected with usable errors; `/settings/operation-profile` is reachable during first-run setup; persistence, reload, restrictive-change reason enforcement, and audit evidence were verified through the tenant dashboard action.
- `04 — QA Staff Service Workspaces And Server Guards` is complete. Browser/server QA found and fixed: service-setting default initialization now recovers from duplicate-create races; `/members` no longer renders Decimal hydration warnings or a server-side relative tRPC URL error. Disabled/default Kano staff routes and enabled Amanah staff routes were verified through Portless, and the focused Operation Profile staff/server regression now passes 161 tests.
- `05 — QA Member Web Portal Service Visibility And Actions` is complete. Browser QA created member-role QA users for Amanah and Kano, found and fixed disabled-service leakage on the member dashboard, verified self-service create actions, disabled blocked states, and office-only/read-only no-create behavior, then restored Amanah to self-service.
- `07 — QA Reports Overview Navigation And Preservation` is complete. Browser QA verified enabled Amanah nav/report exports, disabled unused Kano service hiding, direct hidden routes/export stability, and disabled-with-history preservation after creating a local QA procurement record.
- `08 — QA Security Audit And Tenant Boundaries` is complete. Member-role users could not render Operation Profile or member-admin controls, direct member tRPC mutation of Operation Profile was rejected, audit logs show before/after profile changes and restrictive reasons, and focused server tests cover create guards, cross-tenant source rejection, duplicate prevention, and batch audit behavior.
- `09 — QA Visual Responsive And Accessibility Pass` is complete. Browser screenshots covered Getting Started, Operation Profile Settings, staff service pages, reports, import batches, contributions, and member portal views at desktop and narrow widths. Operation Profile/member accessibility snapshots confirmed named critical controls and actions; a collapsed-sidebar accessible-name defect was fixed and rechecked. One cosmetic desktop settings-nav truncation remains recorded without blocking the feature.
- `06 — QA Mobile Operation Profile Behavior` is complete. Mobile router tests, mobile typecheck, mobile smoke coverage, and native-import checks passed. Source QA verified member home services, More sections, receipt/procurement/Foodstuff Purchase create gates, and history-preservation paths consume Operation Profile DTO flags. Native simulator/device evidence was not required for this DTO-driven slice.
- `10 — Assemble Final QA Report And Ship Recommendation` is complete. Final report lives at `.scratch/cooperative-operation-profile-full-qa/final-report.md`; final compact regression passed with 105 tests and 0 failures; recommendation is to ship for the current pre-launch/local QA milestone.
- Broad automated baseline is now green: root `bun run typecheck` passes, root `bun run test` passes, and the focused Operation Profile/server/mobile regression commands recorded in ticket 02 pass. Browser QA is now unblocked and running through Portless clean-host routes.

## Not yet specified

- None for this QA cycle.

## Out of scope

- Redesigning Operation Profile UX beyond defects found during QA.
- Adding project financing or emergency financing to the first Operation Profile catalog.
- Foodstuff Purchase profit distribution semantics.
- Bank integration, payroll/ministry API integration, production deployment, app-store release, and formal penetration testing.
- Load testing beyond lightweight responsiveness/performance smoke.
