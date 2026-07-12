# Decide Existing Tenant Rollout And Compatibility

Type: grilling
Status: open
Blocked by: 03, 06, 07, 08

## Question

How should the operation profile roll out to existing tenants and existing data?

Resolve:

- Default feature activation for tenants that already have procurement, Foodstuff Purchase, payment receipt, share, contribution, or deduction-source records.
- Defaults for tenants with no data yet.
- Whether Getting Started becomes incomplete until the operation profile is reviewed.
- How to handle service disabling when active obligations or pending applications exist.
- Whether settings can be changed after migration finalization/live operation, and what confirmations or audit notes are required.
- What seed/test defaults should be used.

The answer should avoid breaking active demo data and should provide implementation-ready compatibility rules.

## Comments

- Decision: because the product is not launched yet, no complex existing-tenant rollout or compatibility migration is required. Use the new Operation Profile defaults directly.
- Demo and seed tenants can be updated to match the services we want to showcase. Empty test tenants should use conservative new-tenant defaults: commitments/savings on, shares configured in setup, support on, payment receipts `office_only`, procurement `disabled`, Foodstuff Purchase `disabled`, collection sources off until selected, collection-source batch posting off until selected, and project/emergency financing deferred unless separately enabled.
- Getting Started should require Operation Profile review for new workspaces before live operation readiness.
- Keep one finance-safety guardrail even pre-launch: disabling a service should not delete records or break dev/demo data. It should block new actions while preserving existing records for review, reports, statements, and settlement where applicable.
