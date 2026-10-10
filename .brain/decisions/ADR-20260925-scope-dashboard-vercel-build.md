# ADR: Build the dashboard Vercel project without the workspace Turbo cycle

Status: Accepted for the dashboard project, 25 September 2026.

## Context

The dashboard Vercel project has `apps/dashboard` as its root. Vercel's default Turborepo build traverses the existing `@halaalvest/auth` ↔ `@halaalvest/db` build-task cycle. The dashboard itself can build directly once Prisma's generated client exists.

## Decision

Use `apps/dashboard/vercel.json` to generate the Prisma client with a syntactically valid, nonconnecting `preview-build.invalid` URL scoped only to that generation command, then run the dashboard's own `bun run build`. The placeholder is not a deployment database connection string and must never replace the target-specific `HALAALVEST_DATABASE_URL` runtime secret. Use a bounded source-only deployment input while the main checkout contains large generated Next/native artifacts; exclude dotenv files, secrets and build outputs. Keep Preview protected and QA/private uploads disabled until the shared Neon role is rotated, the Preview schema is reconciled and target settings are verified.

## Verification and limits

Protected Preview deployment `dpl_H5E4DpHJpELAwuhXMx1r3GUytsKQ` was Ready after a 7.8 MB source archive upload. Vercel generated Prisma Client 7.7.0, compiled Next.js, passed TypeScript and generated 89 pages including `/api/trpc/[...trpc]`. Authenticated read-only checks rendered `/login`, returned `available=false`/zero documents from `legal.current`, and denied unauthenticated `accountPrivacy.notice` with `UNAUTHORIZED`/HTTP 401. The Preview environment name list lacks `HALAALVEST_DATABASE_URL`, `APP_ENV`, QA accelerator settings, and upload enable/signing settings. Current Prisma runtime ignores the legacy `DATABASE_URL` entry. No Neon connection, real-data operation, upload, email, signed-device QA or Production promotion was attempted. This is build and no-data routing evidence, not an isolated working backend.
