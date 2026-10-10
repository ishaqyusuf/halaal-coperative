# ADR-033: Isolate Mobile Modal Accessibility Focus

## Status

Accepted

## Context

- Floating bottom sheets and full-screen form sheets share one React Native window so they can preserve the approved EwaTrade-aligned presentation and avoid native popup modals.
- A visible floating sheet previously blocked touch input with its backdrop but could leave the covered route and its controls in Android's accessibility traversal. Nested confirmation sheets above a full-screen form had the same risk.
- Modal focus ownership is a shared presentation concern. Fixing individual feature screens would drift and would not protect future sheets.

## Decision

- The root mobile layout owns a `ModalAccessibilityProvider` and an explicit native `AppAccessibilityBackground` boundary around routed application content.
- Every shared `FloatingBottomSheet` registers while visible and releases only after native dismissal, with a bounded fallback for controlled close transitions. While any floating sheet owns focus, the routed background and full-screen form portal layer use `aria-hidden`, `accessibilityElementsHidden`, and Android `importantForAccessibility="no-hide-descendants"`.
- The accessibility boundaries set `collapsable={false}` so the Android native view required to enforce descendant isolation cannot be flattened away.
- A visible full-screen form hides the routed application background. A floating confirmation above that form additionally hides the full-screen form layer, leaving only the topmost sheet traversable.
- Shared `Button` and `Pressable` primitives provide normalized button/link roles and disabled accessibility state. Feature screens inherit these semantics instead of reimplementing them.
- Android evidence uses UIAutomator's `--compressed` accessibility tree. The uncompressed hierarchy intentionally includes views marked not important for accessibility and is not valid proof of TalkBack traversal.

## Consequences

- Touch and accessibility focus now share the same topmost modal owner across ordinary routes, full-screen forms, and nested confirmations.
- Future floating sheets receive isolation automatically through the shared primitive and root boundary.
- Sheet registration must survive its close animation; releasing when a controlled `visible` prop first becomes false would expose background controls too early.
- Compressed native-tree evidence can verify roles and focus isolation, but it does not replace a real TalkBack session or program-wide large-text and focus-order testing.

## Alternatives Considered

- Hide background controls separately in every feature.
  - Rejected because it duplicates state, misses nested surfaces, and cannot protect future sheets consistently.
- Use native modal windows for accessibility isolation.
  - Rejected because native popup modals are prohibited by ADR-025 and diverge from the shared theme, geometry, and keyboard behavior.
- Treat an uncompressed UIAutomator dump as the accessibility traversal.
  - Rejected because it includes nodes explicitly marked not important for accessibility and therefore overstates what an accessibility service can traverse.
