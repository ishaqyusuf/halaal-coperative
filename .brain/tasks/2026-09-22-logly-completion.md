# Halaalvest Logly integration completion

## Status
In Progress

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
- [ ] Safely merge into local and GitHub main while preserving saved-checkout changes.
- [ ] Deploy both web apps from merged source and validate real arrivals/isolation/privacy/failure behavior.
- [ ] Deliver Android build/update through existing compatible production path.
- [ ] Verify installed Android behavior or record an evidenced external acceptance blocker.
- [ ] Complete Brain impact check and release evidence.

## Evidence
- Clean Codex checkout started at local main `28fea89d` (remote main `4e8a66b9`).
- Branch `codex/logly-complete-20260922` starts at `232659e7`, which descends from local main and includes `1eaa4721`, `8974ea8f`, and prior Android build evidence.
- Compared prior web release `69d3a144`: analytics package is identical; current source preserves newer dashboard QA/decimal-hydration changes.
- Read prior Logly report through September 12 release entry. Prior build artifact and synthetic/provisioning evidence do not prove installed Android acceptance.
- Current implementation incorrectly labels native events as browser; web provider defaults to shared halaalvest-web. Both require correction.

## Blockers
None established yet.

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
