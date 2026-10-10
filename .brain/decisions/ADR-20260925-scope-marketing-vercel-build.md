# ADR: Build the marketing Vercel project without the workspace Turbo cycle

Status: Accepted for the marketing project, 25 September 2026.

## Context

Vercel's inferred `turbo run build` fails before compiling marketing because `@halaalvest/auth#build` and `@halaalvest/db#build` form a build-task cycle. The marketing app can compile directly once Prisma's generated client exists. The Vercel project root is `apps/marketing`.

## Decision

Set `apps/marketing/vercel.json` to run Prisma client generation in `packages/db`, then `bun run build` for marketing. The `preview-build.invalid` PostgreSQL URL is scoped to the generate command solely because Prisma config requires a syntactically valid URL; generation does not connect to a database. It is not a Preview or Production runtime database setting. Keep `HALAALVEST_DATABASE_URL` target-specific in the deployment environment before any database-backed QA. The marketing build must not depend on the cyclic workspace-wide Turbo build.

Package Vercel CLI uploads from a source-only copy while the main checkout contains generated native and Next build artifacts. The tested copy contained 2,673 files including `vercel.json` and uploaded as a 7.8 MB archive. This copy is a deployment input, not a branch or a substitute for tracked source. Do not upload local dotenv files, build caches, native outputs or credentials.

## Verification and limits

The first Preview deployment `dpl_CjYsGL6vgfxiKSAEX97vxueq3j6x` failed on the Turbo cycle. The scoped build in Preview deployment `dpl_9BVD5rwyi1knakxdbZbjP6wrkFWw` generated Prisma Client 7.7.0, compiled Next.js, passed TypeScript and produced all six dynamic policy routes. Vercel reports Preview/Ready. Authenticated HTTP checks returned the six draft pages with `noindex, follow`, the verification page with `noindex, nofollow`, and `/api/legal` with no available documents or acceptance requirement. The deployment remains Vercel-protected. This does not approve the policies, prove deletion email delivery or alter the Production domain.

The follow-up Preview deployment `dpl_3pJLzTHwDBCiz18TJmEeQ7JUSBFH` also built and is Ready after the deletion page gained a configuration-gated unavailable state. Authenticated checks confirmed the six draft routes remain noindex and `/api/legal` remains empty. The deletion page does not render its email form while the Preview target lacks required settings. No email or database action was attempted.
