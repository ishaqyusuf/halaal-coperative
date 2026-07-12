# 07 — QA Reports Overview Navigation And Preservation

**What to build:** Reports, overview queue, and navigation QA evidence that unused disabled services can be hidden while existing records, pending reviews, outstanding obligations, and audit/report evidence remain accessible.

**Blocked by:** 04 — QA Staff Service Workspaces And Server Guards.

**Status:** completed

- [x] Verify staff and member navigation filtering for disabled unused services and services with records.
- [x] Verify overview action queues include pending service work only when enabled or when records need action.
- [x] Verify report export cards hide unused disabled services and reappear when records exist.
- [x] Verify route-title behavior and direct route access do not break when nav entries are hidden.
- [x] Verify no existing financial history, statement evidence, report evidence, or audit evidence disappears because a service is closed to new requests.

## Approved Comment

Approve reports, overview, and navigation QA after staff workspace/server guard behavior is verified. This pass should prove that Operation Profile configuration can simplify the UI for cooperatives that do not use a service without erasing financial evidence or pending work for cooperatives that already have records.

Test staff navigation, member navigation, route titles, direct route access, overview queues, report/export cards, and empty states for disabled unused services, office-managed services, member-self-service services, read-only services, and services with existing records. Hidden navigation is acceptable only when the service is unused and has no pending action, history, outstanding obligation, statement evidence, report evidence, or audit evidence.

Treat any disappearing financial history, missing pending review, missing settlement/servicing path, broken direct route, role leakage, or report/export card that hides existing evidence as a blocker. Cosmetic navigation inconsistencies can be recorded separately when they do not affect money safety or evidence access.

## Implementation Evidence

Baseline browser evidence:

- Enabled/self-service Amanah admin `/` returned `200` and rendered overview/navigation markers for `Procurement`, `Foodstuff Purchase`, and `Payment receipts` with no `TRPCClientError` or `Failed to parse URL` markers.
- Enabled/self-service Amanah `/reports` returned `200` and rendered `Report exports`, `Procurement CSV`, `Foodstuff Purchase CSV`, `Payment receipts CSV`, and `Open activity report`.
- Disabled/default Kano admin `/` returned `200` and hid unused disabled `Procurement` and `Foodstuff Purchase` markers while keeping `Payment receipts`.
- Disabled/default Kano `/reports` returned `200` and hid `Procurement CSV` and `Foodstuff Purchase CSV` while keeping `Payment receipts CSV`, `Contributions`, and `Open activity report`.
- Disabled/default Kano direct `/procurement` and `/food-purchase` returned `200` with blocked-state copy containing `not enabled` and `has not enabled`, proving hidden navigation does not break direct route handling.
- Hidden disabled Kano export URLs `/reports/procurement-export` and `/reports/food-purchase-export` returned `200 text/csv; charset=utf-8`, proving direct report routes remain stable even when cards are hidden.

Preservation evidence with existing records:

- Created a local QA procurement record in disabled/default Kano by temporarily enabling procurement, creating submitted request `QA preservation item`, then disabling procurement again with a change reason.
- After disabling procurement with existing history, Kano admin `/` returned `200` and rendered `Procurement` again in navigation/overview context.
- Kano `/reports` returned `200` and rendered `Procurement CSV` again, proving report cards reappear when records exist even if new procurement is disabled.
- Kano staff `/procurement` returned `200` and rendered `QA preservation item`, while `Save request` and active create form markers remained absent. The page copy indicates new procurement requests are closed rather than exposing a write path.
- Kano member `/` returned `200` and rendered `QA preservation item` in the member dashboard without `Request item` or member create form markers.
- Kano member `/procurement` returned `200` and rendered `My procurement` plus `QA preservation item` without `Request item purchase`, `Send request`, or staff-only markers.

Verification:

- Existing focused tests cover the core rules behind this pass:
  - `apps/dashboard/src/lib/navigation/lib.test.ts` verifies hidden service paths do not remove core navigation.
  - `apps/dashboard/src/lib/payment-receipts/load-payment-receipts-page.test.ts` verifies settlement categories remain visible when disabled services have payable obligations.
  - Ticket 04's 161-test focused regression remains the server-guard baseline for create rejection, caps, receipt categories, and Collection Source batch behavior.
