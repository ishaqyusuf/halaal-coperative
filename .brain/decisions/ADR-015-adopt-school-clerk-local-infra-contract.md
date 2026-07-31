# ADR-015: Adopt the School Clerk Local-Infra Contract

## Status

Accepted

## Date

2026-07-28

## Context

- Halaalvest maintained project-local copies of environment loading, dev routing, PostgreSQL startup, and application-port cleanup.
- School Clerk and GND use `/Users/M1PRO/Documents/code/local-infra-kit` as the shared implementation of those development contracts.
- Halaalvest used the tenant-specific local database name `amanah_cooperative` on port `55434`, while the initial shared PostgreSQL implementation assumed port `55432` and generated a profile-derived database URL.
- School Clerk already owns `55432`; forcing Halaalvest onto the same host port prevents both databases from running concurrently.

## Decision

- Use `local-infra-kit` with profile `halaalvest` for root and workspace development commands.
- Keep a Halaalvest-owned fail-closed launcher limited to making the standard mode file authoritative over Bun's implicit preload, validating the configured database URL and its parsed port ownership, and dispatching to the shared `dev.ts`, `dev-services.ts`, or `with-env.ts` entrypoint.
- Disable Bun's implicit env-file loading at toolkit entry points so the toolkit-selected mode remains authoritative.
- Use `.env.local`, `.env.preview`, and `.env.prod`, with `DATABASE_URL` as the database variable in every mode. The preview file overlays `.env.local` and must provide its own `DATABASE_URL`.
- Use `.env.local` `DATABASE_URL` as the sole local connection source, currently `127.0.0.1:55434/halaalvest`, and retain the existing `halaalvest-postgres-data` volume.
- Name the application ports `MARKETING_PORT` and `DASHBOARD_PORT`; reserve `PORTLESS_APP_PORT` for the value passed from each workspace script into Portless.
- Have `local-infra-kit` parse the URL and pass its port, database name, user, and password transiently to Docker Compose. Do not generate a URL or maintain a central project-port registry.
- Keep Prisma migration commands explicit instead of running migrations automatically during every development startup.
- Refuse to stop or overwrite another project's service when the configured local port is occupied.
- Route `db:sync` through the shared raw PostgreSQL engine. Production is the
  only source; local is the default destination, `--to-preview` explicitly
  authorizes preview, and production is never a destination. The engine owns
  schema preflight, FK ordering/cycle safety, incremental upserts, bounded
  opt-in static refresh, sequence advancement, and per-destination cursor state
  under `.local-db-sync/` without deleting destination-only rows.

## Consequences

- Dev routing, service readiness, environment loading, and port cleanup no longer drift from School Clerk.
- Halaalvest and School Clerk can run their Docker PostgreSQL services concurrently on host ports `55434` and `55432`.
- Preview and production development, database, and shell commands reject local URLs.
- Local startup refuses to recreate the Halaalvest container while another process owns the port parsed from `.env.local`.
- Existing local data was protected by a verified backup and the retained database was renamed in place from `amanah_cooperative` to `halaalvest` on 2026-07-29, aligning the volume with the environment-authoritative connection without a reset.
- Missing or mode-incompatible `DATABASE_URL` values fail closed rather than selecting an implicit database.
- A rollback may remove the root `db:sync` entrypoint without changing the
  database command or environment contract; cursor files are disposable local
  state and no schema rollback is required.

## Alternatives Considered

- Maintain a typed central registry of project database ports and credentials.
  - Rejected because it duplicates `.env.local`, creates drift, and couples every project-specific connection change to the shared toolkit.
- Retain the project-local database starter while adopting only the shared router.
  - Rejected because it would preserve duplicated infrastructure behavior.
