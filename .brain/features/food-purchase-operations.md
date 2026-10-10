# Foodstuff Purchase Operations

## Summary

- Product-facing language should use Foodstuff Purchase for staple food items such as rice, beans, yam, garri, grains, and similar commodities; existing internal module names and routes can remain food-purchase/`food_purchase` until a rename is scheduled.
- Foodstuff Purchase is a monthly cooperative business operation, separate from ordinary savings, procurement, loans, and generic receipt categories.
- Staff records evidence of the cooperative amount released to a Foodstuff Purchase committee for the next/monthly bulk-purchase and resale/allocation cycle. This evidence does not itself post cash or a general-ledger transaction.
- Linked members can apply for Foodstuff Purchase within an active monthly cycle from their own `/food-purchase` self-service page.
- Committee staff can review and approve or reject member purchase applications.
- The committee must provide end-of-month accounting with business performance and profit evidence.

## Core Rules

- Each Foodstuff Purchase cycle is tenant-scoped and period-scoped.
- Foodstuff Purchase availability is controlled by the tenant Operation Profile:
  - `disabled` hides new-cycle and new-application entry points when no Foodstuff Purchase records exist.
  - `office_only` lets staff create cycles and member applications, while members can only view existing application history.
  - `member_self_service` lets linked members apply for open cycles and lets staff create office-assisted applications.
  - `read_only` blocks new cycles and applications while preserving existing cycle, application, payment, and accounting evidence.
- A cycle records committee release evidence: amount, release date, notes, and the staff user who recorded it. The cycle is operational evidence, not a cash-ledger posting.
- Member applications are linked to one Foodstuff Purchase cycle and one member.
- Application submission records requested amount and requested payback months, capped by tenant Foodstuff Purchase policy.
- New applications always require an open cycle. Terminal, accounting-submitted, and accounting-correction cycles cannot accept applications even when a legacy `foodPurchaseRequiresOpenCycle` setting is disabled, because those applications could not enter the review workflow safely.
- Staff-assisted and member-self-service application submissions both require the selected member to be operationally ready.
- Application approval records the approved foodstuff purchase amount and approved payback months; targeted payment receipt allocations can later settle that approved amount.
- Application review runs in a retry-bounded Serializable transaction. It atomically claims the pending application, rechecks cycle capacity and the member active-obligation cap, and only then posts approval-triggered charges, so concurrent approval/rejection requests cannot produce conflicting state or over-allocate the cycle.
- Approved applications snapshot the policy cap and flexible-commitment setting used during approval.
- Application review decisions emit a registered member notification event and send an audited direct email to the linked member when member email contact is available.
- Committee accounting captures sales/income, cost, expenses, profit, accounting notes, and review status for the cycle.
- Finance/admin staff can approve submitted accounting as accepted evidence or reject it for correction.
- Accounting submission and review use atomic status-qualified claims in retry-bounded Serializable transactions so concurrent decisions cannot overwrite one another.
- Accounting review decisions emit a registered committee notification event and send an audited direct email to the submitting committee user when email contact is available.
- Foodstuff Purchase profit must not be mixed into ordinary member savings or share capital until a future approved distribution workflow exists.
- Foodstuff Purchase receipt allocations must link to an approved Foodstuff Purchase application before finance can approve/post the receipt.
- Receipt posting updates the application's paid amount and paid date evidence when fully settled; it does not distribute profit or create a separate food-purchase accounting ledger.
- The permission matrix separates committee and finance responsibilities: finance roles release monthly funds and review accounting, staff roles can review applications and submit committee accounting, and members can apply for open cycles.

## Configuration

- Foodstuff Purchase has its own tenant configuration, separate from loan and procurement settings.
- The configuration includes maximum payback months for member applications.
- The configuration includes whether new applications must target an open cycle.
- The configuration includes the maximum approved unpaid Foodstuff Purchase obligations a member can carry at once.
- The configuration includes whether the member's existing commitment can be reduced during Foodstuff Purchase payback or must remain fixed until the obligation is settled, waived, or otherwise closed.
- Fixed-commitment Foodstuff Purchase obligations block member commitment reductions while an approved application remains unpaid.

## Workflow

- Staff can manage Foodstuff Purchase operations from `/food-purchase`.
- Members can use `/food-purchase` to submit their own applications and view only their own application history.
- Member list/detail responses omit staff and member email fields that are not required by the Foodstuff Purchase interface.
- Mobile Foodstuff Purchase initially returns 20 member-owned applications with an opaque next cursor, loads later pages through the feature adapter, and resolves a selected application independently inside the signed tenant/member scope. Application/open-cycle totals and the active-obligation blocker are full server queries rather than visible-row calculations.
- Ticket 06 member-migration acceptance is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-06/README.md`; its canonical Android matrix proves live/loading/empty/blocked/offline/stale/error and every Operation Profile access mode, preserves readable application/cycle evidence, and uses policy-consistent singular/plural term and obligation language.
- `/food-purchase` has one prefetched Suspense infinite-query owner for application rows; the route and client share the same typed URL filter/sort input, use opaque sort-bound keyset cursors, and refresh by exact query invalidation instead of polling.
- Below `md`, summary cards and the desktop table are replaced by a flat divided Item list, mobile Item skeleton, icon create actions, bottom-sheet filter/sort controls, bottom-sheet cycle actions, and full-screen workflow presentations. Desktop retains the resizable, reorderable, virtualized table.
- Member self-service forms are shown only when the Operation Profile `food_purchase` mode allows member creation; office-managed and read-only cooperatives still show existing member application history.
- Staff opens or records a monthly Foodstuff Purchase cycle with the amount released to the committee.
- A member applies for a Foodstuff Purchase amount or item under that cycle and chooses requested payback months within tenant policy.
- Committee staff marks the application under review, approves it with an approved amount/payback months, or rejects it with notes.
- Linked members receive review-status emails for their own applications when member email contact is available.
- Members or staff can submit payment receipts against approved Foodstuff Purchase applications; finance approval updates the application payment evidence and blocks overpayment.
- Receipt settlement remains possible for approved unpaid Foodstuff Purchase applications even when new Foodstuff Purchase applications are closed by policy or access mode.
- Staff and member food-purchase views show paid and outstanding evidence for approved applications.
- At month end, committee staff records accounting totals and profit notes for the cycle.
- Pending applications and submitted accounting appear in the overview action queue.
- Workspace admins can export Foodstuff Purchase cycles and applications from `/reports/food-purchase-export`, including released funds, member applications, approval/payment evidence, accounting totals, and profit evidence.
- Server-side Foodstuff Purchase cycle and application create actions enforce the Operation Profile mode even when UI entry points are hidden.
- Finance/admin staff can accept submitted accounting or request correction; the submitting committee user receives an email decision when contact is available, and accepted accounting remains governance evidence until downstream posting rules are confirmed.
- The Roles page shows separate food-purchase actions for fund release, application review, committee accounting submission, accounting review, and member application.

## Mobile Staff Cycle Desk

- `mobile.admin.foodPurchaseOperations.workspace` returns one selected cycle, permission-shaped legal actions, full-cycle totals, allocation shortfall, and a 30-row server-filtered application page with an opaque continuation cursor.
- `applicationDetail` resolves the exact selected application independently of the visible page and remains tenant scoped.
- `createCycle`, `transitionCycle`, `reviewApplication`, `submitAccounting`, `reviewAccounting`, and `completeCycle` require their dedicated named permission, a UUID command receipt, legal expected state, signed tenant/actor context, and the existing transactional domain guards.
- Application review reuses the immutable policy and capacity protections in the core Foodstuff Purchase workflow. Accounting commands record governance evidence only and cannot materialize profit/dividend/member-obligation postings.
- The native screen is a flat EwaTrade-aligned cycle desk with semantic token colors, restrained dividers, bounded virtualized application rows, and a visible allocation-shortfall warning. It does not combine an input form with the list.
- Compact confirmations and decisions use the shared floating bottom sheet; long fund-release and accounting forms use the keyboard-safe full-screen form. Date inputs open the fixed-height, bidirectionally swipeable day/month/year floating calendar.
- Screen sizing uses React Native logical points, safe-area insets, live window/screen and keyboard metrics, centered width-derived three-column selectors, and 48–56-point touch targets rather than device-pixel assumptions.

## Mobile Member Ticket 29 Hardening — 2026-09-01

- Five JStack/GStack directions selected `A — Obligation ledger`. The member's active approved exposure leads; application history and current-cycle availability remain separate flat sections.
- The native implementation follows the Midday ownership split: a thin route/controller boundary validates route inputs, the feature controller owns reads, opaque pagination, persisted draft, detail hydration, review/success sequencing, QA fixtures, and online mutation state, and the tested presentation model owns formatting and charge/obligation display shaping.
- Browsing and data entry remain separate. The long form is statically required to be composed inside `FullScreenFormSheet`; detail, review, success, and dirty close use shared floating sheets and the semantic backdrop instead of native popup modals.
- Android Light/Dark 100%, Light/Dark 200% browse reflow, exact detail, all four Gboard inputs, Quick Fill, charges in review, and dirty close have accepted evidence without issuing a real Foodstuff Purchase application.
- Six focused tests, scoped ESLint, mobile TypeScript, and the full executable mobile contract pass. The keyboard contract pins the measured sticky footer plus 144dp clearance and recognizes the feature form as a guarded leaf composed by the full-screen sheet.
- All current QA-state screenshots are rejected because the development linking warning overlays them. Early Dark 200% form captures with clipping or Quick-Fill/label intersection are also rejected. Clean exact `@ishaq.qa.test` state recapture, a clean non-keyboard large-text form, TalkBack, and live duplicate/tenant-isolation evidence remain open.
- Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-food-purchase-accessibility/README.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/food-purchase/README.md`.

## Data Model

- `FoodPurchaseCycle`: tenant, period month, released amount, release date, explicit `draft`/`open`/`intake_closed`/`accounting_submitted`/`accounting_approved`/`accounting_rejected`/`completed`/`closed`/`cancelled` status, committee/accounting totals, profit amount, accounting notes, and recorder/reviewer metadata.
- `FoodPurchaseApplication`: tenant, cycle, member, requested amount, requested payback months, item/notes, requested date, status, approved amount, approved payback months, paid amount, paid date, policy snapshot, reviewer metadata, and an optional tenant-unique submission key for idempotent creation.
- Tenant settings: maximum payback months, commitment reduction mode during Foodstuff Purchase payback, and policy audit metadata.

## Open Questions

- TODO: Decide the separately authorized cash/ledger posting workflow for committee release evidence; recording a Foodstuff Purchase cycle must not be treated as that posting.
- TODO: Confirm exact posting semantics after approval/payment: repayment schedule, commitment deduction, one-off purchase receivable, payment-allocation target, or a hybrid by cooperative policy.
- Does the end-of-month profit belong to all cooperative members, only participating members, share holders, or a dedicated food committee/business pool?
- Should committee accounting require uploaded receipt/invoice evidence before finance approval?

## Dashboard Retest — 2026-09-01

- Staff now uses URL-owned Applications and Monthly cycles tabs, rendering only one substantial operational registry at a time. Applications remain the default search-first workspace; release evidence belongs to the cycles view and cycle accounting stays on each cycle.
- Desktop analytics use one flat border/divider strip, application registries have no nested card wrapper, and empty cycle states use simple divider-led presentation.
- Desktop search is left aligned with column visibility and application creation on the right. Mobile search/filter and the plus action share one compact row; disabled creation explains that an open monthly cycle is required.
- Mobile status/sort controls use flat shadcn radio groups and await URL settlement. Desktop filters have an explicit search/status/sort recovery action.
- All six release/application/review/accounting success flows await URL sheet closure before exact query invalidation and server refresh. Mobile workflow presentations remain full-screen.
- Safa currently has Foodstuff Purchase disabled, so authenticated Portless QA validated the capability gate and direct route title at 360/767/768/1440 pixels without overflow or runtime errors. No service configuration, release evidence, application, or accounting record was changed.
- Dashboard typecheck, pinned lint, and six focused tests pass. Evidence: `artifacts/food-purchase-retest/`.
