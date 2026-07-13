# 02 - Prepare Local QA Environment And Route Inventory

**What to build:** A repeatable local QA strategy and workflow inventory, so the browser run can start from a known tenant state and every required route/helper is known before testing begins.

**Blocked by:** None - can start immediately.

**Status:** done

**Implemented in:** [ENVIRONMENT.md](../ENVIRONMENT.md), [ROUTE-MATRIX.md](../ROUTE-MATRIX.md)

- [x] The QA run decides whether to reuse the current Minna Trust tenant or create a fresh local tenant.
- [x] Local startup, reset, and safety rules are documented using portless URLs.
- [x] Admin and member login/onboarding access paths are documented.
- [x] Email, notification, password setup, and onboarding token capture strategy is documented for local QA.
- [x] Dashboard and member routes/actions needed for setup, opening positions, receipts, loan requests, procurement, Foodstuff Purchase, notifications, and activity/audit visibility are inventoried.
- [x] Any workflow that is not browser-testable today is called out with the exact blocker category.
