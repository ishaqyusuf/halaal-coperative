# ADR-022: Adopt A Tokenized Fintech Mobile Design System

## Status

Accepted

## Context

- The mobile production program requires one coherent visual system across member, staff, authentication, detail, sheet, loading, empty, error, and offline states.
- The user approved a supplied mobile-banking reference with restrained near-white/near-black surfaces, teal brand accents, strong financial typography, subtle dividers, selective information cards, and equivalent light/dark compositions.
- Halaalvest already uses NativeWind semantic variables, but its warm beige/gold palette and screen-local headings did not match the approved direction.
- EwaTrade is the primary implementation reference for NativeWind variable delivery, runtime theme access, shared primitives, and safe mobile geometry. Al-Ghurobaa confirms the route-by-route light/dark audit and exception-documentation approach.

## Decision

- Adopt the approved fintech reference as the Halaalvest mobile visual direction.
- Keep all palette values in `apps/mobile/src/lib/theme.ts` and `apps/mobile/src/styles/global.css`; distribute them at runtime through `nativewindThemeVars` and `VariableContextProvider`.
- Use semantic tokens in feature UI. `primary` represents the main action, `brand` represents the teal identity/accent, and existing success, warning, destructive, surface, border, input, and chart tokens retain distinct meanings.
- Keep NativeWind `className` first. Raw screen/component colors are prohibited; native color styles may consume `useColors()` only where a third-party or platform API requires a native value.
- Standardize screen titles, profile headings, cards, metrics, rows, service tiles, inputs, buttons, statuses, empty states, tabs, and sheets through shared primitives.
- Default to flat sections separated by whitespace and dividers. Reserve bordered or filled cards for forms, selected plans, sheets, dense interactive groups, and compact side-by-side metrics where containment communicates hierarchy or behavior.
- Require every reachable mobile screen to pass static UI/theme/keyboard guards and receive reviewed light/dark emulator screenshot evidence before visual completion is claimed.

## Consequences

- Palette and density changes propagate consistently without screen-by-screen color edits.
- Light and dark mode preserve the same information hierarchy while primary-action contrast adapts to the approved reference.
- The `brand` token prevents product identity from being conflated with success state.
- New routes must compose the shared system and join the screenshot manifest rather than invent local visual rules.
- Visual completion requires materially more QA evidence, but regressions become easier to identify and compare.

## Alternatives Considered

- Copy literal colors and card treatments into each screen.
  - Rejected because it violates the NativeWind-first contract and creates theme drift.
- Reuse the prior warm beige/gold palette.
  - Rejected because it conflicts with the approved visual reference.
- Make teal the success token everywhere.
  - Rejected because brand identity and operational success have different semantic meanings.
