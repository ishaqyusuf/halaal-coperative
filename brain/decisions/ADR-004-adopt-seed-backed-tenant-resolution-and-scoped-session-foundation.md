# ADR-004: Adopt Seed-Backed Tenant Resolution and Scoped Session Foundation

## Status
Accepted

## Date
2026-04-13

## Context
The platform needs real multi-tenant request handling before feature modules can be implemented safely. However, Prisma generation and live database query execution are not fully wired yet. Waiting for the full data layer before structuring tenant resolution, session scope, and repository ownership would create avoidable rework inside the API and apps.

## Decision
- Move tenant, domain, user, and membership lookup ownership into `packages/db/src/queries`.
- Introduce `packages/db/src/runtime.ts` so the application can distinguish between `seed-only` and `database-configured` modes.
- Add shared session-scope and role helpers in `packages/auth`.
- Resolve tenant context in API request composition from forwarded subdomain/hostname headers and repository lookups.
- Keep the temporary data source seed-backed until Prisma generation and migrations are fully operational.

## Consequences
- API and apps can now be written against stable multi-tenant boundaries without waiting for the final Prisma runtime.
- Replacing the seed layer with real Prisma queries later should be a data-source swap rather than an API/context redesign.
- The codebase temporarily contains a transitional repository layer that does not yet persist to the real database.

## Alternatives Considered
- Keep the original single-file demo DB helper until Prisma runtime work begins.
- Delay tenant resolution and scoped sessions until after migrations and live DB access are finished.
