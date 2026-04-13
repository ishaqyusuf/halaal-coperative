# Tech Stack

## Purpose
This file tracks chosen and proposed technologies for the platform.

## How To Use
- Mark decisions as proposed or adopted.
- Update whenever a stack decision becomes durable.

## Current Status
- Application scaffold implemented as a Bun and Turbo monorepo.
- Frontend scaffold implemented with Next.js App Router across `apps/web`, `apps/dashboard`, and `apps/tenant-site`.
- Shared UI scaffold implemented with shadcn/base components in `packages/ui`.
- Shared package boundaries established for `auth`, `db`, `domain`, `notifications`, `notifications-react`, and `utils`.

## Adopted Stack
- Workspace/package manager: Bun workspaces.
- Monorepo orchestration: Turbo.
- Frontend: Next.js 16 App Router.
- Backend HTTP framework: Hono.
- API contract layer: tRPC with `superjson`.
- Local named-host dev: Portless via workspace scripts.
- Styling: Tailwind CSS v4 plus shadcn/base preset styling.
- Shared UI primitives: `@halaal-vest/ui`.
- Shared notifications core: `@halaal-vest/notifications`.
- Shared React notifications adapter: `@halaal-vest/notifications-react`.
- Linting: ESLint with shared workspace config.
- Formatting: Prettier with Tailwind plugin.
- TypeScript sharing: `@halaal-vest/tsconfig`.
- Database ORM: Prisma 7 with a file-grouped schema layout in `packages/db/prisma`.

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
