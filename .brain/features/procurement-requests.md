# Procurement Requests

## Purpose
- Support the client workflow where the cooperative purchases an item for a member and the member repays the cooperative monthly.
- Keep procurement separate from ordinary financing so item details, vendor, cost approval, and repayment plan are explainable.

## Implemented Behavior
- Staff can create procurement requests from `/procurement` with member, item, optional vendor, requested cost, description, and repayment months.
- Linked members can create their own procurement requests from `/procurement` without selecting a member profile, and can view only their own procurement request history.
- Procurement create access is governed by the tenant Operation Profile:
  - `disabled`: hide new-request entry points when no procurement history exists and block new procurement creates server-side.
  - `office_only`: staff can record procurement requests; member self-service create is blocked.
  - `member_self_service`: linked members can submit procurement requests and staff can still manage requests.
  - `read_only`: new procurement creates are blocked while existing requests, repayment schedules, and outstanding balances remain visible.
- The system calculates an estimated monthly repayment from requested cost and months.
- Tenant policy `activeFinancingBlocksProcurement` blocks procurement requests when a member has approved, disbursed, or active financing unless the cooperative disables that guardrail.
- Tenant policy `procurementMaximumPaybackMonths` caps requested and approved repayment months for procurement requests.
- Tenant policy `procurementMaximumActiveObligationsPerMember` caps how many active purchased/fulfilled procurement obligations with unpaid repayment schedules a member can have at once; submitted, under-review, rejected, cancelled, completed, and approved-but-not-purchased requests do not count against this cap.
- Tenant policy `procurementAllowsCommitmentReductionDuringPayback` controls whether a member's commitment can be reduced while active procurement obligations are still unpaid.
- Finance staff can mark procurement requests under review, approve them with an approved cost/month count, or reject them with notes.
- Approved requests store approved monthly repayment estimates and snapshot the policy cap/flexible-commitment setting used during approval.
- Finance staff can record purchase/fulfillment evidence for approved requests with purchase date, first repayment due date, reference, and notes.
- Mobile staff fulfillment uses explicit Review, Activate, Servicing, and Completed lanes. Permission-gated detail exposes the immutable approval snapshot, purchase evidence, repayment schedule, due/overdue state, and completion evidence without merging financial and nonfinancial states.
- Mobile purchase activation is expected-state and idempotency guarded, tenant scoped, audited, and validates strict calendar-only dates plus the first-repayment-date ordering before it creates the schedule exactly once.
- Purchase date and first repayment due date use the shared floating calendar sheet rather than native modals or editable text dates. The sheet keeps one fixed height and stationary navigation/footer across day, month, and year modes; gesture-handler paging moves by month, year, or twelve-year range, cancels underlying cell presses during horizontal movement, and keeps date constraints accessible to assistive technology. The mounted pager is retained across drill transitions to prevent blank-frame flicker.
- Recording a purchase marks the request active and creates monthly procurement repayment schedule rows for the approved cost and approved repayment months.
- Payment receipts can allocate money to active procurement repayment schedule items; finance approval updates the selected schedule row's paid amount/status and completes the request when all schedule rows are paid or waived.
- Approved brought-forward opening balances with procurement outstanding can create an active procurement request labeled as a brought-forward procurement balance, with one opening schedule item for the outstanding amount and an audit link back to the opening-balance row.
- Reversing the applied opening balance cancels the linked opening procurement request and waives its schedule item only when there is no repayment activity against that obligation.
- Procurement read models derive due and overdue installment status from schedule due dates and surface due, overdue, and outstanding servicing counts in staff and member procurement views.
- Procurement requests appear in the admin action queue while submitted or under review.
- Request and review actions write audit log entries.
- The dashboard procurement route, member dashboard quick link, and mobile procurement screen use Operation Profile capability flags to hide creation forms while preserving existing-history visibility.
- Mobile procurement initially returns 20 member-owned requests with a server-issued opaque next cursor, loads later pages through a dedicated feature adapter, and resolves tapped details independently by tenant/member-scoped ID. Summary totals and active-obligation availability use full server aggregates, not the bounded visible page.
- Workspace admins can export procurement requests from `/reports/procurement-export`, including member, item/vendor, requested cost, approved cost, repayment estimates, policy payback/commitment snapshots, purchase evidence, outstanding amount, due/overdue schedule risk, schedule summary, reviewer, and review notes.
- Procurement review decisions emit a registered member notification event and send an audited direct email to the linked member when member email contact is available.
- Ticket 23 native acceptance is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-23/review-2026-08-30/README.md`.
- Ticket 06 member-migration acceptance is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-06/README.md`; its canonical Android matrix proves live/loading/empty/blocked/offline/stale/error and every Operation Profile access mode, preserves readable history, hides internal brought-forward keys, and uses correct obligation count language.

## Ticket 30 real-session audit — 2026-09-05

- Standard Pending Review QA Member exposes `canCreateRequest: true`, but the
  ordinary mutation correctly rejects incomplete historical migration. The
  fixture has zero applied migration months and no procurement request was
  created. This is not a reason to bypass member readiness or change join dates.
- Read capability is now aligned with authoritative operational readiness,
  including inactive membership, unverified KYC, incomplete migration and missing
  readiness. History remains readable and the mutation guard is unchanged.
  Local readback returns `canCreateRequest: false` for the unchanged fixture;
  real-session API v3 blocks before creation and revokes its session/credential.
  Establish truthful migration evidence for the positive fixture before claiming
  end-to-end submission. API adapter tests alone do not satisfy this journey.
- Android baseline exposes missing horizontal gutters/vertical spacing in the
  existing full-screen form. Five HTML/PNG directions now select A — Item first.
  Native source gives the shared full-screen form explicit inner body/footer
  spacing, identifies optional fields, uses examples as placeholders and keeps
  the review action on semantic brand tokens. Routine draft description is
  removed; stale warnings remain. Presentation-only Android v1 verifies five
  populated input keyboards and review cancellation, but visual review rejects
  its edge-to-edge footer. V2 verifies the corrected shared footer/body grid,
  all five keyboards and review cancellation with 2/2 sessions revoked.
  Disabled CTA contrast, parent-footer suppression during nested review,
  Dark/large-text, TalkBack and the real submission journey remain open.
  Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-30-procurement-form/README.md`.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/README.md`.

## Mobile presentation follow-up — 2026-09-05

- Footer diagnostic v2 proves a stable 116px shift when floating Quick Fill
  disappears. Shared Quick Fill now explicitly owns native absolute positioning
  alongside its runtime inset. Android footer-after-v3 proves identical empty/
  populated bounds, all five keyboards and review/cancel; all eleven form images
  and independent Light/100% sign-out are reviewed, with 2/2 sessions revoked.
  25 tests/80 assertions, mobile/API TypeScript, scoped lint, UI and keyboard
  contracts pass. Dark/large-text and other consumers still need regression QA;
  real submission and migration prerequisites remain open. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/footer-after-v3/README.md`.
- Settled-state Android v5 now directly reviews all 36 form frames and verifies
  muted disabled/brand enabled colors in Light/Dark × 100%/200%, all 20 input
  keyboards, nested-review isolation and return to the form without a residual
  sheet. The run exits 0 with ordinary cleanup, 2/2 revoked sessions and independent
  signed-out Light/100% evidence. Earlier CTA mismatches do not recur after
  capture synchronization; no additional UI state/styling rewrite was needed.
  Real submission, TalkBack, 200% system-clock clipping, initial empty-form footer
  resting-position consistency and other-form regressions remain open.
  Latest evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/presentation-matrix-v5/README.md`.
- The form uses semantic muted disabled-action colors instead of reducing the
  whole CTA opacity; nested review declares `overlayActive` so only the top
  sheet exposes actions. Both preserve authoritative submission guards.
- Android v3 reviews all 36 form frames. All 20 input-keyboard checkpoints and
  the four review-sheet layouts pass their scoped checks, but several CTA
  captures are premature and the Dark/100 final frame still contains the
  dismissing review sheet. Do not infer visual acceptance from action metadata.
- Failed cleanup was recovered through ordinary UI controls; independent
  signed-out Light/100% evidence and 13/13 wider-window revocations are retained.
- QA now waits for known navigation landmarks after restart, captures cleanup
  failures and requires two consecutive matching form/action states before
  capture. V4 replay exits 0 and proves 2/2 revoked sessions and independent
  signed-out Light/100% restoration, but predates the last capture refinement.
  Fresh settled native evidence, TalkBack and the 200% clipped Android clock
  remain open. Three v4 frames have direct visual review, not the full matrix.
- Real submission still needs truthful QA migration prerequisites. Tools are
  closed; finance start date, charge schedules, profit pools, legacy loans and
  member backfill are incomplete. The nine-row preview was not saved or applied.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/presentation-matrix-v3/README.md`.

## Policy configuration

- Procurement has its own tenant configuration, separate from loan settings and separate from Foodstuff Purchase settings.
- The configuration includes maximum payback months for procurement requests.
- The configuration includes whether a member's existing commitment can be reduced during procurement payback or must remain fixed until the procurement obligation is settled, waived, or otherwise closed.
- Approved procurement requests snapshot relevant policy values so later settings changes do not rewrite existing repayment schedules or commitment-reduction behavior.

## Boundaries
- Procurement repayment receipt posting is schedule-based and requires a selected repayment schedule item per allocation.
- Brought-forward procurement opening uses a one-row schedule because the opening-balance capture only stores current outstanding amount, not the original vendor, item history, or month-by-month procurement plan.
- This slice does not yet post procurement cash/bank disbursement ledger entries, formal default/escalation handling, or procurement-specific accounting ledger entries.

## Dashboard Retest — 2026-09-01

- The request registry is a flat, divider-led workspace: desktop search is first on the left, while column visibility and request creation stay grouped on the right. The nested rounded/card wrapper has been removed for staff and member views.
- Mobile status and sort controls use flat shadcn radio groups with divided rows, await URL settlement before closing, and explain the disabled create action when no eligible member is available.
- Desktop filters include an explicit clear action that resets search, status, and sorting together.
- Staff/member create, review, and purchase mutation completion now awaits URL sheet closure before invalidating exact list/detail queries and refreshing server content. Mobile workflow sheets remain full-screen.
- Hidden Operation Profile navigation no longer makes a directly visited service route inherit the Dashboard title. The sidebar remains filtered, while `/procurement` correctly shows the Finance module subtitle and Procurement title.
- Safa currently has Procurement disabled, so authenticated Portless QA validated the capability gate and route title at 360/767/768/1440 pixels with no overflow or runtime errors. Persistent create/review/purchase commands were not run because changing tenant configuration just to manufacture test data was outside the safe retest boundary.
- Dashboard typecheck, pinned lint, and 14 focused procurement/navigation tests pass. Evidence: `artifacts/procurement-retest/`.
