# HalaalVest Release Setup and First Run

## Implementation delivered

`bun release` now uses the shared GND/EwaTrade component release engine. It pushes schema changes first, pushes the selected Git revision, waits for owned Vercel deployments, deploys jobs and selects mobile OTA/build by native fingerprint. Release tags advance only for successful components. This replaces the former signed-bundle/CI verifier; no collector, HMAC release secret or hand-authored receipt is required.

This implementation has been checked locally. No actual release, provider login, Git push/tag, database push, build, OTA or deployment was run. Configure the following first; do not copy private values into this document or Git.

## 1. Separate database and Trigger environments

Create **HalaalVest Preview** as a separate Trigger.dev project, alongside the existing Production project. Retrieve each project's **Production environment** runtime key (`tr_prod_...`, including newer `tr_prod_sk_...` keys). Create a Trigger personal access token with access to those projects for CLI deployments. The CLI token and runtime key serve different purposes.

Put these values in both selected root files:

| Key | `.env.preview` | `.env.production` |
| --- | --- | --- |
| `APP_ENV` | `preview` | `production` |
| `HALAALVEST_DATABASE_URL` | Isolated Preview PostgreSQL database | Production PostgreSQL database |
| `TRIGGER_PROJECT_ID` | New Preview `proj_...` ref | `proj_ajaddxidcuphhhckxwja` |
| `TRIGGER_SECRET_KEY` | Preview project's hosted prod key | Production project's hosted prod key |
| `TRIGGER_ACCESS_TOKEN` | CLI personal access token | CLI personal access token |

The personal access token can belong to the same operator in both files. Runtime keys, database target and applicable email/blob credentials must be isolated. `.env` or the terminal cannot supply missing selected-file jobs credentials. Do not configure Preview as a branch of the Production Trigger project. Do not put the CLI personal access token in hosted workers, Vercel or Expo. `HALAALVEST_TRIGGER_PROJECT_ID` is generated and synced automatically; no manual setup needed.

Jobs sync selected-file database, APP_ENV, Trigger runtime key and these feature-dependent values:

- Email: `RESEND_API_KEY`, `EMAIL_DELIVERY_MODE`, `EMAIL_FROM_ADDRESS`, `EMAIL_REPLY_TO`, `EMAIL_QA_DOMAIN_ROUTES`, `EMAIL_TEST_MODE`, `EMAIL_TEST_RECIPIENT`, `TEST_EMAIL`. Supply reviewed values if delivery is enabled; use Preview-only transport and routing in Preview.
- Job telemetry: `SENTRY_DSN_JOBS`, `SENTRY_ENVIRONMENT_JOBS`, `SENTRY_RELEASE_JOBS`. Source-map upload additionally reads local `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT_JOBS`; upload credentials are not worker values.
- QA resource cleanup: `BLOB_READ_WRITE_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_API_TOKEN`, `VERCEL_TEAM_ID` or `VERCEL_TEAM_SLUG`, and `UPLOAD_DIR` if using local upload cleanup. Supply only when those resources are used. Preview credential values must be separate; review the selected cleanup project/store. Local paths are not shared with hosted web deployments.

Templates: `.env.preview.example`, `.env.production.example`. Actual private mode files remain ignored.

## 2. Web projects and Preview origins

Keep these owned Vercel projects Git-connected to this repository in team `team_BV5rgKHJH4fMyFL1YfscZIZK`:

| Project | Root directory | Production branch |
| --- | --- | --- |
| `halaalvest-dashboard` | `apps/dashboard` | `main` |
| `halaal-vest-marketing` | `apps/marketing` | `main` |

Allow Git deployments on the release-owned `preview` branch. Dashboard hosts the API; there is no new standalone API project. Configure isolated Preview ENV values in both projects, including the Preview database, auth/session secrets and URL/trusted-origin configuration, Trigger Preview runtime key for API task dispatch, email transport and applicable Blob/QA settings. Keep Production ENV values in Production scope. Retain existing application-specific payment, store, legal and telemetry configuration where those features are enabled.

Use stable HTTPS Preview dashboard/API and marketing aliases before building mobile. `EXPO_PUBLIC_API_URL` is an origin, without `/api/trpc`. The dashboard API is served at that path by the client. The web auth/origin settings must allow the chosen Preview aliases.

The shared `release env` command audits source-referenced **names** against the selected Vercel/EAS settings and local `.env` plus mode file. It does not prove value isolation; check the values when configuring each provider. There are no blanket feature/ENV bypass lists copied from EwaTrade. Complete any application-specific names that audit reports before the first release.

## 3. Expo account and mobile environments

Use existing Expo project `3fb3e5e2-bd84-4308-8739-e9f4436d0da9`, owner `cipron-startups`, slug `halaalvest`.

Local base `.env` needs `EAS_EMAIL` (or `EAS_LOGIN`) and `EAS_PASSWORD`; `EAS_USERNAME` is optional. Existing credentials can be retained. These are account login credentials, never mobile/public variables. The release's `eas:auth` switches the shared session to this account before reading fingerprints/builds/environment names. Publishing uses an isolated session. An Expo token is not required by this email/password workflow.

Set these values in each root mode file **and** in the matching EAS environment (`preview` / `production`):

| Key | Required value |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Selected API HTTPS origin; Preview must be isolated |
| `EXPO_PUBLIC_DASHBOARD_URL` | Selected dashboard HTTPS origin; Preview must be isolated |
| `EXPO_PUBLIC_LEGAL_ORIGIN` | Reviewed public legal HTTPS origin; may be shared |

Use `HALAALVEST_EXPO_PROJECT_ID=3fb3e5e2-bd84-4308-8739-e9f4436d0da9` and `HALAALVEST_EXPO_OWNER=cipron-startups` only if explicitly overriding the built-in defaults. Profiles already select their matching EAS environment and channel. Cloud APP_VARIANT is profile-owned (`preview` / `production`), not a user-selected release override. Configure enabled public mobile feature/telemetry values in the same EAS environment as required by the source-name audit. Never put private provider credentials under `EXPO_PUBLIC_*`.

The earlier Brain inventory recorded Production API/dashboard values in EAS Preview and a missing legal origin. Replace/verify those values before Preview acceptance; this task did not alter remote EAS settings.

Android participates in both environments; iOS releases are Production-only, as in GND. Preserve the existing iOS Organization identity and publisher handoff, managed signing, Android keystore, provider quota, effective public legal pages and reviewed release endpoints. Fingerprint policy replaces app-version runtime matching: existing version-runtime builds will require a new compatible native build. Store submission remains a separate exact-build action with artifact/legal preflights.

## 4. Local tooling and source

- Keep the sibling `../local-infra-kit` checkout installed with the current shared release flow. HalaalVest now uses it directly, as the references do; it no longer vendors a snapshot.
- Install repository dependencies with the existing Bun lock. Jobs uses its installed workspace Trigger CLI. Shared release provider queries prefer the operator's global Vercel/EAS CLIs. Ensure those are installed and Vercel is authenticated into the owned team. The mobile runner invokes EAS in the mobile workspace, with the provider's existing credentials/signing setup.
- Ensure Git push access to `origin`, `main`, the owned `preview` branch and `release/<env>/<component>` tags.
- Review and commit the intended source before a release. The current checkout contains extensive unrelated existing work; this task did not stage, commit or discard it. Release mobile commands reject a dirty working tree. Preview `--allow-dirty` does not bypass the pinned mobile source guard.
- Optional `bun run eas:update:prepare` edits metadata only; commit that edit before release. OTA publication itself never rewrites source.

## 5. First test, after setup

Run only once the operator is ready to start the requested first release test:

1. `bun release env --preview` — names audit; provider reads and EAS account switch can occur.
2. `bun release plan --preview` — inspect first-run components and mobile fingerprint decisions. This can fetch Git and query providers; it is not an offline unit check.
3. `bun release --preview` — the first actual release. It may push schema, Git, tags, deployments, native builds and OTA. No such command was run during implementation.
4. Verify the Preview web/API aliases, new Trigger worker/project and installed compatible Android build/OTA. Keep Production as a separate later release.

An absent component release tag means it will be included. `--only database,dashboard,marketing,jobs,mobile-android` can scope a reviewed test, and `--mobile skip|update|build` is an explicit operator override; normal automatic selection is preferred. Do not mark a component released unless provider effects are actually accepted.

## 10 October setup progress

Both Neon role resets are saved and fresh connections succeed. Preview old-password rejection is verified; old Production rejection remains unverified. Existing operator Trigger profile `ishaqyusuf` owns Production `proj_ajaddxidcuphhhckxwja` and new Preview `proj_fzczxiaelzyrkydqfrrw`; both local selected-file checks and authenticated API reads pass. Preview bundling dry run passed. Worker imports explicitly clear absent managed optional values; verify hosted readback after deployment. See ADR-20261010-shared-vercel-environment-namespace.md for the shared Vercel alias contract. No hosted source deployment is implied by these setup results.
