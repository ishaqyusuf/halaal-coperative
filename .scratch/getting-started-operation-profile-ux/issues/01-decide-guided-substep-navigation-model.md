# Decide Guided Sub-step Navigation Model

Type: grilling
Status: open
Blocked by:

## Question

How should Getting Started navigation work when Operation Profile becomes a guided sub-step flow?

Resolve:

- Whether the visible setup sequence rail is fully hidden, replaced with a compact progress indicator, or available only as a secondary overview.
- How `Previous` from the first Operation Profile sub-step returns to setup mode.
- How `Next` from setup mode lands on the first Operation Profile sub-step.
- How `Next` from the last Operation Profile sub-step saves/reviews and then moves to start date.
- Whether sub-step state belongs in the URL, local component state, or both.
- How completion state should be shown without overwhelming the user.

The answer should decide the recommended URL/state model and the exact previous/next behavior.

## Comments

Recommendation: hide the full setup sequence rail during Getting Started and replace it with a compact header that shows only the current major step, completion state, and a small progress indicator. Operation Profile should behave as one major step with internal sub-steps.

Use URL state for shareable navigation: `?step=operation-profile&profileStep=commitments`, with valid sub-steps normalized to the first sub-step. `Next` from setup mode should land on `profileStep=intro`. `Previous` from the first Operation Profile sub-step returns to setup mode. `Next` inside Operation Profile advances sub-steps. The final sub-step should save/review the profile, then continue to `start-date`.

Recommended sub-step order: intro, commitments, procurement, foodstuff, member-access, review.
