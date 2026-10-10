# HalaalVest Component Releases

## Current direction

The repository uses the same `local-infra-kit` component release flow as GND and EwaTrade. `release.config.ts` declares HalaalVest's topology; root `bun release` delegates to the sibling `../local-infra-kit/bin/infra.ts release`. The old vendored `.release` verifier, manifest, signed-evidence collector boundary, `release:*` commands and GitHub workflow were removed. The 25 September design is superseded by ADR-20261007-shared-component-release-flow.md.

## Components

| Component | Detection | Effect |
| --- | --- | --- |
| database | Prisma schema directory and Prisma config only | Selected Preview/Production `db:push`, before Git push |
| dashboard | Dashboard workspace dependency closure, including hosted `apps/api` | Git deploy to `halaalvest-dashboard`; wait for exact SHA READY |
| marketing | Marketing workspace dependency closure | Git deploy to `halaal-vest-marketing`; wait for exact SHA READY |
| jobs | Jobs workspace closure and deployment helpers | Deploy to selected Trigger project, provider environment `prod` |
| mobile-android | Mobile workspace closure and release helpers | Fingerprint-compatible OTA or native build, Preview and Production |
| mobile-ios | Same mobile closure plus iOS publisher helpers | Fingerprint-compatible OTA or native build, Production only |

`main` selects Production by default. Other branches select Preview; `--preview` can select it explicitly. The release owns the `preview` remote branch. Per-environment/component Git tags (`release/<environment>/<component>`) record successful release positions. No tag means the component must release. Root manifests/lockfiles affect source components; database changes remain schema-scoped.

## Mobile

Expo runtime compatibility uses `{ policy: "fingerprint" }`. EAS profiles and update channels use `preview` / `production`. `eas:auth` switches the shared Expo session before planner queries; build/update/submit authenticate into temporary isolated homes. Release planner and runner disable Expo dotenv so app-local development files cannot affect release fingerprints.

Release build and OTA commands carry `--expected-commit {sha}` and reject mismatched HEAD or a dirty working tree. Production OTA and Preview/Production builds require a pin even outside the release command. Quick Preview OTA without a pin remains possible. Publishing executes EAS directly without rewriting UPDATE_VERSION. `eas:update:prepare` is a separate, non-publishing metadata edit that must be committed before release.

Preview must explicitly select service URLs from `.env.preview`; API/dashboard origins must differ from Production. App config also rejects known Production hosts in cloud Preview configuration. API URL is the origin: the mobile client appends `/api/trpc`. Public legal origin can be shared. Existing source-presence, legal-publication, exact store-artifact and iOS publisher safeguards remain. Release does not automatically submit a build to stores.

## Trigger

Production remains `proj_ajaddxidcuphhhckxwja`. Preview requires its own project ref. Both projects deploy to Trigger's hosted `prod` environment, using that project's `tr_prod_sk_...` runtime key. `TRIGGER_ACCESS_TOKEN` authenticates the CLI; it is not a worker environment variable.

The selected mode file owns runtime secrets. Ambient/base credentials cannot fill missing selected-file project/key/token values. Preview rejects the Production project, normalized database target and reused runtime email/blob credentials. CLI target/config/env-file overrides are rejected. Config uses generated nonreserved `HALAALVEST_TRIGGER_PROJECT_ID` for hosted task loading when Trigger omits user-defined `TRIGGER_*` variables. Job environment sync uses a bounded allowlist; optional cleanup credentials must be provided in the selected file.

## Verification and handoff

Offline tests cover config validity/workspace closure, deployment isolation, pinned Git source, metadata behavior, Expo evaluation and existing submission guards. Scoped scripts and jobs TypeScript checks pass. No release, Git push/tag, database push, provider authentication or cloud publication was run for this implementation. The full provider/ENV setup checklist is in `runbooks/release-assurance.md`. First release acceptance remains a separate owner-led step after that setup.


## 10 October first-release audit

The [release audit](../tasks/2026-10-10-release-and-android-testing.md) confirms parity with the current EwaTrade component flow and passing local source checks. Expo config now supports environment-free provider metadata reads while retaining explicit release-profile endpoint validation. No component release tags or current-source hosted acceptance exist. Trigger credentials, database rotation/isolation, service origins and policy effectiveness remain prerequisites.

### Trigger key compatibility (10 October 2026)

Hosted worker key validation accepts both legacy `tr_prod_` and newer `tr_prod_sk_` keys. Trigger API returned legacy keys for both selected HalaalVest projects; read-only runs API authentication verified them. Development/Staging/Preview-branch keys and personal tokens are still rejected as worker keys. Separate-project and database/secret isolation checks remain enforced. Preview project reference: `proj_fzczxiaelzyrkydqfrrw`; Production remains `proj_ajaddxidcuphhhckxwja`.
