# ADR-005: Adopt Role-Filtered Dashboard Navigation Registry

## Status
Accepted

## Context
- The dashboard had a single scaffold page and no durable navigation structure for the next implementation phases.
- Upcoming work spans members, contributions, charges, loans, repayments, domains, tenant-site publishing, notifications, and settings.
- The user explicitly asked for a structure close to `midday` for route ownership and to the `gnd` site-nav links pattern for dashboard navigation.
- The current product only needs role-based routing and UI visibility, not a full permission matrix.

## Decision
- Adopt a role-filtered dashboard navigation registry inside `apps/dashboard/features/navigation/`.
- Keep the implementation local to the dashboard app instead of importing the external `gnd` package directly.
- Use a shared dashboard shell in `apps/dashboard/app/layout.tsx` that wraps all routes with a sidebar, a route-aware header, and role-aware filtering using shared helpers from `packages/auth`.
- Keep each route responsible for its own data loading so the shell remains presentation-focused and close to `midday`'s server-first route ownership.
- Use roles only for now: `super_admin`, `tenant_admin`, `finance_officer`, `operations_officer`, and `member`.

## Consequences
- New dashboard modules can be added by extending the registry and creating a route, without reworking layout architecture.
- Navigation visibility now stays consistent with shared role naming from `packages/auth`.
- The system is easier to evolve into deeper permissions later because route ownership and role filtering are now centralized.
- The dashboard app now has a clearer boundary between navigation architecture, page shell composition, and route-level data loading.

## Alternatives Considered
- Keep a single dashboard page and grow it with conditional sections.
  - Rejected because it would make the next operational phases harder to isolate and test.
- Import the `gnd` site-nav package directly.
  - Rejected because the repository needs a lighter local rebuild aligned to current dependencies and role model.
- Introduce a full permission matrix immediately.
  - Rejected because the current phase only needs role-based access and route organization.
