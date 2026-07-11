# Spec: Tenant Migration Setup Mode

Status: ready-for-agent

Source: Wayfinder map at `.scratch/getting-started-migration-mode/map.md`

## Problem Statement

Getting Started currently mixes two different onboarding intentions: cooperatives that want to reconstruct their full historical records, and cooperatives that only want to enter the current carried-forward position and continue operations from there. Because that distinction is not a first-class tenant configuration, the flow can ask the wrong questions, show unnecessary profit-season steps, and route member creation into a generic backfill experience even when the cooperative chose a brought-forward operating style.

The product needs a durable setup mode that is selected at the start of onboarding and then used everywhere the cooperative interacts with historical finance data, member migration data, business profit records, and future member creation.

## Solution

Add a first-class tenant migration setup mode with two options:

- Historical backfill: the cooperative enters past records so the system can reconstruct historical member savings, shares, business profit seasons, and dividends.
- Brought forward: the cooperative enters the current state of the cooperative and each member without recreating every old transaction, then continues operations from that current position.

The setup mode is selected on the first Getting Started screen, persisted in the database as tenant-level configuration, and loaded by downstream workflows. Getting Started copy, required fields, skipped steps, business profit handling, and member creation/backfill behavior should all branch from this persisted mode.

## User Stories

1. As a tenant admin, I can choose between Historical backfill and Brought forward at the start of Getting Started.
2. As a tenant admin, I can read a short description under Historical backfill explaining that I must enter historical cooperative records so the system can reconstruct past activity.
3. As a tenant admin, I can read a short description under Brought forward explaining that I only need to enter the current cooperative and member positions.
4. As a tenant admin, I can see a Recommended flag on the setup mode that best fits my cooperative.
5. As a tenant admin, I can still choose the non-recommended setup mode if I know it fits my cooperative better.
6. As a tenant admin, I can save my setup mode and return later without losing that decision.
7. As a finance officer, I expect future screens to use the saved setup mode instead of asking the same question repeatedly.
8. As a finance officer in Brought forward mode, I am told to enter ongoing businesses and profits that are not yet shared, not every past business record.
9. As a finance officer in Historical backfill mode, I am told to enter the full business and profit history needed to reconstruct past allocations.
10. As a finance officer in Brought forward mode, I do not see the profit-season allocation step when all entered business profits are still within the current or future sharing window.
11. As a finance officer in Brought forward mode, I do see the profit-season allocation step when there are old pending profits that should already have been shared but have not yet been divided into member dividends.
12. As a finance officer in Brought forward mode, I can mark each entered business profit as Completed or Pending.
13. As a finance officer, I understand Completed to mean the profit has already been divided into member dividends.
14. As a finance officer, I understand Pending to mean the profit has not yet been shared with members.
15. As a finance officer in Brought forward mode, completed past profits are not treated as records that need dividend reconstruction during setup.
16. As a finance officer in Historical backfill mode, historical business profit seasons remain part of setup when past dividends must be reconstructed.
17. As a staff user creating a member for a Brought forward tenant, I am routed into a brought-forward capture form after saving the member's basic details.
18. As a staff user creating a member for a Historical backfill tenant, I continue to see the historical member backfill path after saving the member's basic details.
19. As a staff user in Brought forward mode, I can enter the member's current savings balance.
20. As a staff user in Brought forward mode, I can enter the member's current special savings balance.
21. As a staff user in Brought forward mode, I can enter the member's current share position.
22. As a staff user in Brought forward mode with unit-based shares, I can enter only the number of shares and have the system calculate the total share amount from the tenant share price.
23. As a staff user in Brought forward mode with amount-based shares, I can enter the member's current share capital amount directly.
24. As a staff user in Brought forward mode, savings, special savings, and shares are required before the member's carried-forward position can be applied.
25. As a staff user in Brought forward mode, I can optionally add a current loan or financing obligation for the member.
26. As a staff user adding a current loan or financing obligation, I can enter the amount, start date, guarantors, and required repayment or configuration details.
27. As a staff user in Brought forward mode, I can optionally add current procurement obligations for the member.
28. As a staff user in Brought forward mode, I can optionally add current Food Purchase obligations for the member.
29. As a staff user in Brought forward mode, optional current obligations are added from an Add control that reveals loan, procurement, and Food Purchase forms.
30. As a finance officer, I can review brought-forward member data before it is applied to the member's ledger state.
31. As an auditor, I can tell that brought-forward balances came from migration setup rather than ordinary member transactions.
32. As a finance officer in Historical backfill mode with unit-based shareholding, I can record each member's share purchases with the number of shares and the payment date.
33. As a finance officer in Historical backfill mode, I can wait until all members and their historical share purchases are entered before calculating historical dividends.
34. As a finance officer in Historical backfill mode, I can click Calculate backfill dividends to generate member dividend results from share records and profit seasons.
35. As a finance officer in Historical backfill mode, I do not manually divide profits member-by-member when the tenant's profit sharing is based on unit shareholding.
36. As a finance officer in Brought forward mode, I do not reconstruct historical dividends because already-shared dividends should already be included in current savings or share positions.
37. As a tenant admin, I can finalize setup only when the required checks for my selected setup mode pass.
38. As a support or engineering user, I can inspect the tenant setup mode in the database and understand why a tenant sees a brought-forward or historical-backfill workflow.

## Implementation Decisions

Use these exact domain modes:

- `historical_backfill`, displayed as `Historical backfill`
- `brought_forward`, displayed as `Brought forward`

Persist the mode as tenant-level database configuration. The existing tenant finance policy/configuration area is the preferred home because the mode influences share setup, profit setup, member migration, and future finance workflows. The value must be available from server-side loaders/actions and must not be stored only in client state or URL state.

Mode selection belongs at the beginning of Getting Started. The first screen should show two selectable options with descriptions and a Recommended flag. Saving the selection should persist the tenant mode before the user continues into finance setup.

The recommendation heuristic should be deterministic and advisory:

- If the cooperative start date is within the last 12 months, recommend Historical backfill.
- If the cooperative is older than 12 months, estimate setup workload with `memberCount * ageInMonths`.
- Recommend Historical backfill when the estimated workload is at or below 240 member-months.
- Recommend Brought forward when the estimated workload is above 240 member-months.
- If member count or start date is missing, show the descriptions without blocking selection; use the available value to make the best effort recommendation.

Getting Started copy and requirements must branch by mode. Historical backfill should ask for all relevant historical businesses, profits, member share purchases, and dividend reconstruction data. Brought forward should ask for ongoing businesses and profits that still matter to the current operating position.

The profit-season step should be conditional. Historical backfill keeps the profit-season review/allocation step. Brought forward skips that step when all entered profits are current or future pending profits that do not need setup-time sharing. Brought forward shows that step only when there are past pending profits outside the current/future sharing window.

Brought-forward business profit records need a status field:

- `completed`: the profit has already been divided into member dividends.
- `pending`: the profit has not yet been divided into member dividends.

Completed brought-forward profit records are informational/current-state records and should not trigger historical dividend reconstruction. Pending brought-forward profit records can trigger the profit-season review step when they represent old profit that should now be shared.

Member creation must read the persisted tenant mode. After basic member details are saved, a Brought forward tenant should open the brought-forward capture form. A Historical backfill tenant should continue to use the historical member backfill flow.

The brought-forward member capture UI should be a single form with a polished reveal after the basic member save. Required inputs are current savings, current special savings, and current shares/share capital. Optional Add actions reveal current loan/financing, procurement, and Food Purchase forms.

For unit-based shares in Brought forward mode, staff enter the current number of shares and the UI calculates the total value from the tenant's configured share price. For amount-based share configuration, staff enter the current share capital amount directly.

For Historical backfill with unit-based shareholding, member backfill must include a share purchase table. Each row records the number of shares bought and the payment date. These records feed automatic historical dividend calculation.

Historical dividend reconstruction should use a command named along the lines of Calculate backfill dividends. The calculation should use all onboarded member share records and each profit season to generate staged dividend results. Generated dividend results must remain reviewable before any posting/apply step.

All financial migration data must preserve existing staged/generated/posted boundaries. Mode selection can drive generation and validation, but it must not silently post balances, obligations, dividends, or charges.

Role and audit behavior should follow existing finance setup conventions. Setup mode changes, brought-forward applies, dividend calculations, and migration apply/reversal actions should be attributable to the acting user and tenant.

Because the product is pre-launch and has no real production data, implementation does not need a backwards-compatible migration plan for existing tenants. Schema and seed data may be updated directly as needed.

## Testing Decisions

Focus tests on behavior at the finance workflow boundaries rather than component implementation details.

Add database/query tests for persisting, reading, and updating the tenant migration setup mode. These tests should prove that the mode is tenant-scoped and available to downstream finance/member workflows.

Add recommendation tests for the setup mode heuristic: within 12 months recommends Historical backfill; older cooperatives with workload at or below 240 member-months recommend Historical backfill; older cooperatives above that threshold recommend Brought forward; missing start date or member count does not block manual selection.

Add Getting Started step decision tests for mode-specific requirements. Historical backfill should include profit-season review. Brought forward should skip profit-season review when all profits are current/future, and include it when old pending profits exist.

Add validation tests for brought-forward business profit status. Completed profits should not require allocation during setup. Pending old profits should require allocation review.

Add member creation flow tests proving that Brought forward tenants are routed to brought-forward capture after basic member save, while Historical backfill tenants are routed to the existing backfill flow.

Add brought-forward member validation tests for required current savings, special savings, and share position. Include unit-share calculation tests where share count times configured share price produces the displayed/staged share amount.

Add optional obligation tests for brought-forward members: current loan/financing, procurement, and Food Purchase records can be added independently and do not block the required savings/share capture when omitted.

Add Historical backfill unit-share tests proving that share purchase rows require number of shares and payment date, and that generated dividend results use share records plus profit seasons.

Prefer extending existing test seams where available:

- tenant finance query tests
- migration/backfill input query tests
- backfill generator tests
- dashboard member backfill step tests
- Getting Started view or step-decision tests

Manual QA should cover a full Brought forward setup path and a full Historical backfill setup path in the dashboard.

## Out of Scope

Rewriting the underlying ledger posting mechanics for applied opening balances is out of scope.

Rebuilding the full backfill generator architecture is out of scope, except for adding unit-share purchase inputs and dividend generation behavior needed by this mode distinction.

Changing Food Purchase, procurement, project financing, receipt, or repayment accounting semantics is out of scope, except for capturing current obligations during Brought forward member setup.

Production-safe backwards compatibility for existing tenants is out of scope because the product is still pre-launch.

Member self-service onboarding for these migration flows is out of scope.

Changing the cooperative's Halaal finance principles, interest-free assumptions, or audit requirements is out of scope.

## Further Notes

Use the persisted setup mode as a durable tenant decision, not as a temporary onboarding preference. The decision should continue to influence future member creation after Getting Started is complete.

Keep language consistent across the app: use Historical backfill and Brought forward everywhere. Avoid mixing in older phrases like broad forward, opening only, or generic backfill when referring to the selected mode.

When adding UI copy, make the distinction practical: Historical backfill means "enter the past so the system can rebuild it"; Brought forward means "enter the present position and continue from today."

Update product/domain documentation after implementation so future agents know that migration setup mode is now a tenant-level finance setting.
