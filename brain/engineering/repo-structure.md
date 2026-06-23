# Repo Structure

## Purpose
This file documents how the repository is organized and what belongs where.

## How To Use
- Update when introducing new top-level folders or packages.
- Keep examples aligned with the real repository.

## Current State
- `apps/web/`: user interfaces for members and administrators.
- `apps/api/`: APIs, domain services, auth, and jobs.
- `packages/auth/`: server-side session/cookie helpers plus browser-safe role metadata exposed through `@halaalvest/auth/roles`.
- `packages/domain/`: shared business rules and domain models.
- `packages/db/`: schema, package-local generated Prisma client, and database helpers.
- `packages/ui/`: shared UI components and design tokens.
- `packages/utils/`: shared low-level utilities such as formatting helpers.
- `packages/eslint-config/`: workspace lint rules.
- `packages/tsconfig/`: shared TypeScript presets.
- `brain/`: documentation and project memory.

## Organization Principles
- Keep financial domain logic out of presentation layers.
- Avoid circular dependencies between packages.
- Treat `packages/domain` as the home for cooperative calculations and policy logic.
- Co-locate tests with the units they verify when practical.
