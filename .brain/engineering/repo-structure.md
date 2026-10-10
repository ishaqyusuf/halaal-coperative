# Repo Structure

## Purpose
This file documents how the repository is organized and what belongs where.

## How To Use
- Update when introducing new top-level folders or packages.
- Keep examples aligned with the real repository.

## Current State
- `apps/marketing/`: SaaS marketing, public cooperative signup, and tenant onboarding flows.
- `apps/dashboard/`: tenant-hosted public/member/admin flows and authenticated workspace routes.
- `apps/api/`: APIs, domain services, auth, and jobs.
- `packages/auth/`: server-side session/cookie helpers plus browser-safe role metadata exposed through `@halaalvest/auth/roles`.
- `packages/domain/`: shared business rules and domain models.
- `packages/db/`: schema, package-local generated Prisma client, and database helpers.
- `packages/ui/`: shared UI components and design tokens.
- `packages/utils/`: shared low-level utilities such as formatting helpers.
- `packages/eslint-config/`: workspace lint rules.
- `packages/tsconfig/`: shared TypeScript presets.
- `.brain/`: documentation and project memory.

## Organization Principles
- Keep financial domain logic out of presentation layers.
- Avoid circular dependencies between packages.
- Treat `packages/domain` as the home for cooperative calculations and policy logic.
- Co-locate tests with the units they verify when practical.
- Expo feature screens that combine browsable records with create/edit actions keep the browse surface read-focused and place short forms in the shared compact sheet or long forms in the shared full-screen form sheet. Feature-owned models, adapters, and screens live under `apps/mobile/src/features/<feature>/`; route files and legacy compatibility re-exports must not regain business orchestration.
- Mobile reports/access and notifications use `apps/mobile/src/features/admin-reports-access/` and `apps/mobile/src/features/notifications/` for typed policies, models, and API adapters. Corresponding API procedures live in `apps/api/src/routers/mobile-admin-reports-access-notifications.route.ts`, and database ownership lives in `packages/db/src/queries/mobile-admin-reports-access.ts` plus `packages/db/src/queries/mobile-notifications.ts`.
- Ticket 10 removed `apps/mobile/src/lib/mobile-home-api.ts`, all generic production screen files, and `packages/db/src/queries/mobile.ts`. `apps/api/src/routers/mobile.route.ts` is intentionally retained as a thin public tRPC namespace composer only. Device sessions and settings access now use named route/query modules, and the architecture contract rejects legacy modules or router growth beyond 60 lines.

## Required Folder And Route Conventions
- `components/sheets/global-sheets.tsx`
- `components/sheets/global-sheets-provider.tsx`
- `components/sheets/...`
- `components/open-*-sheet.tsx`
- `components/*-sheet-header.tsx`
- `components/*-content.tsx`
- `components/tables/core`
- `components/tables/<domain>/...`
- `components/forms/...`
- `components/onboarding/...`
- `components/sidebar.tsx`
- `components/sign-out.tsx`
- `app/[...slug]/page.tsx`
- `(sidebar)/layout.tsx`
- `(sidebar)/error.tsx`

<!-- personal-coding-rules:start -->
## Global Personal Coding Rules

Agents must treat these global coding rule references as non-negotiable:

- `/Users/M1PRO/.me/coding-standards/global.md`
- `/Users/M1PRO/.me/coding-standards/expo.md`

Project-specific exceptions require an ADR in `.brain/decisions/` before agents may diverge.
<!-- personal-coding-rules:end -->
