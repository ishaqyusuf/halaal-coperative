# Brain Intake: Business Profit And Policy Workspaces

## Status
Complete

## Created Date
2026-07-02

## Last Updated
2026-07-02

## Raw Input
User wants a new business-profit direction for cooperatives and asked how this should relate to existing Loans navigation. Loans already exists in the sidenav as the operational loan workspace, so the new gap is a Business main page in the Finance sidenav plus business-profit settings under `/settings/finance/business`. The earlier request also included loan settings for maximum active loans per member, maximum loan amount, and maximum payback time, but loan-rule settings already exist in a prior Brain plan.

## Generated Plans
- [x] Business Profit Operations Workspace - `brain/plans/2026-07-02-feature-business-profit-operations-workspace.md` - Status: Done
- [x] Business Profit Policy Settings - `brain/plans/2026-07-02-feature-business-profit-policy-settings.md` - Status: Done

## Recommended Execution Order
1. Business Profit Policy Settings - establishes the tenant profit-distribution rules that the operations page should display and respect.
2. Business Profit Operations Workspace - adds the Finance sidenav Business page for active business pools, reviewed profit, distribution periods, and allocation actions.

## Agent Recommendations
- Business Profit Policy Settings: open-code - mostly schema/query/action/form work with careful finance validation and audit logging.
- Business Profit Operations Workspace: open-code - dashboard route, navigation, query DTO, and Midday-style table/page work.

## Merged Items
- Business main page, business sidenav link, and profit operations were merged into one workspace plan because they serve the same staff workflow.
- Dividend session/frequency, business settings, migration readiness, and profit-distribution policy were merged into one policy settings plan because they form one tenant-level rule surface.

## Duplicate Or Existing Items
- Loan settings are covered by `brain/plans/2026-06-30-feature-simple-member-create-and-single-member-backfill-workflow.md`, Phase 7: Loan Rule Settings. That existing plan covers visible tenant loan policy, loan products, eligibility multiple, repayment terms, reserve buffer, dual approval, request-time eligibility preview, and audit safety.

## Needs Clarification
- Resolved: Finance sidenav label is `Business`.
- Resolved: first release excludes monthly distribution frequency.

## Skipped Items
- No implementation handoffs were created. Use `brain-batch-handoff` after approval.

## Approval Notes
None.

## Handoff Notes
Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.

## Follow-Up Intake: Live Business Operations And Profit Seasons

### Raw Input
The current business lock model is too broad. A cooperative can continue creating and operating businesses after initial migration. Historical migration inputs should lock after member backfill or finalization, but the live `/business` workspace should still allow privileged users to create new business pools and profit streams during live operations.

Profit should be attributed to a configured profit-sharing or dividend season. The tenant business policy in `/settings/finance/business` defines the prior rules, such as annual, semi-annual, quarterly, or ad-hoc sharing. Getting started needs an explicit step for the dividend/profit-sharing session so member migration can use the configured policy. For example, when sharing is yearly, member migration should append the member's profit share at the end of each applicable year, based on reviewed business profit and the configured distribution basis.

### Product Direction
- Separate historical migration locks from live business operations.
- Lock only historical profit migration records and already-published allocation history once member backfill has started or initial migration is finalized.
- Keep live business creation/editing available after go-live through normal tenant-scoped, role-checked, audit-logged finance actions.
- Attribute profit streams to dividend/profit-sharing periods rather than treating every business record as a migration-only row.
- Generate migration profit-share rows from configured sharing seasons as draft or reviewed migration context; do not publish member allocations automatically without privileged review.
- Preserve Halaal constraints: profit must be tied to actual cooperative business results, not guaranteed returns or interest-like income.

### Impacted Existing Plans
- Business Profit Operations Workspace: revise the `/business` page so create actions are not blocked by initial-migration lock during live operations. Use lock state only for historical migration editing and published allocation safety.
- Business Profit Policy Settings: extend policy usage so distribution frequency and financial-year start drive profit-sharing period suggestions.
- First Run Onboarding Wizard: add or adjust a step for dividend/profit-sharing season setup before member migration.
- Onboarding Finance Setup And Member Backfill: generate or append profit-share migration rows at configured sharing period boundaries, such as year-end for annual sharing.

### Acceptance Notes
- A finalized cooperative can still create a new live business pool.
- A finalized cooperative cannot rewrite historical migration profit rows or published allocations through the migration workflow.
- Getting started captures enough dividend/profit-sharing policy to make member migration deterministic.
- Annual sharing produces year-end profit-share context for member migration when reviewed profit exists for that year.
- All generated profit-share rows remain auditable and explain their source business, period, allocation basis, and review state.

### Implementation Evidence
- Added source-aware business profit guards so manual live business/profit actions are allowed after go-live while `backfill` and `import` profit rows remain migration-locked.
- Added a dedicated getting-started `profit-policy` step before business history and member migration.
- Added a dedicated getting-started `profit-seasons` review step after business history so generated dividend seasons can be reviewed before member migration.
- Made business profit pool readiness require either recorded profit pools or an explicit no-historical-profit review/policy.
- Made business profit season readiness require business profit entries to be linked to reviewed dividend periods before member backfill can start.
- Mapped draft/manual migration profit credits to configured profit-sharing period boundaries; annual policy lands at year-end.
- Persisted season-level deductions and reasons on dividend periods, and proportionally applied reviewed season deductions back to linked profit entries so member migration uses reviewed distributable amounts.
- Surfaced the linked dividend season label in member migration profit adjustment panels so staff can see which reviewed season a profit entry belongs to.
- Verified with focused unit tests for migration state, tenant-finance guards, domain migration snapshot, and backfill input generation.
