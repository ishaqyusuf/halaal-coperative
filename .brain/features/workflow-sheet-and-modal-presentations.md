# Workflow Sheet And Modal Presentations

## Purpose

Dashboard workflow presentation follows a typed Midday-style contract. Long,
contextual create and edit flows use side sheets; focused reviews and short
forms use centered dialogs; irreversible confirmations are classified as alert
dialogs. Existing URL parameters remain the source of truth for navigable
workflow state.

## Presentation contract

- `apps/dashboard/src/lib/workflow-presentations.ts` is the presentation
  registry and assigns every supported workflow mode exactly one presentation
  and width.
- `apps/dashboard/src/components/workflow-presentation.tsx` owns shared
  responsive sheet/dialog geometry: compact 455px, form 640px, review 768px,
  and wide import presentation.
- Sheets remain for business entry, charge/share configuration, contribution
  entry and batch staging, member creation and long member edits, request and
  receipt creation, historical migration entry, finance settings, and mobile
  navigation.
- Dialogs own reviews, approvals, disbursements, replies, focused settings,
  import flows, member status/access actions, and other interruption workflows.
- Applied brought-forward review and apply remain centered, while capture,
  historical entry, and reversal-with-notes retain their long-form
  presentations.

## Behavioral requirements

- Opening, closing, refresh, and browser history preserve the existing
  domain-specific URL parameter names.
- Closing clears the same selected record and workflow mode parameters that
  opened the presentation.
- Forms preserve entered values after mutation failures and close only after a
  successful action or explicit cancellation.
- Visible controls use shared dashboard inputs, selects, currency/date
  controls, checkboxes, and standard button variants. Hidden native fields are
  permitted for server-action identifiers and payload values.
- Presentation shells provide constrained viewport height, one scrollable
  content region, accessible title and description ownership, focus trapping,
  Escape handling, and responsive widths.

## Validation

- Registry tests verify that every declared mode has a supported presentation
  and width.
- Source-level ownership tests prevent migrated review/modal workflows from
  returning to direct `SheetContent` ownership.
- Dashboard typecheck and browser QA cover URL-backed opening/closing,
  responsive layout, keyboard interaction, and long-form scrolling.
