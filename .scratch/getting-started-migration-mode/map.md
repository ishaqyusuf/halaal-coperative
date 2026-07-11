# Getting Started Migration Mode Map

## Destination

A clear product and implementation specification for making the tenant's migration setup mode a first-class Getting Started choice: full historical backfill or brought-forward opening position. The spec must say how the choice is saved, how later setup steps are tailored, and what business/profit/history data each mode should ask for before implementation starts.

## Notes

- Domain: Halaalvest cooperative finance setup, member migration, brought-forward opening balances, historical backfill, business profit, and profit-sharing seasons.
- Consult `brain/product/halaal-cooperative-operating-model.md`, `brain/features/onboarding-finance-setup-and-member-backfill.md`, `brain/features/core-cooperative-platform.md`, and `brain/database/schema.md` when resolving tickets.
- Treat staged/imported/generated/posting boundaries as finance-safety constraints.
- Planning only unless a later ticket explicitly says otherwise. Do not implement the feature from this map; resolve decisions until the route is clear.
- Local tracker convention: child tickets live in `.scratch/getting-started-migration-mode/issues/`.

## Decisions so far

## Not yet specified

- Exact implementation tickets for UI, database/API, loader/action updates, and tests after the mode semantics and step behavior are decided.
- How much of the current member-level brought-forward/backfill baseline flow should be linked directly from the tenant-level mode choice.
- The exact copy and help text for each mode after prototype review.
- Exact implementation tickets for profit sharing status, unit-share backfill dividend calculation, and brought-forward current obligations after their decision tickets are resolved.
- Exact implementation tickets for the setup-mode recommendation badge after the recommendation heuristic is resolved.
- Exact implementation tickets for the member-create brought-forward reveal flow after its prototype is resolved.

## Out of scope

- Reworking the underlying ledger posting mechanics for applied brought-forward balances.
- Rebuilding the member backfill generator itself.
- Changing Foodstuff Purchase, procurement, project financing, or receipt accounting semantics except where they appear as brought-forward outstanding obligations.
