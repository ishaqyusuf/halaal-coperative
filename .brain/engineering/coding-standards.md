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
- The root `bun run dev` router, dev-run bridge, service readiness, kill-port discovery, and root-level environment wrapper are owned by `/Users/M1PRO/Documents/code/local-infra-kit`; invoke the toolkit with `--profile halaalvest` and keep the command contract aligned with School Clerk. Halaalvest's thin `scripts/local-infra-command.ts` launcher may only replace Bun-preloaded values with the selected standard mode file, validate the database target and port ownership, and forward arguments to those shared entrypoints.
- Invoke toolkit entry points through `bun --env-file=/dev/null` so Bun does not preload `.env.local` and override the explicit remote or production mode selected by `local-infra-kit`.
- Workspace development wrappers must inherit `HALAALVEST_ENV_MODE` when the root router selected remote or production mode; omit a hard-coded `--mode local` unless the command is explicitly local-only.
- Standard local-infra env files are `.env.local`, `.env.remote.local`, and `.env.prod`; use `DATABASE_URL` in each mode instead of introducing profile-specific database URL aliases.
- `bun run kill:ports` discovers numeric env variables ending in `_PORT` while excluding infrastructure ports such as Portless and databases. Keep project-owned application ports declared as individual `*_PORT` values.
- For mobile styling or NativeWind issues that do not resolve after normal debugging, use the working GRD project as the fallback reference and align this project to its theme configuration, styling implementation, NativeWind version, and mobile UI setup.

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
- Ordinary dashboard actions must inherit geometry and standard sizing from the shared `Button` or `buttonVariants` primitive instead of adding one-off radius, padding, or compact-size overrides. Preserve each action's semantic variant (`default`, `outline`, `secondary`, `ghost`, or `destructive`); custom sizing and circular styling remain appropriate for intentional pills, badges, avatars, icon-only controls, and compact utilities.
- Dashboard sidebars follow the Midday overflow pattern: clip overflow on the outer shell, keep one `min-h-0` internal navigation scroller, hide its scrollbar track across browsers, and preserve wheel, touch, and keyboard scrolling.
- Dashboard topbars follow Midday responsibility boundaries: do not repeat sidebar destinations as horizontal quick links. Keep the topbar focused on mobile navigation, current-page context, and global utilities such as theme, account, notifications, search, or logout.
- Dashboard search/filter toolbars use the shared input-group control: a vertically centered search icon at the inline start and an always-visible filter button at the inline end. Do not position these icons with page-specific pixel offsets, use oversized pill fields, or place QA Quick fill actions inside search controls.
- Dashboard forms must use the shared shadcn-style `Form`, `FormField`, and input primitives from `@halaalvest/ui`; avoid custom radio, checkbox, select, and submit-control implementations when a shared primitive exists.
- Tables should follow the Midday domain table pattern: `components/tables/core`, `components/tables/<domain>/columns.tsx`, `data-table.tsx`, `table-header.tsx`, `skeleton.tsx`, `empty-states.tsx`, and `bottom-bar.tsx` or `action-menu.tsx` when needed.
- Sheets should follow the Midday global sheets pattern: `components/sheets/global-sheets.tsx`, `components/sheets/global-sheets-provider.tsx`, and domain sheet files under `components/sheets/`.
- Forms must follow Midday validation, error handling, and mutation patterns.
- Data fetching and mutations must use the standard Midday tRPC patterns, including invalidation, loading states, errors, and caching behavior.
- Prisma schema changes must be followed by root `bun db:migrate` and `bun db:push` when those scripts exist. Do not manually create migration files.
