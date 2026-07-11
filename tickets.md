# Tickets: Tenant Migration Setup Mode

Build a first-class tenant setup mode for Historical backfill vs Brought forward, using the source spec at `.scratch/getting-started-migration-mode/SPEC.md`.

Work the **frontier**: any ticket whose blockers are all done. For this set, several tickets can start after the persisted mode exists.

## Persist Tenant Migration Setup Mode

**What to build:** A tenant admin can choose `Historical backfill` or `Brought forward` at the start of Getting Started, see the recommended option, save the choice, and have that mode loaded again from the database.

**Blocked by:** None — can start immediately.

- [x] The setup mode is stored as durable tenant-level configuration, not client-only or URL-only state.
- [x] The available modes are exactly `historical_backfill` and `brought_forward`, displayed as Historical backfill and Brought forward.
- [x] The first Getting Started screen shows both choices with practical descriptions.
- [x] The recommended mode is calculated from cooperative age and member-count workload.
- [x] Tenant admins can override the recommendation and save either mode.
- [x] Server-side finance/member workflows can read the saved mode.
- [x] Persistence and recommendation behavior are covered by tests.

## Make Getting Started Mode-Aware

**What to build:** Getting Started copy, required sections, and next-step behavior change based on the saved setup mode, so Historical backfill asks for full history while Brought forward asks only for current/ongoing records.

**Blocked by:** Persist Tenant Migration Setup Mode.

- [x] Historical backfill mode tells staff to enter the historical records needed to reconstruct cooperative history.
- [x] Brought forward mode tells staff to enter the current cooperative state and ongoing records only.
- [x] Business/profit guidance changes by mode.
- [x] The flow can determine which setup sections are required from the saved mode.
- [x] Finalization checks use mode-specific requirements.
- [x] Mode-specific step behavior is covered by tests.

## Add Brought-Forward Business Profit Status and Step 6 Gating

**What to build:** Brought-forward business profits can be marked `Completed` or `Pending`, and the profit-season review step is skipped unless old pending profits require sharing.

**Blocked by:** Make Getting Started Mode-Aware.

- [x] Brought-forward business profit records support Completed and Pending statuses.
- [x] Completed means the profit has already been divided into member dividends.
- [x] Pending means the profit has not yet been shared with members.
- [x] Brought forward mode skips the profit-season review step when all relevant profits are current or future.
- [x] Brought forward mode shows the profit-season review step when old pending profits exist.
- [x] Historical backfill mode still includes profit-season review when historical dividends must be reconstructed.
- [x] Profit status and step-gating behavior are covered by tests.

## Route Member Creation by Tenant Setup Mode

**What to build:** After a member’s basic details are saved, Brought forward tenants open a brought-forward capture form, while Historical backfill tenants continue to the existing backfill path.

**Blocked by:** Persist Tenant Migration Setup Mode.

- [x] Member creation reads the tenant's saved setup mode.
- [x] Brought forward tenants are routed to brought-forward capture after basic member save.
- [x] Historical backfill tenants continue to the existing member backfill path.
- [x] The post-create route or reveal behavior is clear to staff and does not require duplicate data entry.
- [x] Routing behavior is covered by tests.

## Capture Brought-Forward Member Current Position

**What to build:** Staff can enter required current savings, special savings, and share position, with unit-share totals calculated automatically, plus optional current loan/financing, procurement, and Food Purchase obligations.

**Blocked by:** Route Member Creation by Tenant Setup Mode.

- [x] The brought-forward member form captures current savings.
- [x] The brought-forward member form captures current special savings.
- [x] The brought-forward member form captures current shares or share capital.
- [x] Unit-based share tenants enter share count and see the calculated total from the tenant share price.
- [x] Amount-based share tenants can enter current share capital directly.
- [x] Savings, special savings, and share position are required before applying the carried-forward position.
- [x] Optional Add actions reveal current loan/financing, procurement, and Food Purchase forms.
- [x] Current loan/financing capture includes amount, start date, guarantors, and required configuration details.
- [x] Optional obligations can be omitted without blocking the required current-position capture.
- [x] Brought-forward balances and obligations remain staged/reviewable before apply.
- [x] Required fields, unit-share calculation, and optional obligations are covered by tests.

## Capture Historical Unit-Share Purchase Records

**What to build:** Historical backfill tenants using unit-based shares can record each member’s historical share purchases with share count and payment date.

**Blocked by:** Persist Tenant Migration Setup Mode.

- [x] Historical backfill mode exposes a share purchase capture path when the tenant uses unit-based shares.
- [x] Each share purchase row records the number of shares bought.
- [x] Each share purchase row records the date the shares were paid for.
- [x] Share purchase records remain tenant-scoped and member-scoped.
- [x] Amount-based share tenants are not forced through unit-share purchase capture.
- [x] Share purchase validation is covered by tests.

## Generate Historical Backfill Dividends from Share Records

**What to build:** Finance staff can run a Calculate backfill dividends action that uses member share purchase records and profit seasons to generate staged dividend results for review.

**Blocked by:** Capture Historical Unit-Share Purchase Records; Add Brought-Forward Business Profit Status and Step 6 Gating.

- [x] Historical backfill tenants with unit-based shareholding can trigger Calculate backfill dividends.
- [x] The calculation uses member share purchase records and profit seasons.
- [x] Generated dividend results are staged and reviewable before posting or apply.
- [x] Staff are not required to manually divide profit member-by-member when share records are available.
- [x] The calculation respects tenant scope and existing finance audit boundaries.
- [x] Dividend generation behavior is covered by tests.

## Finalize Mode-Specific Readiness, Audit, and Documentation

**What to build:** Setup completion checks, audit trails, reversal/apply boundaries, manual QA coverage, and product/domain docs all reflect the selected tenant setup mode.

**Blocked by:** Capture Brought-Forward Member Current Position; Generate Historical Backfill Dividends from Share Records.

- [x] Setup readiness checks clearly reflect Historical backfill vs Brought forward requirements.
- [x] Setup mode changes and migration apply/reversal actions are attributable to the acting user and tenant.
- [x] Generated or staged finance records are not silently posted.
- [x] Manual QA covers one full Brought forward setup path.
- [x] Manual QA covers one full Historical backfill setup path.
- [x] Product/domain documentation describes setup mode as durable tenant finance configuration.
- [x] Existing terminology is normalized to Historical backfill and Brought forward.
