# ADR-003: Align App, API, Domain, and Notifications Architecture With `plot-keys`

## Status
Accepted

## Date
2026-04-13

## Context
This project will reuse architectural and coding patterns from the local `plot-keys` repository. The requested scope is the same top-level product split: a SaaS marketing app, a tenant dashboard, a tenant public website, and a shared API. The project should also keep domain logic in shared packages and use the same notification-system shape rather than recreating app-specific versions.

## Decision
- Align top-level apps to `apps/web`, `apps/dashboard`, `apps/tenant-site`, and `apps/api`.
- Use a Hono + tRPC API foundation in `apps/api`, with grouped routers and shared request context.
- Keep business rules in `packages/domain`, with apps consuming domain outputs instead of embedding domain logic.
- Introduce `packages/notifications` for shared notification types and store primitives.
- Introduce `packages/notifications-react` as the React adapter used by web surfaces.
- Treat `plot-keys` as the reference implementation for these boundaries and patterns, while keeping Amanah-specific cooperative domain rules in local packages.

## Consequences
- Future feature work has a clear place to live across marketing, dashboard, tenant-site, API, domain, and notifications layers.
- API and app composition now match a proven local reference instead of evolving ad hoc.
- New dependencies and setup work are required for Hono, tRPC, and the shared notification stack.
- Further feature implementation should continue to mirror `plot-keys` package boundaries where they fit Amanah's cooperative product.

## Alternatives Considered
- Keep a single `apps/web` surface and grow it into multiple roles over time.
- Use a custom API layer without the Hono + tRPC structure used in `plot-keys`.
- Build per-app notification utilities instead of shared notification packages.
