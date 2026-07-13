# Decide Simpler Service Option Sets

Type: grilling
Status: open
Blocked by:

## Question

Which Operation Profile questions actually need four access-mode options, and which should use simpler yes/no or two-choice controls?

Resolve the recommended option model for:

- Commitment collection and payment receipts.
- Collection Sources and batch posting.
- Procurement.
- Foodstuff Purchase.
- Member support.
- Read-only/history preservation when records already exist.

The answer should define the default choices, labels, helper text, and when advanced options like `read_only` should be hidden, shown, or derived from existing records.

## Comments

Recommendation: do not show all four access modes for every service during first-run setup. Use a simple first question per service, then reveal only the choices that matter.

Commitments should ask how payments are collected: office/manual posting, member receipt upload, collection source/payroll batch, or mixed. Procurement and Foodstuff Purchase should start with "Does this cooperative offer this service?" If yes, ask whether requests are office-managed or members can request online. Member support can default on with member access enabled. `read_only` should not be a normal first-run option unless existing records already require history preservation.
