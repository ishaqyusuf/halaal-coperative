# Repayment And Collections Operations

## Status

Ticket 22 complete on 2026-08-30. Primary Android implementation, interaction, populated-data, Light/Dark, keyboard, and contract evidence pass. Cross-device accessibility and release-profile evidence remain in the cross-cutting mobile tickets.

## Product Boundary

- Repayment posting is a financial command. It changes repayment allocations, loan principal, ledger evidence, and audit history in one transaction.
- A collection follow-up is nonfinancial operational evidence. It can record stage, priority, note, next action, promise date, and actor history, but it cannot change principal, satisfy a schedule row, or create a ledger entry.
- Staff see Due, Collections, and Posted lanes plus an exact facility detail. Existing obligations remain readable when writes are offline, stale, or unauthorized.

## Server Contract

- The signed request owns tenant, actor, and role. Clients never select tenant or actor identity.
- Workspace/detail reads require `view_admin_work_queue`; repayment posting requires `review_financing`; collection follow-up requires `record_collection_follow_up`.
- Repayment inputs include facility id, positive two-decimal amount, explicit paid date, bounded reference, expected outstanding principal, expected facility status, and UUID command id.
- The database uses a Serializable transaction, verifies tenant/facility/state/outstanding/reference/idempotency, and allocates to the earliest unpaid schedule rows. A full payoff closes principal and waives only future unpaid rows under the existing repayment rule.
- Follow-up commands are independently idempotent and audited. Their result cannot be interpreted as payment evidence.

## Mobile Contract

- 2026-09-07 untested continuation: stable 80-row date/id pages replace capped
  history. Clients retain/deduplicate rows, block continuation offline/stale,
  expose loading state and ignore late filter/focus responses. Facility reads
  ignore superseded/dismissed requests. Posting rules are unchanged.

- 2026-09-07 source refinement: paid date, next action date and optional promise
  date open shared floating calendars. Optional dates have explicit clear
  actions. Nested calendars own Back while open; payment and nonfinancial
  follow-up remain separate commands. This change has not been retested: the
  user deferred UI/app/keyboard testing until the later screen-testing phase.

- `/repayment-operations` is a thin admin route backed by feature-owned model, API adapter, controller, screen, fixtures, and Sentry source.
- The selected `E — Servicing desk` design uses a flat summary, Due/Collections/Posted lanes, divider-led rows, semantic NativeWind light/dark tokens, and earliest-obligation ordering.
- The facility detail is a large floating sheet. Repayment is a compact content-aware floating form sheet. Collection follow-up is a full-screen form sheet because its multiline evidence can exceed the compact contract.
- All inputs were keyboard-tested on Pixel 3a API 34. Form action footers hide while typing and return after keyboard dismissal; full-screen content scrolls to keep the focused field visible.
- Guarded icon-only Quick Fill exists only for development/QA form surfaces. Offline or stale state remains read-only.
- Native repayment summary and its live-data indicator now render only when a repayment workspace exists. An absent read shows loading or an unavailable state instead of zero outstanding, zero overdue and an empty-work claim; a returned empty workspace still presents the genuine empty lane. Mobile TypeScript and full contract checks pass after this source correction. Signed-device failure and cached-data review remain open.

## Evidence

- `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-22/review-2026-08-30/README.md`
- `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-22-repayment-collections/`
- `.brain/decisions/ADR-030-separate-repayment-posting-from-collection-evidence.md`

## Dashboard Retest — 2026-09-01

- `/repayments` retains one flat Collections/Schedule/History workspace with a single active responsive dataset, URL-owned view state, and labelled tab/tabpanel ownership.
- View changes clear sort state before a non-shallow route update, preventing stale or racing server data. Mobile filter apply and clear wait for URL settlement, while default view sorting stays out of the URL.
- Mobile sorting uses one divider-led shadcn radio group. Empty collections, schedule, and history queues now explain their true operational state; filtered queues use separate no-match language and one recovery action.
- Repayment workflow mutations invalidate query-owned state, await URL sheet closure, and only then refresh server content. Mobile workflows remain full-screen.
- Authenticated Portless QA covered all three views, mobile sort apply/clear, the empty-loan posting draft, desktop inline filters, and 414/1440-pixel overflow checks. No repayment was posted because Safa has no eligible loan; creating financial evidence was outside safe retest scope.
- Dashboard typecheck and eight focused tests pass. Pinned lint passes with only the existing TanStack Table/Virtual compiler advisories.
- Evidence: `artifacts/repayments-retest/`.
