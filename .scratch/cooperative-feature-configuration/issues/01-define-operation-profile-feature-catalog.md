# Define Operation Profile Feature Catalog

Type: grilling
Status: open
Blocked by:

## Question

What is the tenant operation profile feature catalog for this implementation wave?

Resolve the list of cooperative services that should be configurable during Getting Started and later settings review. At minimum, cover:

- Shares, as an existing configurable reference point.
- Procurement.
- Foodstuff Purchase / Food Purchase.
- Member payment receipts.
- Commitment collection.
- Deduction-source / payroll collection.
- Member self-service access for service requests.

For each service, decide the domain description shown to admins, the enabled/disabled meaning, whether it is a tenant-wide capability or member-level capability, and whether the service can be enabled only for office/admin use.

The answer should also decide whether emergency financing and project financing belong in the first catalog or remain future/fog for this effort.

## Comments

- Recommendation from domain review: define this as a **Cooperative Operation Profile**, not generic feature toggles. The first setup question should ask, "How does this cooperative operate?" and then configure services from there so we do not hard-code one demo cooperative's workflow as the global product model.
- Recommended first-wave catalog: members/KYC/roles/audit are always on; monthly commitment/savings is always on with configurable collection method; shares are always configured through the existing share model selection; payment receipts are configurable as office-only or member self-service; procurement is optional with access mode and active obligation limits; Foodstuff Purchase is optional and separate from procurement; deduction/collection sources are optional but important for ministry/payroll cooperatives; support cases should stay on for member trust and audit evidence; emergency financing should wait unless treated as a loan product mode; project financing should wait because its accounting semantics are still unclear.
- Recommended service questions: first, does the cooperative operate this service? Second, who may initiate it? Third, what policy controls it? Suggested access modes are `disabled`, `office_only`, `member_self_service`, and `read_only`, where read-only preserves old records and outstanding obligations without allowing new requests.
- Procurement should use "maximum active procurement obligations per member" instead of "maximum procurement per cycle" when the real rule is whether a member must finish one procurement before another. Foodstuff Purchase should have its own settings for enabled state, open-cycle requirement, member application access, active obligation limits, payback months, and payment receipt allocation. Commitment collection should use the broader language of **Collection Source** or existing **Deduction Source**, not globally hard-coded "ministry", because sources may include ministry payroll, employer payroll, bank transfer, cash/manual, and self-employed/manual contributors.
