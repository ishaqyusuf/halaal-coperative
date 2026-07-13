# Assemble Implementation Handoff Spec

Type: task
Status: open
Blocked by: 01, 02, 03, 04

## Question

Assemble the approved UX decisions into an implementation-ready handoff spec.

The spec should include:

- Final sub-step sequence and labels.
- Final option sets and defaults.
- URL/state behavior.
- Component and file boundaries.
- Motion and accessibility requirements.
- Test plan and manual QA scenarios.
- Brain documentation updates required after implementation.

The answer should link the final spec and close the Wayfinder map when no unresolved decisions remain.

## Comments

Recommendation: the final handoff should specify a scoped UI refactor, not a data-model rewrite. Reuse the existing Operation Profile persistence and server action. Add an internal Operation Profile sub-step model, new URL param parsing, focused service panels, simplified option sets, review/save screen, and visual QA acceptance criteria.

The handoff should require tests for step-param normalization and option mapping, plus manual QA for desktop/mobile `/getting-started?step=operation-profile`, previous/next behavior, save/review behavior, and Settings parity.
