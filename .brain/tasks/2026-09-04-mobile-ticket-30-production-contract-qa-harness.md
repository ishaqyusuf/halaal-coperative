# Task: Mobile Ticket 30 Production-contract QA Harness

## Status

Deferred by user — 2026-09-07. Screen implementation takes precedence; testing
resumes only in the later phase. Historical progress below is retained.

## Canonical Ticket

[Scratch ticket](../../.scratch/mobile-architecture-hardening-and-feature-completion/issues/30-build-production-contract-real-session-qa.md)

## Created Date

2026-09-04

## Current Progress

- Admin charge application is accepted in `t30-admin-charge-final-v6`. The
  ordinary Starter-healthy Finance Officer passes 3/3 production API/native
  steps. API and Android each prove one application, one ledger transaction and
  two balanced entries; cleanup restores the baseline. Approved five-option
  designs `A — Ledger Calendar` and `D — Emerald confirmation cap` govern the
  native flow. Sixteen frames pass direct review, all measured inputs clear
  Gboard, calendar days/months/years swipe at one fixed height with backdrop,
  and the self-auditing receipt records `runtimeWarnings: []`. Android signs out,
  both credentials and 2/2 sessions are revoked. Positive journeys advance to
  5/18; Ticket 30 remains 5/8 and overall progress remains 25/33 (75.8%).
  Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/admin-charge-application/final-v6/README.md`.

- Duplicate-charge exact retry is accepted in `t30-duplicate-charge-final-v2`.
  Five Design HTML/PNG directions selected `A — Canonical receipt`; the ordinary
  Starter-healthy Finance Officer commits one real charge, sees the simulated
  response interruption, and retries the exact retained command to the same
  canonical result with `replayed: true`. API and Android fingerprints prove one
  application, one ledger transaction and two balanced entries. All ten frames
  pass direct visual review, including four keyboard-clear inputs. Android signs
  out, both credentials and 2/2 sessions are revoked, and fixture cleanup restores
  baseline state. Negative journeys are now 7/7, closing acceptance item 6.
  Ticket 30 advances to 5/8; positive journeys remain 4/18 and overall progress
  remains 25/33 (75.8%). Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/duplicate-charge-command/final-v2/README.md`.

- Cross-tenant Project-financing detail is accepted in
  `t30-cross-tenant-pf-v1`. Five native-scale Design HTML/PNG directions selected
  `A — Quiet trust rail`. The ordinary Standard-review Finance Officer receives
  exact production `NOT_FOUND` for a foreign request identifier while a
  deterministic populated same-tenant record remains in the queue. The foreign
  record never appears, no stale loading/detail sheet survives the denial, and
  the same-tenant detail opens in the shared floating sheet with its semantic
  backdrop. All three Android frames pass direct review; Android signs out and
  both credentials plus 2/2 sessions are revoked. Negative journeys are now
  6/7. Ticket 30 stays 4/8, positive journeys 4/18 and overall 25/33 (75.8%).
  Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/cross-tenant-project-financing-detail/final-v1/README.md`.

- Offline Procurement write suppression is accepted in
  `t30-offline-proc-native-v2`. Five native-scale Design HTML directions selected
  `A — Trust rail`. A staff-authorized production fixture gives the ordinary
  Starter healthy Member one real saved request; the offline client exposes
  history and a bounded Check action but no creation, review, Quick Fill or
  pagination write surface. The full before/after request fingerprint is
  unchanged; the executor records 0 transport calls and 0 optimistic requests.
  Three Android frames pass direct visual review, Android signs out and both
  credentials plus 2/2 sessions are revoked. Negative journeys are now 5/7.
  Ticket 30 stays 4/8, positive journeys 4/18 and overall 25/33 (75.8%).
  Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/offline-procurement-write/final-v2/README.md`.

- Member-capacity v3 is accepted. The real Starter-capacity Tenant Admin
  command returns exact `PERMISSION_DENIED`; the member-directory fingerprint
  is unchanged. Five Design HTML/PNG options selected `A — Capacity rail`;
  Android removes creation and reaches Plan & billing. Both frames pass visual
  review; Android signs out and both credentials plus 2/2 sessions are revoked.
  Negative journeys are now 4/7. Ticket 30 stays 4/8, positive journeys 4/18
  and overall progress 25/33 (75.8%). Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-capacity-limit/final-v3/README.md`.

- Read-only Procurement command v6 is accepted. The ordinary `ishaq.qa.test`
  Enterprise stale Member receives exact production `PRECONDITION_FAILED`; a
  fingerprint of every paginated request is unchanged. Native Procurement shows
  the selected Emerald ledger browse-only state and no create, form, Quick Fill
  or staff action. The single non-duplicate frame passes direct visual review
  and the fatal/runtime filter is empty. Short-lived QA sessions no longer roll
  through the normal refresh window, explicit refresh stays authorization- and
  expiry-bounded, and the QA access control clears Android navigation insets.
  Android signs out, both temporary credentials and 2/2 sessions are revoked.
  Negative journeys are now 3/7; Ticket 30 stays 4/8, positive journeys 4/18 and
  overall progress 25/33 (75.8%). Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-modes/read-only-procurement-v6/README.md`.

- Native stale recovery is now accepted. Four Design HTML/PNG directions selected
  `A — Preserved draft recovery`; source uses the shared semantic-token floating
  sheet and no native alert. Headless Android run
  `t30-stale-native-recovery-v2` proves a genuine concurrent server change after
  review, visible conflict/backdrop facts, exact draft retention after Keep
  editing, explicit refresh/re-review against the latest `Office only` basis, and
  no automatic mutation retry. Both production-contract steps pass, all six
  native frames pass direct visual review, the fatal/runtime filter is empty,
  Procurement returns to `read_only`, Android signs out, both temporary
  credentials are revoked and 2/2 sessions are revoked. Negative journeys are
  now 2/7; Ticket 30 stays 4/8, positive journeys 4/18 and overall progress 25/33
  (75.8%). Evidence:
  `../../.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-conflict-recovery-v2/README.md`.

- Native stale-recovery preparation (read-only source audit, September 5): the
  API adapter proves an outdated expected mode is rejected and durable modes/
  review metadata are unchanged, but its optional Android checkpoint has no
  implemented production-conflict driver. The native controller currently
  reduces mutation failures to a message; the review sheet still offers Review
  again and Confirm change, while Refresh exists only on the covered parent
  screen. Thus the required single refresh/recovery action is not implemented
  in the conflict review state. Do not pass the native journey from the API proof
  or the client-only stale fixture. Next, after the running textarea matrix
  releases the emulator: generate/review four conflict-recovery HTML directions,
  select the consistent one, preserve typed conflict identity, implement explicit
  refresh/re-review, then prove a real ordinary-session server conflict and
  unchanged rejected-write state with documented scoped QA setup/restoration.
  No concurrent-setting mutation, fixture reset, or mobile change was performed
  during this preparation. Corrected Brain's API input field names against the
  router schema; no API behavior changed.

- Latest correction (2026-09-05): display matrix v3 exited 0 at 19:29:57 UTC.
  All four Light/Dark × 100%/200% interaction checkpoints pass; ordinary sign-out,
  Light/100% restoration, temporary credential removal and 2/2 session revocations
  are recorded. This is not full visual acceptance: 200% reason placeholders
  clip, long input text is only partially visible, and system-clock clipping
  remains. The review sheet does expose the complete QA reason.
  Shared-writer review found that freezing every caller would prevent persistent
  screens from saving subsequent drafts. Freezing is now explicit opt-in for
  Operation Profile; default callers retain serialized clear → next-draft writes.
  33 focused tests/106 assertions, mobile TypeScript and scoped lint pass.
  V4 exited 0 at 19:38:12 UTC: Light/100% replay, all fourteen screenshots
  directly reviewed, ordinary sign-out/display restoration and 1/1 session plus
  credential revocation pass. More is neutral. This closes the focused native
  discard-compatibility replay, not the large-text visual defects.
  The reason field now uses the existing EwaTrade-derived shared Textarea with
  three native lines rather than a fixed 96-point Input; its shared sheet focus
  border uses the semantic ring token. QA additionally enters a 254-character
  reason and captures twelve bounded input swipes without submitting a change.
  34 focused tests/113 assertions, mobile/API TypeScript, scoped lint and full
  mobile contracts pass. V5 exited 1 at 19:46:49 UTC: Light/100% empty/short
  keyboard captures pass, but the long-text stage fails before start/end frames;
  failure image shows a collapsed sheet and hidden keyboard. Gesture interception
  is a hypothesis, not an established cause. Ordinary sign-out, Light/100%
  restoration, credential revocation and 2/2 session revocations pass. No other
  display combination was reached; do not accept large-text readability.
  V6 (`t30-mode-textarea-diag-v6`) is a focused Light/100% replay with unchanged
  UI and privacy-safe phase diagnostics (bounds, length, focus, keyboard visibility,
  never raw form text). 35 focused tests/116 assertions, API TypeScript and scoped
  lint pass. V6 exited 1 at 19:56:10 UTC: all 254 characters enter correctly
  with focus and IME clearance; the first in-field downward swipe then blurs
  the input, hides the keyboard and collapses the sheet. Direct before/after
  image review and privacy-safe phase bounds isolate failure to the gesture.
  Ordinary sign-out, display restoration and 1/1 credential/session cleanup
  pass. The shared Textarea now isolates Android multiline gestures locally
  with Gorhom's documented native-view handler pattern, retaining sheet panning
  elsewhere and the selected A flat editor design. Mobile TypeScript and
  30 focused tests/101 assertions, scoped ESLint and full mobile contracts pass.
  V7 exited 1 at 20:04:28 UTC: Light/100% reproduces the same first-swipe
  collapse; other modes were not reached. Ordinary sign-out, display restoration
  and 2/2 credential/session cleanup pass. The ineffective outer gesture wrapper
  is removed. Installed Gorhom already wraps TextInput in a native handler;
  v8 passes the two Android-only gesture settings directly to that existing owner.
  Fresh mobile TypeScript and scoped lint pass. Focused native replay
  `t30-textarea-native-owner-v8` exited 1 at 20:11:04 UTC with the same
  first-swipe blur/collapse. Ordinary sign-out, display restoration and 1/1
  session/credential cleanup pass. Ineffective handler settings/type adapter
  are removed. The sheet's own downward-pan end path dismisses the keyboard;
  v9 now suppresses content panning only while an Android keyboard-expandable
  form has its keyboard visible, preserving its scrollable body and restoring
  panning when typing ends. Mobile TypeScript, scoped lint and full mobile
  contracts pass. V9 exited 1 during authorization (zero sessions); unchanged
  v10 with privacy-safe checkpoint diagnostics exited 1 at `focus-credential`.
  Both cleaned up sign-in/display/temporary credentials. Installed Gorhom swaps
  the content component when its panning flag changes, remounting focused inputs.
  That dynamic flag is reverted. A stable shared gesture hook now suppresses
  Android content-driven sheet movement only for gestures beginning with the
  keyboard shown, keeping the mounted tree and default handle/non-editing/iOS
  handlers. A UI-thread latch spans start/change/end/finalize. Mobile TypeScript
  passes; 33 focused tests/107 assertions plus API TypeScript/lint pass for safe
  authorization checkpoints. V11 exited 1 after the target interaction: twelve
  in-field swipes preserve all 254 characters, focus, field/IME geometry and
  visibly distinct internal text positions; full review and return retention
  also pass. Six key frames were directly reviewed. Keep editing/discard UI,
  ordinary sign-out, display/credential restoration and 1/1 session revocation
  pass. The terminal failure is after Close form, before More, with the uncovered
  Operation Profile visible. The likely harness race is a background Refresh
  match before floating-sheet/backdrop dismissal; production behavior is not
  labelled defective from this evidence. The driver now waits for Refresh plus
  absence of editor/discard/backdrop nodes after both closes. 34 focused tests/
  111 assertions, API TypeScript/lint and whitespace checks pass. V12 is
  inconclusive before the target at the bounded `authorize-device` checkpoint;
  no session was created and cleanup passed. Fresh Light/100% v13 exits 0 with
  all 19 captures, 254-character retention, twelve focused swipes, complete
  review/return retention, clean discard/reopen, settled More navigation,
  ordinary sign-out, display/credential restoration and 1/1 session revocation.
  Critical frames and bounded receipts were directly reviewed; no command was
  submitted. V14 failed before its first gesture because one unverified ADB
  burst delivered 215/254 characters; focus, keyboard and geometry remained
  stable and cleanup passed with 2/2 revocations. The driver now appends bounded
  chunks and verifies the exact accumulated prefix, failing closed on divergence
  or focus loss. 28 focused tests/97 assertions, API TypeScript/lint and diff
  hygiene pass. Fresh Light/Dark × 100%/200% v15 is running.
  Broad shared-form, TalkBack and native stale recovery remain open. Independent
  status-bar recheck v15 exits 0 and directly proves neutral More → emerald Plan
  & billing → neutral More; no status-bar source change is required.
  Counts stay 25/33 (75.8%), Ticket 30 4/8, positive 4/18, negative 1/7.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/textarea-settled-dismissal-v13/README.md`
  and `screenshots/ticket-30/android/workspace-role-switch/statusbar-recheck-v15/README.md`.
  Next: v14 result/visual review, shared-consumer QA, TalkBack and genuine
  stale-command conflict/recovery.

- Historical matrix update: v1 is terminal failed (Light/100% passed, Dark/100%
  failed before reason entry, 200% not reached), with ordinary sign-out,
  Light/100% restoration and 2/2 credential/session cleanup verified by receipt.
  Direct review of the confirmation reveals a real contract mismatch: it promises
  discard, but the Operation Profile close path retains the persisted draft.
  V2's native-input reset replay failed with a partial reason left; ordinary
  cleanup and 2/2 revocations pass. That workaround is removed. The actual fix
  now awaits scoped draft removal before closing and serializes pending autosaves
  so a cleared draft cannot be rewritten/hydrated. Native QA now reopens without
  editing and verifies empty reason, restored current mode and disabled Review.
  Early emulator/draft-matrix guards and bounded failure-stage receipts are added.
  Thirty-two focused tests/101 assertions, mobile/API TypeScript, scoped lint and
  full mobile contracts pass. V3 is launched, not yet accepted.
  No counts change: 25/33 overall (75.8%),
  Ticket 30 4/8, positive 4/18, negative 1/7. Matrix, long reason, shared consumers,
  TalkBack and native stale conflict/recovery remain open. This supersedes older
  "v1 launched" text below. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/presentation-matrix-v1/README.md`
  and the adjacent `presentation-matrix-v3/README.md`.

- Latest after-v8 corrects compact below-footer input bleed through a measured
  UI-thread outer clip, retaining the proven inner scroll/focus geometry.
  Light/100% full draft/keyboard/review-retention flow and ordinary 1/1 session/
  credential cleanup pass; all fourteen images and independent sign-out reviewed.
  More stays neutral. Mobile/API TypeScript, scoped lint, 25 tests/76 assertions
  and full mobile contracts pass. Optional four-combination display-matrix
  harness is implemented and presentation-matrix-v1 launched, not yet accepted.
  Matrix review/cleanup, long-reason scroll, shared consumers, TalkBack and native
  stale recovery remain open; ticket and journey counts do not increase.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v8/README.md`.

- Current slice: native after-v7 verifies review A — Flat consequence, selected
  from four published HTML/PNG options. Actual consequence, all facts, complete
  reason and exact return retention pass on Light/100%; restored v5 empty/typed
  keyboard label clearance and ordinary 1/1 session/credential cleanup pass too.
  Fourteen images reviewed; final Light/100% sign-out independently checked.
  V6's footer-clipping experiment failed keyboard label visibility and was reverted.
  More is neutral. Next: compact footer clipping, native Dark/200% and long-reason
  scrolling, shared consumers, TalkBack and genuine stale recovery. No command
  submitted or ticket/journey count increase. Exact evidence is in the canonical ticket.

- Latest: Member role-denial API/native run is reviewed; negative execution is
  now 1/7. Ticket acceptance remains 4/8 and overall 25/33. Current scope, cleanup,
  failure-reporting amendment and limitations are in the canonical Scratch ticket
  and its linked `member-role-denial/native-v1/README.md`. Historical counts below
  describe their original runs, not the current aggregate.

- Shared Quick Fill positioning now fixes the measured 116px empty-form footer
  shift. Android footer-after-v3 has identical empty/populated bounds, five
  keyboard passes, review/cancel, ordinary cleanup and 2/2 revocations. All eleven
  form images plus independent Light/100% sign-out are reviewed. A separate
  geometry verifier rejects the old baseline and passes the fixed run. The
  single-screen evidence-directory ordering defect is also fixed; its failed
  v1 receipt is preserved. 25 tests/80 assertions and scoped static checks pass.
  Dark/large-text, other consumers, TalkBack, migration and real submission stay
  open; no ticket/journey count increases.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/footer-after-v3/README.md`.
- Procurement v5 closes the settled-capture evidence gap: all 36 form frames
  reviewed, four correct disabled/enabled pairs, all 20 input keyboards clear,
  review isolation/cancellation verified. Exit 0, ordinary sign-out, independent
  Light/100% restoration and 2/2 revoked sessions. No new UI source change or
  procurement submission. TalkBack, 200% clock clipping, initial footer resting
  position, other-form regressions and genuine migration setup remain open.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/presentation-matrix-v5/README.md`.
- Procurement matrix v3 has all 36 form frames directly reviewed, including
  20/20 focused input keyboards across Light/Dark and 100%/200%. Review sheets
  correctly hide the parent footer and reflow summary/actions at large text.
  The visual run remains unaccepted: several CTA frames show the preceding
  state, and Dark/100 final captures a still-visible dismissing sheet. Cleanup
  initially fails, then normal Android recovery restores Light/100% and sign-out;
  independent wider-window session readback is 13/13 revoked. Failed receipt
  remains immutable. New driver tests enforce known-route-only Back handling
  and reject form captures while review/backdrop remains; 19 tests/54 assertions
  pass, along with final API TypeScript, scoped lint and the mobile UI contract.
  V4 exits 0 with 2/2 sessions revoked and independent signed-out Light/100%
  evidence; three v4 frames are directly reviewed. It began before settled-capture
  changes. Clock clipping, TalkBack, settled captures and real submission stay open.
  Read-only migration preflight identifies closed tools and missing finance date,
  charges, profit pools, legacy loans and member backfill; nine preview rows were
  generated in memory only. No positive-journey or ticket count increase.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/presentation-matrix-v3/README.md`.
- Procurement design: five separately published HTML/PNG alternatives select
  A — Item first. Native body spacing/copy/CTA is implemented; the presentation-
  only v1 run passes all five input keyboards and review cancellation, with
  ordinary sign-out and 2/2 sessions revoked. Visual review rejects its footer
  gutters; v2 now verifies corrected body/footer spacing, all five keyboards,
  review cancellation and 2/2 revoked sessions. Ten v2 images are reviewed;
  final signed-out Light/100% evidence is independently captured. Disabled CTA
  contrast, nested-review parent-footer suppression and Dark/large-text remain
  open. No actual procurement mutation was attempted and no journey is added.
  Design/evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-30-procurement-form/README.md`.
- Fresh status-bar recheck v15 passes the ordinary role-switch journey in
  Light/100%, with 15 journey captures and independent final signed-out evidence.
  Five directly reviewed images show neutral More → emerald Billing → neutral
  More, neutral Member More and the auth hero-matched bar. Reported green More
  does not reproduce; no new UI fix is claimed. All 5/5 sessions and both
  credentials are revoked. No fresh Dark/200%, TalkBack or log pass is claimed.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/statusbar-recheck-v15/README.md`.
- Procurement capability correction: the read now composes the existing
  authoritative member-readiness query without changing mutation guards,
  fixture history, migration records or financial state. Readback confirms
  `canCreateRequest: false`; ordinary API v3 blocks before submission and proves
  session/credential revocation. Twenty-three focused tests/70 assertions,
  API and direct DB TypeScript, and scoped DB lint pass. The positive fixture's
  migration prerequisite and form redesign/keyboard evidence remain open.
- Procurement proof is implemented and fails closed on missing readiness. The
  Standard Member fixture is KYC-verified but has historical migration not
  started; v2 returns bounded `CONFLICT`/readiness evidence. The procurement read
  incorrectly advertises create capability despite that prerequisite. Both API
  sessions/credentials were revoked and no request exists. Android baseline
  captures the existing list/form, whose missing gutters fail visual review.
  Original sign-out failed because the fixed swipe began below the Member
  scroll viewport; observed-bound gestures are now tested. Manual ordinary
  sign-out plus exact audited session recovery proves 3/3 sessions revoked.
  Baseline v2 passes both captures, ordinary sign-out and 1/1 session plus
  credential revocation; no submission or input-keyboard acceptance is claimed.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/README.md`.
- Five access-list HTML/PNG options are published; selected A, Continuous ledger,
  is implemented in feature-owned presentation/components. More has one root
  virtualized scroll flow for users/roles, with original header and footer slots;
  default labels are deduplicated and permission scope is retained. Twenty-six
  focused tests/70 assertions, mobile/API TypeScript, scoped lint and mobile
  contracts pass. Android v14 completed all three journey steps and all four
  display combinations; explicit coverage proves all four users and five roles
  reachable in each. Reviewed access reflow and contextual status bars pass.
  The index retains 66 journey frames, 25 trace frames and one independently
  reviewed signed-out Light/100% frame; 21 frames have direct visual review.
  All 12 sessions and both temporary credentials were revoked. Real TalkBack,
  system-clock clipping at 200% and the other journeys remain open. Counts stay
  4/8, 4/18 and 25/33 because this is an existing-journey revalidation.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v14/README.md`.
  Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-30-workspace-access-ledger/README.md`.
- Historical v13 functional matrix pass: three steps, 62 journey frames,
  25 redacted navigation-trace frames, signed-out Light/100% restoration and
  12/12 revoked sessions. Status-bar transitions pass in all four display modes.
  The v12 unexpected destination did not reproduce; no auth/navigation fix is
  claimed. Access-list clipping and verbose/duplicate copy still fail in both
  200% themes. Nineteen tests/47 assertions, API TypeScript and lint pass;
  run-window fatal/JS-error/matching-linking-warning counts are zero. Next is
  four/five published access designs and native implementation, not another
  unchanged whole-matrix replay. Counts remain 4/8, 4/18 and overall 25/33.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v13/README.md`.
- Latest v12 audit is failed with 46 retained frames (Light/Dark 100%, Light
  200%). It exposes fixed-height nested access-list clipping/skipped rows during
  parent scrolling and duplicate role copy. A later restart opens Guarantor
  approvals instead of the Admin shell; root cause is not proven. All 11/11
  sessions were revoked; independent final evidence confirms signed-out
  Light/100%. The failed receipt is preserved. Harness changes enforce named
  checkpoints, access scroll reset, failure capture, persistent receipts and
  independent cleanup/coverage counts. Seventeen tests/41 assertions, API
  TypeScript and scoped lint pass. Next: diagnose restart routing and publish
  four/five Design HTML options for access scrolling/copy before UI changes.
  Latest evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v12/README.md`.
- Acceptance remains 4/8 (50%). Four of 18 positive journeys have fresh
  production-contract plus headless-Android proof; 14 remain. Negative execution
  remains 0/7.
- `subscription-plan-request` is accepted in run `t30-subscription-v13`. Five
  separately reviewable Design HTML directions selected `B — Brand band`; the
  native result carries the semantic emerald surface through the Android status
  bar, keeps plan rows flat and divided, sizes floating sheets to their content
  with bounded scroll fallback, exposes all five material confirmation facts,
  and reports the pending billing state truthfully.
- The run passed `subscriptions.snapshot`, deterministic idempotent
  `subscriptions.requestPlanChange`, and the native Plan & billing checkpoint.
  Android/API sign-out, temporary tester-credential revocation, and readback of
  both ordinary mobile sessions as revoked all passed.
- Design:
  `/Users/M1PRO/.gstack/projects/ishaqyusuf-halaal-coperative/designs/mobile-subscription-plan-request-20260904/comparison.html`.
- Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/subscription-plan-request/README.md`.

- Workspace follow-up: accepted `t30-role-switch-v6` passes all three API/native
  steps, six screenshots including More → billing → Back, and cleanup readback
  of all four created sessions as revoked. `v5` stays rejected because it used a
  capped device-list inspector. The DB aggregate, Expo launch-overlay recognition,
  and awaited callback cleanup have focused regression coverage. API/mobile
  typechecks, scoped lint, full mobile contract, and 24 focused tests pass.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/README.md`.
- The v8 matrix now executes both workspace directions and More → billing →
  Back in Light/Dark × 100%/200%, with all 32 captures visually reviewed.
  Focus-owned status bars match each screen; the complete visual matrix is not
  accepted because Admin More identity/access reflow and shared bottom-tab
  gesture clearance still fail. TalkBack and other state/device coverage remain open.
- The opt-in workspace matrix runner now covers Light/Dark × 100%/200%, cold
  persisted-session restarts, and both native switch directions. It restores
  Light/100% before sign-out and requires the larger session/screenshot evidence
  count. `v7` is rejected for the Overview status-bar gap and large-text defects.
  `v8` fixes the status-bar gap but its original receipt is `complete: false`:
  display restoration and Android sign-out failed after the font-size change.
  A cold restart before interacting with the reset activity now recovers
  Light/100% and ordinary sign-out; scoped DB readback confirms 12/12 sessions
  revoked. The original failure is retained separately from recovery evidence.
  A navigation warning and UiAutomator crash-buffer entry prevent clean-log
  acceptance; another complete run is required after the remaining fixes.
- All four Android proof scripts now exit non-zero when their receipt is
  incomplete. Four source-contract tests pin this CLI behavior. The focused
  status/workspace/driver/session suite passes 24 tests with 49 assertions;
  full mobile contracts pass. No new ticket/journey acceptance is claimed.
- Final API typecheck, zero-output scoped API lint, and scoped diff hygiene pass
  after the cleanup/CLI changes. UI recovery was tested on emulator-5554;
  the complete matrix has not been rerun after that amendment.
- Latest full screenshot/review index:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v8/README.md`.

- Follow-up `t30-role-switch-v9` completed the clean functional matrix: three
  steps, 32 reviewed Android frames, Light/100% restoration, sign-out, credential
  revocation and 12/12 session revocation readbacks. Five Design HTML options
  selected `A — Identity ledger` before implementing adaptive More identity,
  concise directory rows and shared inset-aware bottom tabs. The reviewed frames
  pass those changes and contextual status-bar restoration. Lower access-list
  scrolling, TalkBack, other device/state coverage and the clipped Android clock
  at 200% stay open. V8's failed receipt remains historical evidence; v9 does not
  retroactively change it. Latest index:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v9/README.md`.

## Last Updated

2026-09-05

## Next execution slice

- Latest after-v4 passes typed input, Quick Fill, Review navigation, return,
  discard and normal 1/1 session/credential cleanup; all 11 captures reviewed.
  Fix keyboard overscroll/label visibility, shared multiline top alignment and
  review consequence copy/full-reason scrolling next. Then Dark/200%, other
  shared forms and real native stale-command conflict/recovery. Stable dismissal
  callbacks and content-sized resting expansion are implemented. V2's failed
  receipt and audited server-session recovery remain distinct. No count changes.
  Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v4/README.md`.

- Current prerequisite: Operation Profile editor selected A is now implemented.
  Native after-v1 passes reason reachability and actual keyboard clearance with
  five reviewed screenshots and all 1/1 session/credential revocations. Four HTML
  alternatives precede source edits; 45 tests/129 assertions and type/lint/full
  mobile contracts pass. Finish populated draft actions, Dark/200% and shared
  consumer checks, then prove native stale-command conflict/recovery. Counts stay
  25/33 overall, 4/8 Ticket 30, positive 4/18 and negative 1/7. Latest evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v1/README.md`.

- `member-procurement-request` on the isolated `standard-review` Member profile.
- Preserve the registry's full scope: read service quote/blockers, submit a
  deterministic request through the production contract, confirm exactly one
  member-history record, and exercise keyboard-safe Android entry, review,
  submission and history. API-only proof is not journey completion.
- Capture the existing native state before any UI edits; publish five HTML/PNG
  alternatives and the selected image if a visual change is needed. Use the
  existing separate form sheets and semantic theme, never an inline list form.
- Reuse ordinary QA credential/session cleanup and versioned evidence. No
  execution or acceptance is claimed for this next slice yet.
