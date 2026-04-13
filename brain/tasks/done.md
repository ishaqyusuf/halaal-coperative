# Done

## Purpose
This file records completed work and important outcomes.

## How To Use
- Add a dated note when meaningful work completes.
- Prefer concise outcomes over long narratives.

## Completed
- 2026-03-21: Initialized Project Brain scaffold for the cooperative savings and loans SaaS repository, including system, product, engineering, database, API, task, and template documentation.
- 2026-04-10: Scaffolded the application codebase as a Bun and Turbo monorepo with `apps/web`, `apps/api`, and shared `auth`, `db`, `domain`, `ui`, `utils`, `eslint-config`, and `tsconfig` packages. Added a Next.js dashboard shell, sample domain scaffolds, and synchronized Brain documentation.
- 2026-04-10: Implemented a full Prisma 7 cooperative schema in `packages/db` using a file-grouped layout for enums and models, then validated the schema successfully with Prisma.
- 2026-04-13: Re-scoped the product as a generic cooperative SaaS platform, aligned the multi-app architecture to `plot-keys`, and added tenant host resolution, Next proxy entry points, and `portless` local named-host support.
- 2026-04-13: Completed phases 1-5 foundation work with seed-backed tenant resolution, scoped session/auth helpers, DB query ownership scaffolding, platform identity modules, and shared domain modules.
- 2026-04-13: Completed phase 6 bridge work by generating the Prisma client, adding an optional Prisma runtime adapter, and wiring dashboard and tenant-site pages to server-side tenant context loaders.
- 2026-04-13: Verified Phase 7.7 as complete for the DB-backed runtime path: `apps/api/src/routers/workspace.route.ts` now uses repository-backed dashboard metrics when the database is configured, with seed-mode fallback kept for local scaffold operation.
- 2026-04-13: Completed Phase 8 by adding tenant onboarding bootstrap queries in `packages/db/src/queries/onboarding.ts`, exposing `trpc/onboarding.status` and `trpc/onboarding.bootstrap`, and surfacing onboarding progress plus routing defaults in the dashboard.
- 2026-04-13: Redesigned the main `apps/web` landing page, added a distinct pre-launch variant, and introduced `HALAAL_VEST_MARKETING_STAGE` to switch between pre-launch and launch marketing states without changing routes.
