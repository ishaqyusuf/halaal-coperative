# Decide Feature Settings Persistence And Defaults

Type: grilling
Status: open
Blocked by: 01, 02

## Question

Where should tenant service activation and operation-profile settings live, and what should the defaults be?

Resolve whether this effort should:

- Extend `TenantPolicy` with explicit service activation/access fields.
- Introduce a separate tenant feature/settings table.
- Use a hybrid where core finance policy stays on `TenantPolicy` and per-service activation/access lives elsewhere.

The answer should decide naming, default behavior for new tenants, default behavior for existing tenants with historical data, how disabled services with existing records should behave, and how settings changes are audited.

The answer must preserve finance safety: disabling a service should not delete records or hide obligations that already exist.

## Comments

- Decision recommendation: use hybrid persistence. Keep money-policy rules in `TenantPolicy`, but add a separate operation-profile layer for service activation and access.
- Keep these in `TenantPolicy`: share configuration mode and share limits, financing policy, procurement payback policy, Foodstuff Purchase payback policy, strict commitment rules, active-financing overlap rules, and member signup access mode unless it is later unified carefully.
- Add a new service availability model, likely `TenantOperationProfile` plus `TenantServiceSetting`, or a single typed service-settings table if the implementation can stay simple. Suggested service setting fields: `tenantId`, `serviceKey` such as `payment_receipts`, `procurement`, `food_purchase`, `support_cases`, and later maybe `project_financing` or `emergency_financing`; `accessMode` as `disabled`, `office_only`, `member_self_service`, or `read_only`; review metadata such as `reviewedAt` and `reviewedByUserId`; and timestamps. Avoid JSON for money-critical policy. Numeric limits like procurement max active obligations should be typed columns, probably on `TenantPolicy` or a typed service-policy table, not hidden inside flexible JSON.
- Defaults for new tenants: members, KYC, roles, audit, and commitments/savings are always on; shares are always configured through the existing share setup; support cases are on; payment receipts default to `office_only` until the cooperative enables member upload; procurement defaults to `disabled` until selected; Foodstuff Purchase defaults to `disabled` until selected; project financing and emergency financing stay deferred unless explicitly added.
- Defaults for existing tenants: if a service already has records, never default it to fully hidden. Active or outstanding records should force at least `read_only`. If staff workflows already exist, default to `office_only`. If member-created or member-facing records exist, default to `member_self_service`. Show an operation-profile review warning until an admin confirms the settings.
- Disabled services block new requests, not financial history. Existing records, outstanding obligations, reports, audit logs, statements, and payment servicing must remain visible. If a service has active obligations, the UI should use `read_only` rather than true `disabled`.
- Audit rule: only tenant admins and super admins should change service activation/access. Finance officers may continue changing finance policy where already allowed. Every operation-profile change should create an audit log with before/after values, actor, timestamp, and a reason/note when disabling or restricting a service.
