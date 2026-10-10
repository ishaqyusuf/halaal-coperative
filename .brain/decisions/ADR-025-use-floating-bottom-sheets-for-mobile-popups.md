# ADR-025: Use Floating Bottom Sheets For Mobile Popups

## Status

Accepted

## Context

- Native Android alerts and popup modals diverged from the approved Halaalvest/EwaTrade visual system, did not use the app's semantic theme tokens, and produced inconsistent geometry and action styling.
- Halaalvest already has a shared detached `FloatingBottomSheet` that measures content, caps compact sheets at 44% of the viewport, and enables internal scrolling only when content exceeds that cap.
- Some reviews and confirmations originate inside a long-form full-screen workflow. They must layer above that workflow without opening a second native window or losing the app's root bottom-sheet provider.

## Decision

- Confirmations, destructive prompts, submission reviews, success notices, update notices, workflow details, and other compact popup surfaces must use the shared `FloatingBottomSheet`.
- React Native `Alert.alert` and native `Modal` popup implementations are prohibited. The executable mobile UI contract enforces this rule.
- `FullScreenFormSheet` remains the approved full-screen host for long, multi-section form workflows. It renders through a named same-window portal host, owns runtime window/keyboard geometry, and leaves compact overlays on the root bottom-sheet provider.
- Dirty-form close protection uses the shared `ConfirmationSheet`. Compact content auto-sizes, is capped at 44% of the viewport, and becomes internally scrollable only after overflow. Review, confirmation, success, and workflow-detail actions use a measured fixed footer so they remain reachable while only the body scrolls. Detail row count alone does not opt a popup into a large sheet.
- Input-bearing compact sheets keep a measured resting snap and an explicit EwaTrade-style 88% keyboard snap. Keyboard-controller state moves the sheet to that expanded position, the shared bottom-sheet-aware scroller keeps the focused input/action visible, and dismissal restores the compact snap. This temporary expansion is keyboard avoidance, not a license to present dense or long forms as compact sheets.
- Popup actions use semantic theme tokens, accessible labels, explicit cancel/confirm language, and emulator verification for both dismissal paths.

## Consequences

- Popup visuals, light/dark behavior, accessibility, and action hierarchy remain consistent across member and staff features.
- Features compose state and copy while shared primitives own presentation, dynamic height, portal behavior, and keyboard interoperability.
- Same-window full-screen form portals avoid nested native modal windows and nested bottom-sheet providers while preserving correct popup layering.
- The global update experience is now a non-dismissible floating sheet while an update is active; a failed update becomes dismissible through its explicit recovery action.

## Alternatives Considered

- Keep platform-native alerts for destructive confirmation.
  - Rejected because their typography, spacing, color, and button order cannot follow the product design system consistently.
- Keep separate native popup modals above long-form workflows.
  - Rejected because they duplicate theme, safe-area, animation, and sizing behavior already owned by the shared sheet.
- Convert long forms themselves to compact sheets.
  - Rejected because multi-section keyboard-heavy forms need a dedicated full-screen workflow surface.
