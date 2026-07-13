# Minna Trust Cooperative Onboarding QA Spec

Labels: ready-for-agent

## Problem Statement

We need confidence that Halaalvest can onboard Minna Trust Civil Servants Multipurpose Cooperative using the website flows that exist today, without skipping the cooperative-specific operating details that came from the demo.

The cooperative runs mixed commitment collection, member-submitted receipts, procurement, Foodstuff Purchase, unit-based shares, brought-forward opening positions, loan servicing, member onboarding, member self-service requests, admin approvals, notifications, and activity/audit visibility. The user needs a structured QA specification before running the browser test so the test does not turn into guesswork, especially around dates, repayment schedules, eligibility rules, and expected evidence.

## Solution

Create a local, website-first QA specification for the Minna Trust onboarding scenario under `.scratch/wayfinder-cooperative-onboarding-qa/`. The spec uses the local Wayfinder map and tickets as the planning tracker, not GitHub.

The final QA execution should be driven by a single ordered browser runbook that starts from local setup, configures the cooperative, applies brought-forward member positions, creates and onboards a second member, logs in as that member, submits receipts and service requests, returns to admin review, verifies notifications, and checks activity/audit evidence.

The highest test seam is the end-to-end browser workflow across dashboard and member routes. Targeted database, notification-outbox, or audit-log assertions are allowed only where the UI does not expose required evidence. The final runbook must be blocked until the local Wayfinder decision tickets resolve the test data, route inventory, environment strategy, admin setup, opening-position calculations, second-member scenario, self-service submissions, loan policy coverage, and activity/audit expectations.

## User Stories

1. As a tenant admin, I want to onboard Minna Trust using brought-forward setup, so that the cooperative starts with its current book position instead of reconstructing all historical rows.
2. As a tenant admin, I want the QA run to use the opened local dashboard tenant, or a deliberately chosen fresh local tenant, so that test data does not accidentally pollute unrelated development data.
3. As a tenant admin, I want all relative dates converted into absolute dates, so that "last month" and "this month" do not create inconsistent schedules.
4. As a tenant admin, I want the operation profile to support mixed commitment collection, so that both payroll-style/automatic and manual payers are represented.
5. As a tenant admin, I want member receipt submission enabled, so that members can upload receipts for finance approval.
6. As a tenant admin, I want procurement enabled, so that members can request cooperative-purchased items.
7. As a tenant admin, I want procurement capped at one active obligation per member, so that a member must finish one procurement before taking another.
8. As a tenant admin, I want Foodstuff Purchase enabled, so that members can apply for staple food purchase cycles.
9. As a tenant admin, I want Foodstuff Purchase capped at one active obligation per member, so that members do not stack unpaid food purchase obligations.
10. As a tenant admin, I want unit-based shares configured at NGN 10,000 per share, so that share buying matches the cooperative's rule.
11. As a tenant admin, I want compulsory share units set to one, so that each member must hold at least one share.
12. As a tenant admin, I want maximum share units set to nineteen, so that the cooperative's share cap is enforced.
13. As a tenant admin, I want the cooperative start date confirmed, so that brought-forward and finance setup use the right lower bound.
14. As a tenant admin, I want loan policy configured with a maximum payback of twenty-four months, so that loan requests cannot exceed the cooperative's rule.
15. As a tenant admin, I want financing request prerequisites documented, so that QA knows whether an open financing cycle is required before a member can request a loan.
16. As a tenant admin, I want commitment behavior during active financing documented, so that reduced commitment during loan service is interpreted correctly.
17. As a tenant admin, I want the admin member's current commitment savings captured as NGN 830,000, so that their brought-forward balance is accurate.
18. As a tenant admin, I want the admin member's current special savings captured as NGN 200,000, so that voluntary savings are visible after setup.
19. As a tenant admin, I want the admin member's share position captured, so that unit-share balances match the cooperative's share policy.
20. As a tenant admin, I want the admin member's active NGN 1,600,000 loan from January 2026 captured, so that loan servicing continues from the current position.
21. As a tenant admin, I want the loan schedule to account for February, March, April, May, and June payments already made, so that July 2026 outstanding balance is correct.
22. As a tenant admin, I want the loan monthly servicing amount calculated from NGN 1,600,000 over twenty-four months, so that QA can verify the schedule and rounding.
23. As a tenant admin, I want the admin member's reduced monthly commitment of NGN 20,000 during loan service represented, so that the repayment-period commitment behavior matches reality.
24. As a tenant admin, I want the admin member's NGN 500,000 phone procurement captured, so that procurement repayment begins in July 2026.
25. As a tenant admin, I want the phone procurement payback set to three months, so that QA can verify the procurement policy cap and schedule.
26. As a tenant admin, I want the admin member's NGN 50,000 rice Foodstuff Purchase captured, so that the final July 2026 payment can be verified.
27. As a tenant admin, I want the rice Foodstuff Purchase treated as a two-month payback from May 2026, so that June and July payment expectations are clear.
28. As a finance officer, I want brought-forward opening positions staged before apply, so that current balances and obligations are reviewed before affecting ledgers.
29. As a finance officer, I want applying brought-forward positions to create visible savings, share, loan, procurement, and Foodstuff evidence, so that the setup can be audited.
30. As a finance officer, I want expected outstanding balances documented before QA execution, so that browser evidence can be compared against known values.
31. As an admin, I want to create a second member, so that member onboarding and self-service can be tested independently from the admin member.
32. As an admin, I want the second member's profile and opening position specified, so that QA is repeatable.
33. As an admin, I want to send the member onboarding email, so that the password setup flow is tested through the intended invitation path.
34. As a member, I want to set my password from the onboarding link, so that I can log in to the member portal.
35. As a member, I want to see my dashboard after login, so that I can verify my savings, special savings, shares, obligations, receipts, and recent activity.
36. As a member, I want to submit a payment receipt, so that finance can review my manually submitted commitment evidence.
37. As a finance officer, I want to review the member receipt, so that only approved receipt allocations post to finance records.
38. As a member, I want to request a loan or financing product, so that member financing self-service is covered.
39. As a finance officer, I want to review the member loan request, so that request validation, approval status, schedule expectations, and notifications are covered.
40. As a member, I want to request procurement for a MacBook Pro M1 at NGN 1,500,000 over two months, so that procurement self-service and payback policy are tested.
41. As a finance officer, I want to approve the MacBook Pro M1 procurement request, so that admin review and approved repayment estimates are tested.
42. As a member, I want to receive procurement approval notification, so that I know to step into the office for final activities.
43. As a member, I want to request Foodstuff Purchase, so that food purchase self-service is tested.
44. As a staff user, I want to review the Foodstuff Purchase application, so that application status and policy checks are tested.
45. As a tenant admin, I want notifications tested through local-safe evidence, so that QA does not depend on production email delivery.
46. As a tenant admin, I want activity or audit visibility verified, so that setup, submissions, approvals, and actor attribution are observable.
47. As a QA runner, I want a single ordered runbook, so that the scenario can be executed without switching between vague notes.
48. As a QA runner, I want pass/fail criteria for every step, so that failures become actionable bugs rather than opinions.
49. As a QA runner, I want screenshots or notes called out in the script, so that evidence is captured consistently.
50. As a QA runner, I want a stop/fix/retry protocol, so that the test run does not continue after a money-impacting failure corrupts later evidence.
51. As a developer, I want discovered bugs separated from the QA spec, so that execution failures can become focused implementation tickets later.
52. As a developer, I want the local Wayfinder tickets resolved before the final runbook, so that the final script is based on decisions, not assumptions.
53. As a product owner, I want mobile QA out of scope for this website-first pass, so that the web onboarding confidence comes first.
54. As a product owner, I want production deployment out of scope, so that local QA cannot mutate real customer data.

## Implementation Decisions

- Publish the spec locally under `.scratch/wayfinder-cooperative-onboarding-qa/` because the user explicitly moved this Wayfinder effort off GitHub.
- Use the local Wayfinder map as the issue tracker for this QA planning effort.
- Mark the local spec as `ready-for-agent` in the document header instead of applying a GitHub label.
- Keep the Wayfinder decision tickets as the planning frontier; do not collapse them into implementation tickets yet.
- The final deliverable from this spec is a QA execution runbook, not product code.
- The primary execution seam is one full browser-based dashboard/member QA workflow using local portless URLs.
- The browser workflow should be supplemented by database, notification-outbox, or audit assertions only when a required fact cannot be verified through UI.
- The local QA environment must use the project local-dev command documented in Brain: `bun run dev --local --filter dashboard marketing`.
- Dashboard URLs for the run should use the portless tenant dashboard hostname pattern, not raw localhost ports, unless a tooling limitation forces otherwise.
- Relative scenario dates must be normalized against July 13, 2026 before execution.
- The canonical data ticket must resolve all schedule rounding before browser execution begins.
- Operation Profile setup must configure mixed commitment collection, member receipt submission, procurement, Foodstuff Purchase, and relevant member access.
- Procurement and Foodstuff Purchase must each have their active obligation cap tested as one active unpaid obligation per member.
- Unit-share setup must use NGN 10,000 per share, compulsory one share, and maximum nineteen shares.
- Loan policy must explicitly cover maximum loan payback of twenty-four months and active-financing commitment behavior.
- The admin member brought-forward opening position must include current savings, special savings, shares, active loan, active procurement, and active Foodstuff Purchase obligations.
- The second-member scenario must be chosen before execution and should be rich enough to test onboarding, dashboard balances, self-service permissions, and admin review.
- Member onboarding must test email/password setup through a local-safe mechanism such as a dev link, notification outbox, captured token, or real local inbox, as decided by the environment ticket.
- Procurement approval should verify both status transition and member-facing notification evidence.
- Activity/audit visibility must be verified through the implemented activity page if it exists, or through the closest current audit surfaces if no consolidated page exists.
- The final runbook ticket remains blocked until all prerequisite Wayfinder tickets are resolved.
- Running QA, fixing discovered bugs, creating implementation tickets, or changing production-like data is outside this spec-writing step.

## Testing Decisions

- Good tests for this effort verify user-visible behavior and money-impacting outcomes, not implementation details.
- The highest seam is the end-to-end local website flow through dashboard and member routes.
- The final QA script should test the whole cooperative onboarding path in one ordered run, because many later member actions depend on earlier tenant policy and brought-forward setup.
- Use targeted assertions against persisted data only for finance balances, schedules, notifications, or audit evidence that the UI cannot show reliably.
- Do not rely on raw implementation internals for pass/fail when a user-facing status, balance, schedule, or audit surface exists.
- The route/workflow inventory ticket must identify which routes and actions are browser-testable before execution.
- The local environment strategy ticket must decide reset behavior before any destructive or stateful browser test.
- The canonical data ticket must define expected values for:
  - July 2026 as "this month"
  - June 2026 as "last month"
  - May 2026 as "two months ago"
  - NGN 1,600,000 loan over twenty-four months
  - February-June 2026 loan payments already made
  - NGN 500,000 procurement over three months
  - NGN 50,000 Foodstuff Purchase over two months
- The admin setup ticket must define expected saved policy values after each setup stage.
- The opening-position ticket must define expected outstanding balances, schedule rows, and UI evidence after apply.
- The loan policy ticket must define expected validation and approval behavior for member financing requests.
- The self-service ticket must define exact member submissions and admin approval evidence.
- The activity/audit ticket must define the expected actor attribution and timestamp evidence.
- The final runbook should specify what screenshots, exported rows, UI states, or local data checks are required.
- The final runbook should include a stop/fix/retry rule for failures in setup, finance posting, schedule creation, notification capture, or audit evidence.
- Prior art for test expectations comes from existing Brain docs for Getting Started, Operation Profile, member commitments/payment allocation, procurement requests, Foodstuff Purchase operations, financing policy guards, public signup/onboarding, and member self-service dashboard.

## Out of Scope

- Mobile QA.
- Production deployment.
- Production database mutation.
- Real customer email delivery.
- Fixing bugs discovered during the eventual QA run.
- Creating implementation tickets before the Wayfinder tickets and final runbook are resolved.
- Changing financial schemas, policy models, or service behavior as part of this spec.
- Replacing the local Wayfinder tracker with GitHub issues.
- Testing every unrelated dashboard feature outside the described cooperative onboarding and member-service journey.

## Further Notes

- The current local Wayfinder map lives at `MAP.md` in the same `.scratch` folder.
- Ready-for-agent execution tickets live under `issues/`.
- The local planning tickets are intentionally still open; this spec does not resolve them.
- The user's preferred flow is website-first QA, then mobile later.
- The phrase "Foodstuff Purchase" should be used for the cooperative food service even when internal route names still use food-purchase.
- The final QA run should not begin until the runbook is composed from the resolved local tickets.
