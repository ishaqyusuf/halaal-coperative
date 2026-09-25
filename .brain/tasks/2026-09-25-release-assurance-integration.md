# Release Assurance Integration

- Status: Source Complete — Hosted Activation Pending
- Date: 2026-09-25

## Delivered

- pinned the reusable release toolkit by immutable revision and checksums;
- declared the Prisma, Dashboard/API, Marketing, Expo, and Trigger.dev graph;
- added advisory local plan/status commands and a protected CI gate;
- added fresh signed, project/environment/revision-bound provider evidence;
- connected receipt, live-state, Vercel, Expo, jobs, and fingerprint verifiers;
- added Preview and Production plan/gate tests plus fail-closed evidence tests.

## Validation

- `bun test scripts/release-assurance.test.ts`: 4 pass, 18 expectations.
- Scoped strict TypeScript with the repository's Bun type root: pass.
- GitHub Actions YAML parse: pass.
- Preview and Production local status: pass; a missing baseline reports all
  five targets.
- Preview protected gate without its key: expected exit 2 with
  `Signed provider evidence key is unavailable.`
- UI QA: not applicable; no UI behavior changed.

## Remaining Hosted Work

Follow `.brain/runbooks/release-assurance.md`. This source boundary is complete,
but Halalvest is not live release-ready until the isolated Preview services and
trusted collector are provisioned and accepted.
