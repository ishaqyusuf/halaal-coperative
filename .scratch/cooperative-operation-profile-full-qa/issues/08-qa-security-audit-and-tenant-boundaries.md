# QA Security Audit And Tenant Boundaries

**Type:** task
**Status:** ready-for-agent

**Blocked by:** QA Staff Service Workspaces And Server Guards

## Question

Are Operation Profile changes and guarded service actions tenant-scoped, role-scoped, and audit-logged with enough evidence to trust finance operations?

## Acceptance Criteria

- Verify only tenant admins/super admins can update Operation Profile service activation/access.
- Verify staff/member create attempts cannot bypass service modes through API/server actions.
- Verify cross-tenant IDs for members, sources, requests, cycles, applications, and batch rows are rejected.
- Verify audit logs capture Operation Profile changes, restrictive-change reasons, source assignment changes, batch staging, row updates, and posting.
- Verify member users cannot see staff-only service controls or another member's records.
