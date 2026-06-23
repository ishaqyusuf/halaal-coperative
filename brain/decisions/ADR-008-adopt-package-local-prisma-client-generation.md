# ADR-008: Adopt Package-Local Prisma Client Generation

## Status
Accepted

## Context
- Vercel builds run package builds from a fresh install, so generated Prisma types must be produced before TypeScript checks the DB package.
- The previous setup generated into `@prisma/client`, which made source imports depend on install-time side effects and caused deploy-only type failures.
- The local `after-service` reference deploys reliably with Prisma 7's `prisma-client` generator outputting a package-local generated client.

## Decision
- Generate the Prisma client to `packages/db/generated/prisma`.
- Import Prisma types and `PrismaClient` from the package-local generated client inside `packages/db`.
- Run `bun run db:generate` before DB package build and typecheck.
- Treat `packages/db/generated` as a build artifact and ignore it in git.
- Register `generated/**` as a Turbo build output and expose the Vercel domain-management env vars through `turbo.json`.

## Consequences
- Fresh Vercel builds generate the DB client before TypeScript checks run.
- DB package source no longer depends on generated `@prisma/client` type exports.
- Generated files stay outside `src/`, reducing stale generated source drift.
- Local development must run `bun run --cwd packages/db db:generate` before direct DB package type work if generated output is missing.

## Alternatives Considered
- Keep `prisma-client-js` outputting into `@prisma/client`.
  - Rejected because it preserves the deploy fragility that caused the original failures.
- Commit generated client files.
  - Rejected because `after-service` treats them as build output and the build script can regenerate them deterministically.
