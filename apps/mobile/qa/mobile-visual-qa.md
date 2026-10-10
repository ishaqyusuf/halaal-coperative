# Mobile Visual QA

Run `bun --cwd apps/mobile check:smoke` before release handoff. Use `qa/mobile-smoke-matrix.json` as the viewport and flow contract for manual device or simulator review.

`qa/mobile-visual-routes.json` is the complete screen inventory. Each listed screen requires one reviewed typical-Android screenshot in light mode and one in dark mode. Evidence is stored under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/design-system/`; loading, empty, error, or mock states must be named honestly in the evidence manifest.

## Required Viewports

- `compact-ios`: 320x568, safe area, bottom tabs, sheet fit, long labels.
- `typical-ios`: 390x844, safe area, bottom tabs, form states, status badges.
- `compact-android`: 360x640, safe area, bottom tabs, sheet fit, long labels.
- `typical-android`: 412x915, safe area, bottom tabs, form states, status badges.
- `wide-layout`: 600x960, safe area, bottom tabs, virtualized lists, long labels.

## Required Flows

- Startup routes to loading, auth, member tabs, or admin tabs correctly.
- Password sign-in shows disabled and submitting states.
- Development member and admin shortcuts route to their tab shells.
- Logout clears session-local read caches and draft form state.
- Role switch updates the active workspace without leaving stale drafts.
- Device Access lists durable sessions, confirms revocation in a compact floating sheet, invalidates the local session after sign-out-all, and permits managed-user access only to authorized cooperative administrators.
- Member tabs cover home, commitments, financing, shares, and more.
- Admin tabs cover overview, members, finance, reports, and more.
- Admin charge operations cover applications, monthly levies, and rules; verify search/filter pagination, read-only operations-officer access, effective-version detail, linked workflow and audit history, full-screen apply/settlement forms, compact waiver/reversal confirmation, offline write blocking, and opposite-ledger evidence.
- Receipt, support, financing, procurement, project financing, Foodstuff Purchase, shares, guarantor, admin review, and invitation forms preserve drafts locally.
- Stale cache banners show timestamps and block money-impacting or privileged submit actions.
- Long member, receipt, notification, request, report, support, activity, and access lists use virtualized rendering.
