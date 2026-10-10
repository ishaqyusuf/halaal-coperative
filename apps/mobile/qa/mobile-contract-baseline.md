# Mobile Contract Baseline

Recorded on 2026-08-11 before the feature/runtime migration began.

## Covered contract

- 24 user-visible Expo Router routes and seven route/provider shells are inventoried in `mobile-architecture-contract.json` with feature, role, and tenant boundaries.
- Route entrypoints remain thin and cannot own query, mutation, persistence, or legacy transport orchestration.
- Cross-feature internals, unsafe shared barrels, web/dashboard dependencies, and authoritative client finance calculations are guarded.
- NativeWind `className` and semantic light/dark tokens are the default UI contract. Four unavoidable native style integrations are documented in `mobile-native-style-exceptions.json`.
- Input-bearing route scroll surfaces use `AppKeyboardAwareScrollView`; the root keyboard provider and Gorhom sheet keyboard contract are guarded.
- Money-affecting commands remain online-only, server-authorized, tenant-scoped, auditable, and never inferred from cache.

## Green baseline

| Check | Result |
| --- | --- |
| `bun --cwd apps/mobile check:contract` | Passed: architecture, native imports, NativeWind theme/UI, keyboard, 21-route smoke, five viewports, and 14 flows |
| `bun --cwd apps/mobile typecheck` | Passed |
| `bun --cwd apps/mobile lint` | Passed with one pre-existing generated `.expo/types/router.d.ts` unused-disable warning and no errors |
| `bun test apps/api/src/routers/mobile-auth.route.test.ts apps/api/src/routers/mobile.route.test.ts packages/db/src/queries/operation-profile.test.ts` | 88 passed, 0 failed |

Emulator/simulator screenshots are collected per feature slice and at the dedicated native/device tickets; this architecture ticket changes contracts and keyboard scroll behavior but does not claim the full device matrix.
