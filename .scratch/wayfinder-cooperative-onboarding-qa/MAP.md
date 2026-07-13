# Wayfinder: Minna Trust Cooperative Onboarding QA

## Destination

Create an approved, executable end-to-end QA scenario spec for onboarding Minna Trust Civil Servants Multipurpose Cooperative through brought-forward setup, admin/member finance workflows, member self-service submissions, admin approvals, notifications, and activity/audit visibility.

The map is complete when the scenario data, expected calculations, test environment, workflow coverage, and pass/fail criteria are clear enough to hand off to QA execution without guessing.

## Notes

- Use `halaal-cooperative-domain`, `wayfinder`, and the project Brain docs for domain language and finance safety.
- Local spec: [Minna Trust Cooperative Onboarding QA Spec](SPEC.md).
- Treat this as QA wayfinding, not implementation. Do not run the full browser test or fix bugs while charting the map.
- Local QA should use `bun run dev --local --filter dashboard marketing` and portless URLs: `halaalvest.localhost` and `tenant.halaalvest-dash.localhost`.
- Database sync commands are `bun run db:push --local` and `bun run db:push --prod`; only use them when schema/database changes require it.
- Current date for relative scenario interpretation is July 13, 2026.
- High-risk areas: brought-forward balances, active loan schedules, procurement/food purchase schedules, member self-service permissions, email/password onboarding, approval notifications, and activity/audit logs.
- Local tracker lives under `.scratch/wayfinder-cooperative-onboarding-qa/`; do not publish this Wayfinder map to GitHub.

## Decisions so far

- Canonical QA data is locked in [CANONICAL-DATA.md](CANONICAL-DATA.md).
- Implemented route/action coverage is inventoried in [ROUTE-MATRIX.md](ROUTE-MATRIX.md).
- Local environment and evidence strategy is defined in [ENVIRONMENT.md](ENVIRONMENT.md).
- Final website-first execution script is available in [RUNBOOK.md](RUNBOOK.md).
- QA result capture template is available in [QA-REPORT.md](QA-REPORT.md).
- Website-first QA execution completed locally on July 13, 2026. Results, fixes, and remaining product gaps are captured in [QA-REPORT.md](QA-REPORT.md).

## Tickets

- [Resolve canonical cooperative onboarding QA data](tickets/01-resolve-canonical-cooperative-onboarding-qa-data.md) — resolved, `wayfinder:grilling`
- [Inventory implemented routes and workflow support](tickets/02-inventory-implemented-routes-and-workflow-support.md) — resolved, `wayfinder:research`
- [Decide repeatable local QA environment strategy](tickets/03-decide-repeatable-local-qa-environment-strategy.md) — resolved, `wayfinder:task`
- [Specify admin Getting Started setup path](tickets/04-specify-admin-getting-started-setup-path.md) — resolved, `wayfinder:grilling`
- [Specify admin member brought-forward opening position](tickets/05-specify-admin-member-brought-forward-opening-position.md) — resolved, `wayfinder:grilling`
- [Choose second-member onboarding QA scenario](tickets/06-choose-second-member-onboarding-qa-scenario.md) — resolved, `wayfinder:grilling`
- [Define activity and audit visibility expectations](tickets/07-define-activity-and-audit-visibility-expectations.md) — resolved, `wayfinder:research`
- [Specify member self-service submissions and admin approvals](tickets/08-specify-member-self-service-submissions-and-admin-approvals.md) — resolved, `wayfinder:grilling`
- [Specify loan policy and member financing request coverage](tickets/09-specify-loan-policy-and-member-financing-request-coverage.md) — resolved, `wayfinder:grilling`
- [Compose final ordered onboarding QA execution script](tickets/10-compose-final-ordered-onboarding-qa-execution-script.md) — resolved, `wayfinder:task`

## Execution Notes

- Activity visibility exists through `/reports/audit` and includes actors, approvers, entity IDs, timestamps, and review notes for the tested flows.
- Local onboarding email delivery was represented by dev login/password provisioning because no existing-member "send onboarding email" action was visible in the tested admin UI.
- The tested member financing self-service route is `/project-financing`; `/loans` did not expose a member loan request form in this pass.
- Foodstuff Purchase approval correctly enforced released-cycle capacity; the local Jul 2026 cycle was adjusted to NGN 100,000 before approval could pass.

## Out of scope

- Mobile QA is out of scope for this map; the user requested website-first QA.
- Production deployment, production database mutation, and real customer email delivery are out of scope for this map.
