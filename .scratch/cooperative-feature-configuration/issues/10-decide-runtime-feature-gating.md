# Decide Runtime Feature Gating

Type: grilling
Status: open
Blocked by: 03, 05, 06, 07, 08

## Question

How should enabled/disabled/office-only service settings affect runtime behavior across the product?

Resolve gating rules for:

- Dashboard navigation and admin route access.
- Member portal cards, links, forms, and empty states.
- Mobile service tiles and member actions.
- Payment receipt allocation categories.
- Reports and exports.
- Overview/action queues.
- Brought-forward setup optional obligation sections.
- Server-side action guards and API errors.

The answer should distinguish hiding a feature from preserving access to historical records and outstanding obligations. Disabled services with existing records should remain inspectable and reportable where finance safety requires it.

## Comments

- Runtime gating rule: service settings control new actions and default visibility, but they must never erase existing financial history, outstanding obligations, reports, statements, or audit evidence.
- Gating model: `disabled` hides navigation unless existing records/obligations exist, allows viewing existing records if present, blocks new staff and member records, and allows settlement of existing obligations. `office_only` shows to staff and shows member history/status only if relevant, allows staff create, blocks member create, and allows settlement. `member_self_service` shows to staff and members, allows viewing, allows staff create, allows member create, and allows settlement. `read_only` shows only where records/obligations exist, allows viewing, blocks staff and member create, and allows settlement of existing obligations.
- Dashboard navigation: staff navigation should hide disabled services with no records, but still show a service if there are active obligations, pending reviews, or historical records that need governance. Member navigation should show action links only for `member_self_service`, and may show status/history links for `office_only` or `read_only` when the member has records.
- Admin routes: route loaders should return a clear disabled/read-only state rather than 404. Staff can inspect existing records in `disabled` or `read_only` if records exist. Staff create buttons/forms are hidden and server-blocked unless mode is `office_only` or `member_self_service`.
- Member portal and mobile: service cards should be built from operation-profile settings plus the member's own records. `member_self_service` shows CTA and history. `office_only` shows history/status and "Contact the cooperative office to request this." `read_only` shows history/outstanding obligations only. `disabled` hides unless the member has history/outstanding obligations. Mobile actions must use the same server-side service checks as web.
- Payment receipts: allocation categories should be filtered by operation profile. Always keep `commitment`, `special_savings`, and supported active loan repayment categories where applicable. Show `procurement` only if procurement is enabled/readable or the member has active unpaid procurement schedules. Show `food_purchase` only if Foodstuff Purchase is enabled/readable or the member has approved unpaid applications. Do not allow receipt allocation to create new service obligations. Settlement of existing obligations must remain possible even when new requests are closed.
- Reports and exports: hide unused service exports by default. Show service exports when records exist, even if the service is now disabled/read-only. Export rows should include service status and record status where useful.
- Overview/action queues: show pending queues only for services with pending work or enabled workflows. If a service is disabled but has active obligations, show risk/settlement/follow-up items, not new-request prompts. Setup warnings should flag "Operation Profile not reviewed" and "Disabled service still has active obligations" where applicable.
- Brought-forward setup: optional obligation sections should appear when the service is enabled or existing tenant data suggests the service exists. If a service is disabled for a new tenant, hide its optional brought-forward section. If the tenant later sets a service to read-only, keep existing brought-forward obligations visible.
- Server-side guards: every create/submit action must check service mode. Staff creates require `office_only` or `member_self_service`. Member creates require `member_self_service`. Review/approve actions may continue for already-submitted records unless the service is `disabled` and the admin chooses to cancel/close them. Payment/settlement actions remain allowed for existing obligations. Error messages should be operational, such as "Procurement is office-managed for this cooperative" or "Foodstuff Purchase is not currently enabled for this cooperative."
- Implementation recommendation: create one shared helper/read model, maybe `getTenantOperationProfile`, that returns service settings plus derived booleans such as `canStaffCreate`, `canMemberCreate`, `canViewExisting`, `canSettleExisting`, `shouldShowInStaffNav`, and `shouldShowInMemberNav`.
