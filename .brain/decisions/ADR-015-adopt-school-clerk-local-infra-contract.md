# ADR-015: Adopt the School Clerk Local-Infra Contract

## Status

Accepted

## Date

2026-07-28

## Context

- Halaalvest maintained project-local copies of environment loading, dev routing, PostgreSQL startup, and application-port cleanup.
- School Clerk and GND use `/Users/M1PRO/Documents/code/local-infra-kit` as the shared implementation of those development contracts.
- Halaalvest used the tenant-specific local database name `amanah_cooperative` on port `55434`, while the shared PostgreSQL convention uses port `55432` and a profile-derived database name.

## Decision

- Use `local-infra-kit` with profile `halaalvest` for root and workspace development commands.
- Keep a Halaalvest-owned fail-closed launcher limited to making the standard mode file authoritative over Bun's implicit preload, validating that mode's database URL and port `55432` ownership, and dispatching to the shared `dev.ts`, `dev-services.ts`, or `with-env.ts` entrypoint.
- Disable Bun's implicit env-file loading at toolkit entry points so the toolkit-selected mode remains authoritative.
- Use `.env.local`, `.env.remote.local`, and `.env.prod`, with `DATABASE_URL` as the database variable in every mode.
- Standardize local PostgreSQL to `127.0.0.1:55432/halaalvest` and retain the existing `halaalvest-postgres-data` volume.
- Keep Prisma migration commands explicit instead of running migrations automatically during every development startup.
- Refuse to stop or overwrite another project's service when port `55432` is occupied.

## Consequences

- Dev routing, service readiness, environment loading, and port cleanup no longer drift from School Clerk.
- Halaalvest and School Clerk cannot run their Docker PostgreSQL services concurrently on the same host.
- Remote and production development, database, and shell commands reject local URLs.
- Local startup refuses to recreate the Halaalvest container while another process owns port `55432`.
- Existing local data requires a verified backup and database rename before the standardized container can start.
- The current live cutover remains pending until `school-clerk-postgres` releases port `55432`.

## Alternatives Considered

- Extend `local-infra-kit` to support Halaalvest's existing port `55434`.
  - Rejected to keep Halaalvest on the same standard contract as School Clerk without changing the toolkit.
- Retain the project-local database starter while adopting only the shared router.
  - Rejected because it would preserve duplicated infrastructure behavior.
