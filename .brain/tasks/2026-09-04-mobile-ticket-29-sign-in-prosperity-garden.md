# Task: Mobile Ticket 29 Sign-in Prosperity Garden refinement

## Status
In Progress

## Priority
High

## Created Date
2026-09-04

## Last Updated
2026-09-04

## Global Ticket
- Ticket Position: 29/33

## Source Context
[Mobile production implementation directive](../plans/2026-08-11-halaalvest-mobile-complete-production-implementation-directive.md), continuing Ticket 29 after the owner rejected the current sign-in composition as too dry. Five richer Design HTML directions are stored in `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-vibrant-directions/`; approved-default selection is `E — Prosperity Garden`.

## Implementation Progress
- Completion: 87.5%
- Current Checklist: 8/8 — Commit the completed refinement on the current branch and synchronize Ticket 29 Brain status
- Blockers: The goal-owned auth files are inside a pre-existing untracked `apps/mobile/src/features/auth/` migration and depend on other untracked auth files plus existing tracked component edits. An isolated commit would be incomplete; a coherent commit would sweep unrelated prior work. Brain synchronization is complete, but the commit is intentionally deferred until that broader ownership boundary is resolved.

## Implementation Checklist
- [x] Preserve the current Android baseline, render five richer Design HTML options, and select the strongest direction.
- [x] Map the current native sign-in implementation, token roles, behavior contract, and safe test seams.
- [x] Implement the selected Prosperity Garden hero and disciplined flat form using semantic NativeWind roles.
- [x] Run the focused presentation tests, mobile TypeScript, focused lint, formatting, theme guard, and mobile contract.
- [x] Verify Android Light/Dark, normal/large text, both input keyboards, password geometry, recovery navigation, and authorized tenant-handshake behavior where credentials permit.
- [x] Capture before/design/final screenshots and index truthful acceptance evidence.
- [x] Run the required code review and resolve in-scope findings.
- [ ] Commit the completed refinement on the current branch and synchronize Ticket 29 Brain status.

## Validation Evidence
- Current native baseline: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-vibrant-directions/current.png`.
- Five-option comparison: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-vibrant-directions/comparison.html` and `comparison.png`.
- Selected design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-vibrant-directions/selected-option.html` and `selected-option.png`.
- Migration contract: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-vibrant-directions/midday-migration-contract.md`.
- Native source: `apps/mobile/src/features/auth/components/living-cooperative-hero.tsx`, `living-cooperative-motif.tsx`, `sign-in-form.tsx`, and `screens/sign-in-screen.tsx`.
- Focused presentation test: 5 passing tests, 0 failures.
- Mobile TypeScript, focused ESLint, Prettier check, and the 31-token NativeWind theme guard pass.
- Complete mobile contract passes: 36 routes, seven shells, 397 native-import-safe files, 21 development feature snapshots, 13 Quick Fill screens, 14 guarded API adapters, 31 smoke routes, 34 visual screens, five viewports, and 17 flows.
- Headless Pixel 3a API 34 evidence covers Light/Dark 100%, Light/Dark 200%, both Gboard inputs, enabled/disabled CTA, stable password masking geometry, recovery, the icon-only QA control, floating-sheet backdrop, and sheet keyboard avoidance. Evidence index: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-prosperity-garden/README.md`.
- Final native fidelity frames are `23-light-100-disabled-semantic.png` for the readable semantic disabled state, `24-light-100-enabled-password-keyboard.png` for the keyboard-safe enabled state, and `22-light-100-filled-final-clean.png` for the settled enabled coral shield action. The prior generic 50% opacity frame is superseded because it washed coral into a misleading salmon block. The smoke contract now pins the named disabled predicate and semantic muted treatment.
- The exact `ishaq.qa.test` QA Domain and managed tester credential reached the real local API/database contract, which rejected the currently assigned credential with `Sign in again to continue`. No alternate QA tenant, credential rewrite, or fabricated session was used; a fresh tenant handshake is not claimed.
- Focused tests, mobile typecheck, lint/formatting, the complete mobile contract, Metro, local API, Postgres, and headless Android replay were run. Full monorepo build/tests and unrelated browser/finance walkthroughs were skipped under fast Bun monorepo command discipline.
