# ADR-020: Adopt An Executable Mobile Architecture And UI Contract

## Status

Accepted

## Context

- The working mobile MVP already contains valuable member and staff flows, but most behavior still lives in large screen modules backed by compatibility mobile API/query modules.
- The production program requires a safe migration toward T3 Code-style feature/runtime boundaries and Midday-style thin entrypoints without breaking working Halaalvest behavior.
- EwaTrade's native interaction patterns, NativeWind-first styling, dark mode, keyboard handling, and focused QA guards are the required mobile design reference.
- Tenant isolation, role/permission checks, subscriptions, Operation Profile policy, finance calculations, legal state transitions, and audit writes must remain server-owned.

## Decision

- Maintain a machine-readable inventory of every Expo Router page and shell, including feature ownership, allowed roles, and tenant boundary.
- Enforce thin route entrypoints, explicit feature contracts, no unsafe shared barrels, no mobile imports of web/server internals, and no authoritative client finance calculations.
- Use NativeWind `className` and semantic tokens as the UI default. Allow native styles only for runtime-computed values or documented third-party/native APIs.
- Standardize route-form keyboard avoidance through `AppKeyboardAwareScrollView`, retain the root `KeyboardProvider`, and guard sheet keyboard behavior.
- Preserve existing compatibility modules during expand-migrate-contract work. Delete them only after consumer checks and focused behavior tests prove the migrated feature owns the complete flow.
- Treat client finance totals as untrusted previews. Money-affecting commands are online-only, server-authorized, tenant-scoped, auditable, and never inferred from cached state.

## Consequences

- New migration work fails fast when it violates route, feature, tenant, financial-authority, NativeWind, theme, or keyboard boundaries.
- Known native styling exceptions are visible and cannot silently expand.
- Feature slices can migrate incrementally while the existing app remains usable and testable.
- The contract supplements ADR-009; it does not weaken server authority or make the device an offline financial command processor.

## Alternatives Considered

- Rewrite the mobile app before restoring feature parity.
  - Rejected because it would discard working behavior and make regressions hard to isolate.
- Keep architectural and UI rules as prose only.
  - Rejected because later slices could drift without a deterministic CI signal.
- Ban all native style props.
  - Rejected because gesture, bottom-sheet, animation, safe-area, and runtime geometry APIs legitimately require native values.
