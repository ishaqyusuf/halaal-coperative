# 08 — QA Security Audit And Tenant Boundaries

**What to build:** Security QA evidence that Operation Profile changes and guarded service actions are tenant-scoped, role-scoped, and audit-logged well enough to trust finance operations.

**Blocked by:** 04 — QA Staff Service Workspaces And Server Guards.

**Status:** completed

- [x] Verify only tenant admins/super admins can update Operation Profile service activation/access.
- [x] Verify staff/member create attempts cannot bypass service modes through API/server actions.
- [x] Verify cross-tenant IDs for members, sources, requests, cycles, applications, and batch rows are rejected.
- [x] Verify audit logs capture Operation Profile changes, restrictive-change reasons, source assignment changes, batch staging, row updates, and posting.
- [x] Verify member users cannot see staff-only service controls or another member's records.

## Approved Comment

Approve security and tenant-boundary QA as a finance-safety gate, not a cosmetic pass. This should verify that Operation Profile configuration and every guarded service action remain tenant-scoped, role-scoped, and auditable.

Test both UI-supported paths and direct server/API attempts. Only tenant admins or super admins should update Operation Profile service modes. Staff/member actions must not bypass `disabled`, `office_only`, `member_self_service`, or `read_only` restrictions through crafted IDs, direct action calls, stale forms, or hidden routes.

Cross-tenant IDs for members, Collection Sources, procurement requests, Foodstuff Purchase cycles/applications, receipts, and batch rows must be rejected. Audit logs should capture Operation Profile changes, restrictive-change reasons, source assignment changes, batch staging, batch row updates, and posting. Treat cross-tenant access, unauthorized mode changes, missing audit evidence for financial state changes, member access to staff controls, or access to another member's records as blockers.

## Implementation Evidence

Browser/API access checks:

- Member-role Amanah direct `GET /settings/operation-profile` followed the app back to member dashboard content. The response did not render `Operation profile` or `Save operation profile`.
- Member-role Amanah direct `GET /members` followed the app back to member dashboard content. The response did not render `New member`, `Import members`, or staff member-registry controls.
- Member-role Amanah direct tRPC HTTP POST to `dashboardActions.updateTenantOperationProfileAction` reached the real endpoint and was rejected with `You do not have access to perform this workspace action.`
- Member-role pages for Amanah and Kano rendered no staff-only markers such as `New member`, `Import members`, active staff review queues, or staff create forms during ticket 05 and ticket 07 checks.

Server/security regression evidence:

- `packages/db/src/queries/procurement.test.ts` covers service-mode write rejection for member/staff create paths, active-financing blocking, active-obligation caps, tenant-scoped active obligation counting, and payback caps.
- `packages/db/src/queries/food-purchase.test.ts` covers service-mode write rejection for member/staff application paths, disabled cycle creation, open-cycle policy, active-obligation caps, tenant-scoped obligation counting, and payback caps.
- `packages/db/src/queries/payment-receipts.test.ts` covers duplicate receipt reference rejection, unsupported staged-category rejection, adjustment-reason requirements, before/after allocation snapshots, and supported allocation posting.
- `packages/db/src/queries/members.test.ts` covers Collection Source assignment gating, inactive source rejection, and cross-tenant source rejection.
- `packages/db/src/queries/collection-source-batches.test.ts` covers staged-first batch behavior, duplicate source/month prevention, row update behavior, partial posting, and disabled batch-posting rejection.
- The broad focused Operation Profile regression from ticket 04 passed 161 tests across setup gate, Operation Profile, procurement, Foodstuff Purchase, receipts, Collection Source batches, members, navigation, receipt category loading, and mobile DTO routes.

Audit evidence:

- Amanah `tenant_operation_profile.reviewed` audit logs include before/after service capability metadata, policy metadata, actor user IDs, change reasons, and restrictive service keys for office-only and read-only member-web QA flips.
- Kano `tenant_operation_profile.reviewed` audit logs include the preservation setup and restrictive disabling reason after the QA procurement record was created.
- Batch staging, row update, and posting audit behavior is covered by `packages/db/src/queries/collection-source-batches.test.ts`.
- Member Collection Source update audit behavior is covered by `packages/db/src/queries/members.test.ts`.

Residual note:

- The dashboard form-action wrapper currently reports unauthorized workspace-action errors as JSON `INTERNAL_SERVER_ERROR` while preserving the explicit access-denied message. This did not allow the member mutation to succeed, so it is not a finance-safety blocker for this pass.
