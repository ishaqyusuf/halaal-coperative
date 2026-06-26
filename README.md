# halaalvest

Bun and Turbo monorepo scaffold for `halaalvest`, a multi-tenant halal cooperative operations platform. Amanah is treated as a case-study tenant profile, not the product boundary.

## Workspace

- `apps/web`: Next.js SaaS marketing experience.
- `apps/dashboard`: Next.js tenant application serving the public tenant homepage, shared login, and protected `/app` workspace on the same host.
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
bun run dev:prod
bun run lint
bun run typecheck
```

Development starters automatically start the local PostgreSQL container and wait until it accepts connections before launching the apps. Docker Desktop or another Docker-compatible daemon with Compose must be available.

To start only the database:

```bash
bun run db:start
```

The local database uses `localhost:5432`, database `amanah_cooperative`, and a persistent Docker volume. If startup fails, inspect the service with:

```bash
docker compose logs postgres
```

To run local dev against the production database, put the production `DATABASE_URL` in ignored file `.env.production.local`, then run:

```bash
bun run dev:prod
```

`dev:prod` does not start the local database or run migrations, and it refuses to run if `DATABASE_URL` still points at localhost.

## Portless

This repo includes `plot-keys`-style `portless` scripts for stable named `.localhost` URLs.

```bash
bun run dev:portless
bun run dev:dashboard:portless
bun run dev:web:portless
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
