# Release and Android testing — 10 October 2026

Status: In progress; hosted release and installable build await owner configuration.

## Requested scope

Verify the release flow against EwaTrade, release current work to Preview and Production, then provide an Android testing build, preferably an AAB through Google Play. The owner explicitly selected **review and release all current work**. No source was discarded, staged or committed during this audit. Initial Git status reported 1,136 changed/untracked entries (directory-collapsed); the checkout contains more individual files, including generated native and QA artifacts that must not be blindly committed.

## Reference and implementation findings

Current EwaTrade `release.config.ts`, its 6 October simple-release plan and sibling `local-infra-kit/RELEASE.md` confirm the component flow already adopted here: schema before Git push, exact-revision Vercel readiness, separate Trigger projects, fingerprint-selected mobile build/OTA and independent successful-component tags. EwaTrade's older release-assurance runbook is superseded by that source. Neither HalaalVest environment has component release tags. Planner reads are not releases.

Corrections made during review:

- Allow Expo metadata queries to evaluate default app identity before a provider attaches a selected environment. Explicit Preview/Production variants and build profiles still invoke endpoint/identity validation. The config regression test now includes a metadata-only evaluation without service URLs.
- Align the update-metadata test with the non-publishing command and make the device-session test expiry relative to execution time.
- Classify remaining query failures with existing `ExpectedQueryError` or `QueryInfrastructureError`: expected evidence authorization/conflict and cursor failures preserve safe transport semantics, while failed QA invariants/configuration remain reportable internal failures. Evidence tests assert permission/conflict codes.
- Refresh table/filter assertions for individual row actions and draft-only Reset followed by awaited Apply. No visual layout was changed.
- Repair the mixed local React installation with a frozen install using repository-pinned Bun 1.3.0; this fixed four marketing render tests without changing the lockfile.
- Move the app-wide personal-access provider into `src/runtime/mobile-app-access-provider.ts`, expose bounded subscription/legal public contracts, inventory `/mobile-access`, and update the runtime check for the existing paid-access guards. Source-presence preflight follows the provider's new path.

## Accepted local evidence

- Combined source tests using Bun 1.3.0: **1,939 passed, 16 skipped, zero failures**, 7,032 assertions across 387 files. The skipped suite hooks/cases are database-dependent; the three integration files were also run separately against local PostgreSQL.
- Local integration: **6 passed**, 49 assertions, covering account recovery, durable session replacement/revocation, and evidence finalization/record association. Tests clean up their uniquely named tenant fixtures.
- Root typecheck after corrections: **19/19 tasks passed**. Generation-only validation used a dummy localhost URL, not hosted credentials.
- Optimized Dashboard and Marketing production builds both exited zero. Network permission was needed for Google Fonts; neither build deployed anything.
- Mobile executable contract passed: **39 routes, 7 shells**, native imports, runtime, theme, UI, keyboard, development-fixture and smoke checks.
- `bun db:migrate` and then `bun db:push` against `127.0.0.1:55434/halaalvest` both report synchronized schema. No migration, reset or hosted DB write occurred.
- Focused Expo config/source and error-contract checks pass; Git whitespace check passes.

## Current hosted/configuration blockers

Private values were compared without printing them. Do not copy secrets into this task.

1. Root Preview still declares `APP_ENV=remote-dev`. It must be `preview` for jobs. Preview has no Trigger project/key/access token. Production has a project/key, but its key fails the required hosted `tr_prod_sk_` format and its access token is absent.
2. Preview and Production root DB URLs have different hosts but the **same password**, matching the existing unresolved exposed-credential incident. Follow `../runbooks/neon-shared-role-credential-rotation.md` under owner control before hosted rollout; no credential was rotated here.
3. Both root mode files lack explicit `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DASHBOARD_URL` and `EXPO_PUBLIC_LEGAL_ORIGIN`. Authenticated EAS Preview readback contains API/dashboard `https://app.halaalvest.com` and no legal origin. A connected Preview must use isolated reachable services. The corrected metadata read works; Preview fingerprint/build readiness remains unaccepted.
4. Full Vercel names audit reports Preview Dashboard 13 and Marketing 22 absent names; scoped Production plan reports Dashboard 9 and Marketing 20. These include optional/local names as well as real configuration, so counts are not an instruction to copy every variable or enable QA in Production. Review enabled features and exact target values.
5. Public-pages submission preflight fails locally with `source-policy-not-effective`; the six legal/support policies remain drafts. No legal approval or effective-publication claim was made.
6. On 10 October, Chrome Play Console shows **Zeroes and One — Organization account 9017957593475991384**, with **Create your first app**. This supersedes the older Personal-account observation for the currently signed-in publisher. No HalaalVest app, Play testing track, declarations or upload were created in this task. Do not change account-wide ownership or transfer settings implicitly.
7. Latest five EAS Android records were inspected. Newest finished build `3823cfe4-d0e6-40d9-8782-24e01cc23c07` is `native-validation`, version 0.2.0/build 14, without recorded Git commit. It is not a release candidate. No current-source APK/AAB was generated or submitted here.

Owned Vercel project reads show READY historical Preview deployments for Dashboard and Marketing, but do not prove current-source release, alias health or authenticated flows. Source, deployment, configured backend and signed-device acceptance remain distinct.

## Next steps

10 October follow-up: owner authorized Vercel DB rotation and HalaalVest-prefixed shared environments. Provider inventory now confirms Neon `main`/`dev` endpoint mappings and a single sensitive shared `HALAALVEST_DATABASE_URL` targeting both Preview and Production, linked to both web projects. See the credential-rotation runbook for exact IDs. Prepare separate environment targets; do not reuse the Production secret for Preview. Browser policy requires owner execution of the password reset; the Preview role menu is open for handoff. No rotation or shared-env mutation has occurred. Broader prefix normalization and release/build work remain pending.

- Owner supplies securely rotated/separate DB URLs and each selected Trigger project/runtime key plus CLI access token in ignored root mode files (question pending). Do not paste them in chat.
- Configure isolated Preview backend, stable HTTPS aliases and matching EAS/root mobile origins, then review runtime Vercel configuration and legal readiness.
- Complete the exact release-source review/commit, excluding generated native trees, private files and incidental artifacts; rerun source pin checks. Use Bun 1.3.0 for install/planning/build fingerprint consistency.
- Release Preview first, verify real auth/API/jobs/links, then release the reviewed Production components. Android is requested; do not include iOS implicitly.
- Generate a Preview APK for direct installation or a store-QA AAB for the eligible Play internal-testing app. Verify the exact signed artifact and real-device flows before submission/acceptance. No `native-validation` artifact may substitute.

No hosted database push, Git push/tag, Vercel deployment, Trigger deployment, EAS build/OTA or Play submission occurred in this task.

### Preview credential follow-through

Owner completed Preview reset. New DB authentication passes and old Preview password is rejected. Ignored local Preview/root env files updated; Vercel DB shared variable split into Preview-only (new credential) and Production-only (existing value), both linked to the two web projects, verified by API readback. Production reset is the next owner handoff; no redeployment or Android build yet. Broader shared prefix normalization remains pending.

### Production rotation and Trigger account setup

Production reset success confirmed in Neon and replacement authenticates; local Production already held the new value. Production shared Vercel entry updated successfully, separate from Preview. Old Production password rejection still unverified. Owner explicitly authorized using the existing Trigger account and configuring its projects. Saved CLI profile `ishaqyusuf` owns HalaalVest Production in organization `school-clerk-7783`. Created HalaalVest Preview (`proj_fzczxiaelzyrkydqfrrw`, slug `halaalvest-preview-Ao6U`) there. Both projects use hosted `prod` environments, with distinct authenticated runtime keys and matching DB branches in ignored local mode files. CLI access token remains local and is not synced to workers. Both deployment-profile checks pass. Fixed validation to accept authenticated provider-issued legacy `tr_prod_` keys as well as `tr_prod_sk_`; six profile tests / 28 assertions pass. No jobs or web release completed yet.

### Shared environment and release review

Added an allowlisted server-side shared-variable adapter at Next build/startup and declared `HALAALVEST_` to the shared release audit. Hosted shared APP_ENV and Trigger project/runtime keys now accompany the separate DB variables and link both web projects. Root typecheck passed 19/19 after this adapter. Source review found and fixed a double-refund race using transactional tenant/prior-status claims; worker sync now clears omitted managed optional settings. Focused regression tests pass. Native generated trees and local screenshot evidence are excluded from release source, retained on disk. Play policy approval remains outstanding; asked owner whether to prioritize Preview APK or prepare AAB while holding submission.

Final local review validation: **1,990 passed, 16 skipped, zero failed**, 7,197 assertions in 398 files. Root typecheck **19/19 passed**. Focused charge/shared-env/Trigger set **35 passed**, 110 assertions. Credential-pattern scan and Git whitespace check passed. The review also noted a broader pre-existing cross-application payment-reference concurrency risk; tracked separately from the fixed same-application refund race.

### Preview rollout and cloud compatibility

Owner selected Preview APK first. Commit `b99932650bf3e65ce62d84530a2760867ce6dbd9` records all reviewed current source and Brain documents. Preview DB push synchronized without data-loss overrides; branch `preview` was pushed. Vercel accepted Dashboard `dpl_9LY3BWd2nsqF3PxYCwpoERWcMvEV` and Marketing `dpl_31WJy71nPSQf8EcbyZwFY6nHvJU3` for this SHA. Stable aliases are `https://halaalvest-dashboard-git-preview-ishaqyusufs-projects.vercel.app` and `https://halaal-vest-marketing-git-preview-ishaqyusufs-projects.vercel.app`. Only these two aliases have deployment-protection exceptions for ordinary app login/phone API access. Marketing home/pricing and Dashboard login loaded; unauthenticated API health returns `api: ok`. This is not authenticated-member flow acceptance.

Shared URL/domain settings are now separately scoped and superseded project overrides removed while preserving Development settings and existing Production auth. Preview has independently generated shared auth/signup/early-access secrets and console email mode. Both local mode files and EAS environments now own API/dashboard/legal origins; Preview services use the branch alias, legal origin is `https://halaalvest.com` (draft-policy status remains).

Real local PostgreSQL forced-concurrency check passed: one waiver/reversal winner, one conflict, one correction and one refund; fixtures removed. First EAS APK build `79030469-7e40-4b1a-804f-ca9a989e81bd` (Preview, versionCode 4, exact source SHA) failed during app config evaluation on Node 20.19.4. The iOS publisher identity now has a CommonJS runtime entry with explicit TypeScript declarations, avoiding a nested raw-TypeScript dependency in Expo config. Exact Node 20.19.4 config evaluation now passes; config regression explicitly disables automatic TS stripping and passes 73 assertions. Publisher/profile tests pass (14 tests, 77 assertions); typecheck passes 19/19.

Trigger's first upload failed with HTTP 400; the official CLI project-client diagnostic succeeded on retry. Worker build `20261010.1` then failed because bundling the Sentry build plugin promoted macOS-only fsevents to a required Linux dependency. Preserving `@sentry/esbuild-plugin` as a package external removes fsevents from required bundle dependencies; bundling dry run passes. Worker deployment and APK retry remain pending. No Production source rollout or Play submission yet.
