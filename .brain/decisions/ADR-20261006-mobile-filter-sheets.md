# ADR: Expandable mobile filter sheets

Status: Accepted — owner-approved option 02 from the EwaTrade workshop, 6 October 2026.

## Decision

Below the dashboard `md` breakpoint (768px), list search/filter triggers open one shared bottom sheet with expandable categories, readable selection summaries, and one expanded category at a time. Search stays outside. Changes are local drafts until Apply; Reset clears drafts; Close, backdrop, and Escape discard them. Apply uses existing typed URL hooks and retains each page's search, view, sort defaults, and permitted fields.

Compose the dashboard-local `MobileFilterDrawer` and `MobileFilterGroup` using `@halaalvest/ui` Sheet/Button/RadioGroup/Checkbox primitives. Base UI Sheet handles modal focus, focus return, outside dismissal, and scroll locking, including nested Base UI date popovers. The body scrolls independently; the Reset/Apply footer has safe-area spacing. Apply awaits URL updates and retains the draft with an accessible retry error if they reject. Sheet and backdrop respect reduced motion. No extra dependency, API, database, or result-count contract is introduced.

This is a scoped exception to fullscreen mobile workflow/form presentations: transient list filters and sorting use a bottom sheet capped at 90dvh. Create/edit/review forms and native Expo workflow policies remain unchanged. Desktop keeps existing dropdowns and inline shared panels. The app-local composition follows ADR-007 and the Midday separation of ephemeral drafts from URL state; the approved owner design controls the mobile interaction.

## Consequences

Existing domain drawers keep their controls and permissions, replacing repeated headings with shared groups. All callers mount their drafts only while the sheet is open, so reopening reads current URL state. Date-range presets stack above the calendar on phones instead of requiring horizontal scrolling. Backend authorization, pagination/query keys, and filter tuple normalization remain authoritative.

Validation evidence and consumer audit: [mobile filter task](../tasks/2026-10-06-mobile-filter-sheets.md). Full authenticated route acceptance requires an existing staff QA login; fixture interaction evidence is distinct from backend acceptance.
