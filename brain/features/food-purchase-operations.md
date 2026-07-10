# Foodstuff Purchase Operations

## Summary

- Product-facing language should use Foodstuff Purchase for staple food items such as rice, beans, yam, garri, grains, and similar commodities; existing internal module names and routes can remain food-purchase/`food_purchase` until a rename is scheduled.
- Foodstuff Purchase is a monthly cooperative business operation, separate from ordinary savings, procurement, loans, and generic receipt categories.
- Cooperative funds are released to a Foodstuff Purchase committee at the end of each month to run the next/monthly bulk-purchase and resale/allocation cycle.
- Linked members can apply for Foodstuff Purchase within an active monthly cycle from their own `/food-purchase` self-service page.
- Committee staff can review and approve or reject member purchase applications.
- The committee must provide end-of-month accounting with business performance and profit evidence.

## Core Rules

- Each Foodstuff Purchase cycle is tenant-scoped and period-scoped.
- A cycle records released committee funds, release date, release notes, and the staff user who recorded the release.
- Member applications are linked to one Foodstuff Purchase cycle and one member.
- Application submission records requested amount and requested payback months, capped by tenant Foodstuff Purchase policy.
- Application approval records the approved foodstuff purchase amount and approved payback months; targeted payment receipt allocations can later settle that approved amount.
- Approved applications snapshot the policy cap and flexible-commitment setting used during approval.
- Application review decisions emit a registered member notification event and send an audited direct email to the linked member when member email contact is available.
- Committee accounting captures sales/income, cost, expenses, profit, accounting notes, and review status for the cycle.
- Finance/admin staff can approve submitted accounting as accepted evidence or reject it for correction.
- Accounting review decisions emit a registered committee notification event and send an audited direct email to the submitting committee user when email contact is available.
- Foodstuff Purchase profit must not be mixed into ordinary member savings or share capital until a future approved distribution workflow exists.
- Foodstuff Purchase receipt allocations must link to an approved Foodstuff Purchase application before finance can approve/post the receipt.
- Receipt posting updates the application's paid amount and paid date evidence when fully settled; it does not distribute profit or create a separate food-purchase accounting ledger.
- The permission matrix separates committee and finance responsibilities: finance roles release monthly funds and review accounting, staff roles can review applications and submit committee accounting, and members can apply for open cycles.

## Configuration

- Foodstuff Purchase has its own tenant configuration, separate from loan and procurement settings.
- The configuration includes maximum payback months for member applications.
- The configuration includes whether the member's existing commitment can be reduced during Foodstuff Purchase payback or must remain fixed until the obligation is settled, waived, or otherwise closed.
- Fixed-commitment Foodstuff Purchase obligations block member commitment reductions while an approved application remains unpaid.

## Workflow

- Staff can manage Foodstuff Purchase operations from `/food-purchase`.
- Members can use `/food-purchase` to submit their own applications and view only their own application history.
- Staff opens or records a monthly Foodstuff Purchase cycle with the amount released to the committee.
- A member applies for a Foodstuff Purchase amount or item under that cycle and chooses requested payback months within tenant policy.
- Committee staff marks the application under review, approves it with an approved amount/payback months, or rejects it with notes.
- Linked members receive review-status emails for their own applications when member email contact is available.
- Members or staff can submit payment receipts against approved Foodstuff Purchase applications; finance approval updates the application payment evidence and blocks overpayment.
- Staff and member food-purchase views show paid and outstanding evidence for approved applications.
- At month end, committee staff records accounting totals and profit notes for the cycle.
- Pending applications and submitted accounting appear in the overview action queue.
- Workspace admins can export Foodstuff Purchase cycles and applications from `/reports/food-purchase-export`, including released funds, member applications, approval/payment evidence, accounting totals, and profit evidence.
- Finance/admin staff can accept submitted accounting or request correction; the submitting committee user receives an email decision when contact is available, and accepted accounting remains governance evidence until downstream posting rules are confirmed.
- The Roles page shows separate food-purchase actions for fund release, application review, committee accounting submission, accounting review, and member application.

## Data Model

- `FoodPurchaseCycle`: tenant, period month, released amount, release date, status, committee/accounting totals, profit amount, accounting notes, recorder/reviewer metadata.
- `FoodPurchaseApplication`: tenant, cycle, member, requested amount, requested payback months, item/notes, requested date, status, approved amount, approved payback months, paid amount, paid date, policy snapshot, reviewer metadata.
- Tenant settings: maximum payback months, commitment reduction mode during Foodstuff Purchase payback, and policy audit metadata.

## Open Questions

- TODO: Confirm exact posting semantics after approval/payment: repayment schedule, commitment deduction, one-off purchase receivable, payment-allocation target, or a hybrid by cooperative policy.
- Does the end-of-month profit belong to all cooperative members, only participating members, share holders, or a dedicated food committee/business pool?
- Should committee accounting require uploaded receipt/invoice evidence before finance approval?
