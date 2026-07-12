# ADR-007: Adopt Midday-Style Dashboard `src` Architecture

## Status
Accepted

## Context
- The dashboard had already moved toward a Midday-inspired UI, but its file layout was still split across `app/`, `components/dashboard/layout`, `components/dashboard/primitives`, `components/dashboard/data-display`, and `features/*`.
- That structure kept route composition inconsistent and made it hard to scale a single standard across dashboard, analytics, tables, and settings.
- The product direction now requires a stricter Midday-style organization with one `src/` root and domain grouping through `app/`, `components/`, and `lib/` rather than `features/` and `primitives/`.

## Decision
- Move the dashboard onto a `src/` architecture under `apps/dashboard/src`.
- Use route grouping under `src/app/` and keep authenticated workspace routes inside `src/app/(app)/(sidebar)/*`.
- Replace the old dashboard buckets with:
  - `src/components/dashboard` for shell, page-header, section, metric-card, empty-state, and workspace-shell composition.
  - `src/components/tables/core` for shared table atoms.
  - `src/components/tables/<domain>` for members, contributions, and loans page/table compositions.
  - `src/components/forms`, `src/components/onboarding`, and `src/components/signup-links` for domain UI outside table folders.
  - `src/lib/<domain>` and `src/lib/navigation` for route loaders, filter helpers, and navigation logic.
- Remove `apps/dashboard/features`, `components/dashboard/primitives`, `components/dashboard/data-display`, and `components/dashboard/shell`.
- Add a dedicated `/analytics` route so the dashboard standard now includes a distinct analytics workspace in addition to overview, tables, reports, and settings.

## Consequences
- The dashboard now matches the structural style of the local Midday reference more closely and is easier to extend without inventing new buckets.
- Route imports are simpler: reusable UI now comes from `src/components/*`, while data shaping and loaders come from `src/lib/*`.
- The old `features/` and `primitives/` mental model is retired for dashboard work.
- Midday page-anatomy helpers like `scrollable-content` and `collapsible-summary` can now be reused directly inside list-heavy routes such as members.
- Future visual standardization can happen inside the new folders without another structural rewrite.

## Alternatives Considered
- Keep the existing structure and only restyle pages.
  - Rejected because inconsistent folders were part of the maintenance problem.
- Keep `features/*` and add more aliases.
  - Rejected because it would preserve the old architecture under new naming.
- Move all dashboard UI immediately into `packages/ui`.
  - Rejected because the dashboard still has domain-specific operator patterns that should remain local to the app.
