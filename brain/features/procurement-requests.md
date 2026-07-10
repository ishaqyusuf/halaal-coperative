# Procurement Requests

## Purpose
- Support the client workflow where the cooperative purchases an item for a member and the member repays the cooperative monthly.
- Keep procurement separate from ordinary financing so item details, vendor, cost approval, and repayment plan are explainable.

## Implemented Behavior
- Staff can create procurement requests from `/procurement` with member, item, optional vendor, requested cost, description, and repayment months.
- Linked members can create their own procurement requests from `/procurement` without selecting a member profile, and can view only their own procurement request history.
- The system calculates an estimated monthly repayment from requested cost and months.
- Tenant policy `activeFinancingBlocksProcurement` blocks procurement requests when a member has approved, disbursed, or active financing unless the cooperative disables that guardrail.
- Tenant policy `procurementMaximumPaybackMonths` caps requested and approved repayment months for procurement requests.
- Tenant policy `procurementAllowsCommitmentReductionDuringPayback` controls whether a member's commitment can be reduced while active procurement obligations are still unpaid.
- Finance staff can mark procurement requests under review, approve them with an approved cost/month count, or reject them with notes.
- Approved requests store approved monthly repayment estimates and snapshot the policy cap/flexible-commitment setting used during approval.
- Finance staff can record purchase/fulfillment evidence for approved requests with purchase date, first repayment due date, reference, and notes.
- Recording a purchase marks the request active and creates monthly procurement repayment schedule rows for the approved cost and approved repayment months.
- Payment receipts can allocate money to active procurement repayment schedule items; finance approval updates the selected schedule row's paid amount/status and completes the request when all schedule rows are paid or waived.
- Approved brought-forward opening balances with procurement outstanding can create an active procurement request labeled as a brought-forward procurement balance, with one opening schedule item for the outstanding amount and an audit link back to the opening-balance row.
- Reversing the applied opening balance cancels the linked opening procurement request and waives its schedule item only when there is no repayment activity against that obligation.
- Procurement read models derive due and overdue installment status from schedule due dates and surface due, overdue, and outstanding servicing counts in staff and member procurement views.
- Procurement requests appear in the admin action queue while submitted or under review.
- Request and review actions write audit log entries.
- Workspace admins can export procurement requests from `/reports/procurement-export`, including member, item/vendor, requested cost, approved cost, repayment estimates, policy payback/commitment snapshots, purchase evidence, outstanding amount, due/overdue schedule risk, schedule summary, reviewer, and review notes.
- Procurement review decisions emit a registered member notification event and send an audited direct email to the linked member when member email contact is available.

## Configuration

- Procurement has its own tenant configuration, separate from loan settings and separate from Foodstuff Purchase settings.
- The configuration includes maximum payback months for procurement requests.
- The configuration includes whether a member's existing commitment can be reduced during procurement payback or must remain fixed until the procurement obligation is settled, waived, or otherwise closed.
- Approved procurement requests snapshot relevant policy values so later settings changes do not rewrite existing repayment schedules or commitment-reduction behavior.

## Boundaries
- Procurement repayment receipt posting is schedule-based and requires a selected repayment schedule item per allocation.
- Brought-forward procurement opening uses a one-row schedule because the opening-balance capture only stores current outstanding amount, not the original vendor, item history, or month-by-month procurement plan.
- This slice does not yet post procurement cash/bank disbursement ledger entries, formal default/escalation handling, or procurement-specific accounting ledger entries.
