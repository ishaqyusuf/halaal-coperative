# halaalvest

Bun and Turbo monorepo scaffold for `halaalvest`, a multi-tenant interest-free cooperative operations platform. Amanah is treated as a case-study tenant profile, not the product boundary.

## Workspace

- `apps/marketing`: Next.js SaaS marketing experience.
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
bun run dev --preview
bun run dev --prod
bun run db:start
bun run db:migrate
bun run db:migrate --preview
bun run db:migrate --prod
bun run dev -f marketing dashboard api
bun run lint
bun run typecheck
```

Development commands use the shared `local-infra-kit` profile router:

- `bun run dev` loads `.env.local`, starts the local Docker PostgreSQL service, and forwards to Turbo `dev`.
- `bun run dev --preview` overlays `.env.preview` and uses the hosted preview database without starting local PostgreSQL.
- `bun run dev --prod` loads `.env.prod` and runs the production-profile development task.
- `bun run dev -f dashboard api` accepts Turbo filter aliases and bare package names such as `marketing`, `dashboard`, `api`, and `jobs`.

The local profile uses the exact `DATABASE_URL` from `.env.local`, currently
`127.0.0.1:55434/halaalvest`. The shared toolkit parses that URL and passes its
port, database name, user, and password to Docker Compose for the startup
process. Run only the database with:

```bash
bun run db:start
```

School Clerk remains on `55432`, so both PostgreSQL containers can run
concurrently. Halaalvest checks ownership of the port parsed from `.env.local`
before dispatching to the shared toolkit and fails clearly rather than stopping
another project's database. Preview and production modes likewise reject local
database URLs before starting any service.

Database migrations are explicit and are not applied automatically during `bun run dev`:

```bash
bun run db:migrate
bun run db:migrate --preview
bun run db:migrate --prod
```

Generate, migrate, pull, push, studio, and shell each use one command with an optional mode flag: no flag (or `--local`) selects local development, `--preview` selects hosted preview, and `--prod` selects production. `bun run db:sync` defaults to production → local; `--from-local --to-preview` publishes local data to preview, and `--to-prod` is never accepted.

## Environment modes

Use the same application-facing variable names in each mode:

```txt
.env.local         local development
.env.preview       preview overrides loaded over .env.local
.env.prod          production
```

Each mode uses `DATABASE_URL`; legacy profile-specific database URL aliases,
generated connection fallbacks, and central port registries are not part of the
contract.

## Portless

This repo uses `plot-keys`-style `portless` hostnames by default in app dev scripts. Use the normal `dev` router and filters:

```bash
bun run dev
bun run dev -f marketing dashboard
bun run dev -f api
```

Install the CLI once if needed:

```bash
npm install -g portless
```

## Adding Components

From the repository root, use the same preset family already installed here:

```bash
bunx --bun shadcn@latest add button -c apps/marketing
```
