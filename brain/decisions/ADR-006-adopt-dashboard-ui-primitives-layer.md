# ADR-006: Adopt Dashboard UI Primitives Layer

## Status
Accepted

## Context
- The dashboard already had a role-filtered route structure, but page-level UI composition was still inconsistent across overview, finance, and settings routes.
- The user explicitly requested a close Midday-style dashboard replica, including shell behavior, layout rhythm, and clearer folder/component structure.
- Rebuilding each route independently would have introduced duplication and made visual parity hard to maintain.
- Existing architecture guidance already requires route pages to keep server-side data ownership close to the page entry point.

## Decision
- Add a dashboard-only UI layer under `apps/dashboard/components/dashboard/`.
- Split that layer into:
  - `shell/` for sidebar, topbar, and page-frame composition.
  - `primitives/` for shared page headers, section cards, KPI cards, trend pills, and data-table surfaces.
- Keep route-level data loading inside App Router pages and feature-local server helpers.
- Keep `apps/dashboard/features/workspace/page-shell.tsx` as a compatibility adapter so existing routes can adopt the new UI system incrementally without a large route rewrite.
- Use the overview route `/` as the primary design-reference implementation and `/charges` as the first operator-heavy validation route.

## Consequences
- The dashboard can move toward Midday-like visual consistency without changing the established server-first architecture.
- New routes can be rebuilt progressively by composing the primitive layer instead of inventing local headers, cards, and lists.
- Visual changes are easier to roll out because the shell and primitives are centralized.
- The component map is clearer for future work: page orchestration in `app/`, domain UI in `features/`, and dashboard-scoped presentation primitives in `components/dashboard/`.

## Alternatives Considered
- Continue styling each route page directly.
  - Rejected because it would increase duplication and make parity work slower.
- Move all dashboard UI into the shared `packages/ui` package immediately.
  - Rejected because this design language is currently specific to the authenticated dashboard and should prove itself locally first.
- Introduce a heavier client-side dashboard state layer.
  - Rejected because the project direction and Midday reference both favor server-first route ownership with smaller client islands.
