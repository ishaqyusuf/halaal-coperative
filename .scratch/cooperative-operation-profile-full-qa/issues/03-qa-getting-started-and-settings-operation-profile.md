# QA Getting Started And Settings Operation Profile

**Type:** task
**Status:** ready-for-agent

**Blocked by:** Establish QA Environment And Data Readiness

## Question

Do Getting Started and Settings let admins review and update the Operation Profile correctly, with safe defaults, required reasons for restrictive changes, policy fields, validation, persistence, and audit evidence?

## Acceptance Criteria

- Browser-test the Getting Started Operation Profile step after setup mode selection.
- Browser-test Settings -> Cooperative Profile -> Operation Profile.
- Verify defaults for payment receipts, procurement, Foodstuff Purchase, support, Collection Sources, and batch posting.
- Verify enabling/disabling each service mode persists and reloads correctly.
- Verify restrictive changes require a reason and write audit evidence.
- Verify invalid policy caps or open-cycle values are rejected with usable errors.
