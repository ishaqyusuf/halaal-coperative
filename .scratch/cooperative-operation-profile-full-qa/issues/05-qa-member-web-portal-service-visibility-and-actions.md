# 05 — QA Member Web Portal Service Visibility And Actions

**What to build:** Member web portal QA evidence that service visibility, history, create actions, empty states, and blocked-state copy match Operation Profile modes without exposing staff-only behavior or hiding existing obligations.

**Blocked by:** 03 — QA Getting Started And Settings Operation Profile.

**Status:** completed

- [x] Test member navigation and dashboard cards across disabled, office-managed, member-self-service, and read-only services.
- [x] Verify member procurement and Foodstuff Purchase create forms appear only for member-self-service.
- [x] Verify member payment receipt submission appears only when receipt self-service is enabled.
- [x] Verify office-managed/read-only services still show member history when records exist.
- [x] Verify existing payable procurement/Foodstuff obligations remain settlement-visible after new requests are closed.
- [x] Check empty states and blocked-state copy for clarity.

## Approved Comment

Approve member web portal QA after the website/server Operation Profile behavior is stable. Test the member-facing portal across all service modes: `disabled`, `office_only`, `member_self_service`, and `read_only`.

Expected behavior: members should only see create/submit actions when the service allows member self-service. Office-managed and read-only services should still show existing history, outstanding obligations, repayment targets, and status evidence where records exist. Disabled services with no records should disappear from member navigation/cards, but disabled services with existing records must remain discoverable enough for the member to understand and settle obligations.

This pass should cover procurement requests, Foodstuff Purchase applications, member payment receipt submission, receipt history, service dashboard cards, empty states, blocked-state copy, and direct route access. Treat any staff-only action exposed to members, cross-member data exposure, hidden payable obligation, or settlement path disappearing as a blocker.

## Implementation Evidence

QA member data:

- Created local QA-only member user `qa.member.amanah@example.test` and linked it to existing Amanah member `Musa Bello (8803)` with `member` role.
- Created local QA-only member user `qa.member.kano@example.test` and linked it to existing Kano member `Zainab Muhammad (COOP-8824)` with `member` role.
- Login used the dev `userId` path through `/auth/login`; no admin account was downgraded or reused as a member.

Defect found and fixed:

- Disabled/default Kano member dashboard still showed disabled unused member services: a Foodstuff Purchase card with `Apply`, plus a procurement `Request item` action inside the financing card. The overview component now gates procurement dashboard rows/actions and Foodstuff Purchase cards/actions with Operation Profile visibility/create flags.
- The fix separates “show this service because it is enabled or has history” from “allow member create.” Read-only and office-managed routes can show history/empty states without rendering create/submit links.

Browser evidence:

- Enabled/self-service Amanah member home returned `200` and rendered `Member dashboard`, `Foodstuff Purchase applications`, `Apply`, and `Request item`, with no `TRPCClientError`, `Failed to parse URL`, `New member`, or `Import members` markers.
- Enabled/self-service Amanah `/procurement` returned `200` and rendered `My procurement`, `Request item purchase`, and `Send request`, with no staff-only markers.
- Enabled/self-service Amanah `/food-purchase` returned `200` and rendered `My Foodstuff Purchase`, `Apply for Foodstuff Purchase`, and `Send request`, with no staff-only markers.
- Enabled/self-service Amanah `/payment-receipts` returned `200` and rendered `My payment receipts`, `Submit payment receipt`, and `Submit receipt`, with no staff-only markers.
- Disabled/default Kano member home returned `200` and rendered `Member dashboard` while hiding `Foodstuff Purchase applications`, `Apply`, `Request item`, `New member`, and `Import members`.
- Disabled/default Kano `/procurement` and `/food-purchase` returned `200` with blocked-state copy containing `not enabled` and `has not enabled`, and without create/send form markers.
- Disabled/default Kano `/payment-receipts` returned `200` and rendered `My payment receipts` plus receipt history empty state while hiding `Submit payment receipt` and `Submit receipt`.
- Temporary Amanah office-only mode for payment receipts, procurement, and Foodstuff Purchase returned `200` for member home and direct service routes. Direct procurement/Foodstuff/receipt pages stayed readable with empty/history states, while `Request item purchase`, `Apply for Foodstuff Purchase`, `Submit payment receipt`, `Submit receipt`, and `Send request` were absent.
- Temporary Amanah read-only mode returned `200` for the same member pages with the same no-create/no-submit behavior.
- Amanah was restored to `member_self_service` for payment receipts, procurement, and Foodstuff Purchase with policy caps `2` and `foodPurchaseRequiresOpenCycle: true`; the restored member home again rendered `Apply` and `Request item`.

Verification:

- `bun --filter @halaalvest/dashboard typecheck` passed after the member dashboard visibility fix.
- Ticket 04 server-guard tests remain the authoritative evidence for settlement/category preservation when disabled/read-only services have payable obligations.
