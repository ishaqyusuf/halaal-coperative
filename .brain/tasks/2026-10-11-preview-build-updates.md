# Preview build updates and QA alignment

Source implementation and local checks completed; hosted activation and signed Preview upgrade acceptance remain open.

## Delivered

- Android Preview registry, locked revision publication/withdrawal, hosted and standalone API adapters, stable Marketing `/apk` redirect.
- Normal Android Preview EAS runner validates exact build identity and uses the existing shared local-infra-kit publisher.
- Native download, cancellation/retry, artifact verification, installer permission handoff, final registry revalidation, coordinated OTA checks and scoped session restoration.
- QA chooser on sign-in, More and personal-access gate, safe switching/search/storage recovery.
- User-requested removal of tester credential input from Mobile, Dashboard and Marketing; exact configured domain-only entry, system receipts and legacy API compatibility.

## Verified locally

- Focused registry/API/redirect/publisher/restoration tests: 56 passing before the added domain-only regression.
- Actual update-client scenarios: 19 passing; malformed/expired SecureStore fixture passing.
- Mobile contract suite passing after domain-only UI change.
- Mobile/API/DB/Dashboard/Marketing typechecks passed; Mobile/API/Dashboard/Marketing rechecked after domain-only changes.
- Two generated Prisma migrations applied locally; required db:migrate, db:push and client generation passed.
- Real local PostgreSQL registry concurrency, idempotency and withdrawal checks passed; temporary test row removed.
- Disposable Android Dev APK compiled with native updater module and installed on emulator. This is not evidence of a signed Preview-to-Preview upgrade.

## Remaining activation and acceptance

- Deploy migrations and updated API/Marketing to the intended Preview target, configure publisher API URL/token and shared Preview DB. No hosted migration/deployment was performed.
- Existing hosted Marketing `/apk` returned 404 before deployment. Verify the eventual active redirect and chosen public download host/access policy. No domain-wide protection was changed.
- Build and publish a signed Preview APK through the normal runner, then exercise Preview-to-Preview installation, permission refusal/retry, cancellation, withdrawn/replaced registry, retained authenticated session/workspace and safe navigation, plus OTA continuity.
- Verify domain-only QA profile entry/switching against the hosted configured QA domain.

## Brain impact

Updated API endpoints/contracts/permissions, database schema/migrations, QA feature documentation and in-progress task list. Added Preview build feature, native registry ADR, domain-only QA ADR and this delivery record. Operational instructions: docs/releases/android-preview-download.md.

## Final follow-up checks

QA API/configuration regression: 8 tests, 35 assertions passing, including domain-only entry and Production rejection. Android emulator visually confirmed a single QA Domain field with no tester credential; full device entry remained unverified because emulator input automation stalled. No hosted deployment occurred.

Brain files updated in this delivery:

- `.brain/api/endpoints.md`
- `.brain/api/contracts.md`
- `.brain/api/permissions.md`
- `.brain/database/schema.md`
- `.brain/database/migrations.md`
- `.brain/features/mobile-dev-preview-qa-accelerator.md`
- `.brain/features/preview-build-updates.md`
- `.brain/decisions/ADR-20261011-preview-native-build-registry.md`
- `.brain/decisions/ADR-20261011-domain-only-qa-entry.md`
- `.brain/tasks/in-progress.md`
- `.brain/tasks/2026-10-11-preview-build-updates.md`

## Continuation — Preview rollout preparation

Provider plan readback confirms owned Preview projects/aliases and reports the dirty-source guard plus local Bun 1.3.9 versus pinned 1.3.0. A temporary Bun 1.3.0 runtime is ready for the release checkout. Current hosted Preview has four exact QA domain mappings; no new domain was invented. App publisher and QA capability settings are not yet configured.

Automatic approval review rejected remote Preview environment mutation for lack of explicit authorization for the settings/access scope. A precise Preview-only rollout approval is pending. No remote environment settings, schema, source deployment or cloud build changed in this continuation. Local review added preflight rejection tests for local/no-wait builds and removed a nonexistent resume route.

The Preview example environment now documents domain-only entry and the private publisher settings, without a tester-credential requirement.
