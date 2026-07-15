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
