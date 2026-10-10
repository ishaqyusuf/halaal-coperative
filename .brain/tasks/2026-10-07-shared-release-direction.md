# Shared Release Direction Implementation

- Status: Source Complete — ENV/Provider Setup and First Release Pending
- Date: 2026-10-07
- Owner request: Follow the current GND/EwaTrade release flow; finish code first, hand off ENVs/provider creation, then run the first release separately.

## Delivered

- Root shared `bun release`, component config and per-environment targets; Dashboard closure includes its API.
- Schema-only database push before Git; exact-SHA Vercel readiness, jobs deployment and fingerprint-native mobile flow provided by the same sibling engine as the references.
- Separate Trigger Preview project contract, project-specific prod runtime keys, CLI personal access token, selected-file runtime ENV sync and override/isolation guards.
- Shared EAS account switch, isolated effects, explicit provider environments, clean expected-SHA builds/OTA, fingerprint runtime policy, Preview endpoint isolation, and metadata-only preparation.
- Existing store-artifact/legal/source/iOS publisher checks preserved and Android app-config inspection updated for fingerprint policy.
- Old vendored assurance/manifest/CI workflow removed and Brain architecture/runbook superseded.

## Local checks

56 focused config/profile/mobile/source/submission regression tests across 12 files passed, including Node Expo config evaluation, scoped strict scripts TypeScript, jobs TypeScript and EAS runner bundle compilation. Current dirty source is rejected before EAS authentication. No release/provider ENV mutation, authentication, Git push/tag, database push or cloud deployment was run.

## Handoff

Follow `../runbooks/release-assurance.md`: create Trigger Preview, fill root selected files and provider ENVs, replace EAS Preview Production service URLs, ensure local toolkit/provider access, and review/commit source. First Preview release/installed acceptance remains pending by instruction. See `../decisions/ADR-20261007-shared-component-release-flow.md`.

## Brain documentation impact

Updated `.brain/BRAIN.md`, `.brain/system/architecture.md`, `.brain/engineering/coding-standards.md`, `.brain/features/release-assurance.md`, `.brain/runbooks/release-assurance.md`, `.brain/tasks/in-progress.md`, `.brain/tasks/done.md` and this task. Added `.brain/decisions/ADR-20261007-shared-component-release-flow.md`. Marked `.brain/decisions/ADR-20260925-release-assurance-provider-evidence-boundary.md` and `.brain/tasks/2026-09-25-release-assurance-integration.md` superseded. No Prisma schema, API endpoint, permission or business contract changed; database/API documentation changes are unnecessary.
