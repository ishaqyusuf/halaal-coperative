# Halaalvest Logly integration completion

## Status
Blocked — production Android build is complete, but installed-device acceptance requires an existing store distribution/install path.

## Created / Updated
2026-09-22

## Scope
Dashboard, marketing, and Android only. Preserve historical Logly workspaces and all unrelated saved-checkout changes. Implementation, configuration, testing, independent review, local/GitHub main merge and production release are authorized. No new public store listing or distribution-policy changes.

## Live checklist
- [x] Reconcile main and prior release source; establish isolated clean integration branch.
- [x] Verify exact production domains and create independent Dashboard/Marketing workspaces; reuse Mobile.
- [x] Implement surface isolation, privacy projection, and Android native attribution.
- [x] Configure app-specific Vercel and EAS production settings without exposing ingest secrets.
- [x] Pass focused tests, package checks, dependency reproducibility checks, and independent code review.
- [x] Safely merge into local and GitHub main while preserving saved-checkout changes.
- [x] Deploy both web apps from merged source and validate real arrivals/isolation/privacy/failure behavior.
- [x] Deliver an Android production AAB through the existing EAS production build path.
- [x] Verify installed Android behavior or record an evidenced external acceptance blocker.
- [x] Complete Brain impact check and release evidence.

## Evidence
- Clean Codex checkout started at local main `28fea89d` (remote main `4e8a66b9`).
- Branch `codex/logly-complete-20260922` starts at `232659e7`, which descends from local main and includes `1eaa4721`, `8974ea8f`, and prior Android build evidence.
- Compared prior web release `69d3a144`: analytics package is identical; current source preserves newer dashboard QA/decimal-hydration changes.
- Read prior Logly report through September 12 release entry. Prior build artifact and synthetic/provisioning evidence do not prove installed Android acceptance.
- Current implementation incorrectly labels native events as browser; web provider defaults to shared halaalvest-web. Both require correction.

## Blockers
The connected physical device still runs `com.halaalvest.mobile` version `0.1.0` build `5`. EAS production build `10` is a store AAB and cannot be installed directly with ADB. It has no release channel or completed store submission, and this task does not authorize a new public distribution path. Installed Android event acceptance therefore remains pending an authorized store/internal-distribution install.

### Provisioning and validation checkpoint
- Created Halaalvest Dashboard (`halaalvest-dashboard`) and Halaalvest Marketing (`halaalvest-marketing`) in organization `halaalvest`; verified/reused Halaalvest Mobile credential and kept legacy `halaalvest-web` unchanged.
- Vercel API verified dashboard app domain plus nine tenant domains; marketing apex/www and halaalvest.vercel.app. Exact allowlists are configured per surface (no wildcard).
- Logly report failure was shared query bug; parent task owns repair. Parent reports production fix `82b1eb5` deployed successfully.
- 15 analytics tests / 60 assertions pass. Events/mobile typechecks pass. Web typechecks are rerunning after generating Prisma client from unchanged schema (no DB connection/migration).
- Scoped Expo authentication succeeds for @cipron-startups/halaalvest, preserving global session. Historical production build9 has no channel; installed Android is 0.1.0/build5. New production binary is required rather than assuming OTA acceptance.
- Independent read-only reviewer is running before merge.

### Pre-merge evidence
- Frozen lockfile install passed. Events, dashboard, marketing, and mobile typechecks passed after Prisma generation from the unchanged schema.
- Production Android export passed with a 9.9 MB Hermes bundle.
- Independent review found one blocking browser-storage failure. A lazy guarded adapter with memory fallback now covers storage getter/write failures; reviewer reran 16 tests / 78 assertions and confirmed no remaining merge blocker.

### Release evidence
- Integration source `db00d36f8bca50e31c3f663783d133ef067d9f3b` was fast-forwarded to local and GitHub `main`. The saved checkout's unrelated tracked and untracked work was preserved; the merge autostash remains available as an additional recovery point.
- Dashboard deployment `dpl_DhqMhzm4MqVAsQfGLy45pCtgwMnp` and marketing deployment `dpl_EWCVvEiZHEyLSCxYmymzdcnEcJgp` reached Ready from integration source `db00d36f`.
- Real production visits produced isolated Logly arrivals: marketing `site_visit` in `halaalvest-marketing` for `/`; dashboard `page_view` and `site_visit` in `halaalvest-dashboard` for `/login`. Payloads carried empty properties and null actor, campaign, and referrer values; no arrivals appeared in legacy web or mobile during the validation window.
- EAS production build `cbe2b272-20c3-4692-bc7c-5c3023d4641e` finished successfully as Android version `0.1.0`, build `10`, from source `db00d36f`. Artifact: `https://expo.dev/artifacts/eas/UguTcmEhQZqGR3ZndFkq35z6F2c24O4y2gff9NJkhL4.aab`.
- No database schema or migration changed. The Brain impact check updated feature, API, decision, and task documentation for the analytics contract and release state.
