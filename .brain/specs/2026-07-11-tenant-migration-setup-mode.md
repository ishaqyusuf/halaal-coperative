# Tenant Migration Setup Mode

## Domain Decision

Tenant migration setup mode is durable finance configuration. The stored values are:

- `historical_backfill` (`Historical backfill`): staff enter historical cooperative and member records so savings, shares, business profit seasons, and dividends can be reconstructed.
- `brought_forward` (`Brought forward`): staff enter the cooperative and member current position, then continue live operations from that carried-forward state.

The mode is stored on tenant policy and is loaded by Getting Started, member creation, member migration pages, business profit setup, and readiness checks.

## Readiness Rules

Historical backfill requires historical setup inputs, including business profit reconstruction when applicable. Unit-share tenants can record historical share purchases by member, with share units and paid date, then run `Calculate backfill dividends` to generate draft share profit allocations from share records and historical profit entries.

Brought forward skips historical reconstruction where the current position is enough. Member creation routes directly to brought-forward current-position capture. Required member inputs are current savings, current special savings, and share position. Optional current obligations are active financing, procurement, and Food Purchase.

Brought-forward business profit records use `Pending` and `Completed`. Completed means dividends have already been divided to members. Pending means they have not. Past pending profits can still require profit-season review; current or future pending profits do not force setup-time sharing.

## Audit And Posting Boundaries

Setup mode changes are audited. Brought-forward opening balances are staged as pending review, then approved and applied explicitly. Applying can post savings/share capital, active financing, procurement, and Food Purchase obligations with migration-source audit records.

Historical share purchases post backfill share ledger entries, but generated dividends remain draft share profit allocations until staff publish or apply through the existing finance workflow. No migration mode action silently publishes dividends or final member ledger backfill.

## Manual QA Checklist

Brought forward path:

1. Select `Brought forward` on Getting Started and save.
2. Enter ongoing/current business profit records and confirm old pending profit behavior.
3. Create a member and confirm the post-create route opens brought-forward current-position capture.
4. Stage current savings, special savings, shares, and optional active financing/procurement/Food Purchase.
5. Approve and apply the opening position, then confirm linked records and audit evidence.

Historical backfill path:

1. Select `Historical backfill` on Getting Started and save.
2. Enter historical business profits and keep profit-season review visible.
3. For a unit-share tenant, create a member and record historical share purchases with units and paid date.
4. Run `Calculate backfill dividends` and confirm draft allocations are generated from share balances at each profit date.
5. Review member backfill rows before applying the historical ledger.
