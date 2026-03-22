# Project Index

## Purpose
This file is a fast map of the repository so contributors can quickly find important code and documentation.

## How To Use
- Update this when new major app folders, packages, or services are added.
- Keep entries short and practical.

## Current Repository Map

### Apps
- `apps/api/`: Hono + tRPC backend API server.
- `apps/web/`: Next.js public-facing web application.
- `apps/dashboard/`: Next.js admin dashboard for cooperative management.

### Packages
- `packages/tsconfig/`: shared TypeScript configurations (base, Next.js).
- `packages/db/`: Prisma schema, migrations, and data access utilities.
- `packages/auth/`: authentication utilities and session management.
- `packages/jobs/`: background job handlers (repayments, reminders, etc.).
- `packages/notifications/`: notification triggers and delivery logic.
- `packages/email/`: email templates and sending utilities.

### Documentation
- `brain/`: project memory and planning system.

## Tooling
- **Package Manager**: Bun (workspaces)
- **Build Orchestration**: Turborepo
- **Code Quality**: Biome (formatting + linting)
- **Database**: PostgreSQL (Docker Compose for local dev)
- **Package Namespace**: `@halalcoop/*`

## Notes
- Keep this document synchronized with real folder structure, not aspirational structure alone.
