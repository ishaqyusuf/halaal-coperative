# Decide Batch Commitment Posting From Deduction Sources

Type: prototype
Status: open
Blocked by: 08

## Question

How should admins post monthly commitments in batch for members attached to a deduction source?

Prototype the workflow for a tenant admin or finance officer to select a period and deduction source, review eligible members, confirm expected commitment amounts, mark all or selected members as collected, handle exceptions, and create auditable contribution records.

The answer should decide:

- Whether the batch creates staged records first or posts immediately with confirmation.
- How exceptions are handled for absent/changed members.
- How manual-paying members are excluded or handled separately.
- Whether the workflow attaches source evidence, notes, or payroll reference.
- How it interacts with monthly records and existing contribution plans.
- What audit events are required.

The answer should link the prototype artifact and name the implementation seams to investigate later. Do not implement production UI.

## Comments

- Decision: batch commitment posting from collection sources should use a staged review-first workflow, not immediate automatic posting. This protects money safety and matches the existing system pattern of staged monthly records and reviewed receipts.
- Workflow name: **Collection Source Batch Posting**. Plain-language UI label: **Post commitments by collection source**.
- Recommended workflow: first choose the period, such as July 2026. Then choose one active Collection Source, such as "Ministry of Works Payroll." The system previews eligible active members assigned to that source, their active contribution plan, expected commitment, any scheduled loan servicing, and total expected collection. The admin stages the batch, creating or reusing monthly record rows for the selected period/source without posting contributions yet. The admin reviews and edits exceptions, including mark all as collected, uncheck members not included in payroll release, adjust paid amount, mark exception reason, and add batch note/reference. Require at least a payroll/reference note for batch posting; file upload can come later. On confirm, only selected reviewed rows are posted as contributions. Unselected or exception rows remain staged/unpaid and visible in collection gaps.
- Posting behavior: staged first, posted after explicit confirmation. Use existing contribution plans for expected commitment. Use monthly records as the best existing foundation. Posting should create normal `Contribution` records with channel `payroll` for ministry/employer payroll sources and probably `manual` or `transfer` for non-payroll source types. Do not auto-post merely because a member belongs to a source.
- Manual members: members with no Collection Source or source type `manual`, `cash`, or `bank_transfer` should not appear in payroll batch by default. They should be handled through payment receipts, contributions, or monthly-record manual posting. Admin may later create a manual collection-source batch, but it should be explicitly selected.
- Exception handling: if a member has no active contribution plan, show them as blocked and do not post. If a member's active commitment changed after staging, show a warning and require refresh or explicit override. If a member already has a posted contribution for that period, prevent duplicate posting unless the admin is using an adjustment/correction workflow. Partial payments are allowed but must show collection gap. Overpayment should follow the member's allocation preference or require explicit split into commitment/special savings.
- Audit and reports: audit batch creation, row edits, and final posting with actor, period, collection source, member counts, expected total, posted total, skipped total, reference/note, and exceptions.
- Recommended implementation seam: extend monthly records with source filtering or source grouping rather than creating a competing batch model. If needed, add batch metadata such as collection source id, batch reference, staged/posted totals, created by, and posted by. Keep individual monthly record member rows as the posting unit.
- Suggested prototype artifact if this ticket is later expanded visually: `.scratch/cooperative-feature-configuration/prototypes/collection-source-batch-posting.md`.
