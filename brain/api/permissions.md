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
- Highly sensitive actions should be audit logged.
- HTTP health routes are public.
- `tenantProcedure` in `apps/api/src/lib.trpc.ts` requires a signed-in session and active tenant context.
- Tenant-scoped tRPC routes should derive tenant context from request or session state, not untrusted payload input.
- Role checks should use shared role hierarchy helpers from `packages/auth` rather than app-local rank maps.
- Dashboard server context now drops a non-platform user if the resolved tenant does not match the user’s tenant, instead of allowing the route tree to proceed with a cross-tenant mismatch.
- Report exports remain limited to workspace admin roles through the shared report-export context gate.
