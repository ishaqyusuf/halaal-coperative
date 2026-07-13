# QA Report

Status: website QA pass completed locally for the Minna Trust cooperative onboarding scenario.

## Run Metadata

- Date: 2026-07-13.
- Tester: Codex.
- Tenant: Minna Trust Civil Servants Multipurpose Cooperative.
- Dashboard URL: `http://minna-trust-civil-servants-multipurpose.halaalvest-dash.localhost`.
- Marketing URL rule: `http://halaalvest.localhost`.
- App command rule: `bun run dev --local --filter dashboard marketing`.
- DB command rule: `bun run db:push --local` / `bun run db:push --prod`.
- Browser: Codex in-app browser.
- Setup mode: brought-forward opening positions.

## Results

| Step | Area | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 0 | Preflight | Pass | Portless dashboard host loaded and authenticated users could switch through the local login picker. | Used existing local tenant. |
| 1 | Cooperative setup | Pass after fixes | Operation profile, shares, charges, admin member backfill, and final review unlocked live operations. `/getting-started` showed "Live operations are unlocked." | Fixed setup routing so brought-forward mode does not loop through empty business/profit steps and final review is reachable. |
| 2 | Admin opening position | Pass after fix | Sally opening position applied: NGN 830,000 commitment savings, NGN 200,000 special savings, active brought-forward loan, NGN 500,000 procurement, NGN 25,000 Foodstuff Purchase. | Fixed setup gate so `/members/:id/backfill` is allowed during setup. |
| 3 | Second member onboarding | Pass with local provisioning fallback | Created Aisha Bello `MT-0002`, applied opening position, linked local user `aisha.bello.minna.qa@example.test`, and logged in as member. | Admin UI for sending onboarding email to an existing staff-created member was not found; used local DB provisioning fallback for QA. |
| 4 | Member self-service | Pass with one route caveat | Aisha submitted receipt `QA-AISHA-JULY-001`, procurement MacBook Pro M1 for NGN 1,500,000 over 2 months, Foodstuff Purchase for NGN 60,000 over 2 months, and project financing for NGN 200,000 over 6 months. | `/loans` redirected to member dashboard; available member-side financing request route is `/project-financing`. |
| 5 | Admin reviews and notifications | Pass with local email caveat | Admin approved receipt, procurement, Foodstuff Purchase, and project financing. Procurement review note: "Approved. Please step into the office for final activities." | Local audit showed notification email attempts failed for `example.test` addresses, which is expected in this local QA environment. |
| 6 | Activity and audit | Pass | `/reports/audit` loaded 72 events and showed receipt approval, procurement approval, Food Purchase approval, project financing approval, actors, approvers, entity IDs, timestamps, and notes. | Activity report met the "who did what" requirement. |

## Fixes Validated

- Brought-forward setup no longer treats empty historical business/profit steps as mandatory blockers.
- Getting Started routes to final review when finalization is the only remaining setup requirement.
- Member backfill routes are allowed through setup gating.
- Applied opening balances count as member ledger migration evidence in brought-forward setup mode.
- Foodstuff released-funds guard blocks approval when the cycle does not have enough remaining released funds.

## Local QA Data Adjustments

- Updated the Jul 2026 Foodstuff Purchase cycle released amount from NGN 25,000 to NGN 100,000 so it could cover Sally's NGN 25,000 brought-forward Foodstuff balance and Aisha's NGN 60,000 request. The first approval attempt correctly failed before this correction.

## Bugs / Product Gaps Found

- Existing staff-created member onboarding email flow was not visible from the member detail page. QA used local password provisioning to continue.
- Member `/loans` did not expose a loan request form for Aisha; it redirected to the member dashboard. The currently available member self-service financing request is `/project-financing`.
- Local email delivery attempts failed for `example.test` recipients. This is acceptable for local QA but should be re-tested with a configured mail sink/provider before launch.

## Automated Checks

- `bun test apps/dashboard/src/lib/setup-gate.test.ts apps/dashboard/src/lib/getting-started/operation-profile-flow.test.ts packages/db/src/queries/migration.test.ts packages/db/src/queries/opening-balances.test.ts packages/db/src/queries/procurement.test.ts packages/db/src/queries/food-purchase.test.ts packages/db/src/queries/payment-receipts.test.ts packages/db/src/queries/operation-profile.test.ts` -> 107 pass, 0 fail.
- `bun --filter @halaalvest/dashboard typecheck` -> pass.
- `bun --filter @halaalvest/dashboard lint` -> exit 0 with existing warnings.
- `git diff --check` -> pass.
