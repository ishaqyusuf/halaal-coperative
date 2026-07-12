# QA Member Web Portal Service Visibility And Actions

**Type:** task
**Status:** ready-for-agent

**Blocked by:** QA Getting Started And Settings Operation Profile

## Question

Does the member web portal show the right services, history, and create actions for each Operation Profile mode without exposing staff-only behavior or hiding existing obligations?

## Acceptance Criteria

- Test member navigation and dashboard cards across disabled, office-managed, member-self-service, and read-only services.
- Verify member procurement and Foodstuff Purchase create forms appear only for member-self-service.
- Verify member payment receipt submission appears only when receipt self-service is enabled.
- Verify office-managed/read-only services still show member history when records exist.
- Verify existing payable procurement/Foodstuff obligations remain settlement-visible after new requests are closed.
- Check empty states and blocked-state copy for clarity.
