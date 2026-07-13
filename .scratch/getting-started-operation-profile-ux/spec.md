# Getting Started Operation Profile Guided UX Spec

Labels: ready-for-agent

## Problem Statement

Tenant admins currently meet the Operation Profile as one dense Getting Started screen. It asks too many service-configuration questions at once, exposes the same four access-mode choices even when a simpler decision would do, and sits beside a visible setup sequence that makes the page feel like a control panel rather than a guided first-run setup.

The user wants the Operation Profile to feel easier and more cooperative-aware: one focused question at a time, clear explanations, clean bold UI, simple options, Next/Previous movement, and a more polished interaction model. The broader setup sequence should get out of the way while the admin is answering the Operation Profile questions.

## Solution

Convert the Operation Profile portion of Getting Started into a guided sub-step flow under one major step. The main experience should be framed with a title such as **"Let's know about your operation"** or **"Tell us how this cooperative operates"**.

Hide the full setup sequence rail during the guided flow and replace it with a compact progress header showing the current major step, sub-step progress, and completion state. The admin moves through the Operation Profile using Previous and Next buttons. The first Operation Profile sub-step is reached from setup mode; the last sub-step saves/reviews the profile and continues to the cooperative start-date step.

The Operation Profile should ask simpler service-specific questions. Not every service needs four access modes. Use yes/no or two-choice controls first, reveal the next choice only when relevant, and reserve read-only/history preservation for existing-record cases rather than normal first-run configuration.

Settings should not become a forced wizard. After setup, Settings should present a compact summary list of services with focused edit actions. It should reuse labels and service-edit patterns, but stay quieter, denser, and audit-focused.

## User Stories

1. As a tenant admin, I want the Operation Profile setup to ask one operation question at a time, so that I am not overwhelmed during first-run setup.
2. As a tenant admin, I want a clear title that explains the purpose of the flow, so that I understand I am describing how my cooperative operates.
3. As a tenant admin, I want the full setup sequence hidden while I answer Operation Profile questions, so that I can focus on the current decision.
4. As a tenant admin, I want a compact progress indicator for Operation Profile sub-steps, so that I know where I am without seeing a large step rail.
5. As a tenant admin, I want Next and Previous buttons inside Operation Profile, so that I can move through setup naturally.
6. As a tenant admin, I want Previous from the first Operation Profile sub-step to return to setup mode, so that I can change the earlier setup decision.
7. As a tenant admin, I want Next from setup mode to land on the first Operation Profile sub-step, so that the flow feels continuous.
8. As a tenant admin, I want the final Operation Profile sub-step to save or confirm my choices before moving on, so that I know my operation profile is recorded.
9. As a tenant admin, I want the Operation Profile sub-step to be represented in the URL, so that refreshes and shared links keep me in the correct place.
10. As a tenant admin, I want invalid Operation Profile sub-step links to normalize to the first sub-step, so that I never land on a broken setup state.
11. As a tenant admin, I want commitment collection to be explained in plain cooperative language, so that I can choose the correct collection model.
12. As a tenant admin, I want to choose whether commitments are posted by officials, submitted by members as receipts, collected through payroll/Collection Sources, or mixed, so that Halaalvest matches the cooperative's real payment flow.
13. As a tenant admin, I want Collection Source setup to explain ministry, employer, payroll, transfer, cash, and manual groups, so that I do not think the system only supports ministries.
14. As a tenant admin, I want Collection Source batch posting to appear only when Collection Sources are enabled, so that I am not asked irrelevant batch-posting questions.
15. As a tenant admin, I want procurement setup to start with whether the cooperative offers procurement at all, so that optional services are easy to skip.
16. As a tenant admin, I want procurement access choices to appear only after I enable procurement, so that the form stays simple.
17. As a tenant admin, I want procurement to ask whether requests are office-managed or members can request online, so that member access matches the cooperative's process.
18. As a tenant admin, I want procurement limits to appear only when procurement is enabled, so that policy fields do not distract me when procurement is not used.
19. As a tenant admin, I want the procurement active-obligation limit explained as "finish one before another" where applicable, so that the meaning is clear.
20. As a tenant admin, I want Foodstuff Purchase setup to start with whether the cooperative runs Foodstuff Purchase cycles, so that optional monthly purchase workflows are not forced.
21. As a tenant admin, I want Foodstuff Purchase access choices to appear only after I enable the service, so that the flow stays focused.
22. As a tenant admin, I want Foodstuff Purchase to ask whether members must apply during open cycles, so that the system matches cycle-led cooperative operations.
23. As a tenant admin, I want Foodstuff Purchase limits to appear only when Foodstuff Purchase is enabled, so that unrelated policy fields are hidden.
24. As a tenant admin, I want member support to default on where member accounts are available, so that members can ask for help without extra setup noise.
25. As a tenant admin, I want payment receipts to use simpler options than four access modes when possible, so that I can decide quickly whether members can submit receipts.
26. As a tenant admin, I want read-only/history preservation to appear only when existing records make it necessary, so that first-run setup is not cluttered with rare states.
27. As a tenant admin, I want selected options to have clear visual feedback, so that I know what I chose.
28. As a tenant admin, I want sub-step transitions to feel smooth but not distracting, so that the flow feels polished.
29. As a tenant admin, I want service panels to use bold labels and short descriptions, so that I can scan and decide quickly.
30. As a tenant admin, I want helper text to be short and operational, so that I do not have to read long explanations during setup.
31. As a tenant admin, I want a review screen before leaving Operation Profile, so that I can confirm the services and access choices.
32. As a tenant admin, I want the review screen to show skipped services plainly, so that I can see what the cooperative does not operate.
33. As a tenant admin, I want the review screen to show member self-service services clearly, so that I know which member actions will be available.
34. As a tenant admin, I want the review screen to show office-managed services clearly, so that I know which services require staff handling.
35. As a tenant admin, I want the review screen to show Collection Source and batch-posting choices, so that payroll-style cooperatives can verify the setup.
36. As a tenant admin, I want the flow to preserve existing Operation Profile defaults, so that I do not accidentally lose previously configured choices.
37. As a tenant admin, I want saving the guided flow to reuse the existing Operation Profile save behavior, so that audit and review rules remain intact.
38. As a tenant admin, I want Settings to show a compact Operation Profile summary after setup, so that I can review all services at a glance.
39. As a tenant admin, I want Settings to let me edit one service at a time, so that I do not have to step through the full wizard for a small change.
40. As a tenant admin, I want Settings to ask for a change reason only when access is reduced or a service is disabled, so that audit requirements appear when needed.
41. As a tenant admin, I want Settings to use the same service labels as Getting Started, so that I do not have to relearn terminology.
42. As a tenant admin, I want Settings to explain read-only states when existing records exist, so that I understand why a service remains visible.
43. As a finance officer, I want the guided setup to preserve finance safety warnings, so that simplification does not remove important operational caution.
44. As a finance officer, I want commitment, procurement, and Foodstuff Purchase configuration to stay distinct, so that money workflows are not blended together.
45. As an operations officer, I want Collection Source setup to remain separate from member type, so that business and self-employed members can still be manual payers.
46. As a member, I want only the services my cooperative actually offers to appear later, so that my member area feels tailored.
47. As a developer, I want Operation Profile navigation rules centralized in a flow model, so that tests can cover behavior without depending on JSX structure.
48. As a developer, I want option mapping centralized, so that Getting Started and Settings use the same labels and meanings.
49. As a developer, I want URL param handling tested at the flow level, so that invalid sub-step states are safe.
50. As a QA reviewer, I want clear manual QA scenarios for desktop and mobile, so that the guided flow can be verified reliably.

## Implementation Decisions

- Build a guided Operation Profile sub-step model for the Getting Started flow. It should define sub-step keys, labels, order, URL param normalization, previous/next targets, and completion/review behavior.
- Add an Operation Profile URL parameter, recommended as `profileStep`, used alongside the existing Getting Started `step` parameter.
- Normalize missing or invalid Operation Profile sub-steps to the first sub-step.
- Treat Operation Profile as one major Getting Started step with internal sub-steps rather than separate top-level setup steps.
- Hide the current full setup sequence rail during the guided Operation Profile experience. Replace it with a compact progress header and Next/Previous navigation.
- Recommended sub-step order: intro, commitments, procurement, foodstuff, member-access, review.
- The intro sub-step should frame the flow as describing how the cooperative operates, not as enabling generic product features.
- The commitments sub-step should cover payment receipts, manual/office posting, member receipt upload, Collection Sources, payroll-style collection, and mixed collection.
- The procurement sub-step should start with whether the cooperative offers procurement. If enabled, it should ask who can initiate requests and then reveal policy fields.
- The Foodstuff Purchase sub-step should start with whether the cooperative runs Foodstuff Purchase. If enabled, it should ask who can initiate applications and reveal cycle/limit fields.
- The member-access sub-step should cover member support and any remaining member-facing receipt/service access decisions that are not already decided.
- The review sub-step should summarize all choices and provide the save/confirm action.
- Do not expose four access modes for every service in first-run setup.
- Use simple yes/no or two-choice controls where the underlying service can be mapped safely to existing access modes.
- Keep the underlying persisted access modes unchanged. The guided UI maps simpler choices into existing Operation Profile values.
- `read_only` should not be a normal first-run option unless existing records/history require preservation. It may remain available or explained in Settings when records already exist.
- Continue to preserve existing financial history, active obligations, reports, statements, and audit evidence regardless of simplified first-run options.
- Reuse the existing Operation Profile persistence and save action. This spec does not require a database or API rewrite.
- Use short operational copy. Avoid marketing copy and avoid long explanatory paragraphs.
- Use clean, bold service panels with selected-state feedback.
- Use light motion for sub-step transitions and option selection. Motion should be subtle, fast, and respectful of reduced-motion preferences.
- Settings should not force the guided wizard. Settings should show a compact service summary and allow focused service editing.
- Settings should reuse the same labels and helper copy as Getting Started where possible.
- Settings should show change reason only when reducing access, disabling a service, or making a service more restrictive.
- The implementation should preserve tenant scoping, role checks, existing save semantics, and audit behavior.

## Testing Decisions

- Test the highest useful seam: the Getting Started Operation Profile flow model.
- Good tests should verify external behavior: normalized sub-step state, previous/next targets, option-to-access-mode mapping, review readiness, and derived read-only behavior. Avoid tests that assert JSX structure or styling implementation details.
- Add tests for valid and invalid `profileStep` values.
- Add tests that `step=operation-profile` without `profileStep` resolves to the first sub-step.
- Add tests that setup mode Next targets the first Operation Profile sub-step.
- Add tests that Previous from the first Operation Profile sub-step targets setup mode.
- Add tests that Next moves between Operation Profile sub-steps in the approved order.
- Add tests that the final Operation Profile sub-step targets start date after save/review.
- Add tests for simplified option mapping: commitments, procurement, Foodstuff Purchase, payment receipts, Collection Sources, batch posting, and support.
- Add tests for hiding or deriving `read_only` in first-run setup while preserving it for existing-record cases.
- Use existing Bun test patterns in the dashboard/domain codebase.
- Use manual QA for visual and interaction behavior: desktop `/getting-started?step=operation-profile`, mobile `/getting-started?step=operation-profile`, direct deep links with `profileStep`, previous/next behavior, save/review behavior, selected-state visuals, reduced-motion behavior, and Settings parity.
- Run dashboard typecheck, relevant focused tests, lint if practical, and `git diff --check`.

## Out of Scope

- Changing the Operation Profile database schema.
- Changing server-side feature gating rules.
- Changing mobile DTO behavior.
- Changing procurement, Foodstuff Purchase, payment receipt, Collection Source, or support-case finance rules.
- Reworking member backfill steps beyond any shared visual/navigation patterns needed for consistency.
- Replacing the entire Getting Started workflow.
- Introducing new bank, payroll, ministry, or external integration behavior.
- Changing production deployment, DB push, or migration processes.

## Further Notes

- This spec is a UX and flow refinement on top of the already implemented Cooperative Operation Profile.
- The implementation should respect the existing principle that Operation Profile access modes are operational and non-destructive.
- The work should be visually aligned with the broader Getting Started simplification direction: less card-heavy, less wordy, input-focused, and easier to scan.
- Brain documentation should be updated after implementation because the visible Getting Started Operation Profile behavior will materially change.
