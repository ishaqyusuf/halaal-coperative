# QA Mobile Operation Profile Behavior

**Type:** task
**Status:** ready-for-agent

**Blocked by:** Establish QA Environment And Data Readiness

## Question

Do mobile API DTOs and mobile screens respect Operation Profile service modes for member service tiles, More sections, receipt submission, procurement requests, and Foodstuff Purchase applications?

## Acceptance Criteria

- Run mobile/API tests that cover Operation Profile DTO behavior.
- Smoke mobile member home services and More sections for enabled, disabled, office-managed, self-service, and read-only states.
- Verify mobile receipt, procurement, and Foodstuff Purchase submit actions hide or block consistently with web.
- Verify existing history remains visible when services are read-only or disabled with records.
- Decide whether native simulator/device QA is required for this feature or whether API/screen smoke is enough, and record evidence.
