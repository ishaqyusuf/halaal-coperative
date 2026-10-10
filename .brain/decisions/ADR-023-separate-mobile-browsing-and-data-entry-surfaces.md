# ADR-023: Separate Mobile Browsing And Data Entry Surfaces

## Status

Accepted; popup-hosting details superseded by ADR-025

## Context

- Several mobile feature screens combined summaries and histories with long inline forms. This made record browsing, keyboard behavior, draft recovery, and visual hierarchy compete on one route surface.
- The approved EwaTrade and Midday patterns keep operational pages read-focused and move create, edit, reply, review, and approval work into focused sheet workflows.
- Halaalvest money-impacting actions additionally require fresh server state, explicit review, permission and Operation Profile enforcement, idempotency, and unambiguous success sequencing.

## Decision

- A mobile screen that displays records, history, dashboard content, or other browsable information may expose filters and one clear action, but it must not render its data-entry form inline.
- Short focused forms use the shared detached `CompactFormSheet`. It measures its content, caps at 44% of the viewport, enables scrolling only after overflow, uses bottom-sheet-aware inputs, and disables gesture/backdrop dismissal while dirty or submitting.
- Long, multi-section, keyboard-heavy, evidence-heavy, or multi-step forms use the shared `FullScreenFormSheet`, which owns safe areas, status bar, keyboard-aware scrolling, accessible close behavior, and dirty-draft protection.
- Financial and approval forms proceed through an explicit review sheet. Success appears only after the preceding form/review sheet has dismissed and bottom-sheet provider cleanup is complete.
- Compact popup hosting, including review and success surfaces above a full-screen form, follows ADR-025. Native alerts and secondary native popup windows are no longer permitted.
- Drafts remain scoped and recoverable on close, Quick Fill remains development-only, and successful commands alone clear form state.
- Read-focused feature screens use a normal `ScrollView`; keyboard-aware route scrolling is reserved for dedicated form-only routes. The mobile UI contract rejects inline data-entry controls on the guarded member workflow surfaces.

## Consequences

- Browsing screens stay flatter and easier to scan, while forms receive predictable keyboard and safe-area ownership.
- Compact forms require bottom-sheet-specific input interop; ordinary route inputs remain unchanged.
- A feature may need multiple coordinated surfaces (content, form, review, success), so dismissal order is an explicit state-machine concern rather than incidental local state.
- Cross-window theme variables and presentation order are shared-component responsibilities; individual features provide only state, copy, review rows, and command callbacks.
- Remaining admin migration tickets must adopt the same boundary before their UI work is considered complete.

## Alternatives Considered

- Keep forms collapsed inline above their histories.
  - Rejected because the hidden form still couples browsing and data-entry layout, state, and keyboard ownership.
- Use full-screen forms for every action.
  - Rejected because short replies and small requests lose context and add unnecessary navigation weight.
- Use compact sheets for every form.
  - Rejected because long forms become cramped, nested-scroll-heavy, and harder to validate safely.
