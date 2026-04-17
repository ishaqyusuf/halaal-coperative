# Dashboard Structure

This app is migrating toward a Midday-style structure where route files stay thin,
feature code owns its own forms and loaders, and reusable dashboard primitives live
under clear layout and data-display boundaries.

## Target Shape

```text
apps/dashboard/
  app/
  components/
    dashboard/
      layout/
      data-display/
      feedback/
  features/
    auth/
    contributions/
      data-display/
      server/
    loans/
      data-display/
      server/
    navigation/
    workspace/
    members/
      components/
      data-display/
      lib/
      server/
    member-onboarding/
  lib/
    server-context.ts
    public-actions.ts
```

## Ownership Rules

- `app/`: routing, auth guards, page-level orchestration only.
- `components/dashboard/layout/`: reusable dashboard shell, page frame, topbar,
  sidebar, page headers, and shell composition.
- `components/dashboard/data-display/`: stat cards, section cards, table wrappers,
  trend pills, and reusable presentational building blocks.
- `components/dashboard/feedback/`: empty states and other reusable response states.
- `features/<feature>/`: feature-owned forms, schemas, actions, loaders, and
  reusable feature UI.
- `features/<feature>/server/`: route-ready loaders and server-side composition
  for feature pages.
- `features/<feature>/data-display/`: feature-owned list/detail/report surfaces
  when the UI is specific to one domain and should not live in shared dashboard
  primitives.
- `lib/`: app-wide helpers only when they are truly cross-feature.

## Migration Rules

- New dashboard shell primitives must go under `components/dashboard/layout`.
- New reusable data-display components must go under `components/dashboard/data-display`.
- New reusable empty/loading/feedback blocks must go under `components/dashboard/feedback`.
- Auth-specific redirect or flow helpers should live under `features/auth`.
- Avoid adding new route-specific helper logic to top-level `lib` when it belongs
  to a feature folder.
- Avoid introducing new local form hooks; use `@halaal-vest/ui/hooks/use-zod-form`.

## Compatibility

Some existing files still re-export from older locations during the migration.
Those shims are transitional and should be removed once imports have been moved
to the canonical structure.
