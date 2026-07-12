# Plan: Getting Started And Member Backfill UI Simplification

## Type
UX/UI

## Status
Proposed

## Created Date
2026-07-03

## Last Updated
2026-07-03

## Intake
- Intake File: brain/intake/2026-07-03-recent-cooperative-backfill-cleanup.md
- Intake Item: Keep the Getting Started/member backfill experience clean, simple, input-focused, and flatter with less copy and fewer cards.

## Goal Or Problem
The Getting Started and member backfill screens are too word-heavy and visually card-heavy. Staff should see the next input or table first, with only short operational labels and minimal guidance.

## Current Context
- `apps/dashboard/src/components/getting-started-page-view.tsx` uses summary cards, a card-based step rail, card-wrapped step panels, and repeated historical/backfill descriptions.
- `apps/dashboard/src/components/members/member-backfill-page-view.tsx` uses a separate "Current step" surface card plus section cards and metric blocks before some inputs.
- The admin dashboard KPI framework asks for a clean, flat Midday-style layout and compact border/list rows over nested cards.
- The user specifically requested short sentences, less distraction, a stronger input focus, and flatter design.

## Proposed Approach
Keep the existing workflow and forms, but simplify the composition around them.

For Getting Started:
- Replace the three top summary cards with a compact progress/status band.
- Make the step rail a flat step list or compact side nav instead of a card stack.
- Render the active step as a flat section with the form/table as the main visual focus.
- Trim `getStepMeta` and step header descriptions to one short sentence or remove them where the input labels are enough.
- Move historical warnings into concise inline alerts only when the recent-cooperative backfill gate says history is actually relevant.

For member backfill:
- Remove the separate "Current step" card and fold the active step label into the page header or flat toolbar.
- Keep baseline metrics compact and secondary.
- Put commitment, activity, loan, profit, generated-ledger, and apply inputs/tables first in each step.
- Replace explanatory paragraphs with short labels, helper text, or tooltips only where needed.

Avoid nested cards and avoid styling whole page sections as floating cards. Use flat bordered bands, tables, rows, and form groups; reserve cards for repeated record items, dialogs, or genuinely framed tools.

## Implementation Steps
- Audit visible copy in `getStepMeta`, `SetupCardHeader`, `DashboardSectionHeader`, `memberBackfillSteps`, empty states, and alerts.
- Replace long descriptions with short operational copy focused on the input being completed.
- Refactor `GettingStartedPageView` top summary cards into a compact progress/status band.
- Refactor `StepRail` in `GettingStartedPageView` to a flatter nav/list treatment.
- Refactor each Getting Started step wrapper so the main form or table appears before secondary explanation.
- Refactor `MemberBackfillPageView` to remove the current-step surface card and reduce baseline metric prominence.
- Keep existing forms/actions/loaders intact unless a prop rename is required by the layout cleanup.
- Check desktop and mobile layout for text fitting and non-overlap.
- Update Brain feature docs after implementation if any durable workflow wording changes.

## Affected Files Or Areas
- `apps/dashboard/src/components/getting-started-page-view.tsx`
- `apps/dashboard/src/app/(app)/(sidebar)/getting-started/page.tsx`
- `apps/dashboard/src/components/members/member-backfill-page-view.tsx`
- `apps/dashboard/src/components/members/member-backfill-steps.ts`
- `apps/dashboard/src/components/migration/member-migration-input-panels.tsx`
- `apps/dashboard/src/components/migration/member-ledger-backfill-table.tsx`
- `apps/dashboard/src/components/migration/member-backfill-controls.tsx`
- `apps/dashboard/src/components/forms/tenant-finance-forms.tsx`
- `brain/features/onboarding-finance-setup-and-member-backfill.md`

## Acceptance Criteria
- `/getting-started` no longer opens with three separate summary cards above the workflow.
- The active Getting Started form/table is the main visual focus on desktop and mobile.
- Step descriptions are removed or limited to short, operational sentences.
- The Getting Started layout does not use cards inside cards or card-heavy page sections.
- `/members/[memberId]/backfill` no longer shows a separate current-step card above every step.
- Member backfill step pages prioritize inputs/tables over explanatory text and secondary metrics.
- Empty states and alerts use short, concrete sentences.
- Text fits within controls and panels on mobile and desktop without overlap.

## Test Plan
- `bun --cwd apps/dashboard typecheck`
- `git diff --check`
- Manual desktop check of `/getting-started`.
- Manual mobile-width check of `/getting-started`.
- Manual desktop check of `/members/[memberId]/backfill?step=baseline`, `commitments`, `loans`, `review`, and `apply`.
- Manual mobile-width check of the same member backfill steps.

## Brain Update Requirements
- Update `brain/features/onboarding-finance-setup-and-member-backfill.md` if the visible workflow structure changes materially.
- Update `brain/progress.md` after implementation.

## Lower-Agent Readiness
- Implementation scope is clear: Yes
- File boundaries are clear: Yes
- Acceptance criteria are observable: Yes
- Required checks are listed: Yes
- Brain update requirements are listed: Yes
- Ready for handoff: Yes

## Completion Report Requirements
Lower agent must report:
- Changed files
- Checks run
- Brain docs updated
- Unresolved issues
- Any skipped acceptance criteria

## Risks / Edge Cases
- Removing copy must not remove finance warnings that prevent unsafe history entry.
- Flattening layout must preserve keyboard navigation, form submission targets, and server action redirects.
- The shared migration components may still carry wordy empty states; clean only the relevant visible surfaces in this slice.

## Open Questions
- None.

## Linked Task
- Task Title: Getting Started And Member Backfill UI Simplification
- Task File: brain/tasks/roadmap.md
