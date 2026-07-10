# halaalvest

Bun and Turbo monorepo scaffold for `halaalvest`, a multi-tenant interest-free cooperative operations platform. Amanah is treated as a case-study tenant profile, not the product boundary.

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
bun run dev --remote-dev
bun run dev --prod
bun run dev -f web dashboard api
bun run lint
bun run typecheck
```

Development starters load the configured `DATABASE_URL` and run deployed Prisma migrations before launching the apps. The root `dev` command is a GND-style profile router:

- `bun run dev` uses the local profile and forwards to Turbo `dev`.
- `bun run dev --remote-dev` also loads `.env.remote-dev` and `.env.remote-dev.local` when present.
- `bun run dev --prod` loads production env files, requires a non-localhost production `DATABASE_URL`, and skips local prepare/migration.
- `bun run dev -f dashboard api` accepts Turbo filter aliases and bare package names such as `web`, `dashboard`, `api`, and `jobs`.

Configure your hosted development, remote-dev, staging, or production database in the existing env-loading flow before running dev commands.

Use a hosted PostgreSQL connection string such as:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/amanah_cooperative?sslmode=require
```

To run local dev against the production database, put the production `DATABASE_URL` in ignored file `.env.production.local`, then run:

```bash
bun run dev --prod
```

The production profile does not run migrations, and it refuses to run if `DATABASE_URL` still points at localhost.

## Portless

This repo includes `plot-keys`-style `portless` scripts for stable named `.localhost` URLs.

```bash
bun run dev -f web dashboard
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
