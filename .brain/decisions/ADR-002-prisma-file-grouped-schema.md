# ADR-002: Prisma With File-Grouped Schema In `packages/db`

## Status
Accepted

## Date
2026-04-10

## Context
The project needed a real relational schema for tenants, members, contributions, loans, charges, ledger entries, offline sync, and auditability. The schema is large enough that a single Prisma file would become hard to navigate and maintain quickly.

## Decision
- Adopt Prisma 7 for the database ORM in `packages/db`.
- Use Prisma's folder-based schema loading with `schema: "prisma"` in `prisma.config.ts`.
- Keep `prisma/schema.prisma` limited to datasource and generator configuration.
- Group schema files by domain under `prisma/models/` and `prisma/enums/`.

## Consequences
- The schema is easier to evolve by business area without turning into one massive file.
- Domain boundaries in the database layer now mirror the application package boundaries more closely.
- Migration generation and validation require the Prisma config and grouped schema layout to stay consistent.
- The next step is to generate the first migration and replace temporary DB seed helpers with real Prisma queries.
