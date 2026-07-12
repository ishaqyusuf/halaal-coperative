# QA Staff Service Workspaces And Server Guards

**Type:** task
**Status:** ready-for-agent

**Blocked by:** QA Getting Started And Settings Operation Profile

## Question

Do staff workspaces and server actions enforce Operation Profile modes for procurement, Foodstuff Purchase, payment receipts, Collection Sources, and Collection Source batch posting while preserving existing records?

## Acceptance Criteria

- Test staff create visibility and server rejection for `disabled`, `office_only`, `member_self_service`, and `read_only`.
- Verify procurement active-obligation cap and active-financing blocking behavior.
- Verify Foodstuff Purchase open-cycle and active-obligation cap behavior.
- Verify staff payment receipt capture remains available where intended and product-specific allocation categories follow service state plus payable obligations.
- Verify member Collection Source assignment is visible only when enabled and rejects inactive/cross-tenant sources.
- Verify Collection Source batch staging, row update, exception, partial post, duplicate prevention, and audit evidence.
