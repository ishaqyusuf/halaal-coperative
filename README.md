# halaal-vest

Bun and Turbo monorepo scaffold for `halaal-vest`, a multi-tenant halal cooperative operations platform. Amanah is treated as a case-study tenant profile, not the product boundary.

## Workspace

- `apps/web`: Next.js SaaS marketing experience.
- `apps/dashboard`: Next.js tenant dashboard.
- `apps/tenant-site`: Next.js tenant public website surface.
- `apps/api`: Hono + tRPC backend for tenant-aware workflows.
- `packages/ui`: shared shadcn/base UI components and theme tokens.
- `packages/domain`: cooperative business rules and dashboard snapshots.
- `packages/db`: database-facing record and repository scaffolds.
- `packages/auth`: role and approval guard helpers.
- `packages/utils`: shared formatting plus tenant host/domain resolution helpers.
- `packages/notifications`: shared notification definitions and dispatch primitives.
- `packages/notifications-react`: React notification adapter for app surfaces.
- `packages/eslint-config`: shared ESLint rules.
- `packages/tsconfig`: shared TypeScript presets.

## Commands

```bash
bun install
bun run dev
bun run dev:portless
bun run lint
bun run typecheck
```

## Portless

This repo includes `plot-keys`-style `portless` scripts for stable named `.localhost` URLs.

```bash
bun run dev:portless
bun run dev:dashboard:portless
bun run dev:web:portless
bun run dev:tenant-site:portless
bun run dev:api:portless
```

Install the CLI once if needed:

```bash
npm install -g portless
```

## Adding Components

From the repository root, use the same preset family already installed here:

```bash
bunx --bun shadcn@latest add button -c apps/web
```
