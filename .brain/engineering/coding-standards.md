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

## Global Personal Coding Rules
<!-- BEGIN: global-personal-coding-rules -->
- Canonical global rules: `/Users/M1PRO/.me/coding-standards/global.md`
- Canonical Next.js/App Router/web rules: `/Users/M1PRO/.me/coding-standards/nextjs.md`
- Canonical Expo/React Native/mobile rules: `/Users/M1PRO/.me/coding-standards/expo.md`
- Treat these files as the source of truth for personal coding standards; do not copy full rule text into project Brain docs.
<!-- END: global-personal-coding-rules -->

## Midday Standard
- Pages, tables, modals, sheets, forms, onboarding, sidebar, sign-out, and shared dashboard components must follow Midday architecture, file naming, and coding patterns.
- Tables should follow the Midday domain table pattern: `components/tables/core`, `components/tables/<domain>/columns.tsx`, `data-table.tsx`, `table-header.tsx`, `skeleton.tsx`, `empty-states.tsx`, and `bottom-bar.tsx` or `action-menu.tsx` when needed.
- Sheets should follow the Midday global sheets pattern: `components/sheets/global-sheets.tsx`, `components/sheets/global-sheets-provider.tsx`, and domain sheet files under `components/sheets/`.
- Forms must follow Midday validation, error handling, and mutation patterns.
- Data fetching and mutations must use the standard Midday tRPC patterns, including invalidation, loading states, errors, and caching behavior.
- Prisma schema changes must be followed by root `bun db:migrate` and `bun db:push` when those scripts exist. Do not manually create migration files.
