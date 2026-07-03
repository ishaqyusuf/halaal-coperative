# Brain Intake: Recent Cooperative Backfill Cleanup

## Status
Proposed

## Created Date
2026-07-03

## Last Updated
2026-07-03

## Raw Input
When a new cooperative registers and the cooperative start date is today or this month, hide the backfill procedure because historical records are not necessary. Tone down the next-step alert that says historical records are important when the cooperative is recent. Also simplify the Getting Started/member backfill experience: reduce word noise, use short sentences, focus attention on inputs, and move away from card-heavy layout toward a flatter design.

## Generated Plans
- [ ] Recent Cooperative Backfill Gate And Alert Tone - `brain/plans/2026-07-03-bug-fix-recent-cooperative-backfill-gate.md` - Status: Proposed
- [ ] Getting Started And Member Backfill UI Simplification - `brain/plans/2026-07-03-ux-ui-getting-started-backfill-simplification.md` - Status: Proposed

## Recommended Execution Order
1. Recent Cooperative Backfill Gate And Alert Tone - fixes the workflow decision so the UI knows whether historical backfill is truly required.
2. Getting Started And Member Backfill UI Simplification - cleans the visible experience after the required/not-required state is accurate.

## Agent Recommendations
- Recent Cooperative Backfill Gate And Alert Tone: open-code - focused domain/query and dashboard UI fix with clear tests.
- Getting Started And Member Backfill UI Simplification: open-code - dashboard UI composition cleanup that should stay close to the existing component files.

## Merged Items
- The "hide backfill for recent cooperatives" and "tone the historic-record alert" requests were merged because both depend on the same recent-cooperative history requirement rule.
- The "Getting Started word noise" and "member backfill flat design" requests were merged because both affect the same guided setup/backfill surfaces and share one UX outcome.

## Duplicate Or Existing Items
- Not a duplicate. Related existing work includes `brain/plans/2026-06-27-feature-first-run-onboarding-wizard.md` (Done), `brain/plans/2026-06-30-feature-simple-member-create-and-single-member-backfill-workflow.md` (In Progress), and `brain/features/onboarding-finance-setup-and-member-backfill.md`.

## Needs Clarification
- None for intake. The implementation should treat "today or this month" as the current calendar month and keep historical backfill required for prior closed months.

## Skipped Items
- None.

## Approval Notes
- None.

## Handoff Notes
- Use `brain-batch-handoff` to convert approved plans into handoffs and queue items.
