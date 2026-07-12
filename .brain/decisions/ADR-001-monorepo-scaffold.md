# ADR-001: Bun and Turbo Modular Monorepo Scaffold

## Status
Accepted

## Date
2026-04-10

## Context
The repository started with Brain documentation only. The platform needs a codebase structure that supports a web product, backend workflows, shared UI, and isolated business logic for a multi-tenant financial system.

## Decision
- Use Bun workspaces as the package manager.
- Use Turbo for workspace orchestration.
- Use a modular monorepo layout with `apps/web` and `apps/api`.
- Place shared logic in dedicated packages: `auth`, `db`, `domain`, `ui`, `utils`, `eslint-config`, and `tsconfig`.
- Keep cooperative calculations and policy logic in `packages/domain`, not in presentation layers.

## Consequences
- The scaffold supports parallel development across frontend, backend, and shared packages without collapsing into one large app folder.
- Shared package boundaries make it easier to test and audit financial logic separately from UI code.
- More workspace configuration is required up front than in a single-app repository.
- ORM, migration tooling, and the exact API framework remain open follow-up decisions.
