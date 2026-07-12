# Run Automated Regression And Classify Blockers

**Type:** task
**Status:** ready-for-agent

**Blocked by:** Establish QA Environment And Data Readiness

## Question

What is the automated regression baseline for Operation Profile after environment readiness, and which failures are feature regressions versus existing unrelated blockers?

## Acceptance Criteria

- Run package typechecks for touched workspaces and the root typecheck where possible.
- Run focused Operation Profile tests and the full root test suite where possible.
- Run Prisma validation/migration/push checks according to the environment decision.
- Classify every failure as Operation Profile defect, pre-existing blocker, environment blocker, or intentionally skipped.
- Fix critical/high Operation Profile automated failures within this ticket when feasible; otherwise create follow-up bug tickets.
