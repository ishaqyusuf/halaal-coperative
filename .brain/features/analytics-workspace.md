# Analytics Workspace

## Purpose

- Keep `/analytics` as the staff decision-trend workspace for collection pacing, financing exposure, member trust, and share-profit governance.
- Preserve the exception-led cooperative KPI model defined by the admin dashboard framework.

## Top Metric Card Contract

- The five primary metric links use content-owned automatic height with a 160px minimum.
- Description blocks reserve two text lines so values, descriptions, and tone markers remain aligned.
- Long descriptions must stay inside the card boundary at phone and desktop widths.

## Midday Adaptation

- The page keeps the Midday reports pattern of a dedicated analytics composition with linked metric cards and focused trend sections.
- Editable chart layout, drag-and-drop, and resize controls remain intentionally omitted because the user approved the current fixed cooperative KPI composition.

## Validation

- `apps/dashboard/src/lib/analytics-page-conformance.test.ts` protects the top-card height and description-space contract.
- The focused conformance test, dashboard typecheck, changed-file dashboard lint, and diff whitespace check pass.
- Authenticated Portless QA at 360px, 390px, 767px, 768px, 1024px, and 1440px confirms all five cards are 160px high, every description and tone marker stays inside its card, the following section starts below the cards, and the page has no horizontal overflow or console warnings/errors.
