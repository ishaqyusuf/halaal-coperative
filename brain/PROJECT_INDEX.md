# Project Index

## Purpose
This file is a fast map of the repository so contributors can quickly find important code and documentation.

## How To Use
- Update this when new major app folders, packages, or services are added.
- Keep entries short and practical.

## Current Repository Map
- `brain/`: project memory and planning system.
- `apps/web/`: Next.js SaaS marketing application.
- `apps/web/src/app/`: main marketing route entrypoints for launch and pre-launch rendering.
- `apps/web/src/lib/marketing-config.ts`: server-side env-driven switch for launch versus pre-launch marketing modes.
- `apps/web/src/components/marketing/`: launch and pre-launch landing page sections for the public marketing surface.
- `apps/dashboard/`: Next.js tenant dashboard application for authenticated internal workflows.
- `apps/tenant-site/`: Next.js tenant public website surface.
- `apps/api/`: Hono + tRPC backend foundation following the same structural standard used in `plot-keys`.
- `apps/dashboard/lib/server-context.ts`: server-side tenant, membership, and session loader for dashboard pages.
- `apps/api/src/routers/onboarding.route.ts`: tenant onboarding status and workspace bootstrap route.
- `apps/tenant-site/lib/server-context.ts`: server-side tenant loader for tenant public pages.
- `packages/auth/`: cooperative roles and approval guard helpers.
- `packages/db/`: tenant, domain, user, and membership repository scaffolding plus runtime boundaries for the future Prisma-backed data layer.
- `packages/domain/`: shared cooperative rules, platform identity, policies, finance helpers, and dashboard builders, intended to stay app-agnostic like the domain layer in `plot-keys`.
- `packages/notifications/`: shared notification types, in-memory store, and service primitives.
- `packages/notifications-react/`: React adapter for rendering shared notification events in web surfaces.
- `scripts/with-workspace-env.mjs`: shared environment bootstrap for root and workspace commands, including portless-based dev flows.
- `packages/eslint-config/`: shared lint configuration for apps and packages.
- `packages/tsconfig/`: shared TypeScript presets for Next.js and workspace packages.
- `packages/ui/`: shared shadcn/base UI components, styling tokens, and utilities.
- `packages/utils/`: shared formatting and low-level utilities.
- `packages/db/src/queries/`: tenant, domain, user, and membership repository scaffolding.
- `packages/db/src/queries/onboarding.ts`: tenant workspace bootstrap and onboarding progress query module.
- `packages/db/src/prisma.ts`: optional Prisma 7 runtime singleton using the Postgres driver adapter when `DATABASE_URL` is configured.
- `packages/domain/src/modules/`: platform, policy, finance, product, and dashboard modules.

## Notes
- The repository is now intentionally aligned to the `plot-keys` multi-surface shape: marketing app, dashboard app, tenant site, and shared API.
- Keep this document synchronized with real folder structure, not aspirational structure alone.
