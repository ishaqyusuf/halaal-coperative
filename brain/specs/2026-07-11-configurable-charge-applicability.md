## Problem Statement

Tenant admins and finance officers need one clear way to configure which charges apply to each cooperative workflow. Today, charges can be configured with purpose and a few coarse applicability flags, and loan request charges already post automatically when a loan application is submitted. However, this does not yet cover the full operating model: commitment/monthly collections, loans, procurement, Foodstuff Purchase, and project financing each need their own applicable charges to appear on the relevant admin and member forms.

From the user's perspective, configuring charges through separate settings pages for each workflow would duplicate the charge library and make it harder to understand which charge is authoritative. The preferred model is to configure applicability directly on the charge definition, then let every workflow load the active charges that apply to it.

The platform must keep charges explicit, policy-backed, auditable, and separate from savings, share capital, financing principal, procurement obligations, Foodstuff Purchase obligations, and project financing obligations.

## Solution

Extend the charge definition model so each charge can declare where it applies. A charge remains a reusable finance rule with dated versions, accounting purpose, value type, and active/inactive state. Applicability becomes a separate concept that connects a charge to one or more workflows such as commitment collection, loan request, procurement request, Foodstuff Purchase application, and project financing request.

When staff or members open a relevant form, the form should load a server-calculated charge quote for that workflow. The quote should show each applicable charge, its amount, whether it is fixed or percentage-based, whether it is required, and how it will be collected. When the form is submitted, the server recalculates the applicable charges and posts or stages them according to the configured trigger and collection mode.

The first implementation should preserve the existing behavior for loan request charges and monthly member charges while generalizing the mechanism for the new workflows.

## User Stories

1. As a tenant admin, I want to configure a charge once, so that I do not maintain duplicate charge settings across multiple workflow pages.
2. As a tenant admin, I want to select which workflows a charge applies to, so that the same charge can be reused where relevant.
3. As a tenant admin, I want a charge to apply to commitment collection, so that monthly commitment charges are picked up during monthly record processing.
4. As a tenant admin, I want a charge to apply to loan requests, so that financing application charges are shown and posted consistently.
5. As a tenant admin, I want a charge to apply to procurement requests, so that procurement-related fees can be configured without custom code.
6. As a tenant admin, I want a charge to apply to Foodstuff Purchase applications, so that food-purchase-related charges can be configured centrally.
7. As a tenant admin, I want a charge to apply to project financing requests, so that project-financing-related charges can be configured centrally.
8. As a tenant admin, I want to keep accounting purpose separate from workflow applicability, so that a member-share charge can still post to share capital while also being clear about where it applies.
9. As a tenant admin, I want to mark a workflow charge as active or inactive, so that old charges can stop applying without losing history.
10. As a tenant admin, I want dated charge versions to remain effective-date based, so that future charge changes can be scheduled safely.
11. As a tenant admin, I want charge applicability changes to be audited, so that finance configuration changes can be explained later.
12. As a tenant admin, I want required charges to be visibly required, so that staff and members know they cannot remove them from the workflow.
13. As a tenant admin, I want optional charges to be visibly optional, so that staff can include them only when applicable.
14. As a tenant admin, I want each applicable charge to specify a collection mode, so that the cooperative can decide whether the charge is deducted from savings or paid separately.
15. As a tenant admin, I want charges collected from savings to debit the member savings balance through the normal charge ledger, so that statements stay accurate.
16. As a tenant admin, I want separately paid charges to be staged until payment evidence is received, so that unpaid charges do not silently reduce savings.
17. As a finance officer, I want commitment charges to continue posting during monthly record application, so that existing monthly collection behavior is preserved.
18. As a finance officer, I want loan request charges to continue posting when a loan request is submitted, so that current loan-fee behavior is not broken.
19. As a finance officer, I want procurement request charges to be quoted on the request form, so that the member sees the full expected cost before submission.
20. As a finance officer, I want Foodstuff Purchase charges to be quoted on the application form, so that the member sees applicable fees before applying.
21. As a finance officer, I want project financing charges to be quoted on the request form, so that business financing applicants understand any applicable costs.
22. As a finance officer, I want percentage charges to be calculated from the workflow amount, so that charges scale with requested or approved value where configured.
23. As a finance officer, I want fixed charges to use the current effective amount, so that charges are stable and predictable.
24. As a finance officer, I want the server to recalculate charges on submit, so that client-side previews cannot be tampered with.
25. As a finance officer, I want charge applications to link to the workflow record that created them, so that charge reports can trace the source.
26. As a finance officer, I want charge applications linked to procurement requests, so that procurement charges can be waived, reversed, and reported in context.
27. As a finance officer, I want charge applications linked to Foodstuff Purchase applications, so that Foodstuff Purchase charges can be waived, reversed, and reported in context.
28. As a finance officer, I want charge applications linked to project financing requests, so that project financing charges can be waived, reversed, and reported in context.
29. As a finance officer, I want loan charges to remain separate from loan principal, so that the platform does not create hidden interest-like behavior.
30. As a finance officer, I want procurement charges to remain separate from approved procurement cost, so that repayment schedules do not hide charge amounts.
31. As a finance officer, I want Foodstuff Purchase charges to remain separate from approved food-purchase amount, so that member obligations remain explainable.
32. As a finance officer, I want project financing charges to remain separate from approved project amount, so that partnership, profit-sharing, and repayable facility accounting remain clean.
33. As a finance officer, I want to see charge quotes before approving a request when approval-time charges are configured, so that approval decisions include the expected charges.
34. As a finance officer, I want application-time charges and approval-time charges to be distinguishable, so that admin fees and obligation fees can follow different triggers.
35. As a member, I want applicable charges listed before I submit a loan request, so that I understand what will be charged.
36. As a member, I want applicable charges listed before I submit a procurement request, so that I understand the total request implications.
37. As a member, I want applicable charges listed before I submit a Foodstuff Purchase application, so that I understand what I may owe.
38. As a member, I want applicable charges listed before I submit a project financing request, so that I can make an informed application.
39. As a member, I want to know whether a charge will be deducted from savings or paid separately, so that I can plan my payment.
40. As a member, I want to see posted charges on my statement, so that I can verify why my savings changed.
41. As a member, I want separately paid charges to stay visible as pending until paid or waived, so that I know what still needs action.
42. As an operations officer, I want charge configuration to be simple enough for onboarding, so that new cooperatives do not need multiple settings pages for one charge rule.
43. As an operations officer, I want quick-fill/default charge setup to include sensible applicability, so that demo and pilot tenants start with realistic charge behavior.
44. As an auditor, I want every posted charge to show the charge definition, version amount, workflow source, member, and posting time, so that charges can be investigated.
45. As an auditor, I want waivers and reversals to continue using the existing charge correction flow, so that charge history remains append-only and explainable.
46. As a platform operator, I want existing migrated charge data to keep working after the change, so that tenants are not forced through manual reconfiguration.
47. As a platform operator, I want old applicability booleans to migrate into the new applicability model, so that existing behavior is preserved.
48. As a platform operator, I want reports to keep showing charge applications regardless of originating workflow, so that finance exports remain comprehensive.
49. As a support user, I want configuration problems to be visible in the settings UI, so that missing workflow charges can be corrected before members encounter confusing forms.
50. As a developer, I want one shared charge quote/apply service, so that charge math is not duplicated across dashboard, mobile, and API workflows.
51. As a developer, I want mobile and dashboard forms to consume the same server-owned charge quote shape, so that both products stay consistent.
52. As a developer, I want tests at the query/action seam, so that finance behavior is validated through durable business state rather than component internals.
53. As a product owner, I want charge configuration to stay compatible with future workflow additions, so that new cooperative products can opt into the same mechanism.
54. As a product owner, I want the UI to use Foodstuff Purchase as the product-facing label, so that charge configuration matches the rest of the product language.

## Implementation Decisions

- Configure workflow applicability on charge definitions rather than creating separate charge settings pages for commitment, loans, procurement, Foodstuff Purchase, and project financing.
- Keep charge accounting purpose separate from workflow applicability. Accounting purpose remains responsible for downstream posting semantics such as member share capital, loan fee classification, membership fee classification, general charges, and penalties.
- Add a charge applicability concept that connects one charge definition to one or more workflow targets.
- Supported initial workflow targets are commitment collection, loan request, procurement request, Foodstuff Purchase application, and project financing request.
- Each applicability row should support a trigger. Initial triggers should include submission, approval, and monthly collection. Commitment collection uses monthly collection. Loan request keeps submission behavior. Procurement, Foodstuff Purchase, and project financing should support submission or approval depending on the configured charge.
- Each applicability row should support collection mode. Initial collection modes are deduct from member savings and pay separately.
- Required workflow charges cannot be removed by members or ordinary staff during submission. Optional charges may be included or omitted by staff when the workflow permits it.
- The first implementation should preserve existing behavior by migrating member-applicable charges into commitment collection and existing loan request flags or loan-fee purpose into loan request applicability.
- The old coarse applicability flags may remain during the transition for compatibility, but new workflow logic should use the new applicability model.
- Add optional charge application links for procurement requests, Foodstuff Purchase applications, and project financing requests. Existing contribution, loan request, and loan links should remain.
- Create a shared charge quotation interface that accepts workflow, amount basis, member, tenant, and assessment date and returns active applicable charge rows with calculated amounts.
- Create a shared charge application interface that accepts workflow, target record, member, amount basis, actor, assessment date, and source context, then posts or stages applicable charges according to collection mode.
- Percentage charges should calculate from the workflow basis amount. For loan request this is requested amount. For procurement it should be requested or approved cost depending on trigger. For Foodstuff Purchase it should be requested or approved amount depending on trigger. For project financing it should be requested or approved amount depending on trigger.
- Fixed charges should use the effective charge version amount for the assessment date.
- The client may display a quote, but the server must recalculate before mutation so that users cannot alter charge amounts, omit required charges, or change collection mode.
- Charges deducted from savings should post through the existing charge application and ledger flow, including member savings updates and audit logs.
- Separately paid charges should create a pending charge application or equivalent staged state that can later be settled, waived, or reversed. They should not reduce member savings at quote time.
- Loan request charges must not be added to loan principal or estimated monthly servicing.
- Procurement charges must not be added to procurement approved cost or repayment schedule principal unless a future explicit policy says otherwise.
- Foodstuff Purchase charges must not be added to application approved amount or profit accounting.
- Project financing charges must not be added to approved project financing amount, repayable facility principal, partnership capital, or profit-sharing basis.
- The settings UI should present two separate controls: accounting purpose and applies to workflows.
- The settings UI should show configured applicability badges in the charge table so admins can see where a charge is active.
- The live charge workspace should continue to support manual charge application, waiver, reversal, and reporting.
- Mobile member request screens should display the same quote shape as dashboard request screens.
- Dashboard staff request screens should display the same quote shape as mobile request screens.
- Charge quote responses should include enough display information for forms: charge name, code, accounting purpose, workflow, trigger, collection mode, value type, effective version amount, calculated amount, required state, and explanatory copy for deduction or separate payment.
- Charge configuration writes remain restricted to finance-management roles.
- Charge application, waiver, reversal, and settlement writes remain live-finance actions with tenant scoping, role checks, and audit evidence.
- Existing report/export behavior should include newly linked charge applications without requiring separate workflow-specific charge reports in this slice.
- Quick-fill/demo charge setup should be updated so common charges receive sensible default workflow applicability.
- Product-facing copy should use "Foodstuff Purchase" while internal module keys may continue to use existing food-purchase naming until a separate rename is scheduled.

## Testing Decisions

- Test the feature primarily at the database query/action seam. This is the highest durable seam because it validates tenant scoping, charge selection, amount calculation, posting state, ledger effects, and audit behavior without relying on specific UI structure.
- Add tests for the shared charge quote behavior. Tests should verify active/inactive filtering, effective-dated versions, fixed charges, percentage charges, workflow filtering, required flags, triggers, and collection modes.
- Add tests for the shared charge apply behavior. Tests should verify posted savings-deduction charges, pending separately-paid charges, idempotency where applicable, workflow target links, and audit metadata.
- Add migration/backfill tests for existing charge configuration. Existing member-applicable charges should become commitment collection charges, and existing loan-fee or loan-request-applicable charges should become loan request charges.
- Preserve existing loan request tests that verify automatic loan-fee posting on submission, then extend them to use the new applicability model.
- Preserve existing monthly record tests that verify member charges post during monthly record application, then extend them to use commitment collection applicability.
- Add procurement request tests that verify applicable charges are quoted and applied according to configured trigger and collection mode.
- Add Foodstuff Purchase application tests that verify applicable charges are quoted and applied according to configured trigger and collection mode.
- Add project financing request tests that verify applicable charges are quoted and applied according to configured trigger and collection mode.
- Add mobile API/router contract tests only where the mobile response shape changes. These tests should assert the member sees the server-owned quote and cannot bypass required charges by submitting altered client data.
- Add dashboard action/router tests only where staff workflows expose new charge quote or apply contracts.
- UI tests should stay light and behavior-oriented: verify that forms render the returned charge quote and display deduction versus separate-payment language. Do not test internal component state or styling.
- Prior art exists in the current charge query tests, loan request tests, monthly record tests, procurement tests, Foodstuff Purchase tests, project financing tests, mobile route tests, and payment receipt tests.

## Out of Scope

- Building separate charge settings pages for each workflow.
- Replacing the existing charge library, charge version history, waiver flow, reversal flow, reports, or exports.
- Adding interest, penalty interest, compounding fees, or any hidden interest-like financing behavior.
- Adding charges into loan principal, procurement repayment principal, Foodstuff Purchase approved amount, project financing capital, or profit-sharing basis.
- Full settlement workflow for separately paid charges beyond the minimum staged/pending state needed to avoid silent savings deduction.
- Vendor management for procurement.
- Full project financing accounting beyond linking charges to the project financing request.
- Renaming all internal food-purchase module keys to Foodstuff Purchase.
- Changing the broader loan/financing terminology decision.
- Creating tenant-specific charge templates beyond updating current quick-fill defaults.
- Historical rewrite of already posted charge applications. Existing posted history should remain intact.

## Further Notes

- This spec follows the user's preferred second option: configure charge purpose/applicability directly on the charge and let each workflow load the relevant charges.
- The current system already has enough of the shape to make this an extension rather than a rewrite: charge definitions, charge versions, charge applications, loan request auto-charges, monthly record member charges, member statements, reports, waivers, reversals, and audit logs.
- The key product clarification encoded here is that "purpose" should not carry all meaning. It is better treated as accounting purpose, while a new applicability model controls where the charge appears and when it applies.
- The default implementation stance is that procurement, Foodstuff Purchase, and project financing charges should be displayed on submission and may post on submission or approval depending on configured trigger. If no trigger is configured, approval-time posting is safer for charges tied to approved obligation amount; submission-time posting is appropriate for true application/admin fees.
- All money movement must stay tenant-scoped, role-checked, auditable, and explainable on member statements.
