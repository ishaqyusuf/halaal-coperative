# Dashboard Overview

## Purpose

- Make `/` the role-aware first screen for an authenticated cooperative workspace.
- Give staff a concise operating posture while keeping member-role users inside their member-scoped self-service view.

## Route Contract

- `apps/dashboard/src/app/(home)/page.tsx` owns the `/` route without changing its public URL.
- The route exports `Overview | Halaalvest` metadata, resolves the tenant URL context, and delegates role/data decisions to `loadTenantHomePageData`.
- Staff data uses the existing `overview.summary` tRPC query with server prefetch, `HydrateClient`, and an `OverviewSkeleton` Suspense fallback.
- Member-ready, member-profile-missing, and database-unavailable states remain explicit server branches and never expose the staff summary query to member sessions.
- `loading.tsx` provides a responsive shell-level loading state, while `error.tsx` provides a retryable route boundary and reports failures through `/api/error-report`.

## Staff Overview

- Staff see deployable funds, collection coverage, portfolio risk, the action queue, contribution health, financing exposure, compliance watch items, share/profit position, and recent cooperative activity.
- Primary and row-level links navigate to the corresponding operational workspace.
- Action links remain at least 44px high below the `md` breakpoint and return to the compact desktop density at `md` and wider.

## Mobile Contract

- The overview uses one-column KPI cards on phones, two columns at the intermediate breakpoint, and the full desktop grid at larger widths.
- The shell switches from the fixed sidebar to the mobile navigation drawer below `md`.
- The page and its loading state do not create document-level horizontal overflow at 360px, 390px, 767px, 768px, 1024px, or desktop widths.
- Member actions collapse to Statement and More controls below `md`; More opens the shared bottom action drawer.
- Member summary metrics use a compact two-column phone grid, and status rows stack their label and value when horizontal space is constrained.

## Validation

- `apps/dashboard/src/lib/dashboard-home-conformance.test.ts` covers route metadata, role branches, query hydration, Suspense/loading/error ownership, and member mobile composition.
- Authenticated Portless QA covers staff rendering, primary navigation, mobile navigation, 44px touch targets, breakpoint transitions, horizontal overflow, and console health.

## Boundaries

- The staff and member experiences intentionally share one route because role resolution is server-owned and tenant scoped.
- The staff overview is a summary and routing surface; detailed filters, tables, forms, and mutations remain in their domain workspaces.
- The current authenticated browser QA session covers the staff branch. Member branch behavior is protected by focused source tests and existing member-domain authorization tests.
