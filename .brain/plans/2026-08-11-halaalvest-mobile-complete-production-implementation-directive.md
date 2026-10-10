# Halaalvest Mobile Complete Production Implementation Directive

## Purpose

This is the canonical execution instruction for the Halaalvest mobile architecture, feature-completion, security, native QA, and pilot-readiness goal.

A future goal can point to this file and say:

> Execute the Halaalvest mobile production implementation directive in `.brain/plans/2026-08-11-halaalvest-mobile-complete-production-implementation-directive.md`. Continue from the current ticket frontier until every unblocked ticket is complete.

## Execution Role

### Current phase override — 2026-09-07

The user explicitly changed the execution order: finish screen implementation
before further testing. This override takes precedence over the testing-at-each-
slice requirements below and in referenced skills.

- Work through remaining mobile screens and their forms, sheets, and states.
- For each new screen/design decision, generate five distinct Design HTML
  directions, document the chosen option, implement it, and move to the next.
  Preserve previously selected and implemented designs; do not restart them
  simply because their broader QA matrix is open.
- Continue using the shared EwaTrade/NativeWind theme and Midday feature
  boundaries. Design previews are design artifacts, not app acceptance evidence.
- Do not run automated tests, emulator/device tests, QA account journeys, or
  native screenshot sweeps during this phase. Preserve all prior evidence.
- Leave remaining UI/app/native test checklist items unchecked. Record source
  implementation independently of tested/accepted/release-ready status.
- At implementation completion, stop this goal's work and explicitly hand over
  UI testing, gap fixes, and screen-by-screen screenshot evidence as the next
  phase. Do not mark the production goal complete or claim untested behavior.
- Track this phase in the linked
  [implementation ledger](../../.scratch/mobile-architecture-hardening-and-feature-completion/implementation-first.md).

Act as a senior mobile staff engineer responsible for implementing the approved Halaalvest mobile architecture, feature-completion, security, and release-hardening program. This is implementation mode: do not stop after analysis or planning. Work through the approved ticket frontier until every unblocked ticket is implemented, tested, documented, and honestly marked complete.

## Source Of Truth

Read before changing code:

- Repository `AGENTS.md` and all required `.brain/` documents.
- `.scratch/mobile-architecture-hardening-and-feature-completion/map.md`.
- `.scratch/mobile-architecture-hardening-and-feature-completion/migration-contract.md`.
- Every ticket under `.scratch/mobile-architecture-hardening-and-feature-completion/issues/`.
- Relevant feature, API, permission, database, architecture, observability, and ADR documents for each ticket.

Use these skills faithfully:

- `/Users/M1PRO/Documents/code/skills/agency-engineering/SKILL.md`, routed through its Mobile App Builder specialist.
- `/Users/M1PRO/Documents/code/skills/agent-skills-vercel/skills/react-native-skills/SKILL.md` and its relevant React Native/Expo rules.

Begin with the first ready ticket in dependency order. The initial frontier is ticket 01. After ticket 01, tickets 02 and 14 are the first parallel frontier. Use small, reviewable vertical slices that leave the repository green.

## Reference Hierarchy

Before inventing a solution, search for the analogous implementation in these references:

1. EwaTrade at `/Users/M1PRO/Documents/code/ewatrade`.
   - Primary reference for mobile UI, NativeWind, screens, primitives, forms, keyboard handling, app shell, subscriptions, app lock, attachments, offline presentation, native integrations, EAS variants, Sentry, and real-session QA.
2. GND at `/Users/M1PRO/Documents/code/_turbo/gnd`.
   - Secondary reference for the reusable Expo shell, shared packages, errors, notifications, URL handling, observability, and production conventions.
3. T3 Code mobile.
   - Reference for runtime/connection ownership, platform adapters, persistence, feature controllers, and presentational screens.
4. Midday at `/Users/M1PRO/Documents/code/_kitchen_sink/midday`.
   - Source of truth for thin entrypoints, explicit module ownership, typed API/query boundaries, loading/error/empty states, invalidation, and maintainable architecture.

Read each reference repository's local instructions before using it. Never edit a reference repository. Adapt proven patterns to Halaalvest rather than copying commerce terminology or business rules.

## Non-Negotiable Architecture

- Preserve Expo Router, React Native, React Query, tRPC, NativeWind, and the existing monorepo.
- Keep route files thin: validate parameters and compose a feature route controller.
- Mount auth, connection, lifecycle, query, persistence, and platform adapters once in the application runtime.
- Organize behavior by feature, with feature-owned controllers, screens, components, hooks, typed contracts, models, and tests.
- Presentational components receive typed props and callbacks; they do not construct transports, run retries, or calculate finance rules.
- Split monolithic mobile client, router, and database-query modules by domain using expand–migrate–contract.
- Remove compatibility layers only after all callers migrate and checks are green.
- Do not import T3 Code's Effect runtime.
- Do not import dashboard/web components or browser-only utilities into the native app.
- Keep native dependencies in the mobile package and maintain compatible dependency versions across the monorepo.
- Preserve all user-owned changes in the dirty worktree.

## UI And Design Contract

EwaTrade mobile UI is the primary visual and implementation reference.

- NativeWind `className` is the first/default styling mechanism.
- Inline `style` is permitted only for genuinely dynamic runtime values or native APIs that cannot accept NativeWind classes. Document justified exceptions.
- Do not introduce a parallel component library, screen-local theme system, uncontrolled style objects, or duplicated primitives.
- Centralize colors, spacing, typography, radii, status tones, safe-area geometry, and interaction states in semantic tokens and shared primitives.
- Produce a clean, compact, consistent cooperative-finance design using EwaTrade's app rhythm without copying its commerce language.
- Support light and dark modes on every screen, sheet, modal, list, status, native bar, loading state, empty state, and error state.
- Verify contrast, semantic status meaning, long cooperative/member names, large currency values, compact devices, tablets, and font scaling.
- Use stable callbacks, memoized list rows, hoisted expensive formatters, virtualized lists, stable keys, pagination, and no avoidable inline objects.
- Prefer `Pressable`, native navigation/modal behavior where appropriate, `expo-image` for images, and transform/opacity-only animations.
- Use shared loading, refreshing, stale, offline, empty, no-results, partial-data, error, confirmation, and success patterns.
- Do not communicate status by color alone.
- Preserve the product-facing label “Foodstuff Purchase.”

## Keyboard And Form Requirements

Keyboard-safe input behavior is mandatory.

- Use the existing keyboard controller/provider and EwaTrade's proven keyboard-aware form and bottom-sheet patterns.
- Inputs must remain visible above the keyboard on Android and iOS.
- Long forms must scroll to the focused field and validation error.
- Sticky submit/review actions must remain reachable without covering inputs.
- Bottom sheets must handle keyboard expansion, safe areas, drag/close behavior, dirty-form confirmation, and hardware back behavior.
- Configure return-key flow, focus progression, input types, autofill, secure-entry behavior, and accessible validation announcements.
- Test keyboard behavior on sign-in, activation/recovery, receipts, financing, support, member creation, admin invites, reviews, settings, subscription, and attachment flows.
- Capture screenshots with keyboards visible for representative compact Android and iOS forms.

## Finance And Domain Safety

Treat Halaalvest as an authoritative cooperative financial system.

- Preserve the interest-free model. Never introduce interest, APR, compounding, penalty interest, or implied guaranteed returns.
- Keep commitments, special savings, charges, financing principal, repayments, procurement, Foodstuff Purchase, project financing, shares, profit allocations, and SaaS subscription billing distinct.
- The device never owns eligibility, balances, allocation, capacity, posting, settlement, approval, disbursement, repayment, or profit calculations.
- Money-affecting commands must be online-only, tenant-scoped, role-authorized, expected-state guarded, transactional, idempotent, audited, and confirmed by canonical server responses.
- Offline behavior may retain scoped read caches and drafts but must never present a financial command as queued, submitted, approved, posted, or settled.
- Posted history uses append-only ledger thinking, reversals, waivers, and explicit adjustments rather than destructive rewriting.
- Existing records remain readable when Operation Profile modes disable or restrict new actions.

## Roles, Permissions, And Entitlements

Implement deny-by-default, well-organized authorization.

- Server-side guards are authoritative; UI guards only reflect returned capabilities.
- Preserve tenant isolation on every query, mutation, report, file, notification, deep link, and cache key.
- Model and test boundaries for `super_admin`, `tenant_admin`, `finance_officer`, `operations_officer`, and `member`.
- Members may access only their authenticated member identity; never accept a client-selected member or guarantor identity.
- Compose authorization from authenticated device session, tenant membership and role, action permission, Operation Profile mode, subscription entitlement, current record state, and online/stale state.
- A paid entitlement must never bypass a stricter cooperative Operation Profile or financial permission.
- Navigation must not briefly render unauthorized screens during hydration, role changes, revocation, or tenant switching.
- Test privilege escalation, cross-tenant access, stale roles, revoked sessions, suspended tenants/members, wrong deep-link context, and hidden-versus-read-only behavior.

## Subscription Implementation

- Keep tenant SaaS subscriptions separate from member recurring commitments and cooperative ledgers.
- Implement Free Beta, Starter, Standard, Growth, and Enterprise plans, active-member capacity, add-ons, trials, grace, past-due, cancellation, invoices, checkout intents, usage, and feature entitlements.
- Enforce authoritative entitlements in server account/membership and feature paths, not only in UI.
- Build EwaTrade-aligned NativeWind plan cards, usage states, subscription sheets, invoice history, upgrade/contact flow, and dark mode.
- Implement provider-neutral foundations first.
- Do not fake live billing. If provider selection or credentials remain external blockers, finish all provider-neutral work, document the blocker, keep the ticket open, and continue other unblocked tickets.

## Native Capabilities

Implement and test:

- Secure session storage, expiry, rotation, device inventory, revocation, and sign-out-all-devices.
- PIN/biometric app lock, background relock, privacy concealment, and fail-closed hydration.
- Camera/photo/document selection and private authenticated evidence upload for KYC, receipts, and support.
- Push-token registration, rotation, removal, preferences, foreground/background delivery, and safe notification payloads.
- Typed deep links that revalidate session, tenant, role, entitlement, record state, and destination authorization.
- Authenticated report generation, download, preview, and native share without bearer tokens in URLs.
- Expo updates with safe runtime-version behavior, foreground checks, failure recovery, preview channels, and rollback evidence.

If billing, storage, push, or store credentials are unavailable, complete all safe local/provider-neutral implementation and continue the remaining frontier without fabricating success.

## Sentry And Observability

Use the existing Halaalvest observability policy and relevant ADRs.

- Configure mobile-specific Sentry environment, release, project, source maps, and controlled production enablement.
- Preserve strict separation between mobile, API, dashboard, jobs, and marketing observability.
- Sanitize events in a final `beforeSend`-style boundary.
- Never send tokens, passwords, OTPs, email bodies, KYC data, document URLs, member contact data, financial values, form contents, raw API payloads, database details, or sensitive deep-link parameters.
- Use bounded safe tags such as runtime, release, route family, role class, operation category, error class, and anonymous reference.
- Add safe root/route error boundaries and recovery guidance without exposing stack traces.
- Verify one controlled synthetic event in the correct environment when credentials permit, and retain evidence of release/source-map resolution.
- Treat production credentials, retention, alerts, ownership, and source-map access as explicit release gates.

## Testing Protocol

For every ticket:

1. Mark it in progress only when work starts.
2. Implement the complete vertical slice across data, API, mobile UI, permissions, error states, tests, and Brain documentation.
3. Run the narrowest focused tests while developing.
4. Before marking done, run all relevant unit/integration tests, database query tests, API router/permission tests, mobile typecheck and lint, formatting/diff checks, native-import guard, NativeWind guard, route smoke tests, and relevant monorepo checks.
5. If Prisma changes and the repository exposes both commands, run `bun db:migrate` and `bun db:push`. Do not manually create migrations.
6. Update ticket acceptance criteria and status only after behavior is proven.
7. Update relevant Brain architecture, feature, API, permission, database, task, decision, and progress documents.

Do not weaken tests to make them pass. Fix regressions caused by the work. Record pre-existing failures separately with evidence.

## Expo And Emulator QA

Testing with Expo and a real emulator/simulator is required.

- Inspect existing emulator/AVD and Expo development-client configuration before changing native setup.
- Run the app through the repository's supported Expo scripts and environment loader.
- Test at least one Android emulator end-to-end. Test iOS Simulator as well when available.
- Verify cold/warm launch, sign-in, activation/recovery, role switching, member/admin workspaces, forms, keyboard, dark mode, offline/reconnect, app background/resume, updates, app lock, attachments, notifications, deep links, reports, and sign-out.
- Exercise production API contracts with real QA sessions; do not use mock finance state as release evidence.
- Inspect Expo and native logs for red screens, unhandled promises, navigation warnings, NativeWind issues, memory problems, and repeated requests.
- Test compact and standard sizes, long labels, large fonts, light/dark mode, slow network, lost connectivity, and stale sessions.
- Keep the Expo process alive during interactive QA and provide progress updates during long emulator work.

## Screenshot Evidence

### Mandatory screen-by-screen design workflow

Do not redesign or implement a screen blindly. Before changing each screen:

1. Capture and publish the current native screen as the baseline.
2. Generate four or five genuinely distinct GStack/Design HTML directions that remain inside the shared Halaalvest design system.
3. Before implementation, publish the native baseline, every option as its own clickable HTML artifact, every option as its own separately clickable image, and a comparison page directly in the active Codex task. A directory link or comparison board alone is not sufficient evidence.
4. Name the selected direction before implementation, publish its image again as a separate selected-option artifact, and record why it is the best fit for the task, existing screens, and shared design system. The agent may select it without blocking, but the choice and alternatives must remain reviewable.
5. Implement the selected direction using the existing semantic tokens, shared primitives, NativeWind `className`-first styling, and the EwaTrade reference hierarchy.
6. Test every changed interaction and state clearly, including each input, keyboard avoidance, sheets, navigation, loading/error/empty/blocked states, accessibility, Light/Dark parity, and applicable native behavior. Record the exact command, device/build/runtime, scenario, and result instead of using a generic "tested" claim.
7. After implementation, publish the final native screenshot separately from the concepts in the active Codex task. Preserve a manifest linking the baseline, every option, the repeated selected-option image, selection rationale, implementation evidence, exact test results, and final output.
8. Report the ticket and overall directive progress percentage with each completed screen handoff, including what remains unverified.

Concept images are design evidence, not implementation evidence. QA screenshot overrides are visual-review evidence only and must never be reported as production privacy/security proof.

Retain screenshots under:

`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/<ticket>/<platform>/<theme>/<device-size>/`

Keep a manifest with ticket, scenario, platform/device/OS, build profile/version, safe fixture identifier, role, theme, font-size setting, route/state, timestamp, and pass/fail note.

Capture representative evidence for:

- Auth and recovery.
- Member home and each service family.
- Admin overview, members, finance queues, reports, settings, and subscription.
- Light and dark mode.
- Loading, empty, stale/offline, error, blocked, confirmation, and success states.
- Keyboard-visible long forms and bottom sheets.
- App lock, permissions, attachment progress, notification/deep-link destinations.
- Compact/standard Android and iOS plus tablet-width sanity where available.

Screenshots must not expose real member, KYC, credential, or financial data.

## Performance And Accessibility

Apply the Vercel React Native rules proportionately:

- Virtualize unbounded lists and paginate server-side.
- Memoize list items and stabilize callbacks.
- Avoid expensive work and new objects inside row renders.
- Minimize state subscriptions and derive state from authoritative sources.
- Avoid scroll-position React state.
- Wrap rendered strings in text components and avoid unsafe falsy conditional rendering.
- Use native stack/tab behavior.
- Animate only GPU-friendly properties.
- Test screen-reader names, roles, focus order, state announcements, large text, contrast, reduced motion, touch targets, and destructive confirmations.
- Measure cold/warm startup, screen readiness, scrolling, search, pagination, memory, render churn, and network retries with representative data.

## Execution And Reporting

- Make reasonable in-scope assumptions and continue working; ask only when a missing external decision materially changes financial, security, billing, storage, or release behavior.
- When externally blocked, complete all independent work, record the exact blocker and evidence, and continue the next available frontier.
- Do not mark a ticket complete because time or context is running low.
- Do not claim emulator, native, Sentry, billing, upload, push, or release validation unless it actually ran successfully.
- Maintain concise progress updates.
- At completion, report tickets completed/remaining, architecture and behavior delivered, exact validation commands/results, devices/flows tested, screenshot manifest, Sentry verification, performance/accessibility findings, external blockers/residual risks, Brain files updated, and next executable frontier.

## Current execution status — 2026-09-01

- Tickets complete: 25 of 33 (75.8%).
- Ticket 30 Admin charge application: the approved `A — Ledger Calendar` and
  `D — Emerald confirmation cap` are implemented in the native Charges flow.
  Headless Android `t30-admin-charge-final-v6` passes 3/3 production steps and
  16 directly reviewed frames, including fixed-height day/month/year swipes,
  backdrop and Gboard clearance. API and Android each prove one application,
  one ledger transaction and two balanced entries. The self-auditing receipt
  records `runtimeWarnings: []`, baseline restoration, sign-out, both credential
  revocations and 2/2 session revocations. Positive journeys advance to 5/18;
  Ticket 30 remains 5/8 and overall remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/admin-charge-application/final-v6/README.md`.
- Ticket 30 duplicate-charge exact retry: five Design HTML/PNG directions
  selected `A — Canonical receipt`. A real Starter-healthy Finance Officer
  charge commits before the QA client loses the response; the exact retained
  command retries to the same canonical result with `replayed: true`. API and
  Android fingerprints prove one application, one ledger transaction and two
  entries. Ten directly reviewed Android frames include four keyboard-clear
  inputs, interruption/retry, canonical receipt, single application and ledger
  detail. Android signs out, both credentials and 2/2 sessions are revoked, and
  fixture cleanup restores baseline. Negative journeys are complete at 7/7,
  closing acceptance item 6. Ticket 30 advances to 5/8; positive journeys remain
  4/18 and overall remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/duplicate-charge-command/final-v2/README.md`.
- Ticket 30 cross-tenant Project-financing journey: five Design HTML/PNG
  directions selected `A — Quiet trust rail`. The production Finance Officer
  detail read returns exact `NOT_FOUND` for a foreign record while preserving a
  populated same-tenant queue and allowing its own record to open in the shared
  floating sheet with a semantic backdrop. Headless Android run
  `t30-cross-tenant-pf-v1` proves both API/native steps, three directly reviewed
  frames, ordinary sign-out, both temporary credential revocations and 2/2
  session revocations. Negative execution advances to 6/7; only
  `duplicate-charge-command` remains. Ticket 30 stays 4/8, positive execution
  stays 4/18 and overall remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/cross-tenant-project-financing-detail/final-v1/README.md`.
- Ticket 30 member-capacity journey: five Design HTML/PNG directions selected
  `A — Capacity rail`. Native Members now consumes the same server-owned
  subscription snapshot as command enforcement, removes member creation at
  capacity, and exposes one Plan & billing recovery. Headless Android run
  `t30-member-capacity-native-v3` proves exact `PERMISSION_DENIED`, unchanged
  directory state, both native checkpoints, ordinary sign-out, both temporary
  credential revocations and 2/2 session revocations. Negative execution
  advances to 4/7; Ticket 30 remains 4/8 because all seven categories are
  required. Positive execution remains 4/18 and overall remains 25/33 (75.8%).
  Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-capacity-limit/final-v3/README.md`.
- Latest completion: Ticket 28 — durable governed push registration and preferences, native permission handling, safe lifecycle listeners, exact-record deep links, and final Light/Dark evidence.
- Active frontier: complete the remaining executable Ticket 15 Android accessibility and production-hosted live-data screen-interactive TTI acceptance. A signed optimized local-release-QA APK passes fresh subscription/invoice behavior and production transport safeguards. Post-marker controlled modern frame-timeline runs measure 0.33%, 0.64%, and 0.32% jank (median 0.33%) with zero missed-vsync frames. One-shot Android `CONTENT_APPEARED` to `reportFullyDrawn()` instrumentation emits React-root fully drawn at 639/632/647 ms (median 639 ms) on true cold launches; this is intentionally kept distinct from the later live-data screen-interactive milestone. A second Android emulator form factor passes the signed wide layout and compact/long floating-sheet interactions, without claiming independent physical-tablet hardware. iOS is deferred under the current Android-only direction. Ticket 29 now has eleven independent Android slices: a signed release pass proves shared topmost floating/full-screen focus isolation and keyboard avoidance; a development-client 200% font pass proves semantic reflow for Overview, Members, Create member, Plan & billing, and Growth; an auth/recovery pass proves compact normal density, Light/Dark 100%/200%, actual Gboard focus progression, stable password visibility geometry, reduced-motion identity handling, floating QA-sheet isolation, an authorized `ishaq.qa.test` member session, and auth-gate restoration after sign-out; an App Lock pass keeps its approved 100% design compact while reflowing status/device metadata at 200%, retaining the custom keypad action, rolling back partial token/profile persistence, and enforcing explicit semantics for direct native action Pressables; a Device access pass selects a compact flat ledger, proves token-correct Light/Dark 100%, semantic 200% reflow/action reachability, and content-sized floating confirmation with an accessibility-aware cap and fixed-footer scroll fallback; a notification pass selects a compact inbox ledger, proves populated Light/Dark state, governed destinations/read controls/preferences, token-correct switches, and complete 200% inbox/settings reachability; a Statement pass selects the compact position ledger, removes internal bookkeeping copy, restores semantic Dark contrast, eliminates nested vertical-scroll blank space, and proves Light/Dark 100%/200% reflow plus export/native-share/Back behavior; a Shares pass selects the flat ownership ledger, proves Light/Dark 100% plus Dark 200% reachability, both Gboard inputs, footer-positioned authorized Quick Fill, topmost nested review, body-only sheet scrolling, fixed actions, and Back ordering without submitting a financial request; a Plans / Commitments pass selects the flat savings ledger, removes duplicate records/bookkeeping copy, prevents misleading zero active state, and proves empty/populated Light 100%, populated Dark 100%, Light/Dark 200%, lower-content reachability, and pagination; a member Home pass selects the semantic stack, retains compact normal density, reflows readiness/position/action content, uses full-width service rows at 200%, and proves populated Light/Dark 100%/200%, complete reachability, Updates navigation, and Android Back; and a Member Financing pass retains `A — Position ledger`, aligns Continue request with Available products, adds a semantic Light/Dark backdrop above the full-screen form portal, and proves review close/reopen, backdrop dismissal, Back ordering, and dirty close without submitting a financial request. Real TalkBack and the program-wide accessibility matrix remain open. Tickets 30-33 remain dependency-gated behind Tickets 15, 16, 18, and 29 plus their documented QA/build/hardening chain. Ticket 16 remains dependent on billing-provider selection/credentials, and Ticket 18 remains dependent on the private object-storage/retention decision.
- Ticket 29 Member More update: the independent Android slice count is now twelve. `A — Compact directory` removes routine freshness/repeated descriptions/card-heavy workspace treatment, preserves only useful live metadata, and passes real-session Light/Dark 100%, 200% semantic reflow, shared Appearance icon/label optical alignment with semantic contrast after in-place theme changes, eleven destination actions/Back, and final Light/font-scale-`1.0` restoration. This supersedes the earlier eleven-slice count in the active-frontier narrative without changing ticket completion.
- Ticket 29 sign-in refinement: the richer `A — Emerald Canopy`, `E — Cooperative Passport`, and `B — Woven Gateway` implementations all failed successive visual-quality reviews as too dry or too poster-like. A fourth five-direction Design HTML reset selected and now implements `B — Emerald Vault`: a deep-emerald cooperative gateway, nested arch motif, saffron portal, real brand mark, concise trust cue, and flat token-driven form surface. A feature-owned form, reusable motif, and pure presentation model preserve the thin auth screen and verified-tenant identity replacement. Replacement Pixel evidence passes Light/Dark 100%/200%, both Gboard inputs at normal and 200%, first-gate recovery, enlarged centered masking, normal reveal text, identical hidden/visible bounds, and final Light/font-scale-`1.0` restoration. The complete mobile contract, NativeWind theme guard, TypeScript, focused lint/formatting, and presentation tests pass. A fresh live cooperative handshake and real TalkBack remain open. This refinement does not increase the twelve-slice count or ticket completion.
- Ticket 29 recovery refinement: five separately clickable Design HTML/PNG directions selected `A — Vault Passage`, carrying Emerald Vault's deep-emerald gateway, restrained saffron passage, real mark, and flat semantic-token surface through account details, OTP, and new-password entry. A Midday-style controller/presentation/step-component split replaces the monolithic form. Pixel 3a API 34 evidence on Metro `1443` passes Light/Dark, 200% text, every recovery input keyboard, code/password header reflow, centered enlarged masking, stable reveal bounds, mismatch feedback, clean post-clear fatal/runtime logs, and final Light/night-`no`/font-scale-`1.0` restoration. TypeScript, five focused tests, pinned lint, and the full contract pass. QA Quick Fill remains authorization-gated; no `ishaq.qa.test` credential boundary was bypassed. This refines the existing auth slice without increasing the twelve-slice count or ticket completion.
- Ticket 29 Guarantor approvals update: five Pretext/GStack directions retain `A — Decision queue`. The source now matches the selected hierarchy by keeping full financial context only for pending decisions and reducing resolved work to compact virtualized history with large-text wrapping. Four focused tests, TypeScript, formatting, zero-error lint, and the full contract pass. Fresh Android acceptance remains pending because the configured `ishaq.qa.test` tester credential was entered through the visible local authorization flow and the server rejected it with `Sign in again to continue`; the client discarded it and no bypass was used. This is incomplete and does not increase the twelve-slice count or ticket completion.
- Ticket 29 Procurement update: the prior dry hierarchy is replaced in source by selected direction `A — Emerald ledger`, using one semantic emerald balance/progress surface, a flat active-purchase section, one teal request action, and compact non-duplicated history. A tested feature presentation model owns accurate paid/outstanding progress and next-due shaping; large text reflows rather than shrinking the balance, routine live freshness is hidden, and exact detail remains in the shared detail sheet. Three focused tests, mobile TypeScript, zero-error lint, the complete contract, and browser-console-clean five-option Design HTML previews pass. Fresh Android Procurement acceptance remains pending at the auth gate because the unchanged `ishaq.qa.test` tester credential remains server-rejected; no mock session or bypass was used. This does not increase the twelve-slice count or ticket completion.
- Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-28/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/pixel-3a-api-34/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/large-text-200/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/auth-large-text/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-rich/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-passport/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-woven-gateway/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/guarantor-approvals/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/app-lock/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/device-access/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/notifications/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/statement/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/shares/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/commitments/README.md`, `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/member-home/README.md`, and `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/member-more/README.md`; prior ticket evidence remains in its respective screenshot manifests.

- Latest sign-in design/evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-premium-directions/README.md` and `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-living-cooperative/README.md`.
- Ticket 29 final sign-in refinement: the owner rejected Cooperative Reveal as still too dry. Five premium Design HTML directions selected and now implement `E — Living Cooperative`: a deep-emerald identity field, indigo atmosphere, saffron/coral/teal connected-member network, stable brand-to-tenant handoff, and one flat token-driven form surface. Android 14/API 34 development-client evidence passes Light/Dark 100%, Light 200%, both Gboard inputs at normal and 200%, first-gate recovery, centered masking, stable hidden/visible geometry, final Light/font-scale `1.0` restoration, full mobile contracts, and clean fatal/runtime logs. A fresh live tenant handshake and real TalkBack remain open because the current tester credential is server-rejected and no authorization boundary was bypassed. This supersedes the previous latest-sign-in pointer without changing the twelve-slice count or ticket completion.
- Latest sign-in design/evidence as of 2026-09-04: `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-sign-in-vibrant-directions/README.md` and `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/29-accessibility-mobile-ergonomics/android/sign-in-prosperity-garden/README.md`.
- Ticket 29 Prosperity Garden refinement: five new vibrant Design HTML directions selected and now implement `E — Prosperity Garden`. The native gate uses the selected deep-emerald identity field, semantic botanical/member network, one rounded flat form surface, and a shield-led coral action. Missing data keeps the action disabled on a readable semantic muted surface rather than fading the complete coral control; complete data enables the strong action. Headless Pixel 3a API 34 revalidates Light/Dark 100%/200%, every sign-in input keyboard, masking stability, recovery, QA floating-sheet isolation, and clean final disabled/enabled frames. A source smoke guard pins the named validation predicate and muted token treatment. Focused tests, TypeScript, lint/formatting, theme drift checks, and the full mobile contract pass. The server still rejects the assigned `ishaq.qa.test` credential, so the fresh tenant handoff and real TalkBack remain open. This does not change the twelve-slice count or overall 25/33 (75.8%) completion.
- Ticket 29 Admin Finance refinement: five rich Design HTML directions selected and now implement `A — Treasury Signal`. A thin screen composes a feature controller, virtualized queue, content-sized operations/detail floating sheets, and compact/full action forms with the fixed-height calendar/review/success stack. Server authority, role gates, expected state, idempotency, stale/offline rejection, drafts, and notification destinations remain explicit; no form shares the browse surface and no feature-local literal colors exist. Seven focused tests, TypeScript, focused lint, diff hygiene, and the complete contract pass. Headless Android native acceptance remains open at the exact `ishaq.qa.test` QA gate because submitting the configured tester secret and selecting Tenant Admin requires explicit approval; no bypass or fabricated live evidence is claimed. Ticket 29, the twelve accepted-slice count, and overall 25/33 (75.8%) completion remain unchanged.
- Ticket 30 foundation: a versioned domain scenario plan and DB-owned
  collision-preview/idempotent provisioner now create nine exact
  `ishaq.qa.test` QA tenant shells across every subscription plan, four roles,
  four Operation Profiles, and the nine required state labels. Local preview,
  provision, rerun, and safety readback prove stable counts, deterministic tenant
  policy, and zero credentials, sessions, custom domains, provider linkage, live
  classification, or domain mismatch. Together with the rollback-verified
  cleanup contract, this completes 4/8 Ticket 30 acceptance items; real-session
  positive/negative journeys, routed invitation proof, and visual checkpoints
  remain open.
  A fact-based inspector now proves 9/9 persisted states. Pending review is one
  audited payment receipt created through the existing Operation Profile-guarded
  member workflow and reused without duplicate receipt/audit records. Published
  profit now contains one completed business result, reconciled published
  share-profit/member-dividend evidence, and one audited preparation, approval,
  and publication transition across reruns. Overdue is a real
  contribution-to-collections financing lifecycle and stale is a rejected
  Operation Profile compare-and-set tied to the unchanged setting. Two complete
  reruns retain the same fixture graph with zero failures; metadata labels
  receive no credit.
  The existing QA accelerator remains the only session-entry path and now binds
  each authorization to its token digest, client signal, client kind, contract
  version, server environment, active credential, expiry, revocation, exact QA
  Domain, and opaque eligible-profile selection. Exact-domain readback now
  returns 37 eligible profiles across 36 users: 9 Tenant Admin, 9 Finance
  Officer, 9 Operations Officer, and 10 Member profiles. The Starter/healthy
  Tenant Admin also owns one non-default Member membership and linked profile,
  providing a truthful multi-role fixture while tenant-local default selection
  remains deterministic.
  A versioned positive-journey registry now defines 18 journeys across all 16
  required product areas and pins each named tRPC path against the assembled
  production router. A redaction-safe sequential executor is also implemented;
  private runtime material stays in an injected adapter while receipts contain
  only bounded outcomes. This is complete definition/runner/route coverage only; fresh
  authorized execution is now 4/18: `member-core-reads` passed Home, Plans,
  Shares, and Statement production reads plus four native Android checkpoints
  in run `t30-core-v20`; `share-profit-governance-read` passed its workspace and
  detail production reads plus native summary/detail checkpoints in run
  `t30-share-profit-v10`; `subscription-plan-request` passed the current-plan
  snapshot, deterministic idempotent Standard intent, and four native Plan &
  billing checkpoints in accepted post-design run `t30-subscription-v13`.
  Five separately reviewable Design HTML directions selected `B — Brand band`;
  the native evidence now includes a semantic emerald Android status bar,
  content-sized floating sheets, all five confirmation facts, and truthful
  pending-review copy. `workspace-role-switch` passed its three API/native steps
  in `t30-role-switch-v6`, six screenshots including neutral More → emerald
  billing → neutral More, and readback of all four created sessions as revoked.
  V8 now captures/reviews Light/Dark × 100%/200% and both native role directions.
  Focus-aware status bars pass, but Admin More large-text reflow, bottom-tab
  gesture clearance, and TalkBack remain open. Its failed cleanup receipt is
  retained; cold-restart recovery restores Light/100%, signs out, and proves
  12/12 sessions revoked. Follow-up v9 completes the functional matrix with 32
  reviewed frames and successful Light/100% restoration, sign-out and 12/12
  revocations. Selected `A — Identity ledger` resolves the captured More identity
  and shared tab-clearance defects; lower access-list scrolling, TalkBack and
  the clipped Android clock at 200% remain open. Extended v12 retains 46 captures
  but fails: nested access lists skip/clip rows during parent-only 200% scrolling,
  and a later restart opens Guarantor approvals instead of the Admin shell.
  All 11 sessions revoked; independent final evidence confirms signed-out
  Light/100%. Named checkpoints, independent cleanup/coverage facts and saved
  failure evidence are implemented. Follow-up v13 completes all three functional
  steps and all four display combinations with 62 journey frames, 25 safe
  navigation-trace frames, successful Light/100% sign-out restoration and 12/12
  revoked sessions. Reviewed status-bar transitions pass; 200% access-list
  clipping and copy remain visual failures. The unexpected v12 destination did
  not reproduce and is not claimed fixed. Nineteen focused tests, API TypeScript
  and lint pass; scoped runtime fatal/JS-error/linking-warning counts are zero.
  Five access-list HTML/PNG designs now select `A — Continuous ledger`; native
  source replaces the nested lists with a feature-owned root LegendList and
  concise typed user/role rows, retaining permission scopes and separate forms.
  Twenty-six focused tests/70 assertions, mobile/API TypeScript, scoped lint
  and mobile contracts pass. Android v14 completes all three steps and all four
  display combinations with all four users/five roles reached in each. Reviewed
  access reflow and contextual status bars pass. Its index retains 66 journey
  frames, 25 navigation frames and independent signed-out Light/100% evidence;
  21 frames have direct visual review. All 12 sessions and both temporary
  credentials were revoked. Real TalkBack, system-clock clipping at 200% and
  v12's unreproduced routing cause remain open; no full-app visual pass is claimed.
  Latest evidence is indexed under
  workspace-role-switch/accessibility-v14/README.md. The remaining 14 journeys
  keep the fourth acceptance item unchecked. Ticket 30 remains 4/8 after the
  independent cleanup acceptance item, and overall directive completion
  remains 25/33 (75.8%).
  Next procurement execution now has a tested API adapter and native baseline.
  Actual submission is rejected by member operational readiness: the Standard
  fixture lacks historical migration evidence. The follow-up read correction
  now composes authoritative readiness; ordinary API v3 blocks before creation
  and revokes its session/credential. Twenty-three focused tests, API/direct DB
  TypeScript and scoped DB lint pass. No request was created. Form gutters also fail
  the baseline visual review. Failed Android cleanup was recovered with ordinary
  sign-out and exact audited revocation (3/3 sessions); observed-viewport swipe
  logic replaces the failing fixed coordinate. Neither journey nor visual
  completion is credited. Evidence: member-procurement-request/README.md.
  Procurement now has five published HTML/PNG options selecting A — Item first.
  Native presentation-only v2 proves corrected body/footer gutters, all five
  populated input keyboards and review cancellation in Light/100%, with ten
  reviewed captures, independent final sign-out and 2/2 sessions revoked.
  V1's footer failure remains preserved. Disabled CTA contrast, nested-review
  footer suppression, Dark/large-text, TalkBack and truthful migration followed
  by real submission remain open; this is not an additional positive journey.
  A separate v1 negative registry now covers all 7 required denial/idempotency
  categories and passes production-router conformance. Its sequential executor
  keeps invoked and suppressed adapter paths separate, requires zero recorded
  calls for offline proof, and emits bounded mismatch/terminal evidence, but
  fresh execution is 0/7. A redacted invitation proof also implements the full temporary credential,
  QA accelerator, durable mobile session, production invite, DB inspection,
  sign-out, and credential-revocation path. Its external run was rejected before
  launch pending explicit approval for the configured QA inbox, so no invitation
  or delivery is claimed and acceptance items 5 and 6 remain unchecked.
  A temporary platform-issued credential now removes the stale assigned-secret
  blocker without weakening the boundary; the first run passed native/API
  sign-out, tester-credential revocation, both mobile-session revocations, and
  clean Android runtime logs. Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/ticket-30-production-contract-qa-harness/evidence-report.md`.
  Native member-core evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-core-reads/README.md`.
  The versioned exact-scenario cleanup preflight blocks live, foreign-domain,
  credential/session, custom-domain, document, and provider hazards, then uses
  the existing QA-maintenance marker/delete lifecycle. A real local PostgreSQL
  rehearsal deleted all nine targets inside one transaction, confirmed zero
  remained, deliberately rolled back, and restored the identical fingerprint
  and aggregate counts. The irreversible command was rejected before launch
  without explicit deletion authority and was not retried. Cleanup evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/ticket-30-production-contract-qa-harness/cleanup-rehearsal.md`.

## Definition Of Done

### Latest negative execution — 2026-09-06

- Read-only Procurement command v6 is accepted on the headless Pixel 3a API 34
  development client. The ordinary Enterprise stale Member production create
  command returns exact `PRECONDITION_FAILED`, every paginated history record is
  unchanged, and native Procurement exposes the selected browse-only Emerald
  ledger state with no create/form/Quick Fill/staff surface. The one necessary
  Light/100% frame passes direct review and fatal/runtime filtering is empty.
  Short-lived QA session refresh is now bounded to the original authorization
  and expiry, valid QA sessions do not auto-roll, and the QA trigger clears the
  Android navigation inset. Android signs out; both credentials and 2/2 sessions
  are revoked. Negative execution advances to 3/7; Ticket 30 remains 4/8,
  positive execution remains 4/18 and overall remains 25/33 (75.8%). Evidence:
  `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-modes/read-only-procurement-v6/README.md`.

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

Latest prerequisite after-v8 fixes compact below-footer input bleed through a
measured outer clip, preserving the inner scroll and keyboard geometry. Android
Light/100% keyboard label/field clearance, full reason review/return, discard,
ordinary sign-out and 1/1 credential/session revocation pass. Fourteen images
directly reviewed, including independent Light/100% sign-out; More is neutral.
Mobile/API TypeScript, scoped lint, 25 tests/76 assertions and full mobile
contracts pass. Presentation-matrix-v1 is now launched using the new optional
four-combination harness; do not claim its result or cleanup before inspecting
terminal evidence. Next: matrix review, long-reason scrolling, shared consumers,
TalkBack and real stale recovery. Counts remain 25/33, 4/8, positive 4/18,
negative 1/7. Latest:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v8/README.md`.

Latest prerequisite after-v7 verifies selected review A — Flat consequence from
four published HTML/PNG directions. Actual consequence, complete review facts
and exact audit-reason retention pass on Android Light/100%, as do restored v5
empty/typed keyboard checks, draft actions and ordinary 1/1 session/credential
cleanup. All fourteen images reviewed, including independent Light/100% sign-out.
More remains neutral. V6's footer viewport experiment failed label visibility
and was reverted; compact footer clipping remains open. Next: that correction,
native Dark/200% and long-reason scrolling, shared consumers, TalkBack and genuine
stale-command recovery. No command submitted; counts remain 25/33, 4/8,
positive 4/18, negative 1/7. Evidence:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v7/README.md`.

After-v5 fixes the reason-label overscroll and shared multiline centering within
selected A. Empty/typed keyboard checks now require the label to remain visible;
field bottom 1198px clears IME top 1398px. Quick Fill, Review/return/discard,
ordinary sign-out, credential revocation and 1/1 session revocation pass. All
twelve images reviewed, including independent Light/100% sign-out. More is
neutral. 45 tests/129 assertions, mobile/API TypeScript, scoped lint and full
mobile contracts pass. Next: compact footer clipping, review consequence copy,
complete reason scrolling/retention, Dark/200%, shared consumers and genuine
native conflict/recovery. Counts remain 25/33, 4/8, positive 4/18, negative 1/7.
Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v5/README.md`.

Latest prerequisite after-v4 implements selected A's concise editor, stable
dismissal callbacks (fixing collapse on typing), and content-sized resting
expansion. Native typed input/Quick Fill/Review-return/discard pass; ordinary
sign-out, credential revocation and 1/1 session revocation pass. All 11 frames
reviewed, but visual acceptance remains open for keyboard overscroll hiding the
reason label, shared multiline centering, and complete review content/copy.
Dark/200%, shared consumers and actual stale-command conflict/recovery follow.
V2's failed run plus explicit cleanup recovery are preserved. 45 tests/129
assertions, mobile/API TypeScript, scoped lint and full mobile contract pass.
No ticket/journey count increases. Latest:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v4/README.md`.

Stale Operation Profile now has real API conflict/readback evidence in
`t30-stale-mode-api-v1`: expected-state rejection leaves all service modes and
review metadata unchanged, and ordinary cleanup passes. This does not advance
negative completion without native conflict/recovery. Native baseline v3 fails
reason-input reachability but revokes its credential and 1/1 session. The driver
now bounds gestures to the observed sheet body and waits for More-specific
content before capture. These QA changes are not a product UI fix. Evidence:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/baseline-v3/README.md`.
Authorized v5 confirms that bounded gestures alone do not fix the native sheet:
it expands with a large blank region and the reason input remains unreachable.
Five reviewed images include neutral More and independent signed-out Light/100%;
1/1 session and credential revocation pass. 44 focused tests / 125 assertions,
API TypeScript and scoped lint pass. Next is the sheet's layout/scroll integration
with required HTML alternatives before UI changes, then real conflict/recovery.
Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/baseline-v5/README.md`.

Follow-up: four published HTML/PNG directions selected A — Flat access editor.
Native `t30-mode-editor-after-v1` now passes formerly failing reason reachability
and measured clearance (input bottom 1145px, visible IME top 1398px), with neutral
More before/after, five reviewed frames, sign-out and 1/1 session/credential
revocation. The shared keyboard-aware viewport fills the expanded sheet; compact
non-keyboard caps remain. Editor copy is reduced and existing restrictive-change
policy gates a readable muted Review action. 45 tests/129 assertions, both
TypeScript checks, scoped lint and full mobile contract pass. Populated actions,
Dark/200%, shared consumers and actual conflict/recovery remain open. Counts do
not advance. Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-after-v1/README.md`.

Today's earlier status-bar recheck v15 was independently re-reviewed: Light/100%
More → Billing → More shows neutral → emerald → neutral. The reported green More
bar remains unreproduced; this is not a fresh dark-mode or all-screen acceptance.
Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/workspace-role-switch/statusbar-recheck-v15/README.md`.

Member staff-finance denial now has reviewed production API and headless Android
evidence in `t30-member-role-denial-native-v1`. Two settled native frames preserve
the Member shell after the staff deep link; ordinary sign-out and all three
session revocations pass. Negative execution advances to 1/7; positive execution
remains 4/18, Ticket 30 remains 4/8, and overall completion remains 25/33 (75.8%).
Transient unauthorized frames, TalkBack and remaining categories stay open.
The new entry-error receipt catch is statically checked but not native-fault-
injected. Evidence:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-role-denial/native-v1/README.md`.

### Operation Profile stale recovery — 2026-09-05

Native Operation Profile stale recovery is accepted in
`t30-stale-native-recovery-v2`. Four Design HTML/PNG directions selected
`A — Preserved draft recovery`; the shared semantic-token floating sheet shows a
real backdrop, prior review basis, intended change, preserved-draft notice and
explicit Keep editing / Refresh & review actions. The ordinary `ishaq.qa.test`
Enterprise Tenant Admin journey creates real concurrent drift after review,
passes both API and Android contract steps, retains the exact draft, refreshes
to the current `Office only` basis and proves no automatic mutation retry through
server readback. All six screenshots pass direct visual review; app-process
fatal/runtime output is empty; the fixture returns to `read_only`; Android signs
out; both temporary credentials and 2/2 sessions are revoked. Negative journeys
advance to 2/7. Ticket 30 remains 4/8, positive journeys remain 4/18 and overall
completion remains 25/33 (75.8%). Evidence:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/operation-profile-stale/native-conflict-recovery-v2/README.md`.

### Procurement matrix follow-up — 2026-09-05

Footer follow-up now proves and fixes Quick Fill's 116px flow displacement.
Native footer-after-v3 retains identical empty/populated bounds, all five input
keyboard checks and review/cancel; twelve reviewed images include independent
Light/100% sign-out. Both sessions and the temporary credential are revoked.
25 focused tests and scoped static checks pass. Selected A remains unchanged;
Dark/large-text, other Quick Fill consumers, TalkBack and real submission still
need verification. Counts remain unchanged. Evidence:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/footer-after-v3/README.md`.

Latest v5 uses the settled-state driver and exits 0. All 36 form frames are
directly reviewed: four disabled/enabled pairs, all 20 input keyboards, nested
review isolation and cancellation pass scoped checks. Ordinary sign-out,
independent Light/100% restoration and 2/2 session revocations pass. No additional
UI rewrite was needed. Real submission, TalkBack, 200% system-clock clipping,
initial empty-form footer resting position and other-form regression remain open.
Latest: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/presentation-matrix-v5/README.md`.
Historical v3/v4 findings below are preserved; counts do not increase.

V3 retains 36 directly reviewed form screenshots across Light/Dark and 100%/200%.
All 20 focused input keyboards clear the reachable footer; review sheets hide
the parent action and reflow at large text. The complete visual run is not
accepted: some CTA frames precede their observed state and Dark/100 final still
shows a dismissing review. Original cleanup fails; ordinary UI recovery then
proves signed-out Light/100% and 13/13 revoked sessions in the wider procurement
window. No financial submission occurred. Driver hardening adds known-landmark
navigation and two consecutive matching form states before capture; 19 focused
tests/54 assertions, API TypeScript, scoped lint and the mobile UI contract pass.
V4 restart/cleanup replay exits 0 with 2/2 sessions revoked and independent
signed-out Light/100% evidence; three v4 frames are directly reviewed. It
predates the last capture refinement. Settled captures, 200% system-clock clipping, TalkBack
and real submission remain open. Read-only preflight finds migration tools
closed and five missing setup/backfill steps; no preview was saved/applied.
Evidence: `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/member-procurement-request/presentation-matrix-v3/README.md`.
Counts remain 25/33 (75.8%), Ticket 30 4/8, positive 4/18 and negative 0/7.

### Offline Procurement write suppression — 2026-09-06

Ticket 30 negative journey `offline-procurement-write` is accepted in
`t30-offline-proc-native-v2`. The ordinary `ishaq.qa.test` Starter healthy
Member has one deterministic QA-owned request provisioned through the
staff-authorized production service. The route controller now owns the runtime
financial-command boundary: offline state preserves reads and local detail but
suppresses creation, review, Quick Fill, pagination and detail refresh transport.
Five Android-size Design HTML directions selected `A — Trust rail`; the native
implementation uses semantic NativeWind tokens, flat dividers, a neutral status
bar, one bounded Check action and the existing floating detail sheet/backdrop.
All three frames pass direct review. The proof records 0 transport calls,
0 optimistic requests and an identical before/after history fingerprint;
Android signs out and both credentials plus 2/2 sessions are revoked. Negative
coverage advances to 5/7. Ticket 30 remains 4/8, positive coverage remains 4/18
and overall completion remains 25/33 (75.8%). The two remaining negative
journeys are cross-tenant project-financing detail and duplicate-charge command.
Evidence:
`.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-30/android/offline-procurement-write/final-v2/README.md`.

### Full-goal completion standard

The result is production-quality, maintainable, secure, tenant-isolated, accessible, performant, dark-mode complete, keyboard-safe, fully tested through Expo and emulator/simulator, visually consistent with EwaTrade, and backed by honest release evidence.

## Ticket 29 Admin Overview continuation — 2026-09-01

- Five rich Design HTML/PNG options are complete and individually reviewable under `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-29-admin-overview-rich-directions/`; `A — Command Ledger` is selected and implemented with the redundant draft heading removed.
- The native implementation uses a shared inverse-tone header, one semantic emerald metrics surface, warm decision accents, flat divided operational sections, a pure tested presentation model, and no speculative list/performance rewrite.
- Nine focused tests with 26 expectations, mobile TypeScript, focused zero-error lint, and the complete 36-route/seven-shell mobile contract pass.
- Final native Admin Overview acceptance is pending the assigned `ishaq.qa.test` tester credential. Both connected Android emulators are at the auth gate and the QA access sheet reports `Not configured`; no bypass or fabricated admin fixture was used. Required next evidence is populated Light/Dark/200%, top/scrolled, loading/error/empty/denied/stale/offline, TalkBack, and fatal logs.
- Ticket completion remains 25/33 (75.8%); Ticket 29 remains open and the accepted Android-slice count remains twelve.
