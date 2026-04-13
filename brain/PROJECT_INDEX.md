# Project Index

## Purpose
This file is a fast map of the repository so contributors can quickly find important code and documentation.

## How To Use
- Update this when new major app folders, packages, or services are added.
- Keep entries short and practical.

## Current Repository Map
- `brain/`: project memory and planning system.
- `apps/web/`: Next.js SaaS marketing application.
- `apps/dashboard/`: Next.js tenant dashboard application for authenticated internal workflows.
- `apps/tenant-site/`: Next.js tenant public website surface.
- `apps/api/`: Hono + tRPC backend foundation following the same structural standard used in `plot-keys`.
- `packages/auth/`: cooperative roles and approval guard helpers.
- `packages/db/`: seed record scaffolds and future repository layer.
- `packages/domain/`: shared cooperative rules, policies, and dashboard snapshot builders, intended to stay app-agnostic like the domain layer in `plot-keys`.
- `packages/notifications/`: shared notification types, in-memory store, and service primitives.
- `packages/notifications-react/`: React adapter for rendering shared notification events in web surfaces.
- `scripts/with-workspace-env.mjs`: shared environment bootstrap for root and workspace commands, including portless-based dev flows.
- `packages/eslint-config/`: shared lint configuration for apps and packages.
- `packages/tsconfig/`: shared TypeScript presets for Next.js and workspace packages.
- `packages/ui/`: shared shadcn/base UI components, styling tokens, and utilities.
- `packages/utils/`: shared formatting and low-level utilities.

## Notes
- The repository is now intentionally aligned to the `plot-keys` multi-surface shape: marketing app, dashboard app, tenant site, and shared API.
- Keep this document synchronized with real folder structure, not aspirational structure alone.
