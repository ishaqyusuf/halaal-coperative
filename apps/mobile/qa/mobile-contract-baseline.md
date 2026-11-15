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

## 15 November 2026: fully-drawn marker from a config plugin

`check:contract` had been red since a prebuild regenerated `android/` without the hand-edited `reportFullyDrawn()` marker in `MainActivity.kt` (the directory is git-ignored). `plugins/with-fully-drawn-marker.cjs` now draws the one-shot `CONTENT_APPEARED → reportFullyDrawn()` listener into every variant's `MainActivity`. The smoke guard asserts the plugin and its registration in `app.config.ts`, and checks a local `android/` only when one exists (it fails a prebuild that predates the plugin).

| Check | Result |
| --- | --- |
| `bun --cwd apps/mobile check:contract` | Passed: 32 routes, 33 visual screens, 5 viewports, 19 flows |
| `plugins/with-fully-drawn-marker.test.ts` | Production and dev packages, idempotent re-run |
| Dev-variant `expo prebuild --platform android` (in place) | Only `MainActivity.kt` changed, with the marker |

This is a native change: the fingerprint changes and a new native build is needed. The 639 ms fully-drawn median still needs re-measuring on a new build.

