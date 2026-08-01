# Reporting Workspace

## Purpose

- Make `/reports` the tenant-admin hub for cooperative finance posture, audit evidence, collections follow-up, compliance review, and CSV exports.
- Keep the overview exception-led and compact while detailed tables and mutations remain in their dedicated workspaces.

## Route Contract

- `apps/dashboard/src/app/(app)/(sidebar)/reports/page.tsx` owns metadata, URL date loading, runtime and role gates, server prefetch, and hydration.
- The route exports `Reports | Halaalvest` metadata and prefetches `reports.summary` plus `filters.reports`.
- `loading.tsx` provides a report-shaped responsive skeleton.
- `error.tsx` provides retry isolation, reports failures through `/api/error-report`, and states that no cooperative records were changed.
- The visible page stays in `components/reports/reports-view.tsx`; no form, table, sheet, or mutation is owned by the overview.

## Data Contract

- `reports.summary` remains tenant-scoped and restricted to tenant admins and super admins.
- The overview returns finance, governance, notification, compliance, export-visibility, audit-preview, and collections-preview data.
- Audit preview rows use the normalized activity-report projection, including `actionLabel`, instead of exposing raw action slugs as the primary label.
- Audit and collections previews are limited to five recent rows. Full activity and repayment work remain linked from the section headers.
- Audit and collections evidence links use content-owned row heights so multi-line labels and evidence never overlap.
- Date filters stay in URL state and are passed to the report summary and export links.

## Mobile Contract

- All page-owned controls and links are at least 44px high below `md`.
- Export cards become one flat, divided list below `md`; descriptions are hidden while category, report title, and CSV affordance remain visible.
- Desktop retains the descriptive multi-column export catalog.
- The finance snapshot owns a full-width section with five desktop metric columns.
- Audit and collections evidence appear before exports and align to their own content height; the full-width export catalog is the final page section.
- Long activity, entity, product, status, and resolution text wraps instead of creating document-level overflow.
- The page and filter/date-picker states create no horizontal overflow at 360px, 390px, 767px, 768px, 1024px, or 1440px.

## Midday Adaptation

- Adopted: thin server route, metadata, URL-owned filters, prefetched typed queries, hydration, explicit loading/error states, flat bordered sections, and compact responsive composition.
- Intentionally omitted: Midday's editable metric-widget layout. Halaalvest `/reports` is a governance/export hub; `/analytics` owns chart analysis.
- Intentionally omitted: overview tables, bulk actions, forms, and sheets. Detailed audit rows live at `/reports/audit`, collections actions live at `/repayments`, and exports remain dedicated download routes.

## Validation

- `apps/dashboard/src/lib/reports-page-conformance.test.ts` covers route ownership, URL state, hydration, boundaries, normalized previews, compact mobile composition, and the read-only overview boundary.
- Dashboard and database typechecks pass.
- Focused dashboard lint passes; database lint has zero errors and retains its existing warning backlog.
- Authenticated Portless QA covers the tenant report page, filters, date popover, compact exports, responsive breakpoints, overflow, metadata, and console health.
