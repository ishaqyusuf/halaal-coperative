# Decide Commitment Collection Source Model

Type: grilling
Status: open
Blocked by: 01, 02

## Question

How should the system model members whose commitments are collected automatically through a ministry/employer/payroll source versus members who pay manually?

Resolve the domain language and settings around:

- `DeductionSource` as the likely generic name for ministry, employer, payroll desk, bank-transfer group, cash/manual group, or other collection source.
- Member-level assignment to a deduction source during member creation and later edits.
- Whether `MemberType` is enough to distinguish civil servants, individuals, and businesses, or whether contribution collection mode should be separate from member type.
- How a cooperative can mix payroll-deducted members and manual-paying members in the same tenant.
- How manual members submit commitments, likely through member payment receipts or office/admin posting.
- Which settings belong at tenant level, deduction-source level, and member level.

The answer should avoid hard-coding "ministry" as the only concept if employers, businesses, or manual members need the same structure.

## Comments

- Decision: use **Collection Source** as the product-facing language, backed by the existing `DeductionSource` model in code. This avoids hard-coding "ministry" while still supporting ministries naturally.
- Naming: UI label should be **Collection Source**. Technical/model name can remain `DeductionSource`. Examples include ministry payroll, employer payroll, bank transfer group, cash/manual group, cooperative office, and self-employed/manual.
- Key domain decision: `MemberType` and collection source must stay separate. `MemberType` answers who this member is: civil servant, individual, or business. Collection source answers how this member's monthly commitment is collected: ministry payroll, employer payroll, bank transfer, cash, manual, card, etc. A civil servant may still pay manually, a business owner may pay by bank transfer, one cooperative may mix payroll-deducted members with self-employed members and office cash/manual members, and changing how someone pays should not change who they are.
- Recommended model use: tenant level enables mixed collection and configures whether deduction-source batch posting is used. Collection-source level stores name, type, external reference, active/inactive, and later maybe default posting channel or payroll contact. Member level stores optional `deductionSourceId`, with ability to change it later with audit. Contribution level keeps the actual posted payment channel/reference because a member's source can change over time.
- Member creation/edit behavior: add a **Collection Source** field. Allow "No source / Manual payer" for self-employed/manual members. If the cooperative has enabled payroll/deduction sources, make the field visible and recommended but not globally required. If the selected source type is payroll/ministry/employer, that member becomes eligible for batch posting by source.
- Manual members: manual members should pay through member payment receipts when member self-service receipts are enabled. Otherwise staff can post commitments from the office/admin flow. Manual members should not be included in payroll/deduction-source batch posting unless explicitly selected.
- Avoid: do not call the field "Ministry" globally. Do not overload `MemberType` for payment behavior. Do not assume direct deduction means the whole tenant is payroll-only. Do not post money automatically just because a member has a collection source; payroll/batch confirmation is still required.
- Recommendation: keep `DeductionSource` as the database concept for now, but introduce **Collection Source** in the UI and docs. A future model rename can be a safe refactor, but it is not required for this feature.
