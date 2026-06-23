# Coding Standards

## Purpose
This file tracks coding expectations for maintainability, safety, and clarity.

## How To Use
- Apply these standards to all new code.
- Add project-specific conventions as the codebase grows.

## Standards
- Follow `midday` as the primary architecture and coding-standard reference when choosing patterns for app structure, rendering, data loading, and UI composition.
- Optimize for page speed by default: prefer server-rendered data flows, small client islands, and minimal hydration.
- Keep bundle size disciplined by avoiding unnecessary dependencies and shipping only route-critical client code.
- Reuse shared loaders, domain shaping, and API/query boundaries instead of duplicating data-fetch logic across pages.
- Prefer explicit domain naming over generic helper names.
- Keep money values typed and consistently represented.
- Centralize business rules for contributions, charges, and loans.
- Avoid duplicating financial calculations across UI and backend.
- Add tests for any non-trivial financial rule.
- Favor pure functions for calculation logic where possible.
- Keep authorization checks close to entry points and service boundaries.
- Import browser-safe role metadata from `@halaalvest/auth/roles`; reserve `@halaalvest/auth` for server-side session, cookie, and token helpers.

## Financial Safety Rules
- Never trust client-supplied balances.
- Derive balances from ledger or authoritative transaction records.
- Use transactions for multi-step financial writes.
- Record who performed approvals and when.
