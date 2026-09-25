# Release Assurance

## Purpose

Declare and verify every Halalvest database, web, mobile, and jobs release
effect for Preview and Production.

## Release Graph

1. `database`: the Prisma schema directory under `packages/db/prisma`; hosted
   environments use the guarded push contract.
2. `dashboard-web`: the `halaalvest-dashboard` Vercel project, including the
   dashboard-hosted API; depends on `database`.
3. `marketing-web`: the `halaal-vest-marketing` Vercel project; depends on
   `database`.
4. `mobile`: Expo project `3fb3e5e2-bd84-4308-8739-e9f4436d0da9`; depends on
   `dashboard-web`. Native/config/package changes require a build. JS-only
   changes may use an update only when the runtime fingerprint is compatible.
5. `jobs`: Trigger.dev project `halaalvest-jobs`; depends on `database`.

## Commands

- `bun run release:plan --env preview|production --json`
- `bun run release:status --env preview|production --json`
- `bun run release:check --env preview|production` (protected CI only)

## Current State

Source integration and focused Preview/Production tests are complete. Live
activation remains pending the runbook prerequisites. Until then the protected
gate rejects missing signed evidence, while local status conservatively reports
all targets when no trusted baseline exists.
