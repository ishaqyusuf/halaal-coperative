# ADR-017: Use a Profile-Specific Database URL

## Status

Accepted

## Date

2026-08-03

## Context

- Halaalvest projects need to consume shared Vercel environments without a generic database variable colliding with another project.
- Prisma and application runtime code must have one unambiguous production database variable.
- Other repositories already depend on the shared local-infra toolkit's legacy `DATABASE_URL` contract.

## Decision

- Halaalvest uses `HALAALVEST_DATABASE_URL` exclusively in Prisma, runtime code, jobs, and every selected mode file.
- Halaalvest does not fall back to `DATABASE_URL`.
- The shared local-infra toolkit derives `<PROFILE>_DATABASE_URL` from `--profile`, resolves it before `DATABASE_URL`, and retains the legacy key only for unmigrated projects.
- Local-infra uses the resolved URL for safety checks and Docker settings without manufacturing a `DATABASE_URL` alias for a profile-specific configuration.
- Both candidate keys are pinned to the selected mode file so inherited shell or Bun values cannot cross environment boundaries.

## Consequences

- Production database selection is explicit and project-scoped.
- Halaalvest deployments must define `HALAALVEST_DATABASE_URL`; a generic `DATABASE_URL` is intentionally ignored.
- Existing local-infra consumers remain operational until they choose to migrate.
- No Prisma schema or data migration is required.
