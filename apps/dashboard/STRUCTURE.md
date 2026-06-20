# Dashboard Structure

This app uses a Midday-style `src` structure where route files stay thin,
domain code owns its own forms/loaders/page widgets, and reusable dashboard
and filter primitives live under clear component boundaries.

## Target Shape

```text
apps/dashboard/src/
  app/
    (app)/(sidebar)/
      members/
        page.tsx
  components/
    dashboard/
    members/
    search-filter/
    tables/
      core/
      members/
      contributions/
      loans/
    forms/
    modals/
    onboarding/
    sheets/
    signup-links/
  hooks/
  lib/
    members/
    contributions/
    loans/
    filters/
    navigation/
    server-context.ts
    public-actions.ts
```

## Ownership Rules

- `app/`: routing, auth guards, and page-level orchestration only.
- `components/dashboard`: reusable authenticated shell, page frame, summaries,
  metric cards, empty states, and other dashboard-wide composition pieces.
- `components/search-filter`: reusable Midday-style search/filter controls shared
  by list pages.
- `components/members`: member-list page widgets such as the toolbar and summary
  cards. Member tables stay in `components/tables/members`.
- `components/tables/core`: shared table atoms and list/table infrastructure.
- `components/tables/<domain>`: domain-specific table surfaces.
- `lib/<domain>`: route loaders, URL-filter mapping, and domain-specific server
  data shaping.
- `lib/filters`: app-wide filter utilities only.
- `hooks`: URL-param hooks and client-only shared state hooks.

## Migration Rules

- New reusable dashboard primitives must go under `components/dashboard`.
- New reusable search/filter behavior must go under `components/search-filter`.
- New member-list page widgets must go under `components/members`, not the
  top-level `components` folder.
- Avoid adding route-specific helper logic to top-level `lib` when it belongs in
  `lib/<domain>`.
- Avoid introducing new local form hooks; use `@halaalvest/ui/hooks/use-zod-form`.

## Compatibility

Avoid compatibility shims for moved dashboard files unless a staged migration
requires them. Prefer moving imports to the canonical structure in the same
change set.
