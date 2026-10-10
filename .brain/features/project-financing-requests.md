# Project Financing Requests

## Purpose
- Capture the client workflow where the cooperative may invest in, finance, or share profit from a member business.
- Keep project financing separate from ordinary loans, procurement, and cooperative business-profit records until the accounting structure is confirmed.

## Implemented Behavior
- Staff can create tenant-scoped project financing requests for active members through the query layer.
- Staff can manage project financing requests from `/project-financing`.
- Staff can create requests from the dashboard with member, business, requested amount, proposed structure, optional payback months, purpose, and description.
- Linked members can create their own project financing requests from `/project-financing` without selecting a member profile, and can view only their own project financing request history.
- Mobile project financing initially returns 20 member-owned requests with an opaque next cursor, loads later pages through the feature adapter, and resolves selected details independently inside the authenticated tenant/member scope. Active, approved, requested, paid, and outstanding summary evidence is aggregated across the full scoped result set rather than the visible first page.
- Each request records business name, optional business description, optional project purpose, requested amount, optional requested payback months, and proposed structure.
- Supported structures are `undecided`, `repayable_facility`, `investment_partnership`, and `profit_sharing`.
- The system calculates a principal-only monthly payback estimate when a payback month count is provided.
- Mobile member review fetches a server-calculated quote for the requested amount and shows its submission-charge total and each collection mode, including cents. The same quote appears on the form after review. Submission requires the reviewed charge fingerprint; the server requotes inside a Serializable request transaction and rejects changed terms before writing the request or charges. A failed submission preserves the draft and requires a fresh review.
- Staff can mark requests under review, approve them, or reject them.
- Approval requires the structure to be clarified; an approval cannot remain `undecided`.
- Repayable-facility approvals require payback months and store a principal-only approved monthly payback estimate.
- Repayable-facility approvals can be selected from payment receipt allocations while approved or active; finance approval updates paid amount evidence, marks partially paid requests active, and marks fully paid requests completed.
- Investment-partnership and profit-sharing approvals store approved amount and structure without repayment months.
- Finance staff can record disbursement evidence for approved requests, including disbursement date, reference, notes, and actor; recording disbursement moves the request to active.
- Request and review actions write audit log entries.
- Live project financing writes stay locked until initial migration is finalized.
- Pending project financing requests appear in the overview action queue while submitted or under review.
- Workspace admins can export project financing requests from `/reports/project-financing-export`, including member, business, requested amount, proposed structure, approval structure, disbursement evidence, reviewer, payback evidence, paid amount, outstanding amount, and completed date.
- Project financing review decisions emit a registered member notification event and send an audited direct email to the linked member when member email contact is available.
- Mobile uses a flat funding-position-first hierarchy with one request CTA and divided history. The six-field request is separate in the shared keyboard-safe full-screen form; review, success, and exact detail use compact floating sheets rather than native popups. Repayable-facility rows alone show term, monthly payback, and outstanding-principal evidence.
- Android Expo Go acceptance retains real `@ishaq.qa.test` empty/KYC-blocked evidence and clearly labelled isolated-fixture populated, detail, successful-submit, and refreshed-history evidence. The success surface is delayed until nested review/form portals have settled so it cannot be dismissed by the preceding modal lifecycle.
- Ticket 06 member-migration closeout adds the signed installed-development-client live/loading/empty/blocked/offline/stale/error and disabled/office-only/read-only matrix, accessible read-only detail, correct term pluralization, and clean fatal-log evidence. The canonical manifest is `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-06/README.md`.
- Authorized staff mobile operations expose server-paged Review, Active, and Closed workspaces plus independently hydrated request detail. Review, activation, and release-evidence commands are tenant scoped, expected-state guarded, UUID-idempotent, audited, and disabled for offline or stale reads.
- `repayable_facility` activation materializes only the approved principal obligation and retains principal paid, outstanding, and completion evidence. `investment_partnership` and `profit_sharing` remain evidence-only structures with no repayment schedule, receipt target, implied return, profit allocation, or member obligation.
- Staff visibility requires `view_admin_work_queue`; review, activation, and release commands require `review_project_financing`. Tenant, actor, role, permissions, and record ownership are always derived and rechecked on the server.
- The staff mobile UI uses the selected `B — Boundary Ledger` direction, compact floating sheets for review decisions, keyboard-safe full-screen entry for activation/release, the fixed-height swipe calendar, and explicit accounting-boundary copy. Light/Dark and denied/empty/error/offline/stale native evidence is indexed in the Ticket 25 screenshot manifest.
- The 2026-08-31 visual follow-up uses symmetric 8-point row and separator insets, removes the trailing separator after the final row, gives both attention and work-queue rows 24-point vertical padding, and leaves 16 points between section headings and their rules. The populated Android native-build evidence is indexed under the Ticket 25 live-review screenshots.

## Dashboard Retest — 2026-09-01

- `/project-financing` now uses a flat, search-first registry with desktop controls ordered search, column visibility, and create action; nested registry cards were removed.
- Mobile uses compact search and create controls plus a divided shadcn bottom-sheet filter. Apply and clear actions await URL settlement, and filtered empty states provide one recovery action through the toolbar rather than duplicating it inside the empty state.
- Disabled creation remains discoverable and accessible with an explicit migration-readiness explanation.
- Create and review workflows mirror the server's structure-aware rules: positive amounts and required identity fields are enforced, repayable facilities require a positive payback term, non-repayable structures clear and disable that term, and disbursement defaults to the current date.
- Create, member-create, review, and disbursement success paths close their URL-owned workflow before exact query invalidation and server refresh.
- Authenticated Portless QA exercised a valid populated request draft, repayable-term validation, dirty-draft discard, mobile status filter apply/clear, desktop anchored filters, and 360/767/768/1440 responsive layouts without horizontal overflow. No request or financial evidence was submitted.
- Verification passed with 27 focused cross-screen tests, dashboard typecheck, focused lint, and `git diff --check`. Evidence is stored in `artifacts/project-financing-retest/`.

## Boundaries
- Disbursement recording is evidence that funding was released; it does not create ledger entries or bank-transfer integrations.
- This slice does not create loan records, repayment schedules, procurement ledgers, profit-sharing allocations, dividend records, or non-repayable member obligations.
- Receipt allocation posting is limited to requests approved as `repayable_facility`; investment-partnership and profit-sharing structures remain review-only until their accounting rules are confirmed.

## Open Questions
- Should an approved project financing request become a repayable facility, investment partnership, profit-sharing arrangement, or a selectable mix per request?
- If profit-sharing applies, what is the profit measurement period, evidence requirement, and distribution rule?
- Can a member have active ordinary financing, procurement, food purchase obligations, and project financing at the same time?
- Who can approve project financing, and does it require committee or dual approval?
