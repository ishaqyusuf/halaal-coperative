# Audit Existing Configuration Surfaces And Gaps

Type: research
Status: open
Blocked by:

## Question

What configurable operation settings already exist in the codebase, and what gaps remain before the operation profile can drive Getting Started, admin workflows, member workflows, mobile, and reports?

Audit the existing schema, query helpers, dashboard forms, onboarding/getting-started flow, mobile read models, and routes for:

- `TenantPolicy` operation fields.
- `DeductionSource` and member assignment.
- Procurement request and repayment policy.
- Foodstuff Purchase cycle/application policy.
- Member payment receipt categories and period intent.
- Member signup access mode and migration setup mode.
- Navigation/report/mobile surfaces that assume features are always available.

The answer should be a linked summary of current support, missing persistence, missing UI, missing server guards, and likely compatibility risks. Do not implement changes.

## Comments

- Audit answer: the codebase already has strong finance workflow foundations, but it does not yet have a first-class **Cooperative Operation Profile** that says which services the tenant actually operates and who may initiate each service.
- Already supported: `TenantPolicy` stores many policy rules, including share configuration mode, migration setup mode, member signup access mode, strict commitment, procurement payback cap, Foodstuff Purchase payback cap, active-financing procurement blocking, and commitment-reduction rules. `DeductionSource` already exists and is broad enough for ministry payroll, employer payroll, bank transfer, cash, card, and manual sources. Members already have `deductionSourceId`. Procurement already has request, review, purchase activation, repayment schedule, payment receipt allocation, audit logs, staff UI, member UI, reports, and mobile support. Foodstuff Purchase already has monthly cycles, member applications, review, accounting evidence, payment receipt allocation, staff UI, member UI, reports, and mobile support. Payment receipts already support category-aware and period-aware allocations, including commitment, special savings, loans, shares, procurement, project financing, Foodstuff Purchase, and other. Getting Started already handles migration setup mode and share setup, but it does not yet ask the broader "how does this cooperative operate?" question.
- Main gaps: there is no explicit tenant-level service activation model; procurement, Foodstuff Purchase, payment receipts, project financing, and member request flows are treated as generally available once the user has the right role. There is no per-service access mode like `disabled`, `office_only`, `member_self_service`, or `read_only`. Dashboard navigation is role-gated but not feature-gated. Member portal and mobile surfaces show procurement, Foodstuff Purchase, receipts, and project financing without checking whether the tenant operates them. Server actions enforce finance policy, tenant scope, payback caps, and audit, but they do not yet enforce "this tenant does not operate this service" or "members cannot initiate this service." Monthly records can stage and apply commitment rows, but there is no deduction-source batch posting workflow yet for "this ministry/payroll source has paid this month." Payment receipt categories are always available in the form instead of being filtered by tenant operation profile. Reports and exports always list operational areas such as procurement and Foodstuff Purchase instead of adapting to enabled services while preserving historical records. Existing tenant rollout needs care: if a tenant already has procurement or Foodstuff Purchase records, disabling the service must not hide outstanding obligations or erase audit evidence.
- Recommendation: use the existing models as foundations, but add a thin operation-profile layer that drives visibility and permissions. The rule should be: service settings may hide or block new actions, but they must never hide existing money records, active obligations, audit logs, or reports needed for governance.
