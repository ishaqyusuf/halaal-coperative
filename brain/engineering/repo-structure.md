# Repo Structure

## Purpose
This file documents how the repository is organized and what belongs where.

## How To Use
- Update when introducing new top-level folders or packages.
- Keep examples aligned with the real repository.

## Current Structure
```
halaal-coperative/
├── apps/
│   ├── api/            # Hono + tRPC backend API server
│   ├── web/            # TanStack Start public web application
│   └── dashboard/      # TanStack Start admin dashboard
├── packages/
│   ├── tsconfig/       # Shared TypeScript configurations
│   ├── db/             # Prisma schema, migrations, data access
│   ├── auth/           # Authentication and session management
│   ├── jobs/           # Background job handlers
│   ├── notifications/  # Notification triggers and delivery
│   └── email/          # Email templates and sending
├── brain/              # Documentation and project memory
├── package.json        # Root workspace configuration
├── turbo.json          # Turborepo task orchestration
├── tsconfig.json       # Root TypeScript config
├── biome.json          # Code formatting and linting
└── docker-compose.yml  # Local PostgreSQL database
```

## Tooling
- **Package Manager**: Bun with workspaces (`apps/*`, `packages/*`)
- **Build Orchestration**: Turborepo
- **Code Quality**: Biome
- **Package Namespace**: `@halalcoop/*`

## Organization Principles
- Keep financial domain logic out of presentation layers.
- Avoid circular dependencies between packages.
- Co-locate tests with the units they verify when practical.
