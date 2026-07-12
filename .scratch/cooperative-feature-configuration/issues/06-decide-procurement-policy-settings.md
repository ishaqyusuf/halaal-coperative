# Decide Procurement Policy Settings

Type: grilling
Status: open
Blocked by: 01, 02, 05

## Question

What procurement settings are required beyond the existing payback and active-financing policy fields?

Resolve the tenant-level procurement policy for this wave, including:

- Whether procurement is enabled.
- Member request access mode.
- Maximum active procurement obligations per member, which is the clearer replacement for "maximum procurement per cycle" if the real rule is "finish one before taking another."
- Whether the limit counts submitted, approved, purchased, active, or unpaid procurement records.
- Whether a member can request procurement while repaying another procurement.
- Whether a member can request procurement while serving loan/financing, using the existing active-financing policy where possible.
- Whether invoice/vendor evidence, guarantors, or purchase documentation are required now or deferred.

The answer should define the setting names, operator descriptions, validation rules, and behavior in admin and member request flows.

## Comments

- Decision: procurement remains a separate cooperative service, not a loan and not a generic charge. The first-wave policy should extend the existing procurement rules without overbuilding vendor/invoice management yet.
- Recommended settings: service access uses `procurementAccessMode` through the tenant service setting and defaults to `disabled` for new tenants; existing `procurementMaximumPaybackMonths` defaults to `12`; existing `activeFinancingBlocksProcurement` defaults to `true`; existing `procurementAllowsCommitmentReductionDuringPayback` defaults to `false`; add `procurementMaximumActiveObligationsPerMember` defaulting to `1`. A separate request-pipeline cap can wait unless duplicate pending requests become a real issue.
- Naming decision: replace "maximum procurement per cycle" with **maximum active procurement obligations per member**. It maps better to the business rule: can a member collect another item while still paying for the current one?
- Counting rule: count procurement as an active obligation only when it has become real cooperative exposure: `purchased` or `active`, and the repayment schedule is not fully paid. Do not count `rejected`, `cancelled`, or `completed`. Do not count `submitted` or `under_review` against the active obligation cap, though duplicate pending requests for the same member/item can be prevented later if needed. For v1, `approved` but not yet purchased is pending review evidence, not an active obligation, until purchase activation.
- Request behavior: `disabled` allows no new procurement requests while preserving existing records; `office_only` lets staff create procurement requests for members while members only view status/history; `member_self_service` lets members submit requests while staff can still create and review them; `read_only` allows no new requests but keeps existing records and outstanding repayments visible.
- Validation rules: request cost must be positive; requested repayment months must be positive and no more than `procurementMaximumPaybackMonths`; if `activeFinancingBlocksProcurement` is true, block requests while the member has active financing; if active unpaid procurement count is already at `procurementMaximumActiveObligationsPerMember`, block new request submission. Service mode must be enforced server-side: staff create requires `office_only` or `member_self_service`; member create requires `member_self_service`.
- Evidence and guarantors: defer procurement guarantors for this wave. Defer full vendor management and invoice upload requirements. Keep `vendorName` optional at request time. Require staff to record purchase activation before repayment schedules begin. Strongly recommend purchase reference or purchase note when marking purchased, but file upload can come later.
- Admin/member behavior: member request forms should show the repayment cap and whether active financing or active procurement blocks the request. Admin review should show the policy snapshot: max payback, active obligation cap, financing overlap rule, and commitment-reduction rule. Approved request remains review evidence only; the real obligation begins when staff records purchase activation. Purchase activation snapshots the active policy onto the request/schedule so later policy changes do not rewrite old procurement terms.
