# Tech Stack

## Purpose

This file tracks chosen and proposed technologies for the platform.

## How To Use

- Mark decisions as proposed or adopted.
- Update whenever a stack decision becomes durable.

## Current Status

- Application scaffold implemented as a Bun and Turbo monorepo.
- Frontend scaffold implemented with Next.js App Router across `apps/marketing` and the host-aware tenant app in `apps/dashboard`.
- Shared UI scaffold implemented with shadcn/base components in `packages/ui`.
- Shared package boundaries established for `auth`, `db`, `domain`, `notifications`, `notifications-react`, and `utils`.

## Adopted Stack

- Workspace/package manager: Bun workspaces.
- Monorepo orchestration: Turbo.
- Frontend: Next.js 16 App Router.
- Backend HTTP framework: Hono.
- API contract layer: tRPC with `superjson`.
- Local development infrastructure: the sibling `local-infra-kit` owns the standard dev router, mode-based env loading, application-port cleanup, Docker service readiness, and Portless startup (`bun run dev`, `bun run dev --remote-dev`, `bun run dev -f dashboard api`).
- Styling: Tailwind CSS v4 plus shadcn/base preset styling.
- Shared UI primitives: `@halaalvest/ui`.
- Shared notifications core: `@halaalvest/notifications`.
- Shared React notifications adapter: `@halaalvest/notifications-react`.
- Linting: ESLint with shared workspace config.
- Formatting: Prettier with Tailwind plugin.
- TypeScript sharing: `@halaalvest/tsconfig`.
- Database ORM: Prisma 7 with a file-grouped schema layout in `packages/db/prisma` and a package-local generated client in `packages/db/generated/prisma`.
- Mobile: Expo Router app in `apps/mobile` with EAS build/update scripts for development and preview Android artifacts, an Expo Updates management screen, preview auto-update checks on launch and foreground resume, and Expo project identity supplied by `HALAALVEST_EXPO_PROJECT_ID`, `EXPO_PROJECT_ID`, or `EAS_PROJECT_ID`. The Halaalvest Expo project is `cipron-startups/halaalvest` with project id `3fb3e5e2-bd84-4308-8739-e9f4436d0da9`. The mobile NativeWind/Tailwind CSS toolchain is pinned to the EwaTrade-aligned package set (`nativewind` 5.0.0-preview.3, `react-native-css` 3.0.1, `react-native-css-interop` 0.2.1, Tailwind packages 4.1.18, and root `lightningcss` override 1.30.1) to avoid EAS bundling drift.

## Proposed Stack

- Backend runtime: Bun/Node-compatible TypeScript service layer in `apps/api`.
- Database: PostgreSQL for strong transactional support.
- Auth: tenant-aware authentication with role-based authorization.
- Hosting: cloud deployment suitable for SaaS tenants and secure database access.

## Selection Criteria

- Strong support for relational data and transactions.
- Good developer velocity for a SaaS MVP.
- Clear migration tooling.
- Easy observability and audit logging.

## To Decide

- Queue/job tooling.
- File storage strategy for exports and statements.
- Email/SMS/WhatsApp provider selection behind the shared notifications package.
- First migration rollout and seeding workflow.
