# Project Financing Requests

## Purpose
- Capture the client workflow where the cooperative may invest in, finance, or share profit from a member business.
- Keep project financing separate from ordinary loans, procurement, and cooperative business-profit records until the accounting structure is confirmed.

## Implemented Behavior
- Staff can create tenant-scoped project financing requests for active members through the query layer.
- Staff can manage project financing requests from `/project-financing`.
- Staff can create requests from the dashboard with member, business, requested amount, proposed structure, optional payback months, purpose, and description.
- Linked members can create their own project financing requests from `/project-financing` without selecting a member profile, and can view only their own project financing request history.
- Each request records business name, optional business description, optional project purpose, requested amount, optional requested payback months, and proposed structure.
- Supported structures are `undecided`, `repayable_facility`, `investment_partnership`, and `profit_sharing`.
- The system calculates a principal-only monthly payback estimate when a payback month count is provided.
- Staff can mark requests under review, approve them, or reject them.
- Approval requires the structure to be clarified; an approval cannot remain `undecided`.
- Repayable-facility approvals require payback months and store a principal-only approved monthly payback estimate.
- Repayable-facility approvals can be selected from payment receipt allocations while approved or active; finance approval updates paid amount evidence, marks partially paid requests active, and marks fully paid requests completed.
- Investment-partnership and profit-sharing approvals store approved amount and structure without repayment months.
- Finance staff can record disbursement evidence for approved requests, including disbursement date, reference, notes, and actor; recording disbursement moves the request to active.
- Request and review actions write audit log entries.
- Live project financing writes stay locked until initial migration is finalized.
- Pending project financing requests appear in the overview action queue while submitted or under review.
- Workspace admins can export project financing requests from `/reports/project-financing-export`, including member, business, requested amount, proposed structure, approval structure, disbursement evidence, reviewer, payback evidence, paid amount, outstanding amount, and completed date.
- Project financing review decisions emit a registered member notification event and send an audited direct email to the linked member when member email contact is available.

## Boundaries
- Disbursement recording is evidence that funding was released; it does not create ledger entries or bank-transfer integrations.
- This slice does not create loan records, repayment schedules, procurement ledgers, profit-sharing allocations, dividend records, or non-repayable member obligations.
- Receipt allocation posting is limited to requests approved as `repayable_facility`; investment-partnership and profit-sharing structures remain review-only until their accounting rules are confirmed.

## Open Questions
- Should an approved project financing request become a repayable facility, investment partnership, profit-sharing arrangement, or a selectable mix per request?
- If profit-sharing applies, what is the profit measurement period, evidence requirement, and distribution rule?
- Can a member have active ordinary financing, procurement, food purchase obligations, and project financing at the same time?
- Who can approve project financing, and does it require committee or dual approval?
