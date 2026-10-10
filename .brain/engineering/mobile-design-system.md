# Mobile Design System

## Direction

Halaalvest mobile uses the approved restrained fintech language: high-contrast financial hierarchy, near-white or near-black foundations, teal brand accents, flat sections, deliberate spacing, subtle dividers, and calm operational states. The system is inspired by the supplied banking templates and implemented through the same semantic NativeWind architecture used by EwaTrade.

## Foundations

- Base spacing unit: 4dp.
- Standard route inset: 20dp horizontally; 16-20dp below the top safe area; 32dp after the final surface.
- Standard content gap: 20dp. Dense row gap: 12dp. Field-label gap: 8dp.
- Standard radius: 12dp. Compact controls derive 10dp and 8dp radii. Status badges remain pill-shaped.
- Minimum touch target: 44x44dp.
- Route title: 32dp, extra-bold, tight tracking, 36dp line height.
- Financial/metric value: extra-bold with tabular-friendly spacing and one-line scaling where values may grow.
- Body: 14-16dp with at least 20dp line height. Supporting text uses `text-muted-foreground`, never reduced opacity on an arbitrary fixed color.

## Semantic color contract

- `background` / `foreground`: route canvas and primary content.
- `card` / `card-foreground`: contained information surface used only when grouping materially improves comprehension.
- `primary` / `primary-foreground`: main action. Near-black in light mode and teal in dark mode to match the approved template.
- `brand` / `brand-foreground`: Halaalvest teal identity, highlights, and brand-led visual emphasis.
- `accent` / `accent-foreground`: soft teal supporting surface.
- `secondary`, `muted`, `border`, and `input`: neutral hierarchy and controls.
- `success`, `warn`, and `destructive`: operational meaning only; status may never rely on color alone.
- `chart-1` through `chart-5`: centralized data visualization tones.
- `overlay`: centralized native backdrop color consumed through `useColors()`.

Raw hex/RGB/RGBA values are permitted only inside the central theme definitions. Feature and shared UI use semantic NativeWind classes. Third-party/native APIs use `useColors()` and must be covered by a documented UI exception when required.

## Component rules

- `ScreenHeader` owns the large route title, optional description, leading navigation, and trailing action. Repetitive eyebrow/overline labels such as `Member account`, `Member service`, `Admin workspace`, and `Account` are prohibited; role or cooperative context belongs in meaningful badges and content sections.
- `ProfileHeader` starts directly with the large greeting and cooperative mark. It does not repeat the cooperative name as a small overline above the greeting.
- `ProfileHeader` owns signed-workspace greeting geometry on member/admin home.
- `SectionCard` owns titled grouped content as a flat section with bottom-divider separation; do not turn every section into a bordered box.
- `StatCard` owns compact KPI display and may use a quiet neutral inset surface because side-by-side metrics need containment.
- `ConfirmationRow` owns labeled operational rows and values using spacing and dividers instead of card borders.
- `ServiceTile` owns member-service launch actions.
- Buttons, fields, status badges, empty states, cached/draft banners, tabs, sheets, and progress indicators use shared primitives only.
- Floating `DevQuickFill` must not reserve space in its parent. Its native runtime-inset style explicitly owns absolute positioning (documented in the mobile style exceptions); NativeWind still owns appearance and size. The separate `footer` placement remains in normal flow. Verify the parent footer does not move when floating Quick Fill disappears after entry.
- Reserve bordered cards for forms, selected plans, sheets, or dense interactive groups where a boundary communicates behavior. Prefer whitespace, section labels, and dividers everywhere else.
- Full-screen keyboard-aware scrolling is reserved for form-bearing routes. Focused form sheets keep keyboard avoidance inside the sheet; non-form route shells use a normal scroll surface.
- Bottom-sheet presentation follows the EwaTrade floating-sheet pattern. Short actions, confirmations, reviews, success notices, and workflow details use a detached, content-height sheet capped at 44% of the viewport. Overflow stays inside the body while action footers remain fixed. Keyboard-heavy forms and genuinely dense editor content use a large sheet or full-screen route when compact presentation would impair entry or comprehension; row count alone never promotes a popup detail to a large sheet.
- Native Android `Modal` windows do not inherit NativeWind variable context from the root React tree. A review or success panel hosted across that boundary must re-provide the centralized semantic variable map and use `useColors()` only for native API values such as backdrop, card, and border colors; feature code must never compensate with hardcoded colors.
- Short success feedback uses an auto-content detached panel with a 44% maximum and scroll fallback. It must not reserve the full compact cap when its icon, message, and action need less height.
- Browsable records, history, dashboards, and forms never share one visible route surface. The content screen stays read-focused and opens data entry through one explicit CTA: short forms use `CompactFormSheet`, while long or multi-section forms use `FullScreenFormSheet`.
- Compact form inputs use the shared bottom-sheet input context so keyboard focus participates in Gorhom sheet movement. The resting sheet remains auto-content and capped at 44%; while the keyboard is open, input-bearing compact sheets may expose the EwaTrade-style extended keyboard snap so the focused field and fixed actions remain visible, then restore the compact snap after blur. Dirty compact forms disable swipe/backdrop dismissal; both compact and full-screen forms keep saved drafts and require an explicit protected close action.
- Every input is a separate keyboard-avoidance acceptance case. Focus each control with the software keyboard open and verify that the focused field and its next or submit action remain reachable; coverage from another input on the same route is never representative evidence.
- Shared text fields separate the NativeWind shell from the native text renderer. The shell owns semantic background, border, focus, and geometry; the native control owns only native typography and runtime colors. Password placeholders and revealed text remain normal-sized, while populated hidden values use larger, evenly spaced, vertically centered bullets without changing field height.
- Review and success surfaces are sequenced after dismissal/provider cleanup. A successful financial or approval command clears its draft only after server confirmation; hidden sheet portals may not remain mounted to intercept content-screen actions.
- When a review is nested inside a full-screen native form window, dismiss the review first, dismiss the form second, and present success only after the form window's dismissal delay. This is an explicit lifecycle handoff, not simultaneous visibility toggling.

## Light and dark equivalence

Every screen must preserve hierarchy and meaning in both themes. Review route background, status bar, title, card, field, divider, icon, disabled, loading, empty, error, stale, sheet, modal, and tab states. Dark mode must not be a color inversion; it uses near-black layers, subtle borders, teal actions, and legible muted text.

## Visual QA contract

- Inventory every Expo Router screen and every role needed to reach it.
- Capture one typical-Android light screenshot and one dark screenshot for each reachable screen after the final implementation.
- Add compact/wide evidence for screens with tabs, long labels, forms, large lists, or sheets according to `apps/mobile/qa/mobile-smoke-matrix.json`.
- Store evidence under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/design-system/` with a machine-readable manifest containing route, role, theme, viewport, state, file, and review result.
- Static gates must reject raw feature colors, missing semantic tokens, unprotected keyboard forms, missing shared route headers, and untracked screens.
- Visual review must check safe-area/header spacing, 20dp horizontal alignment, text clipping, contrast, touch targets, tab/sheet fit, empty/loading/error states, and light/dark parity.
