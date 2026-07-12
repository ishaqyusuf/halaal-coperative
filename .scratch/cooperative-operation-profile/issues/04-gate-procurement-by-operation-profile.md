# 04 - Gate Procurement By Operation Profile

**What to build:** Procurement navigation, staff creation, member self-service, payment settlement, and server actions obey disabled, office-only, member-self-service, and read-only modes while existing obligations remain visible.

**Blocked by:** 01 - Persist Tenant Operation Profile Defaults; 03 - Add Operation Profile Settings Workspace.

**Status:** done

- [x] Disabled procurement hides new-request entry points when no procurement records exist.
- [x] Office-managed procurement lets staff create requests and blocks member-created requests.
- [x] Member-self-service procurement lets linked members submit requests and still lets staff manage requests.
- [x] Read-only procurement blocks new requests while preserving existing procurement records and repayment visibility.
- [x] Server-side procurement create actions enforce service mode regardless of hidden UI.
- [x] Procurement route, member portal, and mobile behavior are covered for each access mode.
