# Decide Food Purchase Configuration Model

Type: grilling
Status: open
Blocked by: 01, 02, 05

## Question

What configurable settings does Foodstuff Purchase need, and what exactly is the feature in the product domain?

Resolve whether Foodstuff Purchase is treated as:

- A separate cooperative service with cycles and member applications, matching the current implementation direction.
- A procurement-like product.
- A recurring commitment/category.
- A hybrid that needs clearer naming.

Then decide the first-wave settings, including:

- Whether Foodstuff Purchase is enabled.
- Whether members can apply/request from the member area or only through office/admin entry.
- Whether applications require an open monthly cycle.
- Maximum applications or outstanding Foodstuff Purchase obligations per member.
- Maximum payback months.
- Whether commitment reduction is allowed during payback.
- Whether payment receipts can target Foodstuff Purchase and how allocations link to applications.
- Whether food-related obligations should appear in brought-forward setup and member statements when enabled.

The answer should include recommended admin-facing language, because "Foodstuff Purchase" and "Food Purchase" are both currently used in conversation and code.

## Comments

- Decision: Foodstuff Purchase is a separate cooperative service with monthly cycles and member applications, matching the current implementation direction. It should not be collapsed into procurement or ordinary commitment because it has committee fund release, monthly cycle accounting, member applications, and possible profit evidence.
- Naming: use **Foodstuff Purchase** consistently in product/admin UI. Avoid switching between "Food Purchase" and "Foodstuff Purchase." Short description: "Run monthly foodstuff purchase cycles, approve member applications, and track repayments or settlement evidence."
- Domain distinction: procurement is member-specific item purchase such as phone, refrigerator, equipment, or similar member-requested items. Foodstuff Purchase is cooperative/committee-led bulk purchase or staple distribution for a period. Foodstuff Purchase has cycles and committee accounting; procurement has item purchase activation and repayment schedules.
- Recommended settings: service access uses `foodPurchaseAccessMode` through the tenant service setting and defaults to `disabled` for new tenants. Add `foodPurchaseRequiresOpenCycle` defaulting to `true`. Keep existing `foodPurchaseMaximumPaybackMonths` defaulting to `1`. Keep existing `foodPurchaseAllowsCommitmentReductionDuringPayback` defaulting to `false`. Add `foodPurchaseMaximumActiveObligationsPerMember` defaulting to `1`. Receipt settlement uses the existing `food_purchase` receipt category and should be available when the service is readable or has active obligations.
- Counting rule: count an active Foodstuff Purchase obligation when an application is `approved` and the approved amount is not fully paid. Do not count `submitted`, `under_review`, `rejected`, or `cancelled`. If a cycle is closed, existing approved/unpaid applications still remain obligations until settled.
- Application behavior: `disabled` allows no new cycles or applications unless existing records force read-only visibility; `office_only` lets staff/committee create applications for members while members view status/history only; `member_self_service` lets members apply for open cycles while staff can still create and review; `read_only` allows no new cycles/applications but keeps old cycles, applications, payments, and accounting visible.
- Validation: new applications require service mode `office_only` or `member_self_service` for staff, and `member_self_service` for members. If `foodPurchaseRequiresOpenCycle` is true, applications must target an open cycle. Requested amount must be positive. Requested payback months must be positive and no more than `foodPurchaseMaximumPaybackMonths`. If active unpaid Foodstuff Purchase obligations are already at `foodPurchaseMaximumActiveObligationsPerMember`, block new application submission. Receipt allocations to `food_purchase` must target an approved unpaid application.
- Brought-forward and statements: if Foodstuff Purchase is enabled or existing obligations exist, brought-forward setup should allow optional current Foodstuff Purchase outstanding balance. Member statements should show Foodstuff Purchase separately from procurement, commitments, loans, shares, and special savings. Even if the service is later disabled/read-only, existing Foodstuff Purchase obligations must remain visible and payable.
- Accounting/profit caution: end-of-cycle accounting and profit evidence should remain review evidence for now. Do not automatically distribute Foodstuff Purchase profit to members until a separate profit/allocation rule is explicitly decided. Keep this Halaal-safe by avoiding hidden interest or automatic penalty/profit assumptions.
