# Decide Member Self-Service Access Modes

Type: grilling
Status: open
Blocked by: 01, 03

## Question

What access modes should each enabled service support for members versus office/admin-only operation?

Resolve the access model for member-facing actions such as procurement requests, Foodstuff Purchase applications, payment receipt submission, additional share applications, support cases, and profile/KYC updates.

The key procurement example to decide is:

- Members may submit procurement requests themselves from the website/mobile member area.
- Or procurement exists, but members must request it in the office and staff create the request through an admin account.

The answer should decide the reusable naming for access modes, whether the modes are per-service or global, what members see when a service is office-only, and what server-side guards must enforce regardless of hidden UI.

## Comments

- Decision: use per-service access modes, not one global member-access switch. A cooperative can allow members to submit receipts while still requiring procurement requests to happen in the office, or allow Foodstuff Purchase applications while keeping share applications staff-managed.
- Reusable access modes: `disabled` means the cooperative does not operate this service and no new staff or member requests are allowed, while existing records remain available if they already exist. `office_only` means staff can create and manage requests for members; members may see existing/status records but cannot initiate new requests. `member_self_service` means members can initiate requests from web/mobile, and staff can still create, review, and manage them. `read_only` means no new requests from staff or members, but existing records, active obligations, statements, reports, and audit history remain visible.
- Product labels should avoid raw enum language: `disabled` -> "Not used"; `office_only` -> "Office-managed"; `member_self_service` -> "Members can request"; `read_only` -> "View existing records only".
- Recommended per-service defaults: procurement defaults to `disabled` for new tenants, existing records default to `office_only` or `read_only`, and member self-service is only enabled explicitly. Foodstuff Purchase defaults to `disabled`; if enabled, it usually starts as `office_only` because it depends on monthly cycles and committee review. Payment receipts default to `office_only` and upgrade to `member_self_service` when the cooperative wants members to upload receipts. Optional share applications default to `office_only` when unit-based shares are enabled, with `member_self_service` only when the cooperative wants members to request extra units themselves. Support cases default to `member_self_service` when member accounts are active, because this protects trust and keeps issues auditable; if member accounts are not active, staff can still log cases. Profile/KYC updates default to `office_only`; member self-service can be added later for document/profile update requests.
- Member-facing behavior: `disabled` shows no card/link unless existing records exist. `office_only` shows history/status if records exist, with text like "Contact the cooperative office to request this." `member_self_service` shows the action button and history. `read_only` shows history/outstanding obligations and no action button. Existing obligations should still appear on statements and payment targets where settlement is needed.
- Server-side guard rules: UI hiding is not enough. Every create action must check the tenant service setting. Staff create actions require service mode `office_only` or `member_self_service`. Member create actions require service mode `member_self_service`. `read_only` blocks new applications but allows viewing and servicing existing obligations. `disabled` blocks new actions; if records exist, the system should treat them as historical/read-only rather than deleting or hiding them. Payment receipt allocation should only show categories for enabled/readable services, but it must still allow repayment/settlement of existing active obligations even if new requests are closed.
