# ADR-034: Adopt Adaptive Mobile Large-Text Reflow

## Status

Accepted

## Context

- Android system font scaling can reduce the effective horizontal space of a phone screen even when its physical pixel width is unchanged.
- Fixed multi-column metrics, paired key/value rows, plan prices, segmented choices, and tab labels became clipped or fragmented at 200% text.
- Hiding financial values, requiring horizontal discovery, or adding an app-specific accessibility mode would make cooperative information harder to compare and duplicate platform settings.
- Large-text behavior is a shared presentation concern. Screen-local width exceptions would drift and would not protect new screens.

## Decision

- Mobile presentation uses the shared `shouldUseLargeTextLayout` policy and `useLargeTextLayout` hook.
- The adaptive layout activates when system font scale is at least `1.5`, or when `windowWidth / fontScale` is below `280` logical points. Invalid scale values normalize to `1`.
- Essential finance summaries, plan/capacity rows, form choices, and comparable key/value content reflow vertically. Values remain visible and money strings remain unbroken.
- Horizontal scrolling is reserved for clearly discoverable filter rails, not essential finance summaries or required form choices.
- Normal text keeps the established compact dashboard layout. Shared tab labels use a bounded multiplier so five native tabs remain legible without replacing their accessible names.
- Full-screen form headers allow two lines with a bounded multiplier; forms retain persistent essential labels, keyboard-aware scrolling, and sticky actions.
- Shared screen display headings cap their system-scale multiplier at `1.6` so long single words remain intact instead of splitting by character. Body, form, status, and financial content continue to receive the full system scale and reflow vertically.
- Flex growth that is valid for a horizontal row must be removed when that content reflows into a vertical column; otherwise text can collapse to zero height.
- The implementation remains NativeWind `className` first and uses semantic theme tokens. Dynamic runtime geometry is the only styling exception.

## Consequences

- Screens can preserve the compact EwaTrade-aligned layout at normal text and expose the same information in a single-column flow at large text.
- The decision is deterministic and unit-testable without device rendering.
- Content height increases at large text, so screens and floating sheets must remain scrollable and keep fixed actions outside their scrolling body.
- Bounded tab-label scaling is a navigation exception, not permission to suppress scaling in screen content.
- Bounded display-heading scaling is limited to already-prominent page titles; it does not reduce body, form, financial, or action text scaling.
- The policy improves the audited surfaces but does not prove program-wide large-text or real screen-reader completion; Ticket 29 retains that matrix.

## Alternatives Considered

- Preserve all horizontal layouts and shrink text to fit.
  - Rejected because it defeats the user’s system text preference and can make financial values illegible.
- Move supporting values behind disclosure controls.
  - Rejected because comparisons would require additional taps and critical context would no longer be visible together.
- Put metrics and choices in horizontal swipe rails.
  - Rejected because essential content would depend on discovering an off-screen gesture.
- Add a separate Comfortable or Accessible mode.
  - Rejected because it duplicates Android settings and creates another state that every screen must synchronize.
