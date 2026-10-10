# Mobile filter sheets — 6 October 2026

Status: source implementation and focused component QA complete; authenticated route acceptance awaits an existing local staff QA account.

## Migration contract and conformance audit

- [x] Inspect Brain/standards, EwaTrade approved option 02, existing filters and URL hooks. Midday references: `invoice-search-filter.tsx`, `use-customer-filter-params.ts`, `sheets/category-create-sheet.tsx`, and state/routing guidance.
- [x] Keep UI composition under dashboard `components/search-filter`; reuse package UI primitives. Keep server routes, prefetch/hydration, API/schema/query ownership unchanged.
- [x] Implement one mobile sheet shell and disclosure group, with ephemeral drafts separated from navigable URL state; preserve search and page-specific sorts/permissions.
- [x] Migrate domain drawers and shared-panel consumers; retain desktop menus/panels and query keys. Existing table columns, selection/bulk actions, view tabs, loaders/errors, and permissions remain outside this scoped migration.
- [x] Validate real production UI components in isolated browser fixtures and run focused checks.
- [ ] Complete authenticated page/filter/refetch/pagination/loading/denied acceptance with an existing staff QA login. The local database has been started through the project service runner; the real dashboard reaches login.

| Consumer | Preserved controls / migration |
| --- | --- |
| Members | status/type/KYC/mode-aware migration/date range/sort; shared groups |
| Membership approvals | status/sort; shared groups |
| Contributions | query-supplied member/channel/date range/sort; shared fields/groups |
| Repayments | collections/schedule/history, assignee/stage/resolution/status/date/member/sort; conditional shared fields/groups |
| Loans | request/portfolio statuses and their distinct sorts; shared groups |
| Charge definitions | status/frequency/value type/sort; shared groups; compatibility header switches too |
| Businesses | status/profit/source/boolean profit evidence/dividend period/date/sort; shared groups |
| Import histories | batch status; shared group; retains import-kind labels |
| Share requests | status/sort; shared groups |
| Payment receipts | status/sort; shared groups |
| Support | member status/priority; staff-only category/assignee; shared groups |
| Food purchase | status/sort; shared groups |
| Procurement | status/sort; shared groups |
| Project financing | status/sort; shared groups |
| Audit / notifications / reports | existing server-supplied metadata and typed URL hooks; central panel switches below md |
| Share rules | rule/status; mobile sheet, existing desktop menu |

14 existing domain drawer implementations migrated. Search-only role directory and form autocompletes, month/year navigation, global command search, view tabs, and column settings intentionally retain their own controls. Native Expo screens do not consume these web components.

## Evidence

Fixture source and screenshots: `artifacts/mobile-filter-sheet-qa/`. It mounts production components and synthetic options; no application QA route, authentication bypass, cooperative write, commit, push, or deployment is added.

Browser checks: 320×740 and 390×844, 767×900 boundary, plus desktop 768×900 and 1280×900. Scalar Pending and multi-select Cash/Transfer remain drafts until Apply, then commit together with search preserved. Reset remains local; Reset+Escape, Reset+Close, and Reset+backdrop preserve applied URL values; Reset+Apply clears filters while retaining search. Preset Today, explicit 13–20 October range, and single date 13 October commit through the original date controls. Member Active commits through the actual member hook and retains q; member Reset+Close preserves it. Support assignee commits through the actual support hook and retains q. Share rules open a sheet at 320px and their original nested menu at 768/1280px; desktop Fixed amount writes immediately. Tab/Shift+Tab contain focus; Apply/Escape return it to the trigger. Body overflow is hidden while open. At 320px the date sheet spans 320px with a 494px internal scroller (941px content), footer stays within the 740px viewport, and page horizontal overflow is absent. Rejected Apply displays a retry alert and retains the open draft. At 767px member support exposes only Status, Priority, and Sort; staff-only Category and Assignee are absent. A 30-option assignee group scrolls internally to option 30 at 390px (scrollTop 1328), keeps the footer at viewport bottom 844, and applies that selection with search preserved.

Focused checks: dashboard TypeScript passed; scoped ESLint and Prettier checks passed without warnings; scoped diff whitespace check passed. 22 existing search/date/member/payment-receipt/membership conformance tests passed with 216 assertions; six date utility tests passed with 24 assertions. The existing member structural assertion was updated from the Vaul Drawer import to the Base UI bottom Sheet contract. Root typecheck was attempted but failed before completion because Prisma generation lacked HALAALVEST_DATABASE_URL; no database schema change was made, so db:migrate/db:push are not applicable.

## Brain impact

Final integration regression: the fixture also mounts `MembersSearchFilter` inside the real header's `hidden md:flex` wrapper. At 390px, Reset followed by Escape preserves `q=member-query` and `status=active`, and returns focus to Filter members. The hidden desktop component's global Escape handler is disabled below md; at 1280px, its original Escape shortcut still clears q. Dashboard TypeScript, focused member lint, and the 22 conformance tests passed again after this correction.

New cross-feature behavior and durable filter-sheet exception documented in `features/dashboard-mobile-filter-sheets.md` and `decisions/ADR-20261006-mobile-filter-sheets.md`; this task records migration coverage and remaining acceptance. Member registry and reporting docs link the new behavior. No API/database documentation changes required: request contracts and query/mutation boundaries are unchanged.
