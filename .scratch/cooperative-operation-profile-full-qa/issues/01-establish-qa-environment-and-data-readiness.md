# Establish QA Environment And Data Readiness

**Type:** task
**Status:** ready-for-agent

## Question

Can we create a trustworthy local QA environment for Operation Profile testing, including app URL, tenant/demo credentials, database state, migration status, seed/demo records, and a non-destructive reset or isolation decision?

## Acceptance Criteria

- Record the exact app/API/mobile command(s), URL(s), tenant host(s), and credentials or access path used for QA.
- Verify whether the current local database schema matches the committed Prisma migrations or document drift precisely.
- Decide whether QA will use the existing local DB, a reset local DB, a separate test DB, or mocked/API-only flows.
- Confirm which demo records exist for procurement, Foodstuff Purchase, payment receipts, Collection Sources, and member accounts.
- Record blockers before any downstream browser/mobile QA starts.
