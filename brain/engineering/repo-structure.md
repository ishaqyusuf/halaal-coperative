# Repo Structure

## Purpose
This file documents how the repository is organized and what belongs where.

## How To Use
- Update when introducing new top-level folders or packages.
- Keep examples aligned with the real repository.

## Current State
- The repository currently contains the `brain/` documentation system only.

## Intended Structure
- `apps/web/`: user interfaces for members and administrators.
- `apps/api/`: APIs, domain services, auth, and jobs.
- `packages/domain/`: shared business rules and domain models.
- `packages/db/`: schema and database helpers.
- `packages/ui/`: shared UI components and design tokens.
- `brain/`: documentation and project memory.

## Organization Principles
- Keep financial domain logic out of presentation layers.
- Avoid circular dependencies between packages.
- Co-locate tests with the units they verify when practical.
