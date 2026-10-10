# Mobile Architecture Hardening

## Status

Current execution phase (2026-09-07): the user extended implementation-first
to all pending tickets. The earlier existing-screen source pass is complete;
remaining-ticket integrations/hardening are not complete. Testing is deferred. See
[phase ledger](../../.scratch/mobile-architecture-hardening-and-feature-completion/implementation-first.md)
and [36-route/seven-shell inventory](../../.scratch/mobile-architecture-hardening-and-feature-completion/screen-implementation-inventory-2026-09-07.md).
Historical acceptance below is retained; it does not validate this source pass.
Live provider billing and private native uploads remain open dependencies.

### Remaining-ticket source continuation — 2026-09-07

- Tenant-scoped checkout status, exact hosted-checkout allowlist, stable client
  retries and foreground refresh; no provider/payment activation.
- Financing/repayment pagination, deduplicated continuation and stale-response
  guards using existing tokenized controls. No new design direction or native
  screenshot is claimed.
- Financing notifications resolve an exact tenant-scoped entity rather than
  searching the first 50 records; blur cancels pending presentation.
- Sentry outbound privacy/size bounds and production-variant gates; release
  config rejects variant/profile mismatches and unsafe service URLs.
- [Pilot runbook](../runbooks/mobile-pilot-release.md) records NO-GO, required
  owners/artifacts, test gates and financial-safe rollback.
- Regression cases were authored, not executed. No tests, typecheck, lint,
  formatter, build, emulator, QA mutation, telemetry or deployment was run in
  this continuation. Historical verification below does not cover these changes.

### Implementation-first source changes — 2026-09-07

- Twelve changed contribution/form surfaces have five HTML/PNG alternatives
  and a documented selection. Existing screen designs are retained. All use
  shared semantic colors, NativeWind classes, flat sections and separate forms.
- Contribution workspace statistics now use server-provided totals rather
  than summing a visible page. Pagination preserves rows on error, deduplicates
  by id and rejects stale responses. Draft keys include the record/form scope.
- Contribution identity, commitment, batch, row and review surfaces share
  feature-owned summary/choice components and existing confirmation/result sheets.
- `CalendarDateField` supports date/month precision and wrapping minimum-height
  geometry. `CalendarPickerSheet` supports month-only selection while retaining
  the existing fixed-height day/month/year pager for date selection.
- `useFormCalendar` owns nested calendar state and dismisses the keyboard before
  opening. Full-screen, compact and floating parents can yield Back ownership
  through `overlayActive`, rather than treating an open calendar as a submission.
- Receipt paid date/allocation month, member joined date, repayment paid date,
  collection next-action/promise dates, charge filter bounds and disbursement
  first-repayment date use calendar triggers. Optional dates remain clearable.
- No API/database/financial-rule changes in this pass. Source review and
  formatting only; typecheck, lint, all tests, emulator work and native
  screenshots deliberately deferred. Required follow-up covers all input,
  nested-sheet/Back, calendar/swipe, alignment, text-scale and light/dark states.

Active migration program. Tickets 01-14 established the executable baseline, shared runtime, feature-owned member/admin slices, legacy contraction, secure recovery-only public mobile authentication, revocable durable device sessions, local app-lock/privacy protection, and the provider-neutral tenant subscription foundation. Tickets 19-26 add permission-split staff contribution, Collection Source, charge, monthly levy, financing-cycle, approval, disbursement, repayment, collection-evidence, procurement-fulfillment, Foodstuff Purchase, project-financing, and share/profit-governance operations. Ticket 15's mobile management behavior, Android exception-state matrix, modern frame-timeline acceptance, second Android emulator form factor, and React-root fully-drawn instrumentation are implemented; real screen-reader and production-hosted live-data screen-interactive acceptance keep it in progress. iOS is deferred under the Android-only direction. Live provider billing remains Ticket 16.

## Ticket 30 production-contract QA foundation

- Admin charge application now has accepted real-contract proof. The native
  feature uses the approved shared `A — Ledger Calendar` and `D — Emerald
  confirmation cap`, semantic NativeWind tokens, floating sheets and a neutral
  screen/status bar. Headless Android `t30-admin-charge-final-v6` records 3/3
  production steps, 16 directly reviewed frames, fixed sheet geometry across
  every calendar mode/swipe, Gboard clearance, one application, one ledger
  transaction and two balanced entries. Transaction clients no longer execute
  the migration snapshot fan-out or account reads concurrently. The receipt is
  self-auditing and records `runtimeWarnings: []`, baseline restoration, ordinary
  sign-out, both credential revocations and 2/2 session revocations. Positive
  journeys advance to 5/18; negative remains 7/7; Ticket 30 remains 5/8 and
  overall progress remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/admin-charge-application/final-v6/README.md`.

- Duplicate-charge exact retry now has accepted real-contract proof. Five
  Design HTML/PNG directions selected `A — Canonical receipt`; native Charges
  retains the exact command after a committed-response interruption, retries it,
  consumes the server-owned `replayed` fact, and presents a compact token-driven
  floating receipt with backdrop. Headless Android `t30-duplicate-charge-final-v2`
  records one application, one ledger transaction and two balanced entries,
  ten directly reviewed frames including four keyboard-clear inputs, ordinary
  sign-out, both credential revocations, 2/2 session revocations and restored
  fixture state. Negative journeys are complete at 7/7. Ticket 30 advances to
  5/8; positive journeys remain 4/18 and overall progress remains 25/33 (75.8%).
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/duplicate-charge-command/final-v2/README.md`.

- Cross-tenant Project-financing detail now has accepted real-contract proof.
  Five Design HTML/PNG directions selected `A — Quiet trust rail`; the native
  screen classifies expected `NOT_FOUND` without reporting it to Sentry, clears
  stale loading/detail state, preserves the populated signed-tenant queue, and
  keeps own-tenant detail in the shared floating sheet with its semantic
  backdrop. Headless Android `t30-cross-tenant-pf-v1` records exact `NOT_FOUND`,
  an unchanged signed-tenant fingerprint, absence of the foreign record, three
  directly reviewed frames, ordinary sign-out, both credential revocations and
  2/2 session revocations. Negative journeys advance to 6/7. Ticket 30 remains
  4/8 and overall progress remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/cross-tenant-project-financing-detail/final-v1/README.md`.

- Member-capacity negative execution now has accepted real-contract proof.
  Five Design HTML/PNG directions selected `A — Capacity rail`; native Members
  consumes server-owned subscription facts, removes member creation at capacity,
  and exposes one Plan & billing recovery. Headless Android v3 records exact
  `PERMISSION_DENIED`, unchanged directory state, two directly reviewed frames,
  ordinary sign-out, both temporary credential revocations and 2/2 session
  revocations. Negative journeys advance to 4/7. Ticket 30 remains 4/8 and
  overall progress remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-capacity-limit/final-v3/README.md`.

- Read-only Procurement negative execution now has accepted real-contract proof.
  Headless Android v6 uses the ordinary Enterprise stale Member and verifies
  exact `PRECONDITION_FAILED`, unchanged complete request history, and a native
  browse-only state with no create/form/Quick Fill/staff surface. Its one needed
  Light/100% frame passes direct visual review and the fatal/runtime filter is
  empty. QA session refresh now preserves the short authorization boundary,
  valid QA sessions do not enter normal rolling refresh, and the QA access
  trigger clears Android's navigation inset. Android signs out; both temporary
  credentials and 2/2 sessions are revoked. Negative journeys advance to 3/7;
  Ticket 30 remains 4/8 and overall progress remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-modes/read-only-procurement-v6/README.md`.

- Native Operation Profile stale recovery now has accepted real-contract proof.
  Four published Design HTML/PNG directions selected `A — Preserved draft
recovery`; the native source uses the shared token-driven floating sheet with
  a true backdrop. Headless Android v2 proves real concurrent drift, conflict
  disclosure, exact draft retention, explicit refresh/re-review and no automatic
  mutation retry. Six frames pass direct visual review; the app-process
  fatal/runtime filter is empty; the QA setting is restored; Android signs out;
  both temporary credentials and 2/2 sessions are revoked. Negative journeys
  advance to 2/7 while Ticket 30 remains 4/8 and overall progress remains 25/33
  (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-conflict-recovery-v2/README.md`.

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

- After-v8 corrects compact input bleed below fixed footers. Keyboard-expandable
  detached sheets with a footer clip their outer boundary to Gorhom's measured
  current height; column-reverse content remains top-anchored. The existing inner
  keyboard-aware viewport remains unchanged. The clip follows a shared value on
  the UI thread instead of React gesture state. Installed Gorhom 5.2.14 layout
  hooks are used, so upgrades need native regression checks. Light/100% keyboard,
  exact review retention, draft dismissal and ordinary 1/1 credential/session
  cleanup pass, with all fourteen images reviewed and More remaining neutral.
  An optional per-display QA matrix reuses workspace display preparation and
  requires restoration before sign-out; first matrix run is launched, not accepted.
  No API contract, finance, schema or permission behavior changed. Matrix visual
  review, long content, shared consumers, TalkBack and native stale recovery remain.
  Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v8/README.md`.

- After-v7 implements review **A — Flat consequence** from four published
  Design HTML/PNG options: feature-owned actual mode consequence, flat icon-free
  fact rows and complete audit reason. Stronger native QA verifies the exact
  reason both in review and after returning to the editor. Light/100% empty and
  typed keyboard label/field clearance, draft actions, ordinary sign-out and
  1/1 session/credential revocation pass; all 14 images directly reviewed.
  More stays neutral. The v6 compact-footer viewport experiment failed label
  visibility and was fully reverted, preserving v5 keyboard geometry. Compact
  footer clipping, native Dark/200%/long-reason scroll, shared consumers, TalkBack
  and real stale conflict/recovery remain open. No API/permission/schema change.
  Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v7/README.md`.

- After-v5 corrects the selected A editor's keyboard overscroll and multiline
  centering: Input respects explicit vertical alignment and defaults multiline
  to padded top alignment; the keyboard-aware floating body reserves 16dp and
  no extra spacer while its footer is hidden. The stronger native check requires
  the label as well as the input to remain visible. Empty/typed field bottom
  1198px clears IME top 1398px; Quick Fill, review/return/discard and ordinary
  1/1 session plus credential revocation pass. Twelve images reviewed; independent
  final Light/100% sign-out passes and More stays neutral. Compact footer clipping,
  review copy/full-reason retention, Dark/200%, shared consumers and real native
  conflict/recovery remain open. No API, permission, schema or finance change.
  Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v5/README.md`.

- Latest Operation Profile follow-up is `t30-mode-editor-after-v4`: typed reason,
  Quick Fill, Review/return, Keep editing/final discard and ordinary credential/
  1/1 session cleanup pass. All 11 images are directly reviewed. Stable latest-value
  dismissal callback prevents typing from reopening at the compact snap point;
  resting expansion follows measured content instead of filling 88% unnecessarily.
  V2's failed receipt and explicit server-session recovery remain recorded. V4
  is not full visual acceptance: keyboard overscroll hides the reason label,
  shared Input overrides multiline top alignment, and review's lower audit reason
  plus actual-consequence wording need work. Dark/200%, shared consumers,
  TalkBack and native stale-command recovery remain open. Counts are unchanged.
  Latest evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v4/README.md`.

- Operation Profile editor follow-up selects `A — Flat access editor` from four
  published HTML/PNG directions. The keyboard-aware shared scroll viewport now
  fills the expanded sheet rather than retaining its compact-height ceiling.
  Current mode is marked inline; duplicate summaries are removed; required-reason
  policy gates a readable muted Review action. Native `t30-mode-editor-after-v1`
  passes formerly failing reason reachability and measured keyboard clearance
  (input bottom 1145px, IME top 1398px), with five directly reviewed frames and
  ordinary credential/session cleanup (1/1 revoked). More remains neutral before
  and after. Populated draft actions, Dark/200%, broader shared-sheet regression
  and real stale-command recovery remain unaccepted. 45 tests/129 assertions,
  mobile/API TypeScript, scoped lint and full mobile contract pass. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v1/README.md`.

- Latest negative execution is 1/7 (Member staff-finance denial). The next
  stale Operation Profile API proof passes production conflict/readback with
  ordinary cleanup but remains incomplete without native recovery evidence.
  Android Expo QA now verifies the installed APK is debuggable before launching
  a development-client URL, preventing release bundles from being mislabeled as
  current Metro execution. No mobile presentation was changed in that original baseline slice.
  Baseline v3 fails reason-input reachability with successful credential and
  1/1 session cleanup. The QA driver now clips sheet swipes between observed
  header/footer bounds. V5 still fails reason reachability with a large blank
  expanded body, so neither keyboard nor native conflict recovery is accepted.
  Fresh More is neutral; independent final Light/100% sign-out and all run
  revocations pass. Latest evidence is `operation-profile-stale/baseline-v5/README.md`
  under the Ticket 30 Android screenshot directory.

- Workspace access follows selected `A — Continuous ledger`: one feature-owned
  root LegendList places typed user/role rows between the existing More header
  content and Sign out footer. It replaces two nested fixed-height lists without
  eager-mounting every user. Role scope is retained, default membership appears
  once, counts use singular/plural grammar, and invite forms remain separate.
  Five published HTML/PNG alternatives precede the native edit. Twenty-six
  focused tests/70 assertions and type/contract checks pass. Android v14 proves
  all four users/five roles reachable in Light/Dark at 100%/200%, both workspace
  switch directions, contextual status bars and complete 12-session revocation.
  Its 92-image index distinguishes 21 visually reviewed images from remaining
  captures. Real TalkBack and Android system-clock clipping at 200% stay open.
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v14/README.md`.
- A domain-owned v1 scenario plan and DB-owned preview/provisioner now create nine
  isolated exact-domain QA tenant shells covering all five subscription plans,
  four roles, four Operation Profile combinations, and the nine required state
  labels.
- Local preview, provision, idempotent rerun, and safety readback pass: 9 tenants,
  36 users, 37 memberships, 10 members, 9 subscriptions, 9 profiles, 54 service
  settings, 9 deterministic policies, and zero credentials, sessions, custom
  domains, provider links, classification/domain violations, or policy drift.
  All 36 cooperative numbers match the mobile `ABC-0123` contract.
- This is 4 of 8 Ticket 30 acceptance items, not ticket completion. Four of 18
  positive real-session journeys are complete; the remaining 14 positive
  journeys, all seven negative cases, routed invitation proof, and the full
  Android visual matrix remain open. Overall directive
  completion remains 25/33 (75.8%).
- The second accepted journey, `share-profit-governance-read`, uses the
  Enterprise/published-profit Tenant Admin. Its workspace and detail production
  contracts plus native summary/detail checkpoints pass, both temporary
  credentials and both ordinary mobile sessions are revoked, and filtered
  Android runtime logs are clean. The screenshots also expose a separate
  left-edge workspace-spacing defect that remains behind the required JStack
  design review rather than being silently counted as visually complete.
- The third accepted journey, `subscription-plan-request`, uses the
  Starter/healthy multi-role Tenant Admin. It proves the server-owned current
  plan/limit/entitlement/invoice snapshot, repeats one deterministic Standard
  plan request to the same intent id, and captures current, detail,
  confirmation-sheet, and recorded-result Android states. Both credentials and
  both ordinary sessions are revoked. Exact role-segment matching now prevents
  the duplicate multi-role display name from entering the wrong shell, and
  profile entry itself is inside the sign-out cleanup boundary. The screen's
  large header, density, and verbose confirmation copy remain pending a separate
  JStack visual review.
- A read-only fact inspector proves 9/9 states from persisted records. Pending
  review is now an audited member receipt created through the production-shaped
  self-service workflow and reused idempotently. Published profit is now a real
  completed business result with reconciled published share-profit/member
  dividend allocations and exactly one audited preparation, approval, and
  publication transition after rerun. The overdue fixture uses the ordinary
  contribution, cycle, request, dual-approval, disbursement, ledger, schedule,
  and collection-refresh services. The stale fixture proves an ordinary
  Operation Profile compare-and-set conflict without changing its governed
  setting. Two complete reruns retain the same exact fixture graph and zero
  failures; metadata labels still receive no credit.
- The ordinary QA accelerator is the exclusive session-entry boundary and now
  verifies stored client kind as well as token digest, client signal, contract
  version, environment, credential, expiry, revocation, exact domain, and opaque
  eligible profile selection. Five API tests reject forged and substituted
  inputs; the real exact-domain inventory returns 37 eligible harness profiles
  across 9 tenants and 36 users. The Starter/healthy Tenant Admin owns one
  non-default Member membership and linked profile for a truthful role-switch
  journey; sign-in selection prefers the tenant-local default membership.
- A v1 positive-journey registry now defines 18 journeys spanning all 16
  required product areas, including activation/recovery/password sign-in,
  role switching, subscription, member/staff workflows, service fulfillment,
  reports, governed push/deep links, revocation, and share/profit oversight. An
  API contract test proves every named tRPC path exists. No live journey or
  Android checkpoint is credited until it is executed through an authorized
  exact-domain session. `member-core-reads` is the first credited journey:
  `t30-core-v20` passed Home, Plans, Shares, and Statement production reads and
  native checkpoints through an ordinary Starter/healthy Member session.
- A transport-agnostic domain executor now runs selected journeys sequentially,
  preserves declared step order, stops a journey after a failed/blocked step,
  marks the remainder skipped, maps thrown adapter details to bounded codes, and
  produces a redacted counts/status receipt. Credentials and native automation
  remain closure-owned by future adapters and cannot enter the receipt model.
- The headless Pixel 3a/API 34 member-core proof cold-launched the Expo
  development client on Metro `1443`, captured four 1080 × 2220 screenshots,
  found no `AndroidRuntime` or `ReactNativeJS` errors, and passed native/API
  sign-out, temporary credential revocation, and both mobile-session revocations.
  No screen changed in this harness slice, so no artificial Design HTML was
  generated. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-core-reads/README.md`.
- Seven versioned negative journeys now cover offline write suppression,
  stale-state rejection, subscription capacity, Operation Profile restrictions,
  role boundaries, cross-tenant access, and duplicate-command idempotency. The
  registry requires an Android checkpoint per journey and production-router
  conformance for every named API path. The sequential executor cannot route a
  suppressed write through the invocation adapter, requires a zero-call verifier,
  fails outcome mismatches, and emits only bounded receipt data; live execution
  is still 0/7.
- The invitation proof uses the real platform-owner credential issue/revoke
  procedures, QA accelerator, durable mobile session, production invitation
  route, and DB-owned persisted/audit inspector. Its receipt exposes no identity,
  address, number, URL, token, provider id, or provider error. External execution
  was denied before launch pending explicit approval for the configured QA inbox,
  so no delivery or new data is claimed.
- Deterministic cleanup resolves only the nine exact scenario identities, fails
  closed on live/foreign/provider/credential/document evidence, and reuses the
  existing QA-maintenance `qaPurgeStartedAt` plus QA-only tenant-delete boundary.
  A real local PostgreSQL rehearsal deleted all targets inside the transaction,
  proved zero remained, rolled back deliberately, and restored the identical
  fingerprint and counts. The irreversible command was rejected before launch
  without explicit deletion authority, so no persistent state changed.
- Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/ticket-30-production-contract-qa-harness/evidence-report.md`
  and `.scratch/mobile-architecture-hardening-and-feature-completion/ticket-30-production-contract-qa-harness/cleanup-rehearsal.md`.

## Ticket 29 Admin Finance Treasury Signal source milestone

- Five separately reviewable Design HTML/PNG directions selected `A — Treasury Signal`. It keeps one compact emerald decision surface, a flat divided review queue, and secondary finance workspaces in the shared content-sized floating sheet with a dimmed backdrop.
- The former route-level monolith is now a thin composition. A feature controller owns signed-role gating, server reads, stale-response protection, online-only commands, expected-state/idempotency data, drafts, sheet sequencing, and governed notification destinations. Display/action decisions are isolated in tested models.
- The queue uses LegendList virtualization with stable extraction/render callbacks. Browse and data entry remain separate: compact actions use floating sheets, evidence-heavy approvals use full-screen sheets, and collection follow-up uses the shared fixed-height calendar picker. All feature colors are semantic NativeWind tokens.
- Seven focused tests with 22 expectations, mobile TypeScript, zero-output focused ESLint, scoped diff hygiene, a zero-result literal-color scan, and the complete 36-route/seven-shell contract pass.
- Native Admin Finance acceptance remains open. The headless Android 14/API 34 client at Metro `1443` is at the exact `ishaq.qa.test` authorization gate; submitting the configured tester secret and selecting Tenant Admin requires explicit authorization. No bypass or mock finance acceptance is claimed.
- Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-admin-finance-rich-directions/README.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/admin-finance-treasury-signal/README.md`.
- This is a source milestone, not a completed independent Android slice. Ticket 29 and overall progress remain open at 25/33 (75.8%).

## Ticket 29 Android Procurement accessibility source slice

- Five richer separately clickable Design HTML directions selected `A — Emerald ledger`. The selected main screen uses one semantic deep-emerald balance/progress ledger, a flat active-purchase section, one teal request action, and compact divided history; it avoids both sterile monochrome presentation and card-heavy decoration.
- A tested feature presentation model now owns active-obligation selection, approved/requested balance math, accurate paid progress, next-due selection, and compact history shaping. The active obligation is excluded from history so the member does not see the same request twice.
- Feature-owned overview and history-row components use semantic NativeWind tokens and large-text reflow. The prior shrink-to-fit balance, routine live freshness line, repeated descriptions, purchase metadata, and review notes leave the browse surface; exact detail remains in the existing workflow detail sheet. The keyboard-safe full-screen request form remains separate from the list.
- Three focused tests with eight expectations, mobile TypeScript, package lint with zero errors, and the complete 36-route/seven-shell mobile contract pass. The Design HTML board reports no browser console errors.
- Fresh Android acceptance is pending. The port-`1443` development client loads the updated bundle and settles at the auth gate, but the available `ishaq.qa.test` tester credential was already rejected by the server and discarded. No mock session or authorization bypass was used, so Procurement Light/Dark 100%/200%, input keyboards, sheets, state matrix, and TalkBack are not claimed.
- Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-procurement-accessibility/README.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/procurement/README.md`.
- This is not a completed Ticket 29 native slice. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android Member More accessibility slice

- Five separately clickable JStack/GStack directions selected `A — Compact directory`. The accepted normal-density screen keeps identity and destination names dominant, retains only decision-useful live metadata, and removes routine freshness, repeated descriptions, status-pill clutter, and card-heavy workspace treatment.
- The member identity, Money, Services, App, Workspace, Appearance, and Sign out hierarchy uses flat divided rows, restrained accent icons, semantic tokens, and NativeWind `className` first. No form or native popup is introduced.
- Android native review rejected the initial clipped/token-losing 200% states. Explicit semantic scaled typography now moves row metadata below titles, grows rows to content, and stacks workspace heading, tenant, role, and current/switch state without horizontal discovery.
- The 1 Sep user review reopened the shared Appearance selector: equal outer boxes and label line boxes did not produce optical icon/text alignment in the rendered screenshot. The current revision keeps compact Android-trimmed 12/18 label metrics, one inner flex centerline and fixed 24dp icon boxes, adds one-dp Lucide-glyph optical correction, and replaces squeezed 200% segments with three full-width rows. Live semantic foreground/muted tokens remain unchanged.
- The prior real `@ishaq.qa.test` data, eleven destination actions/Back, reachability, and touch-target evidence still establishes route behavior, but every earlier Appearance-alignment capture is rejected for this revision. Mobile TypeScript and the complete contract pass. Fresh exact-tenant Light/Dark 100%/200% Android evidence is pending because the available tester credential is rejected; the client will not bypass authorization or directly rewrite QA credential records. More has no input, so keyboard avoidance is not applicable.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/member-more/README.md`. Android is currently at the auth gate, not an accepted Member More handoff state.
- This is the twelfth independent Ticket 29 Android slice. Ticket 29 remains open for real TalkBack and the remaining program-wide matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android member Home accessibility slice

- Five separately clickable JStack/GStack directions selected `A — Semantic Stack`. The accepted screen preserves the approved profile, freshness, readiness, position, attention, and services order in a flat EwaTrade-aligned hierarchy.
- A feature-owned layout policy keeps normal density compact, stacks readiness metadata and position metrics at constrained text widths, removes large-text action-detail caps, and selects compact, two-column, or full-width service presentation by semantic font-scale thresholds.
- The initial two-column 200% service treatment was rejected because long labels still wrapped mid-word. Android font scale `1.8` and above now uses full-width divided service rows; `Procurement`, `Notifications`, and every final service remain complete and reachable.
- Android evidence passes populated Light/Dark 100%/200%, complete top/lower/service reachability, Updates navigation and Android Back, semantic-token parity, mobile TypeScript, three focused tests, scoped Biome, the complete mobile contract, and clean post-load app-PID logs. Home has no input, so keyboard avoidance is not applicable.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/member-home/README.md`.
- This is the tenth independent Ticket 29 Android slice. Ticket 29 remains in progress for real TalkBack and the remaining program-wide matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android Plans / Commitments accessibility slice

- Five separately clickable JStack/GStack directions selected `A — Flat savings ledger`. The accepted screen keeps posted savings, active monthly commitment, voluntary special savings, and recent contributions financially distinct in a flat EwaTrade-aligned hierarchy.
- Feature-owned presentation logic now resolves stable metric keys before legacy labels, preserves exact NGN values, and omits false active-plan/special-savings/contribution summaries when the authoritative count or value is zero.
- One parent scroller owns the page and embedded contribution history. Duplicate records, repeated statuses, internal references, and bookkeeping prose were removed; `Load more` remains an accessible button and appends the next row.
- Android evidence passes empty/populated Light 100%, populated Dark 100%, Light/Dark 200%, complete lower-content reachability, pagination, mobile TypeScript, twelve focused tests, scoped Biome, the complete mobile contract, and clean app-scoped logs. Plans has no form input, so keyboard avoidance is not applicable.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/commitments/README.md`.
- Ticket 29 remains in progress. The member Home hardening slice is recorded above; real TalkBack and the remaining program-wide matrix stay open. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android Statement accessibility slice

- Five separately clickable normal-density JStack/GStack directions selected `A — Position ledger`. The accepted screen preserves the compact normal-density savings/commitment/financing/dividend hierarchy, flat divided identity/activity/section evidence, and EwaTrade-aligned rhythm.
- At Android font scale `2.0`, position metrics, identity/status, activity labels/amounts, section rows, and export states reflow vertically without clipping, broken money strings, or horizontal discovery. Normal scale remains a compact three-column comparison.
- Visible member copy removes raw references, UUID detail, ledger-entry counts, and duplicated lifecycle prose while retaining useful dates, types, units, and status. The zero-value pending-workflow row is omitted.
- Statement now owns one vertical scroller around its inline activity history, eliminating nested-list blank space while standalone history screens retain virtualization. Dynamic typography remains NativeWind `className` first and semantic-token driven.
- The shared floating export sheet remains content-sized at normal density and stacks/falls back to capped scrolling at large text. Generation produced an 18-row ready state; native share chooser and Back dismissal order pass without selecting an external target.
- Android evidence passes Light/Dark at 100%/200%, mobile TypeScript, nine focused tests, the complete 36-route/seven-shell contract, scoped Biome, and a clean app-PID replay. Final emulator state is Light/font scale `1.0`.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/statement/README.md`.
- Ticket 29 remains in progress for real TalkBack and the remaining program-wide accessibility matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android notification accessibility slice

- Five separately clickable normal-density JStack/GStack directions selected `A — Compact inbox ledger`. The implemented screen keeps one concise unread/total/failure summary, flat tabs, a divided push-permission row, and divided notification activity without cards or hardcoded colors.
- Notification preferences are a separate full-screen state. Required security/transaction categories are explicit `Always on` rows; optional categories expose semantic switches, saving state, and update errors.
- A dev-only populated presentation state preserves the real authorized member/tenant context without claiming a successful live notification read. Governed destination routing, per-item read state, Unread/All, Read all, empty recovery, Android settings, and preference mutation pass.
- The shared ScreenHeader now applies ADR-034's `1.6` display-text scale cap while body text receives the full Android scale. Notification permission/preference rows remove row-only flex growth after vertical reflow, preventing hidden content at 200%.
- Android evidence passes Light/Dark at 100%, Light at 200%, full-list/settings reachability, mobile TypeScript, 16 focused tests with 33 expectations, the complete 36-route/seven-shell contract, scoped Biome, and a clean app-PID interaction replay. The final emulator state is Light at font scale `1.0`.
- Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-notification-accessibility/README.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/notifications/README.md`.
- Ticket 29 remains in progress for real TalkBack and the remaining program-wide accessibility matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android Device access accessibility slice

- Five separately clickable normal-density JStack/GStack HTML/PNG directions selected `A — Compact access ledger`. The accepted screen removes its redundant subtitle and metric strip, keeps current/active/ended evidence in flat divided rows, and retains one restrained destructive action.
- The default Light 100% design remains compact. At Android font scale `2.0`, shared route-title typography and feature-owned summaries, headings, counts, rows, metadata, badges, and actions use explicit semantic reflow without clipping or horizontal discovery.
- Dynamic text sizing preserves semantic theme colors and intended weights rather than allowing Android inline typography to erase NativeWind token presentation. Light and app-selected Dark pass at 100%; Light screen/action reachability and the confirmation sheet pass at 200%.
- The shared floating sheet clips its scroll viewport. The Device access confirmation is content-sized at normal density, gets an accessibility-aware maximum only under constrained text, stacks its footer actions, and falls back to scrolling with the footer fixed. It remains an app-rendered floating sheet, not a native popup.
- Mobile TypeScript, the complete 36-route/seven-shell contract, scoped Biome, eight focused tests with 15 expectations, refresh/Back replay, and a clean app-scoped Android error log pass. No device session was revoked. The app and emulator were restored to Light/font scale `1.0`.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/device-access/README.md`.
- Ticket 29 remains in progress for real TalkBack and the remaining cross-screen accessibility matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android app-lock accessibility slice

- Reused the existing five App Lock GStack directions and selected `A — Protection at a glance`; no new normal-scale design decision was introduced. The accepted Light 100% UI remains compact and EwaTrade-aligned.
- Applied ADR-034 semantic reflow only when Android text scaling constrains effective width. App Lock status and device metadata move below their primary content at 200%, preventing overlap without enlarging the default UI.
- Verified the unconfigured screen and full-screen custom PIN pad at 100%, then the reflow at 200%. The PIN pad does not summon the system keyboard; its fixed action remains reachable. Android font scale was restored to `1.0` after verification.
- Hardened mobile session activation so token/profile secure writes roll back atomically instead of leaving a split local session. Sign-in and QA handoff failures enter the governed Sentry path while public sign-in copy remains generic.
- Extended the mobile UI contract to reject actionable direct React Native `Pressable` controls without an explicit role; the repository-wide actionable audit is clean. Mobile TypeScript, the complete NativeWind/UI contract, 16 App Lock/layout tests, and 6 session persistence/invalidation tests pass.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/app-lock/README.md`.
- Ticket 29 remains in progress for real TalkBack and the remaining program-wide accessibility matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 adaptive Android large-text slice

- Five independently reviewable GStack HTML/PNG directions selected `A — Semantic reflow`. The shared `useLargeTextLayout` boundary switches essential summaries, plan rows, detail pairs, progress labels, and required form choices to a vertical flow when font scale or effective width is constrained; critical finance values are neither hidden nor moved to horizontal rails.
- Pixel 3a API 34 development-client evidence at Android font scale `2.0` covers Overview, Members, Create member, dirty-close confirmation, Plan & billing, plan rows, and the Growth plan sheet. Persistent field labels remain after Quick Fill, the six-input focus chain passes, and the lowest input plus sticky action remain above the numeric keyboard.
- Shared floating sheets retain background focus isolation. The Growth sheet uses intrinsic content height until its cap, then scrolls independently with a fixed CTA. Explicit add-on/provider rows replaced redundant explanatory prose.
- Normal font scale retains the compact three-column Overview and five-tab navigation. Mobile TypeScript, the full 36-route/seven-shell contract, six focused layout/database tests, scoped Biome, and fresh Android fatal-log inspection pass.
- Decision: `.brain/decisions/ADR-034-adopt-adaptive-mobile-large-text-reflow.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/large-text-200/README.md`.
- Ticket 29 remains in progress: real TalkBack and the program-wide large-text, Dark, focus-order, announcement, reduced-motion, contrast, touch-target, app-lock, upload, notification, report, and finance matrices are not yet complete. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android auth accessibility slice

- Five separately clickable JStack/GStack HTML/PNG directions selected `A — Task-first stack`. Normal cooperative-number/password sign-in owns the page; optional authorized QA access remains a quiet action that opens the shared floating bottom sheet.
- A 1 Sep visual review reopened the normal-density sign-in composition because the prior screen read as a responsive web form. The first richer pass was still judged too dry, so five new separately clickable Pretext/GStack HTML/PNG directions selected the final `A — Emerald Canopy`, retaining direction E's cooperative identity-handshake behavior. The semantic emerald hero now uses the bundled Halaalvest mark, warm growth accents, and a tested concise large-text fallback; the tenant profile still replaces Halaalvest after a valid credential handshake. The two required fields, first-gate recovery, icon-only development QA entry, and flat hierarchy remain intact without a small eyebrow subtitle. The final review archive lives at `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-rich-directions/`.
- The same-day visual review rejected that implemented composition as still too dry. A second five-direction reset varied composition as well as palette: `A — Harvest Arc`, `B — Woven Trust`, `C — Collective Orbit`, `D — Living Ledger`, and selected `E — Cooperative Passport`. The selected direction is now implemented: a deep-emerald tenant identity region, mint form surface, saffron verification/action accents, the real Halaalvest mark, and the required cooperative avatar/name handshake replace the rejected composition without adding cards or explanatory copy. Review archive: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-spiced-directions/`.
- The owner then rejected Cooperative Passport as still too poster-like and dry. A third five-direction studio reset selected `B — Woven Gateway` from Saffron Horizon, Woven Gateway, Indigo Cooperative, Member Mosaic, and Botanical Ledger. The final native screen keeps the form primary while interlocking semantic teal, saffron, coral, and indigo bands supply an ownable cooperative signature. New reusable `brandWarm`, `brandVivid`, and `brandContrast` roles are synchronized across runtime theme, NativeWind variables, CSS, Tailwind, and the drift guard; no screen-local color literals were introduced. Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-studio-directions/README.md`.
- Normal-density Light now uses 56dp sign-in fields, EwaTrade-aligned spacing, a hero-matched status bar, and semantic `brandSurface`/`brandSurfaceForeground` tokens shared by the runtime theme, NativeWind variables, CSS fallback, Tailwind mapping, and drift guard. Light/Dark 200% states continue to use the shared large-text policy, and true cold-start evidence avoids treating a hot system-font transition as an accepted layout.
- Sign-in and recovery preserve persistent labels, enlarged centered password bullets, stable visibility-toggle geometry, actual Gboard Next/Go focus progression, keyboard clearance, assertive errors, and explicit recovery Back semantics. The cooperative identity fade uses the EwaTrade `useReducedMotion()` zero-duration fallback.
- QA-sheet opening dismisses the active sign-in keyboard and retains root-owned background focus isolation. Its resting height is content-aware; keyboard-controller state expands it to an explicit 88% snap and the bottom-sheet-aware scroller keeps both `ishaq.qa.test` and tester-credential inputs plus the authorization action visible above Gboard. A real authorized `ishaq.qa.test` Fatima profile previously opened the correct tenant-scoped member session; Sign out returned to the auth gate.
- The Cooperative Passport pass splits field UI into a feature-owned `SignInForm`, keeps auth/handshake orchestration in the screen, and keeps headline/action shaping in a tested pure presentation model. Android QA caught and fixed a local raster `expo-image`/NativeWind sizing mismatch and a duplicated 200% title before acceptance.
- Woven Gateway keeps that feature split and adds a reusable motif component. Android 200% QA rejected the first frame because Password/Forgot password and placeholder/eye content collided; the accepted revision stacks the recovery action and caps input scaling without changing secure-value geometry. Mobile TypeScript, the full 36-route/seven-shell contract, semantic-theme drift checks, keyboard/dev-fixture/smoke guards, four focused presentation tests, and zero-error focused lint pass. Pixel evidence at Metro port `1443` covers final Light/Dark 100%/200%, both inputs above Gboard at normal and 200%, large centered password bullets, exact stable reveal bounds, the real brand mark, recovery navigation, and final restoration to Light/font scale `1.0`. The refreshed cooperative handshake remains source/model covered but was not resubmitted because the available tester credential is server-rejected and this pass did not invent or rewrite one.
- The owner then rejected Woven Gateway as still too dry. A fourth five-direction Design HTML reset selected `B — Emerald Vault`. The accepted native screen uses a deep-emerald cooperative gateway, nested arch motif, saffron portal, real brand mark, concise private-member trust cue, and flat semantic-token form surface. Light/Dark 100%/200%, both normal/large-text input keyboards, recovery navigation, enlarged secure bullets, normal revealed text, exact identical hidden/visible bounds, theme/keyboard/contracts, and final Light/font-scale-`1.0` restoration pass. The live cooperative identity handshake remains open because the available tester credential is server-rejected and no authorization boundary was bypassed.
- The owner rejected the next near-monochrome reset before implementation. Five richer directions selected final `E — Cooperative Reveal`. The native result retains the deep-emerald identity field but replaces poster-like arches and redundant trust copy with restrained concentric cooperative rings, a semantic warm/coral/mint rail, a stable brand-to-tenant identity handoff, and one flat form surface. Light/Dark 100%, Light 200%, both Gboard inputs, first-gate recovery, centered masking, normal reveal text, exact stable bounds, full contracts, and clean fatal/runtime logs pass; the current tester credential still prevents a fresh live handshake replay without bypassing authorization.
- The owner rejected Cooperative Reveal as still too dry. A final five-direction premium reset selected `E — Living Cooperative`. The accepted native screen adds an indigo atmosphere and a saffron/coral/teal connected-member network around the tenant identity while keeping the form flat and token-driven. Decorative network content is removed at 200% text size. Light/Dark 100%, Light 200%, both Gboard inputs at normal and 200%, first-gate recovery, secure masking, stable reveal geometry, clean logs, and final Light/font-scale `1.0` restoration pass.
- A 4 Sep refinement generated five new vibrant directions and selected `E — Prosperity Garden`. Native now matches the selected connected-member botanical motif and shield-led coral action while preserving the existing feature/controller split, semantic NativeWind roles, concise field copy, and large-text fallback. Headless Android revalidated Light/Dark 100%/200%, input keyboards, masking geometry, recovery, QA-sheet backdrop/keyboard lift, and enabled/disabled action states. A follow-up owner review rejected generic 50% opacity for the unavailable action because it washed coral into a misleading salmon block; the final empty state uses `bg-muted` plus readable `text-muted-foreground`, while complete input retains the strong coral CTA. The smoke guard pins the semantic state treatment. The exact `ishaq.qa.test` credential remains server-rejected, so no fresh tenant-handshake pass is claimed.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/auth-large-text/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-rich/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-passport/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-woven-gateway/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-emerald-vault/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-cooperative-reveal/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-living-cooperative/README.md`, and `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-prosperity-garden/README.md`.
- Ticket 29 remains in progress for real TalkBack and the remaining program-wide accessibility matrix. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 29 Android recovery Vault Passage refinement

- Five separately clickable Design HTML/PNG directions selected `A — Vault Passage`, extending the accepted Emerald Vault identity into recovery rather than leaving a generic white utility form beside it.
- The accepted native flow uses the same semantic deep-emerald gateway, nested passage motif, restrained saffron accent, real Halaalvest mark, and flat light/dark form surface. Account details, six-digit code, and new password remain separate first-gate states with only useful field, progress, action, destination, resend, validation, and Back text.
- Recovery now follows the Midday split: the screen owns local state/API/session orchestration, a pure tested model owns step presentation, and focused feature components own request/code/password rendering. The shared keyboard-aware viewport accepts an inner minimum height so the rounded form surface reaches the full screen.
- Pixel 3a API 34 development-client evidence on Metro `1443` covers Light/Dark account details, Light 200%, account/email/OTP/new-password/confirm-password keyboards, stacked code/password headers, enlarged centered bullets, normal revealed text, exact stable hidden/visible geometry, mismatch announcement, and final restoration to Light/night `no`/font scale `1.0`. Post-clear fatal/runtime logs are clean.
- Mobile TypeScript, five focused tests, pinned focused ESLint, and the complete 36-route/seven-shell contract pass. Development Quick Fill exists for every recovery step but continues to require an authorized `ishaq.qa.test` device/session; no credential or server-owned authorization was bypassed.
- Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-recovery-emerald-vault-directions/README.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/recovery-emerald-vault/README.md`.
- This refines the existing auth slice without increasing the independent-slice or ticket count. Ticket 29 remains open for real TalkBack and the remaining program-wide matrix; overall directive progress remains 25/33 (75.8%).

## Ticket 29 Android Guarantor approvals accessibility slice

- Five separately clickable Pretext/GStack HTML/PNG directions selected `A — Decision queue`: unresolved decisions retain complete borrower and financial context while resolved decisions become compact divided history.
- The first native implementation remained too tall because resolved rows reused the full requested/monthly/term/purpose body. The feature presentation now supplies a concise product-plus-amount history context, resolved rows reflow status/date/disclosure metadata, and bounded virtualization reserves compact history-row height instead of full-card space.
- Large-text status labels wrap rather than shrinking. The response form remains separated from browsing in the shared content-sized keyboard-safe floating sheet, with shared review/success/detail/backdrop/Back and development Quick Fill behavior; no native modal or inline list form was introduced.
- Four focused presentation/QA tests, mobile TypeScript, scoped formatting, lint with zero errors, and the complete 36-route/seven-shell mobile contract pass. Fresh Android acceptance is not claimed: the configured tester credential was entered securely through the visible port-`1443` `ishaq.qa.test` authorization flow, but the server rejected it with `Sign in again to continue` and the client discarded it. No mock signed session, credential rewrite, or authorization bypass was used.
- Design: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-guarantor-approvals-accessibility/README.md`. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/guarantor-approvals/README.md`.
- This remains an incomplete Ticket 29 slice pending fresh Light/Dark 100%/200%, keyboard/sheet, state-matrix, and TalkBack evidence. Overall directive progress remains 25 of 33 tickets (75.8%).

## Ticket 28 push notifications and governed deep links

- Device push endpoints are durable, bound to one active mobile-device session, re-registered on token changes/foreground, disabled when OS permission is lost, removed on session revocation, and audited by token fingerprint rather than raw token.
- Tenant channel policy, user preferences, plan availability, and mandatory security/transaction categories are resolved server-side. Optional financing, cooperative-update, and support categories remain user controlled; mandatory categories cannot be disabled.
- A typed action registry validates the signed session, tenant, intended cooperative role, allowlisted destination, and bounded opaque record id. Exact receipt, financing, support, Procurement, Foodstuff Purchase, project-financing, report, guarantor, security, update, and notification destinations never accept client-supplied tenant scope.
- Cold-start, foreground/background, live response, duplicate response, role-switch, expired/revoked session, stale/deleted record, and unavailable-feature paths fail closed with concise recovery. Notification/telemetry payloads exclude sensitive financial, KYC, contact, credential, and provider-token detail.
- Five independently clickable HTML/PNG directions selected `A — Clear ledger`. The rebuilt Pixel 3a API 34 native development client on Metro `1443` verified denied/granted permission, registered Light/Dark inbox, mandatory/optional settings, read state, exact financing/report/support destinations, and the unavailable-record notice.
- Verification passes mobile TypeScript, the full 36-route/seven-shell executable contract, 27 notification/domain/database/mobile tests with 71 expectations, 103 mobile API route tests with 250 expectations, and Android fatal-log inspection. Required database migrate/push checks were attempted, but Docker remained unavailable; no reset or manual migration occurred.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-28/README.md`. Ticket 28 is complete. Overall directive progress is 25 of 33 tickets (75.8%), with 8 remaining; Ticket 15 is the next executable frontier.

## Ticket 06 member cooperative services closeout

- Procurement, Foodstuff Purchase, and Project financing now complete their feature-owned mobile migration behind thin Expo routes, typed feature controllers/adapters, signed tenant/member API procedures, and domain database queries. Generic mobile helpers do not own their business behavior.
- The selected GStack exception-state direction is `E — Operational clarity`: flat consequence/recovery rails, readable existing history, one semantic action, and no additional card layer. Production surfaces stay NativeWind `className` first, semantic-token only, keyboard-safe, Light/Dark complete, and aligned with the EwaTrade-derived system.
- A real signed Zainab Musa `@ishaq.qa.test` member session on the installed Pixel 3a API 34 development client produced the canonical 30-state Light matrix plus representative Dark states. Native checks prove labelled retry, command suppression with accessible history/detail in read-only mode, shared floating detail presentation, and no matching fatal React Native, AndroidRuntime, or ANR event.
- Final visual QA hid internal brought-forward Procurement keys, replaced placeholder count copy with correct singular/plural language, and made deterministic empty fixtures internally consistent without changing production server authorization.
- Ten focused mobile tests, 79 cooperative-service database policy/idempotency/tenant tests, 97 mobile-router tests, mobile/API/database-source TypeScript, focused Biome, diff hygiene, and the complete 36-route mobile contract pass. Ticket 31 retains the program-wide iOS, installed-build, and broader device matrix.
- Tickets 09, 10, and 27 are complete. Overall directive progress is 24 of 33 tickets (72.7%), with 9 remaining. Ticket 28 is the active executable frontier; Ticket 15 remains active for its cross-device accessibility and release-performance acceptance.

## Ticket 27 reports, statements, and audit activity

- The fixed server-owned catalogue covers member register/statements, contributions/special savings, charges, financing/repayments, receipts, Procurement, Foodstuff Purchase, project financing, shares/profit, support, opening balances, and audit activity. Subscription depth determines availability and bounded row limits; tenant, actor, role, and member identity come only from signed context.
- Admin reports and member statements generate through authenticated mobile procedures, write only to app cache, expire after 15 minutes, and are removed on cancellation, expiry, permission/session loss, or unmount. Native sharing receives a local cache URI; bearer credentials and report content never enter public URLs. Raw CSV preview text is neither rendered nor retained in presentation state.
- Governance activity is cursor-paginated newest-first and exposes actor, authorizer/reviewer where available, timestamp, affected entity, and at most three allowlisted redacted facts. Arbitrary payloads and sensitive credential/contact/bank/document values remain outside the mobile contract.
- Five independently clickable HTML/PNG directions selected `A — Report workspace`. The native result keeps the approved flat EwaTrade/NativeWind system: large titles, compact metrics, divided virtualized rows, content-aware floating sheets, semantic tokens, concise labels, and no report form beside list content.
- Final Pixel 3a API 34 development-client QA on Metro `1443` covers populated Statement, export/ready sheets, report catalogue, filters, fixed-height month/year calendar swipes, generation, ready files, and activity. Calendar touch handling required sibling sheet portals so the native horizontal pager—not a nested overlay—owns day/month/year swipes without height flicker.
- Report/list copy now keeps only orientation, decision, status, constraint, and recovery text. Statement and activity rows use deliberate vertical padding and inset dividers; repeated descriptions plus `loaded`/`recent` bookkeeping labels were removed. This concise-copy rule is also recorded in the personal Expo coding standard and Brain pointers.
- Verification passes mobile TypeScript, the full 36-route/seven-shell executable contract, scoped Biome, 21 report/domain/database/model tests with 57 expectations, 101 mobile-router tests with 246 expectations, and 21 calendar/date/list-formatting tests with 56 expectations. External share-target selection was intentionally not performed because it would expose a private report to a third-party app; the native adapter and local lifecycle remain wired and reviewed.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-27/README.md`. Ticket 27 is complete; program-wide TalkBack/large-text, iOS/device/build, and release-profile performance/security breadth remains with Tickets 29, 31, and 32.

## Ticket 07 admin overview and member lifecycle closeout

- The previously selected `Exceptions first`, `Directory first`, and `Readiness first` directions remain the authoritative UI. Closeout added no competing screen language: the native implementation stays flat, divider-led, semantic-token-only, NativeWind `className` first, and aligned with the EwaTrade-derived Halaalvest system.
- A real `@ishaq.qa.test` Tenant Admin session now proves populated Overview, Members, and Member Detail reads plus loading, empty/not-found, error/retry, denied, offline, and stale states on the Pixel 3a API 34 development client. The denied detail path clears prior member state and gates every payload/action render so an authorization change cannot retain a profile or loading indicator.
- Member rows now expose lifecycle status, KYC, linked-login state, Collection Source, and active monthly obligation. A guarded, idempotent local QA utility created 94 clearly prefixed profiles only inside the exact QA-classified `ishaq.qa.test` tenant, producing a 100-member signed registry.
- Native page 1, Next to page 2, Previous, exact search, and keyboard-visible search passed. Direct query measurements were 62.67 ms for page 1, 24.91 ms for page 2, and 26.26 ms for exact search; broader release-profile scale/memory/render budgets remain centrally owned by Ticket 32.
- Forty focused member-lifecycle tests with 91 expectations, mobile/database TypeScript, Prisma generation, focused Biome, diff hygiene, the complete 36-route mobile contract, Android accessibility-tree inspection, and fresh fatal-log replay pass. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-07/README.md`.
- Ticket 07 is complete. Overall directive progress is 20 of 33 tickets (60.6%), with 13 remaining. Tickets 29, 31, and 32 retain the shared TalkBack/large-text, iOS/device/build, and release-profile performance/security matrices.

## Ticket 26 share and profit governance milestone

- Five separately clickable HTML/image directions selected `A — Two books`, keeping member capital ownership and cooperative profit allocation visibly and operationally separate.
- The feature-owned DB/API/mobile boundary exposes bounded book workspaces, independent share-application/profit-period detail, share review, profit approval, and profit publication. Signed tenant and actor context is server-owned; view, share review, profit approval, and profit publication use separate named permissions.
- Unit-based and monthly-history share models remain explicit. Approval posts share capital exactly once; pending applications reserve capacity but do not post ownership. Share ledger evidence is immutable, and neither book is described as savings or a guaranteed return.
- Profit periods expose live versus historical state, gross result, reviewed expenses/deductions, distributable amount, allocation reconciliation, and publication state. Members receive only published allocation/dividend evidence; dense allocation construction and migration authoring remain web-first.
- Commands require legal expected state, UUID idempotency, tenant ownership, reconciliation/publish preconditions, and audit evidence. Offline and stale reads remain readable but cannot submit financial commands.
- The NativeWind semantic-token UI uses a flat two-book workspace, divider-led summaries, floating browse/confirmation/success sheets, and separate keyboard-safe entry forms with guarded development Quick Fill. Deterministic QA states cover both share models, no results, denied, empty, error, offline, and stale presentation without changing production behavior.
- A signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified populated Light/Dark workspaces, every input with the Android keyboard, real share and profit approvals, real publication, both models, search, and the exception-state matrix. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-26/README.md`.
- Fifty-nine focused tests, mobile/API/DB TypeScript, the complete 36-route contract, zero-error package lint, diff hygiene, and fresh Android fatal-log replay pass. Ticket 26 is complete; overall directive progress is 19 of 33 tickets (57.6%), with 14 remaining. Tickets 06, 07, 09, and 10 acceptance are the next executable frontier; Ticket 27 remains blocked by 09 and 10.

## Ticket 25 Project Financing operations milestone

- Five separately clickable HTML/image directions selected `B — Boundary Ledger`: a flat structure-first workspace that keeps repayable principal separate from investment-partnership and profit-sharing evidence and exposes only the next legal operation.
- The feature-owned DB/API/mobile boundary exposes workspace, independent detail, review, activation, and release-evidence commands. Signed tenant and actor context is server-owned; `view_admin_work_queue` controls visibility while `review_project_financing` independently controls review, activation, and release.
- Approved repayable facilities materialize only the approved principal obligation. Partnership and profit-sharing approvals remain non-repayable governance evidence and cannot become receipt targets until a dedicated accounting model exists.
- Review, activation, and release use expected-state guards, UUID command receipts, transactional tenant checks, idempotent replay, and audit evidence. Offline and stale workspaces remain readable but cannot submit commands.
- The UI uses one flat workspace, exact structure/detail timelines, compact floating decision sheets, and keyboard-safe full-screen entry with the shared fixed-height swipe calendar. Deterministic development-only QA states cover denied, empty, error, offline, and stale presentation without changing production behavior.
- A signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified populated Light/Dark workspaces, review, activation, release evidence, principal receipt settlement, evidence-only structures, terminal completion, search, every-input keyboard clearance, calendar modes, and the five-state exception matrix. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-25/README.md`.
- Fifty-four focused project-financing, receipt, idempotency, authorization, and offline-runtime tests with 159 assertions plus eight calendar/date tests with 29 assertions pass. Mobile/API/DB TypeScript, the complete 35-route contract, zero-error package lint, diff hygiene, and Android fatal-log inspection pass. Ticket 25 is complete; overall directive progress is 18 of 33 tickets (54.5%), with 15 remaining. Ticket 26 share and profit governance oversight is the next executable frontier.

## Ticket 24 Foodstuff Purchase cycle operations milestone

- Five separately clickable HTML/image directions selected `A — Cycle desk`: one flat active-cycle truth surface, a bounded application queue, full-scope allocation totals, an explicit allocation-shortfall warning, and only the next legal cycle/accounting actions.
- The feature-owned DB/API/mobile boundary exposes `workspace`, independent application detail, cycle create/transition/complete, application review, and accounting submit/review. Signed tenant and actor context is server-owned; `view_admin_work_queue` controls visibility while release, application review, committee accounting, and finance accounting review remain independently permissioned.
- Cycle states are explicit from `draft` and `open` through `intake_closed`, `accounting_submitted`, correction, acceptance, completion, cancellation, and terminal closure. UUID command receipts, expected-state guards, Serializable claims, immutable policy snapshots, and audit evidence protect releases, review races, accounting decisions, and completion.
- Workspace paging is server-owned at 30 rows with an opaque cursor and server search. Cycle/request/approved/paid/outstanding totals and allocation shortfall are computed across the full tenant cycle rather than the visible page.
- Fund release and accepted accounting remain provisional governance evidence: they do not post cash, create a member obligation, distribute Foodstuff Purchase profit, or create a dividend allocation. Existing payment-receipt allocation remains the only supported application settlement boundary.
- Forms remain separate from the cycle/list screen. Long entry uses the shared full-screen keyboard-safe form, compact decisions use floating sheets, and the shared fixed-height calendar uses live viewport geometry with centered three-column month/year selectors and bidirectional day/month/year paging.
- A signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified the populated Light/Dark cycle desk, allocation warning, cycle transition, release form, lowest-field keyboard clearance, review-from-keyboard, and balanced/swipeable calendar modes. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-24/review-2026-08-30/README.md`.
- Mobile/API/DB TypeScript, the complete 34-route contract, 54 focused DB/API tests with 153 expectations, receipt-allocation regression coverage, formatting, and Android fatal-log inspection pass. Ticket 24 is complete; overall directive progress is 17 of 33 tickets (51.5%), with 16 remaining. Ticket 25 project-financing operations is the next executable frontier.

## Ticket 23 procurement fulfillment milestone

- Five separately clickable procurement directions selected `A — Fulfillment desk`; five separately clickable calendar directions selected `A — Ledger Calendar`, a flat, familiar day/month/year picker with schedule constraints kept secondary.
- The feature-owned mobile boundary keeps Review, Activate, Servicing, and Completed legal states explicit. Visibility and commands are permission split, tenant scoped, expected-state and idempotency guarded, audited, and safe against activation races and duplicate schedule creation.
- Purchase activation requires the approved immutable snapshot and vendor/purchase evidence, validates strict date-only values and due-date ordering, and creates the approved repayment schedule exactly once. Servicing evidence remains transactional and existing obligations remain readable when new procurement is disabled or read-only.
- Purchase activation is a keyboard-safe full-screen form. Calendar fields open the shared floating bottom sheet with a fixed viewport-bounded 520–540-point height, stationary header/footer, gesture-handler paging by month/year/twelve-year range, title drill cycling, clipped selection states, and accessible minimum-date enforcement. The pager stays mounted across modes so drill transitions cannot expose a blank frame; horizontal gestures cancel cell selection before animating the next or previous period.
- A signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified the populated Patsy Cummerata request, fulfillment detail, every purchase input, day/month/year modes, repeated bidirectional swipes, identical sheet bounds, and the 30 Aug 2026 minimum-date boundary.
- Mobile typecheck, the full executable contract, lint with zero errors, and four focused date-helper tests with thirteen expectations pass. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-23/review-2026-08-30/README.md`.
- Ticket 23 is complete. Overall directive progress is 16 of 33 tickets (48.5%), with 17 remaining; Ticket 24 Foodstuff Purchase cycle operations is the next executable frontier.

## Ticket 22 repayment and collections milestone

- Five separately clickable HTML/image directions selected `E — Servicing desk`: one flat servicing summary, Due/Collections/Posted lanes, earliest-obligation ordering, and explicit separation between repayment posting and nonfinancial collection evidence.
- The feature-owned mobile boundary consumes signed-tenant server workspaces. `view_admin_work_queue` owns visibility, `review_financing` owns repayment posting, and `record_collection_follow_up` owns collection evidence; offline/stale reads cannot write.
- Repayment posting is Serializable, expected-state and outstanding guarded, UUID-idempotent, reference-unique, earliest-unpaid allocated, append-only, audited, and atomic with loan/schedule/ledger updates. Collection follow-up has independent idempotency/audit evidence and cannot mutate principal, schedules, repayments, or ledger values.
- Facility detail uses a large floating sheet, compact repayment entry uses the content-aware floating form sheet, and the longer follow-up composer uses a keyboard-safe full-screen sheet. Action footers hide while typing and return after dismissal; every input passed native keyboard verification.
- A signed `@ishaq.qa.test` Tenant Admin Pixel 3a development-client flow posted ₦66,667 as `QA-REP-291112`, reduced outstanding principal to approximately ₦4.03m, and recorded a Promise To Pay follow-up that explicitly preserved principal.
- Forty-one focused tests with 112 expectations, DB/API/mobile TypeScript, and the complete 32-route executable mobile contract pass. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-22/review-2026-08-30/README.md`.
- Ticket 22 is complete. Overall directive progress is 15 of 33 tickets (45.5%), with 18 remaining; Ticket 23 procurement fulfillment operations is the next executable frontier.

## Ticket 21 financing cycle and disbursement milestone

- Five separately clickable HTML/image directions selected `E — Operational clarity`, which combines immutable cycle truth, quick/normal allocation health, actionable review/disbursement lanes, and liquidity/evidence blockers in the established flat divider-led NativeWind system.
- The thin route and feature-owned mobile boundary consume tenant-scoped server workspaces. `view_admin_work_queue` owns visibility; `review_financing` separately owns cycle, approval, and disbursement commands. Offline/stale state is read-only and errors use sanitized feature-scoped Sentry capture.
- Cycle opening persists capacity and allocation snapshots; pause/resume preserves them and close is terminal. Approval revalidates product, eligibility, overlap, guarantors, dual approval, and capacity. Disbursement rechecks deployable funds and records one transactional ledger/schedule/audit/idempotency result.
- Compact cycle, review, disbursement, confirmation, and success flows use the shared floating bottom sheet. Fixed headers, keyboard-aware body scrolling, sticky keyboard actions, auto sizing, overflow caps, dirty-close confirmation, and icon-only Quick Fill passed native testing.
- A signed `@ishaq.qa.test` Tenant Admin Pixel 3a development-client flow opened the August QA cycle, approved and disbursed a ₦300,000 request, preserved a ₦40,000 request blocked by one pending guarantor, and passed populated Light/Dark, search, detail, review, success, discard, and keyboard evidence.
- Forty-six focused tests with 137 expectations, DB/API/mobile TypeScript, the complete executable mobile contract, focused Biome, and fatal-log inspection pass. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-21/review-2026-08-30/README.md`.
- Ticket 21 is complete. Overall directive progress is 14 of 33 tickets (42.4%), with 19 remaining; Ticket 22 repayment posting and collections operations is the next executable frontier.

## Ticket 20 staff charge and monthly levy milestone

- The selected `Applications workspace` direction separates Applications, Monthly levies, and Rules behind one thin `/charges` route and feature-owned mobile model/API/controller/screen boundary. The apply form uses the selected `Compact picker rows` direction with searchable floating pickers.
- Named permissions separate staff visibility from finance application/settlement and finance correction. Tenant scope, expected state, UUID-plus-fingerprint idempotency, effective definition version, duplicate policy, target, amount, payment reference, and corrective accounting remain authoritative server checks.
- Existing dated charge versions are immutable once member applications exist. Pending separate-payment settlement posts balanced cash/income evidence; posted waiver/reversal posts the opposite accounting evidence rather than deleting history.
- NativeWind semantic tokens, flat divided rows, content-aware floating sheets, same-window long-form states, guarded Quick Fill, Sentry capture, light/dark presentation, and verified keyboard avoidance follow the shared mobile contract.
- The current screenshots, five whole-screen options, five form options, selected rationale, final native captures, keyboard matrix, QA data, and automated checks are indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-20/review-2026-08-30/README.md`.
- Ticket 20 is complete; its evidence remains indexed in the linked Ticket 20 report.

## Ticket 19 staff contribution operations milestone

- The selected `Workspace lanes` direction separates Ledger, Commitments, and Collections behind one thin `/contributions` route, feature-owned model/API/controller/screen boundaries, and active-lane-only reads.
- Named permissions separate staff visibility/member contribution work from finance-only Collection Source mutation. Every command retains signed tenant/actor scope, expected-state review, UUID plus fingerprint idempotency, authoritative policy/target checks, audit evidence, and transactional posting.
- The flat semantic-token NativeWind UI uses full-screen keyboard-safe long forms and shared content-aware floating sheets for compact row work and popups. Development Quick Fill is guarded; stale/offline reads cannot write; Sentry capture is sanitized and feature-scoped.
- The mandatory design workflow and Pixel 3a API 34 Light/Dark, populated, review, success, single-line keyboard, and multiline keyboard evidence are indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-19/review-2026-08-30/README.md`.
- Ticket 19 is complete; its evidence remains indexed in the linked Ticket 19 report.

## Product contract

- Mobile is one Halaalvest client, not an independent finance or permission authority.
- The signed server session owns tenant, user, active membership, role, member linkage, Operation Profile, subscription entitlement, and record authorization.
- Money-affecting commands require live server authorization, tenant scoping, audit evidence, and idempotency where retry is possible. Offline state may preserve drafts and display visibly stale reads only.
- Subscription is part of the program: foundation, effective entitlements/limits/usage, mobile management, and live billing lifecycle are Tickets 14-16.

## Architecture contract

- `apps/mobile/qa/mobile-architecture-contract.json` inventories every route and shell with feature, role, and tenant boundaries.
- Expo Router page files stay thin. Feature route controllers will own typed API orchestration and presentational screens will remain transport-independent.
- `apps/mobile/scripts/check-mobile-architecture.mjs` rejects route business logic, cross-feature internal imports, unsafe shared barrels, and authoritative-looking client financial calculations.
- The generic production screen directory, monolithic mobile client, and monolithic mobile database query module are removed. `mobile.route.ts` is a 32-line composition-only public namespace; feature procedure modules own validation, authorization, queries, and commands. CI rejects legacy modules and an aggregation router over 60 lines.

## Legacy contraction

- Ticket 10 is complete. Production route controllers import feature-owned screens, cross-feature imports use explicit public contracts, development fixtures use an isolated dev-only contract, and repository-wide scans plus the executable architecture checker prove the removed generic compatibility layers have no production consumers.
- Device session registration and member settings access have dedicated API/database modules. Admin member lifecycle and procurement, project financing, and Foodstuff Purchase no longer delegate to a generic mobile database query.
- The post-contraction suite passes the complete mobile contract, DB/API/mobile TypeScript, and 121 focused router/query/runtime/fixture tests. Native Ticket 07-10 screenshot matrices remain an honest external evidence gap because the Pixel 3a API 34 system UI is unresponsive.

## UI and keyboard contract

- EwaTrade remains the primary mobile interaction/design reference: compact stable geometry, semantic status language, consistent sheets/forms/lists, and one reusable component system.
- NativeWind `className` is the default; semantic light/dark tokens are mandatory. Inline/native styles require runtime values or a documented native API exception.
- `AppKeyboardAwareScrollView`, the root `KeyboardProvider`, bottom-sheet-aware inputs, and keyboard-aware sheet settings are guarded. Dedicated form-only routes use the shared keyboard surface; read-focused workflow screens use a normal scroll surface and keep inputs inside `CompactFormSheet` or `FullScreenFormSheet`.
- Financing, shares, guarantor responses, receipts, support, procurement, Foodstuff Purchase, and project financing now separate their summaries/histories from data entry. Compact forms auto-size up to 44% at rest and scroll only on overflow; input-bearing compact forms expose an EwaTrade-style extended snap only while the keyboard is open so the focused field and actions stay visible. Long forms, including the optional-share request whose complete content exceeds the compact contract, use full-screen safe-area sheets with draft-aware close protection, explicit review, and post-dismiss success sequencing.
- Native popup alerts and popup modals are prohibited. Confirmations, destructive prompts, submission reviews, success notices, and update notices use the shared auto-content `FloatingBottomSheet`, capped at 44% with body-only scroll-on-overflow behavior and measured fixed action footers. Long forms use the same-window `FullScreenFormSheet` portal host so compact overlays stay on the root bottom-sheet provider instead of opening another native window. The full-screen host owns semantic NativeWind variables, safe-area backgrounds, status-bar appearance, an EwaTrade-style `KeyboardStickyView` action footer, keyboard-aware scrolling, and dirty-draft protection; manual keyboard screen-coordinate sizing is forbidden because it clipped multiline-keyboard actions on Android.

## Quality baseline

- `apps/mobile/qa/mobile-contract-baseline.md` records the initial green contract, TypeScript, lint, smoke, API, auth, and Operation Profile query results.
- Later tickets must keep these checks green and add focused tests, Expo/emulator evidence, screenshots, accessibility, performance, security, and release evidence appropriate to their slice.

## Member core migration

- Ticket 03 is complete. Member home and cursor-paginated commitment/share/statement activity use member-core query ownership.
- Commitments now use the dedicated `mobile.member.commitments` procedure and `getMobileMemberCommitments` DB boundary. The server derives the member from the signed tenant/user session and returns active commitment, total savings, voluntary special savings, and contribution count as separate metrics.
- The mobile Commitments screen consumes the dedicated procedure, retains scoped read-cache behavior, uses compact `Plans` tab copy on five-tab devices, and has populated Pixel 3a API 34 light/dark evidence under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-03/`.
- Shares now use the dedicated `getMobileMemberSharesSnapshot` and `createMobileMemberShareApplicationForSession` DB boundaries. Both derive the linked member from the signed tenant/user session; snapshot queries are member/tenant scoped, bound preview rows, expose published dividends only, and calculate requestable unit capacity after approved and pending-reserved units.
- Optional-share request history uses a bounded session-scoped cursor endpoint and mobile load-more path; it never accepts a client-selected tenant or member.
- Statements now use `getMobileMemberStatementSnapshot`, composing dedicated commitment and share read models while preserving profile, financing, charge, document, ledger, and published-dividend values. Populated top and scrolled Pixel 3a light-mode evidence is retained in the Ticket 03 manifest.
- Ticket 03 acceptance passed the full mobile architecture/runtime/theme/UI/keyboard/fixture/smoke contract, DB/API/mobile typechecks, 87 focused tests, and populated compact-device visual review.

## Shared runtime

- `MobileRuntimeProvider` owns connectivity, foreground/background state, bounded recovery, query focus/online integration, and active-read refresh.
- React Query mutations do not pause/replay offline. Runtime event and command contracts require online state, with a dedicated financial-command error that preserves the draft.
- Secure session hydration distinguishes transient connectivity failure from server-confirmed unauthorized credentials.
- Read caches and form drafts expose timestamps/age and encode tenant, user, active membership, and effective role in every key.
- Android API 34 Expo evidence is retained under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-02/`; cold launch and email-keyboard avoidance passed in dark mode with reduced motion enabled.

## Mobile account recovery

- Ticket 11 is complete. Mobile public authentication is sign-in plus account recovery only; it has no sign-up or membership-activation route, CTA, Quick Fill fixture, public API router, persisted challenge writer, or executable database activation command. Historical challenge enum values remain read-compatible only.
- Recovery requests use enumeration-neutral production responses, persistent account/device/network/tenant rate buckets, tenant-bound 30-minute single-use evidence and a six-digit development-only QA seam. Tenant-only throttling and notification delivery failures do not disclose whether an account exists.
- Completion counts invalid evidence, rejects expiry/replay/cross-tenant use, changes the password and consumes the challenge atomically, resolves the canonical active role, enforces member-login entitlement and records redacted audit metadata.
- Fourteen focused tests with 54 expectations, DB/API/mobile TypeScript and the full mobile contract pass. Expo Go on port 1443 completed the real `@ishaq.qa.test` request/reset/session journey with every input keyboard checked and retained under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-11/`.

## Revocable mobile device sessions

- Ticket 12 is complete. Mobile requests require a signed mobile-kind token plus a matching durable database session keyed by one-way token/device hashes; legacy signed bearer tokens are rejected when the client declares `x-trpc-source: mobile`.
- Device sessions retain tenant/user/membership scope, bounded platform/app/device labels, creation/last-use/expiry, and revocation evidence. Refresh and role switching atomically replace the prior token, concurrent replacement is replay-safe, and password reset, sign-out-all, tenant/member suspension, or membership removal invalidate access.
- Users can inspect current/recent sessions, revoke another device, and sign out all. `manage_roles` administrators have separate tenant-scoped list/revoke commands. All mutations write redacted audit evidence without token or device hashes.
- Unauthorized invalidation clears secure session state, user/tenant/membership-scoped read caches, and form drafts while failing the protected UI closed. A response for an older request token cannot invalidate a newer rotated session.
- Gate 25 implements the selected flat `Access first` direction with semantic NativeWind Light/Dark tokens and shared floating confirmation sheets. Expo Go on Pixel 3a API 34 verified current-device recognition, other-device revocation, sign-out-all, first-gate return, and clean fatal logs for the QA-classified real session. Evidence is indexed under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-12/`.
- Twenty-three focused tests with 106 assertions, DB/API/mobile typechecks, zero-error package lints, diff hygiene, and the complete mobile executable contract pass. The required migrate check refused pre-existing local drift without resetting data; `db:push` confirmed the schema is synchronized.

## Local app lock and privacy

- Ticket 13 is complete. App lock is scoped to the signed-in user and device, stores only secure local configuration, hydrates before protected content, and fails closed on missing, corrupt, rejected, or timed-out secure state.
- A six-digit local PIN is always available. Strong device biometrics are offered only when supported and enrolled; failed/unavailable biometrics retain PIN recovery without changing server authentication. Immediate, one-minute, and five-minute relock policies are bounded locally.
- Sign-out, server-confirmed revocation, user/tenant/membership change, and secure-store reset clear the local lock safely. The root runtime gate prevents protected content from becoming interactive before lock state resolves.
- Android privacy uses the native secure-screen boundary. With the QA capture override disabled, active and Recents screenshot attempts produced zero-byte output while accessibility inspection remained available; Home/reopen returned the full unlock overlay.
- The selected `Protection at a glance` direction is flat, semantic-token, NativeWind `className`-first, and Light/Dark capable. Pixel 3a API 34 and an installed native development APK passed setup, confirmation, wrong/correct PIN, relock, and unavailable-biometric states. Twelve focused tests, mobile TypeScript, zero-error lint, and the complete executable contract pass.

## Financing and guarantor migration

- Ticket 04 is complete. Financing and guarantor approvals moved from generic mobile screens/API reads into dedicated feature models, adapters, screens, DB boundaries, and `mobile-member-financing.route` procedures.
- Financing request previews are server-owned: eligibility, cycle capacity, term, monthly servicing, effective charges, active-financing overlap, migration readiness, and deployable-funds warnings are returned as blockers/warnings. Submission independently rechecks the authoritative command guards.
- Financing request history is bounded and cursor-paginated. All reads and commands derive the member and tenant from the signed active member session.
- Guarantor responses require explicit confirmation, require a rejection reason, and use the existing pending-only immutable audited command. Offline/stale state keeps scoped reads and drafts but blocks both financial commands.
- The flat EwaTrade-aligned light UI, Quick Fill development data, financing review/submission, guarantor review/approval, and corrected keyboard avoidance passed on Expo Go with Pixel 3a API 34 evidence under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-04/`.
- Ticket 04 acceptance passed DB/API/mobile typechecks, the complete mobile contract, 89 mobile API tests, and 28 financing/guarantor domain tests.

## Receipts and support migration

- Ticket 05 is complete. Member Receipts and Support moved from generic mobile helpers/screens into dedicated feature models, adapters, screens, API procedures, and tenant/member-scoped DB query boundaries.
- Receipt reads return bounded cursor history, Operation Profile capabilities, and server-shaped category/target options across commitments, special savings, loan servicing, shares, procurement, project financing, and Foodstuff Purchase. The command preserves exact allocation-total, category-target, duplicate-reference, audit, and canonical server-evidence guards.
- Procurement, Foodstuff Purchase, and project-financing member routes now resolve feature-owned screens, models, and API adapters instead of the generic mobile screen/helper layer. Their dedicated cooperative-services router returns server-shaped policy/capability metadata, exact full-scope aggregates, first-20 histories with opaque bounded pagination, and independently scoped detail reads; member ownership comes only from the authenticated tenant/user link. Remaining hardening is complete Foodstuff Purchase/project-financing native state matrices, duplicate/tenant-isolation integration evidence, and the per-screen screenshot manifest.
- Android Expo Go light/dark QA now proves the complete safe-fixture happy path for all three services. Foodstuff Purchase and project financing retain populated content, empty/filled long-form, keyboard, review, refreshed history/count, and compact success screenshots under the Ticket 06 manifest; Foodstuff Purchase Quick Fill was corrected from a policy-invalid four-month term to the authoritative three-month fixture maximum. Halaalvest and Android were restored to persisted Light appearance after the dark matrix.
- Support reads use bounded cursor pages plus an exact detail route before reply. Creation/reply preserve member identity, receipt ownership, linked-record context, full conversation/resolution evidence, and the rule that support financial review is governance evidence rather than a money-posting command.
- Operation Profile modes block new receipt/support creation without hiding existing member-scoped history. Drafts persist locally, stale/offline state blocks commands, and closed support cases remain terminal.
- The full mobile contract, mobile typecheck, 94 mobile API tests, 39 receipt/support DB tests, and 2 dev-fixture regressions pass. Populated Pixel 3a API 34 Expo Go evidence covers Quick Fill, keyboard avoidance, confirmation, success, receipt-linked support, exact-detail reply, and corrected actor attribution under the Ticket 05 manifest.

## Expo Go and role-navigation hardening

- Metro resolves React Query and Query Core as app-owned singletons, imports Lucide icons through a bounded literal registry, and enables `inlineRequires` so Expo Router route discovery does not force Hermes to evaluate every transitive module before it is visited.
- The root navigator uses `Stack.Protected` for unauthenticated, member, admin, and signed-in shared routes. Changing or clearing the active role prunes inaccessible history instead of relying on a redirect from a now-forbidden nested navigator.
- Development mock sign-out skips server revocation and clears only the local scoped session. Real signed sessions still attempt device-session revocation and server sign-out before local cleanup.
- `check-mobile-runtime.mjs` guards both role-protected root navigation and deferred Metro module evaluation.
- Android API 34 Expo Go evidence for member Home to More, protected sign-out, admin More, and the admin subscription route is retained under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-15/diagnostics/`. The flow remained alive without Hermes or JavaScript errors after the hardening changes.
- Live subscription acceptance is still open: port 1442 reaches the local API, but a development mock token is intentionally not a signed server identity and the local database deployment is unavailable. The captured subscription error state is diagnostic evidence, not completion evidence.

## Admin overview and member lifecycle migration

- Ticket 07 now owns its database facade, mobile tRPC procedures, feature model/API adapter, and Overview, Members, and Member detail screens under `features/admin-member-lifecycle`. Generic client helpers were removed and architecture guards reject their return.
- The admin overview presents authoritative deployable-funds, collection-coverage, and portfolio-risk metrics; non-zero exceptions are stable-sorted by severity; compliance gaps, setup warnings, and recent audit activity remain distinct flat sections.
- Member directory pagination is bounded and its summaries cover the full filtered tenant registry. Member number/login conflicts return a correctable conflict, while lifecycle and KYC transition matrices reject illegal jumps at the database boundary.
- All Ticket 07 reads and commands require the shared `manage_members` permission, preventing the previous rank-based finance-officer admission. Signed tenant and actor scope, subscription activation limits, migration/live-write guards, auditing, and onboarding notifications remain server-owned.
- Create is isolated in a full-screen keyboard-safe sheet; status, KYC, and onboarding commands use compact auto-content sheets. All commands require review notes, explicit review, stale/offline blocking, safe development Quick Fill, post-dismiss success, and refreshed read state.
- Focused formatting and database/API tests pass with 134 cases and 323 expectations after adding critical-first queue-order coverage. Mobile typecheck and the full architecture/runtime/theme/UI/keyboard/fixture/smoke contract also pass. Expo Go on port 1443 loaded populated semantic-token Light screens without a Halaalvest JavaScript error, but the Pixel 3a AVD repeatedly lost or stalled Android framework services and input delivery. Diagnostic controls are retained under the Ticket 07 manifest; admin light/dark flow evidence remains open and is not claimed as acceptance.

## Admin finance and support work queue migration

- Ticket 08 now owns a unified database aggregate/command facade, mobile tRPC procedures, feature model/API adapter, and a flat read-focused screen under `features/admin-finance-support`. The legacy finance screen is only a compatibility re-export, and architecture/fixture/UI guards point to the feature-owned implementation.
- The aggregate returns receipt, financing, procurement, Foodstuff Purchase, project-financing, share, collections, and support exceptions with member context, age, amount, server policy evidence, blockers, current state, and role-specific allowed actions. The client performs no financial risk or authorization calculations.
- Staff queue visibility is separated from command authority. Finance, committee, operations, collections, support, and money-impact support capabilities are derived from named permissions, while members are denied the tenant work queue.
- Every command requires an expected state and deterministic tenant-scoped UUID receipt. Existing domain workflows preserve their audit/notification effects and now reject stale review state. Completed duplicate commands replay canonical results; uncertain completion-receipt failures retain the claim and fail closed.
- The queue uses semantic-token NativeWind flat rows and dividers, title-only header spacing, populated development fixtures, Quick Fill, explicit refresh, and stale/offline command blocking. Short actions use the compact auto-content sheet; evidence-heavy approvals use the full-screen keyboard-safe sheet. Both flow through explicit review, recover server errors back into the form, and show success only after dismissal before refreshing.
- DB/API/mobile typechecks, the complete mobile contract, and the original 185 focused tests pass. The 2026-08-30 recheck also passed 13 focused DB/API tests with 28 expectations, target-screen zero-warning lint, and clean Android error logs. Signed-tenant mismatch and member-role rejection remain covered.
- The mandatory visual workflow retained the actual native baseline, published five separately clickable GStack/Design HTML and image options, and selected `A — Decision queue first`. A real signed Tenant Admin Pixel 3a API 34 development-client run on Metro port 1443 passed populated Light/Dark queue, permitted actions, content-aware floating sheet, keyboard-safe input, confirmation, empty search, cached offline data, and disabled offline commands. No real finance command was confirmed, and Light appearance was restored after QA.
- Ticket 08 is complete. Generic transport failure is contract-tested but was not safely induced through the shared local API tunnel; iOS, real screen-reader, broader-device/large-text, and release-profile performance evidence remain cross-cutting Tickets 29, 31, and 32. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-08/review-2026-08-30/README.md`.

## Reports, access, notifications, updates, and More migration

- Ticket 09 now owns feature DB/API/mobile contracts for admin report summaries, workspace access, and the notification center. The prior generic exported query/client helpers were removed; Ticket 10 owns final contraction of compatibility screens and the monolithic modules.
- Report reads require `view_reports`, derive tenant from the signed active membership, return bounded summary cards/evidence instead of desktop tables, and expose only server-returned export destinations. Mobile hides the tab for roles without report permission and blocks export/share actions when cached report data is stale; the server remains authoritative for direct routes and exports.
- Workspace access requires `manage_roles`. Mobile role visibility and invitations exclude super-admin provisioning in the input schema, keep long data entry in a keyboard-safe full-screen sheet with development Quick Fill, and route the command through the shared online runtime guard. Invitation now requires the tenant cooperative prefix, returns the issued cooperative number and recovery setup URL, attempts an audited setup email, and preserves a truthful manual handoff when delivery cannot be confirmed.
- Notification reads filter audit deliveries to the signed user's normalized email and tenant. Unread receipts are actor scoped, tenant scoped, deterministic, duplicate-safe audit rows; optimistic read state survives a post-command refresh failure and the scoped cache is invalidated after success.
- Role switching first resolves the next signed server context, then clears all scoped drafts/read caches before persisting/rendering it. A failed server switch leaves the current context intact. More exposes real Notifications and Updates destinations plus explicit workspace-switch and sign-out loading/error/retry states.
- Updates use semantic-token flat sections, safe progress presentation, redacted errors, and explicit retry. Title-only headers, NativeWind `className`-first styling, restrained dividers, and Light/Dark tokens remain enforced.
- The prior AVD blocker is resolved. On 2026-08-31, the exact `ishaq.qa.test` QA source domain authorized Patsy Cummerata as Tenant Admin on the Pixel 3a API 34 development client. The authoritative Reports request loaded the ten-report server catalogue, and Workspace access loaded the signed four-user role directory with the `@ishaq.qa.test` identity visible.
- Authorized invitation Quick Fill, both focused inputs, fixed keyboard-safe submit action, missing-prefix denial, and a deterministic no-mutation delivery failure pass. The long form dismisses before the compact auto-content floating handoff presents the issued cooperative number and truthful manual-delivery guidance.
- Reports, Notifications, and More now distinguish offline from stale caches through an explicit cache reason and screen-specific command language. Denied states use the intended registered icons, and the mobile UI contract rejects literal icon names absent from the bounded Lucide registry instead of silently rendering a generic circle.
- Fourteen focused residual-state tests with 38 assertions, mobile TypeScript, and the complete executable mobile contract pass. Thirty-nine current Android Light screenshots plus links to the existing selected-design and Dark manifests are indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-09/README.md`.
- Reports, Notifications, Updates, and More route controllers now own signed scope, runtime connectivity, authoritative reads/commands, request invalidation, permission shaping, workspace/sign-out behavior, and native export/update effects. Their prop-driven screens retain only presentation, tabs, form drafts, and sheet visibility; report/access sheets close on permission loss. The executable architecture checker pins these ownership boundaries.
- Post-refactor Pixel 3a API 34 fixture regression covers all four selected Light surfaces, a real recipient read mutation, truthful development-client update-check failure/retry, accessibility actions, and clean strict native logs. Together with the signed `@ishaq.qa.test` evidence, 118 focused tests with 302 expectations, mobile/API TypeScript, scoped Biome, diff hygiene, and the complete contract, Ticket 09 is complete.
- Ticket 30 owns live QA-routed invitation delivery and persistence proof, Ticket 29 owns program-wide accessibility, and Ticket 31 owns installed-preview update lifecycle, iOS, and the broader device matrix. These cross-cutting gates do not keep Ticket 09 or Ticket 10 open.

## Mobile subscription management hardening

- Ticket 15 keeps the Expo Router entrypoint compositional and moves signed role, runtime connectivity, authoritative subscription reads/commands, provider links, request-race cancellation, and development-only visual state injection into the feature route controller. The presentational screen owns only typed rendering callbacks and ephemeral floating-sheet/review state.
- Permission loss invalidates in-flight reads, clears retained commercial snapshot/intent state, and closes detail/review sheets. The screen also defensively refuses to render a snapshot without current management authority.
- The selected five-direction `Operational clarity` exception system keeps offline and stale snapshots visibly read-only, distinguishes load failure from denial, retains one recovery action, and preserves the existing flat plan context. Production behavior remains server/runtime authoritative; `offline`, `stale`, `error`, and `denied` query states are development-only QA seams.
- Real Pixel 3a API 34 transport loss/reconnect, stale refresh, error retry, denial, Light/Dark, 130% text, reduced motion, shared floating-sheet Back behavior, and fatal-log inspection pass. QA also corrected the global offline banner's Android top-inset ownership and replaced clipped mixed-style large-text handling with a documented semantic native-text runtime boundary.
- The complete mobile contract, mobile TypeScript, scoped ESLint, diff hygiene, and focused policy/environment tests pass. An optimized local-release-QA APK also passes a second Android emulator form factor, 0.33% median modern frame-timeline jank after the marker build, and React-root fully drawn at a 639 ms cold-launch median. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/15-subscription-management/README.md`. Real TalkBack and production-hosted live-data screen-interactive TTI remain open; iOS is deferred under the Android-only direction, so Ticket 15 is not complete.
- Ticket 29 has begun an independent shared-accessibility slice without claiming its dependency-gated program matrix complete. ADR-033 adds root-owned modal focus isolation: routed content hides while a full-screen form or floating sheet owns focus, and a nested confirmation additionally hides the underlying full-screen form. Shared Button/Pressable roles and disabled state are normalized, reduced-motion disables the shared active-scale transition, and floating-sheet isolation survives native dismissal. A signed Pixel 3a API 34 release pass proves the Growth plan sheet exposes only its backdrop/action in Android's compressed accessibility tree, restores the route after Back, isolates Create member and nested dirty-close controls, and keeps the lowest input/action above the keyboard. The App Lock development-client pass additionally proves the full setup/error/configured/lock/unlock/relock/removal matrix, zero-byte production capture protection, Light/Dark parity, and final secure-state cleanup without keypad action remount warnings. Evidence is indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/pixel-3a-api-34/README.md` and `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/app-lock/README.md`. Real TalkBack and the broader large-text/focus/announcement/contrast/reduced-motion/device matrices remain open.

## Mobile Operation Profile and tenant settings

- Directive Ticket 17 started from the actual signed Tenant Admin More screen. No mobile Operation Profile destination existed, so the retained baseline records that real entry-point gap rather than inventing a prior screen.
- Five separately clickable GStack/Design HTML directions and preview images were generated from the authoritative six-service/four-mode database contract, the approved web route/view/focused-sheet implementation, and EwaTrade/GND mobile settings references. `E — Operational clarity` is selected because it keeps all current modes and consequences scannable in flat divided rows while matching the established Halaalvest information rhythm.
- The selected direction is now implemented as a thin Expo Router entry, a feature-owned route controller/model/API/components/screen boundary, and a permission-gated More destination. The screen renders the signed tenant's six configured services, four access modes, effective subscription restrictions, review/update evidence, and policy limits without placing an editor inside the browse surface.
- Compact one-service edit, review, success, and discard interactions use the shared floating bottom sheet. The edit sheet auto-sizes to content, exposes body scrolling under its cap, expands only for the keyboard, keeps icon-only Quick Fill in the footer, and requires a reason for restrictive changes. Programmatic dismissal and edit-to-review sequencing are guarded against stale native callbacks.
- The server requires `manage_operation_profile`, derives tenant and actor from the signed workspace, validates `expectedMode`, performs a compare-and-set service-only update, preserves unrelated settings, records before/after audit evidence, and rejects subscription-restricted writes. Paid entitlement never widens a stricter configured Operation Profile mode.
- A real signed Tenant Admin flow changed Support cases from member self-service to office-only, observed the refreshed authoritative result and success sheet, then restored member self-service. Two corresponding QA audit events remain; no tenant setting remains altered.
- Pixel 3a API 34 passed Light/Dark, compact sheet, overflow scrolling, keyboard avoidance, Quick Fill, review, success, stale/offline retained read-only data, subscription restriction, denied and load-error states, accessible disabled semantics, and clean React Native/Android fatal logs. Mobile TypeScript, the complete executable contract, package lint with existing warnings only, diff hygiene, and 41 focused tests with 196 expectations pass.
- Evidence and selected-design links are indexed at `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/17-operation-profile/README.md`. Ticket 17 is complete. With the later Ticket 08 evidence closeout, overall directive completion is 11 of 33 tickets (33.3%), with 22 remaining.

## Manual UI audit gates

- The complete route inventory now lives in `.scratch/mobile-architecture-hardening-and-feature-completion/ui-audit-ledger.md`. Mobile membership activation was removed from both the route and visual inventories by product decision; mobile authentication now exposes Sign in and Forgot/Reset password only.
- Gate 01 (Authentication) is implemented and ready for manual review, not yet approved. It uses the EwaTrade-aligned flat light design, corrected compact-Android header spacing, semantic NativeWind tokens, Cooperative number + password, cooperative identity handshake, neutral recovery responses, and individually verified keyboard behavior for the retained auth inputs. A dedicated five-direction GStack HTML pass selected `Guided continuation` for recovery: account identification, six-digit OTP, and new-password entry are separate states, the internal challenge reference is hidden, and native one-time-code autofill is retained.
- Expo Go on port 1443 authenticated and recovered the real QA account `KAD-COOP-QA2026072701`, resolved the correct tenant, and reached populated member Home as Zainab Musa. The 29 Aug follow-up completed a second real request, API-issued development OTP, password reset, canonical signed session, and keyboard-visible captures for cooperative number, email, OTP, new password, and confirmation. The floating Quick Fill guard now accepts either a QA-authorized profile or an unexpired device QA authorization; the running endpoint rejected the configured local tester credential, so signed-out authorization runtime proof remains open and the guard was not bypassed. Retained evidence and the full note are under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ui-audit/01-auth/`.
- Gate 02 (Bootstrap) has a primary native pass. The selected `Verification first` direction is one shared feature-owned, flat, semantic-token screen for runtime hydration and route initialization, with no tenant, member, role, or cached-profile content before verification. Fatal recovery fails closed with one accessible retry. Expo Go on port 1443 verified Light/Dark hydration and fatal states, the real retry path, accessibility hierarchy, clean logs, and final restoration of Zainab Musa's real `@ishaq.qa.test` Light session. Native QA also moved the cached/offline banner inside the runtime gate so it cannot precede verification. Mobile TypeScript, the complete contract, and 13 focused bootstrap/runtime tests with 31 expectations pass. Installed builds, iOS, large text, screen-reader, process-death, slow-storage, and startup-performance evidence remain open.
- The user replaced per-screen blocking with a continuous evidence workflow: each gate first publishes the current native state, then renders four or five constrained GStack/Design HTML directions as separate clickable HTML and image artifacts plus a comparison page. Before implementation, the selected option is named, justified, and republished as its own clickable image. After implementation, exact emulator/Expo interaction and state tests, the final native screenshot, the evidence manifest, and ticket/overall progress are published in the active Codex task before proceeding. Gate 22 now provides the recipient-visible staff cooperative-number/setup handoff; collision-aware legacy access-code rollout controls remain open.
- Gate 06 (Shares) passed its reopened visual correction. The revised `Decision first` request hierarchy keeps browsing ownership-led, then uses a flat Available/Per unit/Pending strip, explicit unit range and optional context, inline server-derived value, and lifecycle copy verified against the share reservation/approval transaction. A 29 Aug user screenshot correctly rejected a regressed compact-sheet presentation; the live Expo Go recheck restored the required full-screen form and then found and fixed an Android multiline-keyboard footer clip in the shared shell. The shell now uses a sticky keyboard action footer, and the executable keyboard contract rejects the former manual `keyboardDidShow` / `keyboardTop` pattern. Expo Go on port 1443 verified the real `@ishaq.qa.test` account, both input keyboards, icon-only Quick Fill separation, and compact dirty-close actions. A real successful submission remains open until an authorized verified QA member can create it; the client must not bypass KYC or fabricate financial success. Broader loading/empty/stale/offline/error, pagination, iOS, accessibility, device, and performance evidence remains open.
- Gate 06 Ticket 29 follow-up selected `A — Flat ownership ledger` from five JStack/GStack directions. The accepted Shares screen keeps posted capital, compulsory/optional ownership, published profit, and request history as separate flat ledgers with semantic-token Light/Dark parity. At 200%, Quick Fill now occupies the sticky footer row instead of obscuring Units, hides while Gboard or nested review owns interaction, and the shared full-screen form removes its footer beneath the modal review sheet. Review rows/actions reflow, capped body scrolling reaches context, Back returns to the intact form, and dirty close remains an app-rendered floating sheet. Android evidence covers Light/Dark 100%, Dark 200%, both input keyboards, authorized `@ishaq.qa.test` data, and clean logs; no financial request was submitted. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/shares/README.md`.
- Ticket 29 Member Financing follow-up rechecked the selected `A — Position ledger`. `Continue request` now belongs to Available products and aligns to the section edges. One shared `colors.overlay` backdrop is elevated above the full-screen form portal and reused by both floating-sheet wrappers, so Light/Dark review and dirty-close sheets remain visually distinct without native popup modals or screen-local colors. Clean Android replay exposed and fixed duplicate keyboard-gated review presentation state; open, Review again, reopen, backdrop dismiss, Android Back, dirty close, and safe form close now pass without submitting a financial request. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/financing/README.md`.
- Gate 07 (Member More) retains its route and interaction pass, but its Appearance-alignment acceptance is reopened. The selected `Service directory first` GStack/Pretext direction remains a compact member/KYC identity followed by flat divided Money, Cooperative services, App, and Appearance groups. A 1 Sep user review correctly rejected the supplied selector capture: outer boxes were centered while the rendered Lucide glyphs and Android label ink were not. The shared selector now uses a fixed icon box, compact 12/18 label metrics, explicit one-dp glyph optical correction, and full-width 200% rows; mobile TypeScript and the complete contract pass. Prior alignment screenshots are rejected until fresh exact `@ishaq.qa.test` Light/Dark 100%/200% Android captures pass visual review. The client will not bypass authorization or rewrite QA credential records to obtain them. Workspace switching, explicit stale/offline/read-error states, final-revision sign-out re-execution, real TalkBack, and the fresh alignment matrix remain open; iOS stays deferred under the Android-only direction.
- Gate 08 (Foodstuff Purchase) has a partial Ticket 29 native hardening pass. Five JStack/GStack directions selected `A — Obligation ledger`: current approved exposure leads, history/cycle context stays flat, and the long application form remains in the shared keyboard-safe full-screen stack. Accepted Android evidence covers Light/Dark 100%, Light/Dark 200% browse reflow, exact detail, all four input keyboards, QA-only Quick Fill, charges in review, semantic backdrops, and floating dirty-close without a real financial submission. The Midday split now keeps load/pagination/draft/detail/review/mutation behavior in the feature controller, display shaping in a tested presentation model, and focused overview/row/form components. Six focused tests, scoped ESLint, mobile TypeScript, and the full executable contract pass; the contract recognizes the controller/component ownership and pins the verified measured-footer plus 144dp keyboard clearance. All existing QA-state captures are rejected because a development linking warning overlays them; two early Dark 200% form frames are also rejected for clipping and Quick-Fill/label overlap. Clean exact `@ishaq.qa.test` state recapture, a clean Dark 200% non-keyboard form, TalkBack, and live duplicate/tenant-isolation evidence remain open. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/food-purchase/README.md`.
- Gate 09 (Guarantor Approvals) has a primary native pass. The selected `Pending first` direction separates the flat pending/resolved list from its compact response form and floating review/success surfaces. Expo Go on port 1443 verified rejection validation, Quick Fill clearance, the focused-note keyboard state, fixed review actions, review-body scrolling, delayed success sequencing, refreshed history, and Light/Dark parity with an isolated populated fixture. The final Light capture uses the real `@ishaq.qa.test` Zainab Musa session and authoritative empty response; no fixture approval is claimed as a real financial command. Loading, stale/offline, generic error, iOS, large-text, and real pending/duplicate/tenant-isolation evidence remain open.
- Gate 10 (Procurement) has a primary native pass. The selected `Obligation first` direction leads with open exposure and server-owned availability, keeps current obligation/history rows flat, and separates the five-field request into the full-screen keyboard-safe form stack. Expo Go on port 1443 verified every input keyboard, Quick Fill clearance, compact review, isolated-fixture success, refreshed history, exact detail, detail-body scrolling with fixed actions, and Light/Dark parity. Workflow details now remain under the shared 44% compact cap regardless of row count. The final Light capture restores the real `@ishaq.qa.test` Zainab Musa session and its authoritative active-obligation/blocked state. Loading, empty, stale/offline, generic error, disabled/read-only access modes, pagination, iOS, large-text, screen-reader, reduced-motion, and live duplicate/tenant-isolation evidence remain open.
- Gate 11 (Project Financing) has a primary native pass. The selected `Funding position first` direction leads with approved funding and request counts, keeps request history flat, and reserves repayable language for repayable facilities. The six-field request lives in the full-screen keyboard-safe stack with footer-positioned icon-only Quick Fill; review, success, and exact detail use compact floating sheets with body-only overflow and fixed actions. Expo Go on port 1443 verified all five text-input keyboards plus the structure controls, review while the keyboard was open, authoritative real-account KYC rejection, isolated-fixture success/refreshed history, detail scrolling, and Light/Dark parity. Android success presentation now waits for the nested review/form modal stack to settle, avoiding an immediate dismissal race. The final Light capture restores the real `@ishaq.qa.test` Zainab Musa session and authoritative empty state. Loading, stale/offline, generic error, disabled/office-only/read-only access modes, pagination, iOS, large-text, screen-reader, reduced-motion, and live duplicate/tenant-isolation evidence remain open.
- Gate 12 (Receipts) has a primary native pass. The selected `Latest proof first` direction leads with current proof and review status, keeps aggregate status and history flat, and separates receipt entry from browsing. The receipt form uses the shared full-screen keyboard-safe stack; every input passed with the fixed Review action reachable. Review, exact detail, receipt support, dirty-close, and success use floating sheets. The real `@ishaq.qa.test` account proved the authoritative receipt rejection and a successful receipt-linked support mutation; an isolated development fixture proved successful receipt handoff and refreshed history. The shared compact form now swaps to its confirmation content inside the same floating sheet, eliminating the nested portal race while preserving both `Keep editing` and `Close form`. Representative Light/Dark evidence and the complete contract are green; final Android state is Zainab Musa in Light mode. Loading, empty, stale/offline, generic error, pagination, iOS, accessibility/device-matrix, and live duplicate/tenant-isolation evidence remain open.
- Gate 13 (Statement) has a primary native pass. The selected `Position first` direction leads with real posted savings, keeps commitment, financing, and published dividends comparable, and then uses flat divided identity, recent-activity, profile, commitments, financing, shares, charges, documents, and ledger sections. Expo Go on port 1443 verified the real `@ishaq.qa.test` Zainab Musa session in Light and Dark. Synthetic empty rows no longer inflate section counts, machine UUID segments are shortened visually while complete references remain accessible, and the real one-row history correctly has no load-more action. A focused database test proves stable tenant/member-scoped Statement cursors when a second page exists. Thirteen focused tests, mobile TypeScript, and the complete mobile contract pass; final Android appearance is Light. Loading, stale/offline, generic error, multi-page native, iOS, large-text, screen-reader, reduced-motion, device-matrix, and long-history performance evidence remain open.
- Gate 14 (Support) has a primary native pass. The selected `Queue first` direction leads with compact case counts, one primary create action, and flat divided conversations with deduplicated message copy and abbreviated visible record references. Case creation remains a full-screen keyboard-safe form; review, compact reply, dirty-close, and success use floating sheets only. Expo Go on port 1443 verified both create inputs, a real support-case mutation, reply keyboard avoidance, both dirty-close actions, a real reply mutation/refreshed history, and Light/Dark parity with the real `@ishaq.qa.test` Zainab Musa session. The shared compact sheet now uses non-overlapping action-row Quick Fill, resets removed-footer measurement, and holds confirmation content through native dismissal. Mobile TypeScript, the complete contract, and 123 focused tests pass; final Android appearance is Light. Loading, empty, stale/offline, generic error, closed/escalated/resolved states, native pagination, iOS, accessibility/device matrix, and long-conversation performance remain open.
- Gate 15 (Notifications) has a primary native pass. The selected `Inbox first` direction leads with unread work, keeps aggregate transport health supporting, and presents safe recipient-scoped activity in flat divided virtualized rows with typed icons and semantic delivery text. Expo Go on port 1443 verified real single-item and read-all synchronization, mixed rows, default preference routing, zero-unread recovery, and Light/Dark parity for the real `@ishaq.qa.test` Zainab Musa session. The complete contract caught and corrected a temporary non-virtualized list regression. The root layout now composes notifications through a runtime adapter instead of importing feature orchestration directly, and notification retry exposes an explicit accessibility label. Mobile TypeScript, the complete contract, 98 API tests, and 16 focused notification tests pass; final Android appearance is Light. Loading, stale/offline, read error, queued/failed delivery, governed deep links/push, iOS, accessibility/device matrix, and long-history performance remain open.
- Gate 16 (App Updates) has a primary native pass. The selected `Status first` direction leads with the actual update outcome, renders one valid action, and moves build diagnostics into the shared compact floating sheet while the existing global floating sheet owns active download/apply/restart progress. Expo Go on port 1443 verified initial Light, a real safe failure/retry, build-detail scrolling, Light/Dark parity, and final Light restoration; it correctly cannot prove a successful EAS Update lifecycle. Native QA also found Android Back navigating below an open floating sheet. The shared primitive now consumes hardware Back, including while a non-dismissible active update is visible, and the mobile UI contract pins the invariant. Mobile TypeScript, the complete contract, and 5 focused state-model tests pass. Installed preview/release current/available/download/restart/rollback, offline/runtime-mismatch, iOS, accessibility/device matrix, and performance evidence remain open.
- Gate 17 (Admin Overview) is closed by Ticket 07. The selected `Exceptions first` direction preserves server severity/order across a bold title, compact identity/metric strip, flat priority and compliance rows, restrained setup warnings, and audited activity. A reopened Pixel 3a audit corrected priority dividers to the title column, increased list-row breathing room, and removed last-row dividers; before/after evidence is indexed under `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ui-audit/2026-08-31-admin-overview-divider-spacing/`. Real signed `manage_members` plus populated/loading/empty/error/denied/offline/stale Android states now pass; shared iOS/device/accessibility/release-performance breadth belongs to Tickets 29, 31, and 32.
- Gate 18 (Admin Finance) has a primary native pass. The selected `Decision queue first` GStack/Pretext direction preserves server ordering, keeps counts and filters compact, uses flat divided rows with one review entry point, and separates every staff command from the browsing surface. Compact actions use the shared auto-content floating sheet; long correction uses the full-screen keyboard-safe stack, which now hides underlying tabs. Expo Go on port 1443 verified Light/Dark rendering, compact and full-form keyboard avoidance, dirty-close recovery, review, isolated-fixture success, and refreshed counts on Pixel 3a API 34. Mobile TypeScript, the complete contract, 111 focused tests with 269 expectations, and focused diff checks pass. The fixture is presentation/transition evidence only; real signed-staff permissions and the remaining route/device state matrix stay open.
- Gate 19 (Admin Members) is closed by Ticket 07. The selected `Directory first` direction uses server-owned filters, flat virtualized rows, a separated full-screen create form, and compact KYC/onboarding sheets. Real signed state coverage, 100-member pagination, exact search, keyboard visibility, Collection Source/obligation/login context, and direct query measurements now pass.
- Gate 20 (Admin Member Detail) is closed by Ticket 07. The selected `Readiness first` direction leads with identity/lifecycle readiness, keeps financial/account evidence flat, and separates all lifecycle/KYC commands into stale- and permission-aware floating workflows. Real signed detail plus loading/error/denied/not-found/offline/stale states now pass, including fail-closed clearing of prior profile state.
- Gate 21 (Admin Reports) has a primary native pass. The selected `Reports first` direction uses a compact server-owned metric strip, one virtualized report catalogue, and flat audit/collection evidence. Internal export paths and repeated row controls were removed; each report opens a shared auto-content floating sheet whose commands fail closed for stale data. Expo Go on port 1443 verified Light/Dark hierarchy, complete evidence scrolling, compact-sheet sizing, Android Back dismissal, accessibility labels, and clean runtime logs on Pixel 3a API 34. The isolated admin fixture is presentation evidence only; the final state restores the real Zainab Musa `@ishaq.qa.test` session in Light mode. Mobile TypeScript, the complete executable contract, and 101 focused policy/API tests with 252 expectations pass. Real signed `view_reports`, live exports, explicit stale/empty/error states, iOS, accessibility/device matrix, and performance evidence remain open.
- Gate 22 (Admin More) has a primary native pass. The selected `Administration first` direction uses a compact identity, flat divided route directory, restrained appearance/workspace controls, and one detailed access section. Invite remains a separated full-screen keyboard-safe workflow with icon-only Quick Fill; the issued cooperative number is shown after dismissal in the shared auto-content floating sheet with truthful production/fixture delivery copy. Expo Go on port 1443 verified every input, Light/Dark, route actions, access jump, role/default selection, fixed CTA, Android Back, and clean logs on Pixel 3a API 34. The final state restores the real Zainab Musa `@ishaq.qa.test` session in Light mode. Mobile/API/direct-DB TypeScript, the complete executable contract, and 104 focused tests with 257 expectations pass. Real signed `manage_roles`, live email delivery, missing-prefix/offline/error/denied states, legacy rollout, iOS, accessibility/device matrix, and performance remain open.
- Gate 23 (Subscription) has a primary signed native pass. The selected five-option `Disclosure first` direction leads with authoritative plan/status/period/capacity and keeps subscription, setup, add-on, and provider costs explicit before action. All five plans and invoices remain flat divided rows; large plan details, review, and compact invoice detail use shared floating sheets with body-only overflow and fixed actions. The follow-up five-option `Operational clarity` pass covers stale, real offline/reconnect, load error/retry, and denied states without leaking commercial data or enabling commands; Pixel 3a also passes Light/Dark, 130% text, reduced motion, Android Back, and fatal-log checks. A real `@ishaq.qa.test` Tenant Admin session and local API on 1442 provide signed evidence. An optimized Android release APK additionally passes fresh subscription/invoice rendering with the compact sheet and a development-only local transport guard that preview/production reject. Profiling replaced an unnecessary keyboard-aware form scroller with native `ScrollView` and clipped subviews, then corrected a measurement defect that had parsed Android's unstable legacy counter. Post-marker controlled modern frame-timeline runs measure 0.33%, 0.64%, and 0.32% jank (median 0.33%), with p99 25/19/17 ms and zero missed-vsync frames. A one-shot React Native `CONTENT_APPEARED` listener now calls Android `reportFullyDrawn()`; three true cold launches emit React-root fully drawn at 639/632/647 ms (median 639 ms), explicitly distinct from the later live-data screen-interactive milestone. An isolated read-only API 34 tablet profile also passes the signed wide layout, compact and long floating sheets, body scroll with fixed action, Android Back, and fatal logs, closing the second Android emulator form-factor gate without claiming independent physical hardware. Domain/DB/API/mobile TypeScript, targeted lint, the 36-route/seven-shell contract, 29 foundation tests with 88 expectations, and 19 focused mobile policy/environment tests with 31 expectations pass. Live provider lifecycle, real TalkBack, and production-hosted live-data screen-interactive TTI remain open; iOS is deferred under the current Android-only direction.
- Gate 23 Ticket 30 revalidation selected `B — Brand band` from five separately reviewable Design HTML directions. The accepted native Plan & billing screen carries its semantic emerald surface through the Android status bar with light system icons, keeps the plan catalogue flat and divided, removes redundant detail copy, and uses content-sized floating detail/confirmation/result sheets with bounded scroll fallback. All five confirmation facts remain visible and the recorded result states that Standard is pending while Starter remains active. Headless Android run `t30-subscription-v13` passed `subscriptions.snapshot`, deterministic idempotent plan request, all four visual checkpoints, sign-out, temporary-credential revocation, and both mobile-session revocation readbacks. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/subscription-plan-request/README.md`.
- Ticket 30 offline Procurement write suppression now passes in
  `t30-offline-proc-native-v2`. The route-owned runtime boundary prevents
  financial command transport while offline; saved history and local detail
  remain readable. Five native-scale Design HTML options selected the compact
  trust rail, implemented with NativeWind semantic tokens and flat dividers.
  The accepted run records 0 transport calls, 0 optimistic requests, one
  unchanged persisted request, three directly reviewed Android frames, ordinary
  sign-out, both credentials revoked and 2/2 sessions revoked. Negative coverage
  is 5/7; Ticket 30 stays 4/8, positive coverage 4/18 and overall 25/33 (75.8%).
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/offline-procurement-write/final-v2/README.md`.
- Status bars are contextual, not globally emerald: More uses the semantic neutral
  background and theme-appropriate icons; only an emerald top-edge hero, such as
  Plan & billing, carries emerald behind the system icons. Workspace run
  `t30-role-switch-v5` shows neutral Admin and Member More and passes all three
  API/native journey steps, but is not accepted because its cleanup inspector
  read zero sessions from a capped device list. The replacement DB aggregate
  counts all run-window sessions without pagination. Accepted run
  `t30-role-switch-v6` passes the three journey steps, six native screenshots
  including More → Plan & billing → Back, sign-out/credential cleanup, and all
  four session revocations. That v6 run-window crash buffer is empty.
- The contextual status-bar component now renders only while its route is
  focused, so mounted inactive screens cannot retain background/icon ownership.
  More uses the neutral tone; Plan & billing and Admin Overview use the brand
  tone; the root retains a neutral theme fallback. No literal colors were added.
  All 32 v8 frames were reviewed across Light/Dark × 100%/200% and both role
  directions. Status-bar continuation/restoration passes; Admin More's large-text
  identity/access sections and shared bottom-tab gesture clearance remain visual
  failures. No full-screen accessibility pass is inferred from working controls.
- V8's original matrix cleanup failed; after a cold restart before interacting
  with the font-reset activity, ordinary UI recovery restores Light/100% and
  sign-out, with DB readback of all 12 sessions revoked. The original receipt
  remains failed. A linking warning and UiAutomator crash-buffer entry are
  documented rather than hidden; clean rerun and TalkBack remain open. Four
  Android proof commands now exit non-zero for incomplete receipts. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v8/README.md`.
  Overall completion stays 25/33, Ticket 30 stays 4/8, and positive execution
  remains 4/18.
- The follow-up Admin More design pass publishes five HTML/PNG options and selects
  `A — Identity ledger` before implementation. The account identity now owns a
  separate feature component, role text sits beneath the name/tenant, repetitive
  directory descriptions are removed, and access metrics/user/role rows follow
  ADR-034 vertical reflow. Both native tab shells share tested safe-area geometry
  that reserves a 56dp target region above the Android system area. Nine focused
  tests/18 assertions, mobile TypeScript, focused lint, and source contracts pass.
  Android matrix `t30-role-switch-v9` completed all three journey steps, captured
  and reviewed 32 frames across Light/Dark × 100%/200%, restored Light/100%,
  signed out, and confirmed all 12 sessions revoked. More identity reflow,
  directory spacing, tab/gesture clearance and contextual status-bar restoration
  pass in these frames. Lower access-list scrolling and TalkBack remain unverified;
  the Android system clock is visibly clipped at 200% and remains an open defect.
  This revalidates an existing journey, not a fifth positive journey or a complete
  accessibility pass. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v9/README.md`.
  Design/evidence entry: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-30-admin-more-adaptive/README.md`.
- V13 revalidation completes all three functional workspace journey steps in
  Light/Dark at 100%/200%, retaining 62 journey frames and 25 phase-trace frames.
  More → billing → More status-bar colors/contrast pass in reviewed frames in
  all four modes. Access-list clipping and redundant role copy still fail at
  200% in both themes. Signed-out Light/100% restoration and 12/12 revoked
  sessions pass; run-window Android fatal, React Native JS error and matching
  linking-warning counts are zero. V12's unexpected Guarantor route did not
  reproduce; no auth/navigation fix is claimed, and observation timing changed.
  The new QA-only allowlisted navigation evidence module and driver phase
  captures pass 19 tests/47 assertions, API TypeScript and scoped lint. No app
  UI, API, permission or schema behavior changed. Next: four/five published
  access-list HTML directions, selected native implementation and complete
  user/role traversal evidence, with the trace retained during that replay.
  Progress remains 25/33, Ticket 30 4/8 and positive journeys 4/18. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v13/README.md`.
- Extended v12 access audit retains 46 frames across Light/Dark 100% and Light
  200%. Fixed-height nested lists skip remaining users and clip role content
  during parent-only scrolling at 200%; inner-list traversal is not verified.
  Repeated default-role copy and singular-count grammar remain. A later restart
  opens Guarantor approvals instead of the Admin shell, so the matrix fails and
  Dark/200% access is absent. All 11 sessions are revoked; independent final
  screenshot/readback confirms signed-out Light/100%. Clock clipping also
  reproduces on the Android launcher. The harness now requires named checkpoints,
  captures failures, persists receipts, resets access scroll position and
  separates cleanup from minimum matrix coverage. Seventeen tests/41 assertions,
  API typecheck and lint pass. No app UI, API, permission or schema behavior
  changed in this audit. Next: diagnose restart routing and publish four/five
  options before implementing access scrolling/copy fixes. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/accessibility-v12/README.md`.
- Gate 24 (Not Found) has a primary native pass. The selected `Recovery first` direction replaces the nearly blank fallback with a feature-owned, role-aware, flat semantic-token recovery screen. Member/admin/guest action labels are policy tested; `/` remains the protected destination resolver; Back is conditional on actual router history; and the copy avoids leaking routes or falsely assigning a permission cause. Expo Go on port 1443 verified real-member Light/Dark, member Back/root recovery, isolated-admin label/root recovery, combined heading accessibility, clean runtime logs, and final restoration of Zainab Musa’s real `@ishaq.qa.test` Light session. Mobile TypeScript, the complete contract, and 5 focused tests with 7 expectations pass. Guest native, iOS, large-text, screen-reader, reduced-motion, device matrix, and performance remain open. With Bootstrap now passed, the primary ledger is 24/24 route gates (100%) and 25/25 concrete screens (100%); broader production-hardening matrices remain open and the program stays active.

## Ticket 29 Admin Overview rich-direction refinement

- Five separately rendered Design HTML/PNG directions replace the dry Admin Overview exploration. `A — Command Ledger` is selected: one semantic emerald position surface carries authoritative collections, membership, and financing values; warm accents identify decision work; the rest of the screen remains a flat divided ledger.
- A Midday-style feature presentation model selects the server collections metric, preserves the remaining server metrics and action-queue order, totals server-owned decision counts, and parses only an explicitly supplied bounded schedule percentage. The route remains thin and no permission, risk, capacity, or financial calculation moved to the client.
- The screen now composes a shared inverse-tone `ScreenHeader`, focused feature content, semantic NativeWind tokens, compact copy, cache/error/denied/empty handling, and large-text reflow. The redundant `Command ledger`, role, routine freshness, and warning-explanation copy were removed.
- Nine focused tests with 26 expectations, mobile TypeScript, zero-error focused lint, and the complete 36-route/seven-shell contract pass. No list-performance optimization was introduced because this is a bounded server dashboard and no bottleneck was measured.
- Fresh native populated Light/Dark/200%-text/state evidence remains open. Both connected Android emulators were inspected on Metro `1443`; neither held a valid admin session, and the development client's `ishaq.qa.test` QA access was explicitly `Not configured` without the assigned tester credential. The gate was not bypassed. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/admin-overview-command-ledger/README.md`.
# 24 September 2026 launch-contract maintenance

The NativeWind/UI and keyboard guards now scan the current `src/app`, `src/components` and `src/features` layout rather than the removed top-level `src/screens` directory. The keyboard guard explicitly checks the fixed contribution-search header against the shared virtual list's drag-to-dismiss and handled-tap behavior. Smoke coverage checks the store subscription purchase/restore/manage controller and the contribution screen/workspace split. The full mobile contract passes; native-device keyboard and purchase QA remain separate evidence gates.


## Release integration — 10 October 2026

The app-wide personal-access provider is owned by `src/runtime/mobile-app-access-provider.ts`; the root shell and access route consume that runtime. Subscription native-store helpers and legal read access expose explicit bounded public modules for cross-feature consumers. `/mobile-access` is inventoried with signed-account/tenant and server-verified purchase boundaries. The executable runtime contract enforces the existing role-plus-paid-access guards. All 39 route/7 shell checks pass; signed-device acceptance remains pending the release prerequisites. See [release task](../tasks/2026-10-10-release-and-android-testing.md).
