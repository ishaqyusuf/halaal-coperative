# API Permissions

## Purpose
This file documents who can do what across the platform.

## How To Use
- Update when roles or protected actions change.
- Keep permissions aligned with real enforcement in code.

## Initial Roles
- Super admin.
- Tenant admin.
- Finance officer.
- Operations officer.
- Member.

## Sensitive Actions
- Create or update charge definitions.
- Approve or reject loan requests.
- Mark repayments received.
- Publish dividend results.
- Export statements and reports.
- Configure cooperative rules.
- Resolve offline sync conflicts.

## Rules
- Members can view only their own financial records.
- Super admins can oversee platform-wide setup and tenant support workflows.
- Tenant admins and finance officers operate only within their tenant.
- Office staff may capture transactions subject to tenant-defined permissions.
- Dashboard navigation visibility currently uses shared role checks only; a more granular permission matrix is intentionally deferred.
- Procurement create permissions are role plus Operation Profile gated:
  - staff create requires a staff role and `procurement` access mode that allows staff create (`office_only` or `member_self_service`);
  - member self-service create requires member role and `procurement` access mode `member_self_service`;
  - `disabled` and `read_only` block new procurement creates while preserving existing-record reads.
- Foodstuff Purchase create permissions are role plus Operation Profile gated:
  - cycle creation and staff-created applications require a staff/finance role and `food_purchase` access mode that allows staff create (`office_only` or `member_self_service`);
  - member self-service applications require member role and `food_purchase` access mode `member_self_service`;
  - `disabled` and `read_only` block new Foodstuff Purchase cycles and applications while preserving existing cycles, applications, payments, and accounting evidence.
- Collection Source batch posting requires a finance-management dashboard role, live financial writes, and `collection_source_batch_posting` Operation Profile staff create access. Disabled/read-only modes hide the dashboard workflow and block staging, row updates, and posting in the DB layer.
- Member payment receipt submission requires `payment_receipts` Operation Profile member create access. Staff office capture remains staff-role gated through the dashboard action.
- Dashboard navigation, mobile member tiles, overview queues, and report export cards hide disabled service surfaces when there are no records or pending work to preserve.
- Highly sensitive actions should be audit logged.
- HTTP health routes are public.
- `tenantProcedure` in `apps/api/src/lib.trpc.ts` requires a signed-in session and active tenant context.
- Tenant-scoped tRPC routes should derive tenant context from request or session state, not untrusted payload input.
- Role checks should use shared role hierarchy helpers from `packages/auth` rather than app-local rank maps.
- Dashboard server context now drops a non-platform user if the resolved tenant does not match the user’s tenant, instead of allowing the route tree to proceed with a cross-tenant mismatch.
- Report exports remain limited to workspace admin roles through the shared report-export context gate.
