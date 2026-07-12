# 03 — QA Getting Started And Settings Operation Profile

**What to build:** Browser QA evidence that tenant admins can review and update Operation Profile from Getting Started and Settings with safe defaults, validation, persistence, restrictive-change reasons, and audit evidence.

**Blocked by:** 01 — Establish QA Environment And Data Readiness.

**Status:** completed

- [x] Browser-test the Getting Started Operation Profile step after setup mode selection.
- [x] Browser-test Settings -> Cooperative Profile -> Operation Profile.
- [x] Verify defaults for payment receipts, procurement, Foodstuff Purchase, support, Collection Sources, and batch posting.
- [x] Verify enabling/disabling each service mode persists and reloads correctly.
- [x] Verify restrictive changes require a reason and write audit evidence.
- [x] Verify invalid policy caps or open-cycle values are rejected with usable errors.

## Approved Comment

Run this as the first browser QA slice after environment readiness and automated website/server checks.

Website QA must use the local dev command:

- `bun run dev --local --filter dashboard marketing`

Website QA URLs must use the portless feature:

- `halaalvest.localhost`
- `tenant.halaalvest-dash.localhost`

Database commands to verify or prepare schema state:

- `bun run db:push --local`
- `bun run db:push --prod`

Test order:

1. Sign in as tenant admin or super admin.
2. Open Getting Started and confirm Operation Profile appears after setup mode selection.
3. Verify default service modes:
   - payment receipts: office-managed
   - procurement: not used
   - Foodstuff Purchase: not used
   - support: members can request
   - Collection Sources: not used
   - Collection Source batch posting: not used
4. Change each service through disabled, office-managed, member-self-service, and read-only where applicable.
5. Save and reload to confirm persistence.
6. Open Settings -> Cooperative Profile -> Operation Profile and verify it shows the same saved state.
7. Try restrictive changes, such as member-self-service -> office-managed/read-only/disabled, without a reason and confirm the save is blocked.
8. Add a reason and confirm the restrictive change succeeds.
9. Verify policy fields for procurement and Foodstuff Purchase reject invalid caps and persist valid caps.
10. Confirm audit evidence exists for Operation Profile review/update, especially restrictive changes with reason.

Critical defects:

- admin can bypass required reason for restrictive changes;
- saved settings do not persist or reload correctly;
- Getting Started and Settings show conflicting state;
- invalid policy caps are accepted;
- non-admin roles can update Operation Profile;
- update succeeds without audit evidence.

Record screenshots or browser notes for the happy path and at least one blocked restrictive-change path.

## Implementation Evidence

Environment readiness is complete and browser/server QA has started through the approved Portless routes.

Resolved QA blocker:

- Login against the seeded QA tenant host `http://codex-qa-620c.halaalvest-dash.localhost:1355/login` succeeded through the local dev account picker flow.
- After login, `/getting-started` initially returned a 500 caused by Operation Profile default initialization.
- Root cause: concurrent/default tenant Operation Profile creation could hit the unique `tenant_id` constraint while using a fragile upsert path.
- Fix applied: default initialization now reads before create, recovers from duplicate-create races by re-reading the singleton row, and updates an ensured existing profile by `tenantId`.
- Focused verification passed with `bun test packages/db/src/queries/operation-profile.test.ts`.
- After the fix, `/getting-started` returns 200 for the seeded QA tenant instead of the Prisma unique-constraint error.

Resolved setup-gate blocker:

- `/settings/operation-profile` initially redirected to `/getting-started` while the tenant was still in first-run setup.
- Fix applied: `/settings/operation-profile` is now an allowed initial migration setup path so admins can review Operation Profile from Settings before the full workspace is live.
- Focused verification passed with `bun test apps/dashboard/src/lib/setup-gate.test.ts packages/db/src/queries/operation-profile.test.ts`.

Browser/server evidence:

- Approved dev command used: `bun run dev --local --filter dashboard marketing`.
- Portless routes active: `http://halaalvest.localhost:1355` and `http://halaalvest-dash.localhost:1355`.
- Seeded tenant route used for evidence: `http://codex-qa-620c.halaalvest-dash.localhost:1355`.
- Login through the seeded dev account `codex.qa.620c@example.com` returned a tenant-scoped session.
- `GET /getting-started?step=operation-profile` returned `200` and rendered `Confirm service access`, `Payment receipts`, `Procurement`, `Foodstuff Purchase`, `Payroll or ministry collection sources`, `Save operation profile`, `Change reason`, `Reviewed`, `Member self-service`, `Active procurement limit per member`, and `Require an open Foodstuff Purchase cycle` with no runtime error markers.
- `GET /settings/operation-profile` returned `200` and rendered `Operation profile`, `Update operation profile`, `Payment receipts`, `Procurement`, `Foodstuff Purchase`, `Collection sources`, `Source batch posting`, `Save operation profile`, `Change reason`, `Reviewed`, and `Member self-service` with no runtime error markers.
- The real dashboard tRPC action `dashboardActions.updateTenantOperationProfileAction` persisted member self-service for payment receipts, procurement, Foodstuff Purchase, and support; office-only for Collection Sources and batch posting; procurement active obligation cap `2`; Foodstuff Purchase active obligation cap `2`; and `foodPurchaseRequiresOpenCycle: true`.
- Invalid procurement cap submission returned `Procurement active obligation limit must be a positive whole number.`
- Invalid Foodstuff Purchase cap submission returned `Foodstuff Purchase active obligation limit must be a positive whole number.`
- Restrictive procurement change from `member_self_service` to `office_only` without a reason returned `A reason is required when disabling a service, making it view-only, or removing member self-service access.`
- Restrictive procurement change with reason succeeded and wrote a `tenant_operation_profile.reviewed` audit log with `restrictiveServiceKeys: ["procurement"]` and the submitted change reason.
- Final QA state was restored to member self-service for procurement and Foodstuff Purchase so downstream staff/member QA can test create paths.

Verification:

- `bun test apps/dashboard/src/lib/setup-gate.test.ts packages/db/src/queries/operation-profile.test.ts` passed: 9 tests.
- Focused Operation Profile/service regression run passed: 159 tests across setup gate, Operation Profile, procurement, Foodstuff Purchase, payment receipts, Collection Source batches, members, navigation, payment receipt loader, and mobile route DTO tests.
- `bun --filter @halaalvest/db typecheck` passed.
- `bun --filter @halaalvest/dashboard typecheck` passed.
