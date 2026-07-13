# Local QA Environment Strategy

## Commands

- Start the local website stack with:
  - `bun run dev --local --filter dashboard marketing`
- Use portless URLs:
  - Marketing: `http://halaalvest.localhost`
  - Dashboard tenant: `http://minna-trust-civil-servants-multipurpose.halaalvest-dash.localhost`
- Database sync commands, only when schema/database changes require them:
  - Local: `bun run db:push --local`
  - Production: `bun run db:push --prod`

## Data Safety

- Do not use production URLs or production database mutation commands for this QA run.
- Prefer a fresh local tenant when a clean browser pass is required.
- If reusing the currently opened Minna Trust tenant, record the tenant id/slug and current browser URL in `QA-REPORT.md` before mutating data.
- Stop the run before applying money-impacting actions if the active tenant cannot be confirmed as local and disposable.

## Repeatability Choice

Use the existing local Minna Trust tenant only when it is already the target of the browser session and the user expects continuity. For a clean repeatable pass, create a fresh tenant from marketing signup/onboarding and use the same canonical data values. The runbook supports either path but requires recording which path was used.

## Email And Token Capture

- Real customer email delivery is out of scope.
- Prefer visible development links or notification/audit evidence exposed by the app.
- If the UI does not expose a password setup/onboarding link, use a local-only database/query helper to inspect the relevant member signup/onboarding link or notification evidence.
- Do not send real external email during QA.

## Evidence Folder

- Store screenshots, local dummy upload files, and notes under `.scratch/wayfinder-cooperative-onboarding-qa/evidence/`.
- Name evidence files with an ordered prefix such as `03-operation-profile.png` or `06-member-receipt-submitted.png`.

