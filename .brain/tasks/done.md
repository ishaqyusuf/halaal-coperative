# Done

## 2026-10-07 — Shared release direction source implementation

- Replaced the old assurance layer with the current GND/EwaTrade `release.config.ts` / sibling local-infra-kit component engine, separate-project Trigger Preview deployment and fingerprint-native mobile flow. Local regression/type checks pass; no release was run. Provider/ENV setup and first live acceptance are recorded separately in [the task](2026-10-07-shared-release-direction.md).

## 2026-09-25 — Release assurance source integration

- Added a pinned shared-toolkit snapshot, repository release manifest, Halalvest evidence adapter, signed provider-evidence verifier, source-change tests, and a protected Preview/Production verification workflow.
- The planner distinguishes database push, dashboard web, marketing web, Expo update versus native rebuild, and jobs deployment, while enforcing prerequisites and exact-revision evidence.
- Historical source integration was complete. Superseded on 7 October by the shared component release flow; protected evidence secrets and provider collectors are no longer activation requirements.

## Purpose

This file records completed work and important outcomes.

## How To Use

- Add a dated note when meaningful work completes.
- Prefer concise outcomes over long narratives.

## Completed

- 2026-08-31: Completed mobile hardening Ticket 28: device push endpoints are attached to active durable sessions, rotated/disabled/revoked safely, governed by tenant/user preferences and mandatory security/transaction categories, and delivered through bounded privacy-safe payloads. A typed registry validates action, signed session, tenant, role, and opaque record context before exact-record routing; cold-start, live response, token-refresh, foreground, duplicate, stale, deleted, and unavailable states fail safely. Five HTML/PNG directions selected `A — Clear ledger`; the rebuilt Pixel 3a/API 34 native development client on Metro `1443` verified granted/denied permission, registered Light/Dark inbox, settings, read synchronization, exact financing/report/support records, and compact unavailable-record handling. The full mobile contract, mobile typecheck, 27 notification/domain/database/mobile tests with 71 expectations, 103 API route tests with 250 expectations, and Android fatal-log scan pass. The required database migrate/push checks were attempted but the managed Docker engine remained unavailable; no reset or manual migration was performed. Program-wide TalkBack/iOS/device, release build/update, performance/security, and pilot breadth remains Tickets 15 and 29-33.
- 2026-08-31: Completed mobile hardening Ticket 27: authorized staff receive the full server-owned report catalogue, entitlement/row-cap shaping, cursor-paginated redacted governance activity, and authenticated CSV generation; members receive only their signed self-scoped statement export. Generated files live in app cache for at most 15 minutes, are removed on cancel/expiry/permission or session loss/unmount, use the native share adapter, never put credentials/content in URLs, and no longer retain raw CSV presentation previews. Five separate HTML/PNG directions selected `A — Report workspace`; the installed Pixel 3a/API 34 development client on Metro `1443` verified populated Statement/Reports/Activity, content-aware filter/generation/file sheets, fixed-height day/month/year calendar controls with native swipes, concise copy, and corrected inset-divider/list spacing. Mobile TypeScript, the complete 36-route/seven-shell contract, scoped Biome, 21 report/domain/database/model tests with 57 expectations, 101 mobile-router tests with 246 expectations, and 21 calendar/date/list-formatting tests with 56 expectations pass. External share-target selection was intentionally omitted to avoid disclosing a private fixture report to third-party apps; program-wide TalkBack/large-text, iOS/device/build, and release-performance/security breadth remains Tickets 29, 31, and 32.
- 2026-08-31: Completed mobile hardening Tickets 09 and 10: Reports, Notifications, Updates, and More now use thin routes, orchestration-owning feature controllers, prop-driven screens, feature API/policy boundaries, fail-closed permission transitions, and an executable architecture checker that rejects API/runtime/auth/native orchestration in presentation screens. Signed `@ishaq.qa.test` Android evidence covers staff Reports/Workspace access, member read state, invitation Quick Fill/keyboard/truthful handoff, residual states, Light/Dark, Back, and accessibility actions; post-refactor fixture regression covers all four selected Light surfaces, real notification read mutation, and truthful update-check failure. The removed generic screen/client/query layers have no production consumers, closing legacy contraction. The final focused run passes 118 tests with 302 expectations, mobile/API TypeScript, scoped Biome, diff hygiene, clean strict native logs, and the complete 36-route/seven-shell contract. Ticket 30 owns live QA-routed invitation delivery, Ticket 29 accessibility breadth, and Ticket 31 installed-preview update/iOS/device-matrix proof.
- 2026-08-31: Completed mobile hardening Ticket 06: Procurement, Foodstuff Purchase, and Project financing now finish their feature-owned member migration with thin routes, signed tenant/member API/query boundaries, server-enforced Operation Profile and policy rules, list/detail pagination, separated keyboard-safe full-screen forms, floating review/success/detail sheets, and readable history under disabled/office-only/read-only modes. The approved `E — Operational clarity` state treatment has a signed Zainab Musa `@ishaq.qa.test` Pixel 3a API 34 matrix covering 30 Light states plus representative Dark states. Final QA hid internal brought-forward keys, corrected singular/plural labels, and removed contradictory empty-fixture restrictions. Ten mobile tests, 79 cooperative-service database tests, 97 mobile-router tests, mobile/API/database-source TypeScript, focused Biome, diff hygiene, the 36-route contract, accessibility-tree interaction checks, and fatal-log inspection pass. Ticket 31 retains iOS, installed-build, and broader-device acceptance.
- 2026-08-31: Completed mobile hardening Ticket 07: the selected `Exceptions first`, `Directory first`, and `Readiness first` admin designs now have real signed `@ishaq.qa.test` Tenant Admin Android acceptance for Overview, Members, and Member Detail plus loading, empty/not-found, error/retry, denied, offline, and stale states. Member rows expose status, KYC, linked-login state, Collection Source, and monthly obligation. A guarded idempotent local QA utility produced a 100-member registry; native Next/Previous, keyboard-visible exact search, and direct page/search measurements passed. Denied member detail now clears and gates prior profile state. Forty focused tests with 91 expectations, mobile/database TypeScript, Prisma generation, focused Biome, diff hygiene, the complete 36-route mobile contract, accessibility-tree inspection, and fresh Android fatal-log replay pass. TalkBack/large text, iOS/installed builds, and broader release-performance/security matrices remain Tickets 29, 31, and 32.
- 2026-08-31: Completed mobile hardening Ticket 26: authorized staff can inspect distinct Share capital and Profit allocation books, both unit-based and monthly-history share models, optional-unit applications, immutable share ledger evidence, live/historical profit periods, reviewed totals, distributable amounts, approvals, and published allocations. Share review, profit approval, and profit publication use independent named permissions, signed tenant/actor scope, expected-state guards, UUID idempotency, transaction/audit evidence, and published-only member visibility. Five separate HTML/PNG directions selected `A — Two books`; a real signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified populated Light/Dark, both share models, no-results, denied/empty/error/offline/stale states, every input with the Android keyboard, real share/profit approvals, and real publication. Fifty-nine focused tests, mobile/API/DB TypeScript, the complete 36-route contract, zero-error package lint, diff hygiene, and fresh Android fatal-log replay pass. The full API/DB suites retain five classified cross-ticket baseline failures; iOS, real TalkBack, broader devices, installed-release evidence, and release performance remain Tickets 28–32.
- 2026-08-30: Completed mobile hardening Ticket 25: authorized staff can review, activate, and record release evidence for project-financing structures with explicit lifecycle, tenant/permission, expected-state, UUID-idempotency, audit, offline, and stale-state boundaries. Repayable facilities materialize only approved principal and support valid receipt settlement; investment partnerships and profit-sharing remain evidence-only with no repayment target, implied return, or ledger posting. Five separate HTML/PNG directions selected `B — Boundary Ledger`; a signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified populated Light/Dark, review, activation, release, receipt settlement, evidence-only and terminal states, every-input keyboard clearance, fixed-height swipe calendar, and denied/empty/error/offline/stale states. Fifty-four focused tests with 159 assertions plus eight calendar/date tests with 29 assertions, mobile/API/DB TypeScript, the complete 35-route contract, zero-error package lint, diff hygiene, and Android fatal-log inspection pass. iOS, real TalkBack, broader devices, release performance, and secure native evidence storage remain cross-cutting tickets.
- 2026-08-30: Adopted the approved `01 — Cooperative Ledger` React Email system across all 40 registered notification types with a package-owned responsive shell, five semantic family previews, exhaustive presentation mapping, synchronous runtime rendering, neutral global copy, explicit-amount-only promotion, and preserved tenant sender/QA/plain-text delivery contracts. React Email 5.2.10 live preview, both package typechecks, zero-error scoped lint, 54 focused tests, and five-family 390px browser QA with no horizontal overflow pass; desktop and mobile screenshots are attached to the implementation task.
- 2026-08-30: Completed mobile hardening Ticket 24: authorized staff can run Foodstuff Purchase from committee release evidence through intake, application review, accounting correction/acceptance, and completion with explicit lifecycle states, tenant/permission boundaries, expected-state and UUID-idempotent commands, server-owned search/30-row paging/full-cycle totals, and an allocation-shortfall warning. Release and accounting remain provisional evidence and cannot post cash, member obligations, profit distributions, or dividends. Five separate HTML/PNG directions selected `A — Cycle desk`; a signed `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified Light/Dark, transition review/success, fund-release keyboard clearance, review-from-keyboard, and fixed-height balanced/swipeable day/month/year calendar modes. Mobile/API/DB TypeScript, the complete 34-route contract, 54 focused tests with 153 expectations, receipt-settlement regression coverage, formatting, and Android fatal-log inspection pass. iOS, real TalkBack, broader devices, release performance, and secure native evidence storage remain cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 23: staff procurement fulfillment now exposes legal Review/Activate/Servicing/Completed lanes, immutable approval and policy snapshots, permission/tenant/audit boundaries, expected-state and UUID-idempotent purchase activation, exactly-once repayment schedule creation, and transactional paid/outstanding/overdue evidence while disabled/read-only tenants retain service history. Five fulfillment and five calendar HTML/PNG directions selected `A — Fulfillment desk` and `A — Ledger Calendar`; a real `@ishaq.qa.test` Tenant Admin Pixel 3a/API 34 development-client pass verified populated detail, every purchase input, keyboard avoidance, strict minimum-date behavior, and fixed-height day/month/year calendar modes with repeated bidirectional native swipes. Mobile typecheck, the complete 33-route contract, lint with zero errors, and four date-helper tests with thirteen expectations pass. iOS, real TalkBack, broader devices, release performance, and secure native evidence storage remain cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 22: finance staff can inspect Due/Collections/Posted lanes and exact facility schedules/history, post repayment with explicit amount/date/reference/review, and record collection evidence without implying payment. Repayment allocation is earliest-unpaid, Serializable, expected-state guarded, UUID-idempotent, tenant/role scoped, append-only, audited, and atomically linked to loan/schedule/ledger evidence; collection follow-up is separately permissioned and cannot change principal or ledger values. Five independently clickable HTML/PNG options selected `E — Servicing desk`; a real `@ishaq.qa.test` Tenant Admin Pixel 3a development-client run posted ₦66,667 as `QA-REP-291112`, recorded a Promise To Pay follow-up, and passed populated Light/Dark, facility detail, every-input keyboard avoidance, Quick Fill, review/success, posted history, and nonfinancial evidence. Forty-one focused tests with 112 expectations, DB/API/mobile TypeScript, and the complete 32-route mobile contract pass. iOS, real TalkBack, broader devices, release performance, and the program-wide state matrix remain cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 21: finance staff can inspect immutable monthly-cycle capacity, quick/normal allocations, review/disbursement/activity lanes, live deployable funds, request evidence, and blockers; cycle, approval, and disbursement commands are signed-tenant scoped, permission checked, expected-state guarded, idempotent, transactional, and audited. Five separately clickable GStack/Design HTML/image options selected `E — Operational clarity`; a real `@ishaq.qa.test` Tenant Admin Pixel 3a development-client run opened the August QA cycle, approved and disbursed a ₦300,000 request, preserved a ₦40,000 guarantor-blocked request, and passed populated Light/Dark, search, detail, floating forms, fixed-header keyboard avoidance, Quick Fill, review/success/discard, and clean fatal logs. Forty-six focused tests with 137 expectations, DB/API/mobile TypeScript, the complete mobile contract, and focused Biome pass. iOS, real TalkBack, broader devices, release performance, and the program-wide state matrix remain cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 20: staff charge and monthly levy operations now use named view/manage/correct permissions, Applications/Monthly levies/Rules lanes, bounded tenant-scoped filters and cursor paging, exact effective-version/target/ledger/audit detail, supported manual or levy application, separate-payment settlement, waiver, reversal, UUID-plus-fingerprint idempotency, expected-state checks, duplicate policy, and immutable dated-version evidence. Five whole-screen and five apply-form GStack/Design HTML/image options selected `A — Applications workspace` and `A — Compact picker rows`; a real `@ishaq.qa.test` Tenant Admin Pixel 3a development-client run passed populated Light/Dark screens, searchable floating pickers, full-screen and compact sheet states, review/success/discard flows, permission-shaped actions, and ten keyboard-open inputs. Mobile/API TypeScript, the complete mobile contract, zero-error mobile lint, and 76 focused charge/finance/auth tests with 277 expectations pass. A broader API-router suite retains one unrelated pre-existing mobile-device-registration failure; iOS, real TalkBack, broader devices, release performance, and full offline/error matrices remain cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 19: staff contribution operations now use named view/member-management/finance-batch permissions, active-lane server workspaces, exact member/batch detail, historical commitment plans, allocation preference, individual payment allocation, Collection Source staging/correction/posting, UUID-plus-fingerprint idempotency, expected-state checks, and existing transactional ledger workflows. Five separate GStack/Design HTML/image options selected `A — Workspace lanes`; a real signed Tenant Admin Pixel 3a development-client run passed populated Light/Dark lanes, full-screen and compact floating sheets, single-line and multiline keyboard avoidance, review/success, QA-only batch staging, and a QA-only row update. Mobile/API/DB TypeScript, the complete mobile contract, 47 focused tests, and zero-error scoped lint passed. No local financial posting was executed; iOS, TalkBack/large text, broader devices, and release performance remain cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 08 evidence closeout: five separately clickable GStack/Design HTML and image options selected `A — Decision queue first`; a real signed Tenant Admin Pixel 3a development-client run passed the populated flat work queue in Light/Dark, role-permitted actions, content-aware floating sheet, keyboard avoidance, confirmation, empty search, cached-offline state, disabled offline commands, and clean Android error logs. Mobile TypeScript, the complete mobile contract, target-screen zero-warning lint, and 13 focused DB/API tests with 28 expectations passed. No real finance command was confirmed; iOS, real screen-reader, broader-device/large-text, and release-profile performance evidence remain in cross-cutting tickets.
- 2026-08-30: Completed mobile hardening Ticket 17: authorized cooperative admins can inspect and update the six-service Operation Profile through a thin route and feature-owned mobile boundary; subscription restrictions only narrow configured modes; updates are tenant/actor scoped, expected-state compare-and-set, unrelated-setting preserving, restrictiveness-reasoned, and before/after audited. Five separately clickable GStack/Design HTML and image options selected `E — Operational clarity`; a signed Tenant Admin Pixel 3a development-client flow passed Light/Dark, floating-sheet sizing and overflow, keyboard avoidance, Quick Fill, review/success, stale/offline/subscription/denied/error states, accessibility semantics, live update/restore, and clean fatal logs. Forty-one focused tests with 196 expectations, mobile TypeScript, the complete contract, lint with existing warnings only, and diff hygiene pass.
- 2026-08-30: Completed mobile hardening Ticket 14: Free Beta, Starter, Standard, Growth, and Enterprise now use a provider-neutral tenant subscription model with explicit commercial categories, effective entitlements, authoritative member-login/capacity enforcement, audited lifecycle reconciliation, tenant-scoped idempotent checkout intent, invoices, and provider-event evidence. Five separately reviewable Design HTML/image directions selected `Disclosure first`; a real `@ishaq.qa.test` Tenant Admin Pixel 3a Expo Go session passed Light/Dark plan details, recorded intent, populated invoice list/detail, scrolling, fixed actions, and Android Back. Twenty-nine focused tests with 88 expectations, domain/DB/API/mobile TypeScript, targeted lint, Prisma generation/push, and the complete mobile contract pass. `db:migrate` safely refused the pre-existing drift reset; no destructive reset or manual migration occurred.
- 2026-08-29: Completed mobile hardening Ticket 13: per-user/device local PIN protection, strong-biometric availability, fail-closed hydration, bounded background relock, session-change cleanup, and native Android privacy protection are implemented through feature-owned model/platform/runtime boundaries. Five separate Design HTML directions selected `Protection at a glance`; Pixel 3a Expo Go and the installed native development APK passed setup, confirmation, wrong/correct PIN, relock, and unavailable-biometric states. With the QA capture override disabled, active and Recents screenshot attempts were blocked at the native boundary while accessibility remained inspectable. Twelve focused tests, mobile TypeScript, zero-error lint, and the complete mobile executable contract pass.
- 2026-08-29: Completed mobile hardening Ticket 12: mobile-kind bearer tokens now require matching durable hashed device sessions; refresh and role switching replace old access replay-safely; users and `manage_roles` administrators can inspect and revoke scoped sessions; password reset, sign-out-all, membership/member/tenant invalidation and local secure-session/draft/read-cache cleanup fail closed. Twenty-three focused tests with 106 assertions, DB/API/mobile typechecks, zero-error package lints, the complete mobile contract, and Pixel 3a Expo Go Light/Dark current-device/revoke/sign-out-all evidence pass. The required migrate check refused pre-existing drift without resetting data, and `db:push` confirmed schema synchronization.
- 2026-08-29: Built and inspected signed EAS Android preview build `f42d828e-93c2-4837-8d10-2d2e3125fe4b`; the APK is intact and carries isolated package `com.halaalvest.mobile.preview`, label `Halaalvest Preview`, version code 2, and scheme `halaalvest-preview`. Hardened the EAS runner's exact target-env loading and the root upload archive so managed preview builds cannot inherit the local production Android identity; managed prebuild, mobile typecheck, and the complete mobile contract pass.
- 2026-08-29: Corrected mobile QA entry so development/preview launch shows an optional dismissible suggestion rather than an expanded gate; normal sign-in/recovery remain available, a persistent Set up/Update QA access CTA opens a closable keyboard-safe sheet, and clearing QA authorization no longer clears ordinary auth. Mobile typecheck, the complete contract, package lint with existing warnings only, diff hygiene, and physical Samsung SM-S928U1 Expo Go dismissal/open/close/login-control evidence pass; Expo web remains blocked by the existing React Native Worklets web-runtime error before app render.
- 2026-08-29: Implemented the mobile/web QA accelerator for local, development, and preview: server-owned capability and tester authorization, exact QA-domain role profiles, revocation-aware ordinary mobile/web sessions, QA-classified Safa seed data, dashboard and marketing authorization gates, typed Quick Fill coverage/exclusions, production fail-closed configuration, four Design HTML variants with the calm-ledger direction selected, 24 focused tests (55 assertions), all affected typechecks, the complete mobile contract, and live responsive Chromium authorization/member/marketing flows. The full physical-device matrix, WebKit, provider-canary, deployed-preview purge, and production-artifact evidence remains a release-owner validation task.
- 2026-08-28: Completed mobile hardening Ticket 11: mobile public auth is sign-in and recovery only; dormant activation UI/API/database writers were removed and contract-guarded; recovery now uses neutral responses, persisted account/device/network/tenant throttling, expiring single-use evidence, atomic password reset/consumption, canonical role/session hydration, and redacted audits. Fourteen focused tests with 54 expectations, DB/API/mobile typechecks, the complete mobile contract, and a real `@ishaq.qa.test` Pixel 3a Expo Go recovery with every-input keyboard screenshots pass.
- 2026-08-11: Completed mobile hardening Ticket 05: receipts and support now use dedicated session-scoped DB/API/mobile feature boundaries; receipt categories and payable targets are server-shaped and cursor-paginated; support detail/replies preserve linked records, conversation, resolution, and non-posting money-impact governance; Operation Profile, stale/offline, draft, duplicate, and member-ownership guards remain intact; the complete mobile contract, mobile typecheck, 135 focused API/DB/fixture tests, and populated Pixel 3a Expo Go create/reply/review/keyboard evidence pass.
- 2026-08-11: Completed mobile hardening Ticket 04: financing and guarantor approvals now use dedicated session-scoped DB/API/mobile feature boundaries; request eligibility, cycle capacity, term, servicing, charges, overlap, and deployable warnings are server-owned; guarantor responses require deliberate immutable evidence; stale/offline commands are blocked; the complete mobile contract, DB/API/mobile typechecks, 117 focused tests, and populated Pixel 3a Expo Go CTA/review/keyboard screenshots pass.
- 2026-08-11: Completed mobile hardening Ticket 03: member Home, Commitments, Shares, Statement, and growing histories now use session-scoped feature DB/API/mobile boundaries; optional-share applications and financial activity are cursor-paginated; savings, special savings, financing, approved/pending shares, posted ledger evidence, and published-only dividends remain distinct; the full mobile contract, DB/API/mobile typechecks, 87 focused tests, and populated Pixel 3a Expo Go screenshots pass.
- 2026-08-03: Moved Halaalvest database configuration to strict `HALAALVEST_DATABASE_URL` usage across Prisma, runtime, jobs, mode files, and local tooling; extended `local-infra-kit` to prefer `<PROFILE>_DATABASE_URL` while retaining `DATABASE_URL` only for other unmigrated projects.
- 2026-08-03: Standardized root environment selection on `.env` plus exactly one of `.env.local`, `.env.dev`, `.env.preview`, or `.env.production`; simplified Prisma configuration; and allowed non-production schema tooling to use hosted database URLs while retaining exact production-target and data-sync guards.
- 2026-08-01: Completed Safa end-to-end QA at 100/100: brought-forward onboarding, four current charge schedules, unit shares at NGN 10,000 with 1 compulsory and 16 maximum units, three additional members, portal access, member/admin login, accessibility and artifact semantics, registry refresh, remote member transactions, deterministic readiness checks, and green repository gates (716 tests, 16 typecheck tasks, 16 lint tasks).
- 2026-07-23: Completed the ACAC full-flow local QA fixture and added a tenant-level brought-forward reconciliation snapshot so the full 1,000-member cooperative can retain ₦100m member savings, ₦1m special savings, and 5,000 share units while the detailed QA import remains a 20-member sample and member share caps remain enforced.
- 2026-07-23: Added approved support-linked special-savings refund settlement with a dedicated withdrawal record, balanced ledger posting, member balance update, audit evidence, dashboard form, and automatic case resolution; completed the ACAC ₦50,000 excess-payment refund with zero remaining sampled special savings.
- 2026-07-23: Allowed audited metadata-only corrections on finalized historical businesses without reopening capital/profit/date/status values, and recorded the ACAC Layer Poultry operating profile (1,000 hens, about 800 eggs daily, ₦5,000 per crate, 10% monthly operating deduction).
- 2026-07-21: Expanded explicit QA email domain routing to every runtime, including production, while retaining validated `.test` maps, unmatched-recipient blocking, legacy-mode conflict checks, provider-envelope isolation, and routing audit metadata.
- 2026-07-19: Added staging/preview-only QA email domain routing with explicit delivery modes, validated reserved `.test` domain maps, fail-closed unmatched recipients, provider-envelope isolation, QA message labeling, original/delivered recipient audit metadata, Trigger/Turbo environment wiring, and focused routing/transport tests.
- 2026-07-15: Updated the marketing production setup funnel so homepage CTAs and direct `/signup` visits go through early access, admin request emails contain a signed approval API link, approval sends the cooperative a private setup link, and production `/api/signup` requires that approval token before creating the onboarding verification email.
- 2026-07-15: Hardened the EwaTrade-aligned Halaalvest mobile release plumbing by regenerating mobile launcher/splash/favicon PNGs from the canonical web logo design, keeping the development logo variant red like EwaTrade, fixing the preview OTA version parser for semicolon-free `app.config.ts`, adding a safe `--skip-publish` OTA script path, replacing the placeholder `/updates` route with a real Expo Updates management screen, and enabling preview foreground-resume update checks with cooldown metadata.
- 2026-07-15: Completed the Halaalvest mobile UI flow refresh across all nine local tickets: shared mobile primitives, auth/bootstrap/tabs, member home/service discovery, member detail/read-only flows, member form confirmations, admin overview, admin members/detail, admin finance queues, admin reports/More, and final mobile QA gates now align with the warm cooperative fintech direction while preserving Expo/tRPC/NativeWind and server-owned finance behavior.
- 2026-07-13: Simplified the Getting Started Operation Profile into a guided sub-step flow with compact progress, simpler service choices, focused Settings edit disclosures, and tested flow navigation/option mapping.
- 2026-07-12: Added Halaalvest mobile EAS release plumbing aligned with EwaTrade and Al-Ghurobaa: root account-aware EAS build/update scripts, mobile package EAS aliases, Expo app config support for environment-driven project identity and preview OTA updates, and the live Expo project `cipron-startups/halaalvest` (`3fb3e5e2-bd84-4308-8739-e9f4436d0da9`) configured in local env.
- 2026-07-12: Stabilized the Halaalvest mobile preview build input by aligning the Expo slug to `halaalvest`, pinning the NativeWind/Tailwind/Lightning CSS toolchain to the EwaTrade-compatible versions, validating the Android `export:embed` bundle locally, and submitting EAS Android preview build `32ec4a70-d495-464e-87fc-5cb386b9a39b` for `cipron-startups/halaalvest` build version 4.
- 2026-07-12: Implemented the Cooperative Operation Profile feature set: tenant service settings, Getting Started review, Settings workspace, procurement/Foodstuff Purchase/payment receipt gating, active-obligation guards, Collection Source member assignment, staged Collection Source batch posting, Operation Profile-aware dashboard/member/mobile/report visibility, Brain documentation, and QA audit evidence.
- 2026-07-11: Completed the Halaalvest mobile MVP release audit and Brain update: all 18 local mobile MVP tickets are done, the release audit records evidence/checks/skipped checks/residual risks, and ADR-009 locks the EwaTrade-aligned Expo/tRPC/NativeWind/server-owned architecture for future mobile work.
- 2026-07-11: Added mobile admin report preview reads: `mobile.admin.reports.overview` now returns operations-officer gated report cards for real dashboard report/export paths with compact server metrics, and the admin Reports tab renders the guarded API-backed preview list.
- 2026-07-11: Added mobile admin Finance queue reads: `mobile.admin.finance.overview` now returns operations-officer gated finance queue counts and recent pending financing/procurement/project/Foodstuff request rows, and the admin Finance tab renders the guarded API-backed queue hub.
- 2026-07-11: Added mobile admin member directory reads: `mobile.admin.members.list` now returns operations-officer gated member rows from the existing server member query with search/status/KYC filters and pagination, and the admin Members tab renders the guarded API-backed directory.
- 2026-07-11: Added mobile member project financing request self-service: `mobile.member.projectFinancing.list/createRequest` now returns signed-member project request history and submits audited project financing requests through the existing server-side helper, with the More hub opening a guarded `/project-financing` screen.
- 2026-07-11: Added mobile member Foodstuff Purchase application self-service: `mobile.member.foodPurchase.list/createApplication` now returns signed-member open cycles and application history, submits audited applications through the existing server-side Foodstuff Purchase helper, and exposes a guarded mobile `/food-purchase` screen from the More hub.
- 2026-07-11: Added mobile member procurement request self-service: `mobile.member.procurement.list/createRequest` now returns signed-member item-purchase requests and submits audited procurement requests through the existing server-side policy helper, with the More hub opening a guarded `/procurement` screen.
- 2026-07-11: Added mobile member financing request self-service: `mobile.member.financing.list/createRequest` now returns signed-member financing products/history and submits audited loan requests through the existing server-side policy helper, with the Financing tab rendering products, request inputs, current records, and request history.
- 2026-07-11: Added mobile member statement view: `mobile.member.statement` now returns signed-member scoped profile, commitments, financing, shares/dividends, documents, and ledger sections from the existing statement detail query, with the mobile More hub opening a guarded read-only `/statement` screen.
- 2026-07-11: Added mobile member guarantor approval self-service: `mobile.member.guarantorApprovals.list/respond` now returns signed-member scoped financing guarantor requests, stages audited approve/reject responses through the existing loan helper, and exposes a guarded mobile `/guarantor-approvals` screen from the More hub.
- 2026-07-11: Added mobile member optional share self-service: `mobile.member.shares.list/createApplication` now returns member-scoped share policy, optional-unit availability, application history, and stages audited optional share requests from signed member sessions, with the mobile Shares tab rendering the request form and status history.
- 2026-07-11: Added mobile member receipt self-service: `mobile.member.receipts.list/create` now return member-scoped receipt summaries and submit staged member receipts from signed sessions, with a guarded mobile `/receipts` screen for total amount, paid date, payment reference, proof link, notes, multi-allocation splits, and recent receipt status.
- 2026-07-11: Added mobile member support self-service: `mobile.member.support.list/create` now return member-scoped support cases and create audited member-authored support cases from the signed session, with a guarded mobile `/support` screen for category selection, subject/description submission, optional money-impact review, and recent case tracking.
- 2026-07-11: Added the server-backed mobile member More hub: `mobile.member.more` now returns signed-session member profile, statement, receipt, and support highlights from existing statement/payment/support query helpers, and the mobile More screen renders those sections for signed member sessions while preserving admin/mock fallback menus.
- 2026-07-11: Added server-backed mobile member section reads for Commitments, Financing, and Shares: `mobile.member.section` validates the section key, stays member-workspace gated, derives data from signed-session member statement/share queries, and the shared mobile detail screen now renders signed-session DTO metrics and rows while keeping static starter rows for mock/development fallbacks.
- 2026-07-11: Added the first Phase 2 mobile home read DTOs: `mobile.member.home` derives member self-service state from the signed member workspace, `mobile.admin.overview` reuses the server overview summary behind staff role gating, and mobile member/admin home screens now fetch server DTOs for signed sessions while keeping static fixtures for development mock sessions.
- 2026-07-11: Added the mobile role resolver and workspace switcher: signed sessions now preserve selected membership, API context refuses invalid selected-membership fallback, `auth.mobile.switchRole` mints a resumable token for owned memberships, and the shared mobile More screen lets multi-role users switch between member/admin workspaces.
- 2026-07-11: Hardened mobile session resume and tenant bootstrap: startup now verifies `auth.mobile.me`, clears stale native sessions, keeps mock sessions development-only, adds selected-tenant signed-session context, ignores client override headers for bearer sessions, and exposes server-shaped tenant branding fields to the mobile profile.
- 2026-07-11: Added the first production mobile auth seam for the Halaalvest mobile MVP: signed bearer session handling in API context, `auth.mobile` tRPC sign-in/me/sign-out procedures, standalone API `/api/trpc` support, and a real mobile sign-in form with development-only mock role shortcuts.
- 2026-07-10: Added a GND-style root dev router on `main` so `bun run dev` supports local, remote-dev, production, and Turbo filter aliases while documenting the remote-dev env-file flow.
- 2026-07-10: Completed the client-fit cooperative operations completion audit, covering all 93 spec stories and recording the 13/13 non-deferred roadmap result with deferred/out-of-scope boundaries.
- 2026-07-10: Added authenticated evidence upload support for receipt proofs, support attachments, member KYC documents, and brought-forward source documents, plus member self-service document submission into the existing staff review workflow.
- 2026-07-10: Cleaned up client-fit dashboard route standards drift by moving workspace page loaders, member portal data loading, and CSV export row builders out of route files into feature-owned dashboard `lib` modules while preserving a passing dashboard typecheck.
- 2026-07-10: Fixed receipt review audit and loan payoff settlement gaps so allocation changes keep before/after snapshots and receipt-approved loan payoffs waive remaining unpaid schedule rows with early-settlement audit evidence.
- 2026-07-10: Cleaned up dashboard verification blockers for the client-fit work by completing the API action handler map, refreshing finance demo policy defaults, serializing opening-balance reversal notes, declaring dashboard's direct form/date type dependencies, narrowing shared React wrapper props, and restoring a passing dashboard typecheck.
- 2026-07-10: Added member-facing published dividend visibility to statement data, member text statement downloads, printable staff statements, member dashboard cards, and member statements CSV export.
- 2026-07-10: Fixed dividend period publication totals so linked business-profit allocations rebuild member-level season totals across all published profit entries and only publish the period once every linked entry is published.
- 2026-07-10: Added brought-forward active financing opening posting so approved opening balances can create a linked active loan and one opening repayment schedule item, while reversal closes it only before repayment activity exists.
- 2026-07-10: Added brought-forward procurement opening posting so approved opening balances can create a linked active procurement request and one opening repayment schedule item, while reversal cancels it only before repayment activity exists.
- 2026-07-09: Implemented separate Procurement and Foodstuff Purchase payback policies with tenant caps, fixed/flexible commitment guards, policy snapshots, Foodstuff Purchase application payback months, exports, dashboard settings, and Foodstuff Purchase product-facing labels.
- 2026-07-09: Updated the client-fit spec and Brain notes so Procurement and Foodstuff Purchase each require separate tenant configuration for maximum payback months and fixed/flexible commitment policy, with Foodstuff Purchase used as the product-facing label for staple food purchases.
- 2026-07-09: Split food-purchase permissions in the role matrix so committee application/accounting work is visible separately from finance fund release and accounting review.
- 2026-07-09: Added an opening balances CSV export so brought-forward current-book positions, source documents, review/apply/reversal evidence, and unresolved obligations can be reviewed offline.
- 2026-07-09: Added trust-readiness visibility for internal crash evidence captured as `application.error_captured` audit activity.
- 2026-07-09: Added a special savings CSV export so voluntary extra-savings contribution rows can be reviewed separately from general contributions.
- 2026-07-09: Updated guarantor approval request emails so guarantors are sent to the member `/guarantor-approvals` response page instead of the staff loans route.
- 2026-07-09: Added feature-request support summary visibility so open product feedback appears as its own staff/member support dashboard metric.
- 2026-07-09: Added dashboard error report capture so safe crash screens send sanitized evidence to tenant audit logs when a database-backed workspace context is available.
- 2026-07-09: Added project-financing disbursement evidence so finance staff can record funding date/reference/notes, move approved requests active, and expose the evidence in cards and CSV exports.
- 2026-07-09: Added project-financing receipt repayment posting so approved/active repayable facilities can be selected from payment receipts, paid/outstanding amounts are tracked, partial repayments become active, and full repayments complete the request.
- 2026-07-09: Added food-purchase payment visibility so staff/member cards and CSV exports show paid, outstanding, and settled-date evidence for approved applications.
- 2026-07-09: Added food-purchase receipt posting so approved applications can be selected from payment receipts, paid amounts are tracked, and overpayment is blocked without distributing profit.
- 2026-07-09: Added a tenant trust readiness profile so admins can save audited legal, incident-contact, backup-retention, and recovery-objective evidence from `/settings/trust`.
- 2026-07-09: Added a workspace role permission matrix so admins can provision tenant users and review module/action access boundaries for each cooperative role.
- 2026-07-09: Added a payment receipts CSV export so workspace admins can download proof metadata, review status, allocation intent, and posted ledger/schedule links from Reports.
- 2026-07-09: Added a share positions CSV export so workspace admins can download member share ledger balances, active share model, unit totals, and pending/approved/rejected/cancelled share-request counts from Reports.
- 2026-07-09: Added a member register CSV export so workspace admins can download contact, KYC, deduction source, status, payment-allocation preference, savings snapshot, and linked-login evidence from Reports.
- 2026-07-09: Added procurement export schedule risk columns so workspace admins can filter due item counts, overdue item counts, and risk status from the CSV report.
- 2026-07-09: Added procurement due/overdue servicing visibility so active item-purchase schedules show due, overdue, and outstanding repayment risk in staff and member procurement views.
- 2026-07-09: Added procurement repayment receipt posting so finance-approved receipt allocations can pay selected active procurement schedule rows and complete procurement requests when all installments are closed.
- 2026-07-09: Added procurement purchase activation so approved item-purchase requests can be marked active with purchase evidence and generated monthly repayment schedule rows.
- 2026-07-09: Added applied opening-balance reversal so finance staff can undo brought-forward savings/share postings with required notes, opposite ledger entries, snapshot decrement, negative share correction, reversed status, and audit evidence.
- 2026-07-09: Added payment-backed share receipt posting so approved `shares` receipt allocations create auditable member share ledger entries and keep the posted ledger reference on the receipt allocation.
- 2026-07-09: Added member self-service guarantor approvals so linked guarantor members can approve or reject their own pending financing guarantor requests with audit evidence.
- 2026-07-09: Added the first approved opening-balance apply workflow for brought-forward savings and share capital, with applied status metadata, ledger/share posting, member savings snapshot updates, and audit evidence.
- 2026-07-09: Added food-purchase accounting review notification support so the submitting committee user receives audited direct emails when finance accepts accounting or requests correction.
- 2026-07-09: Added food-purchase application review notification support so linked members receive audited direct emails when committee staff change their application status.
- 2026-07-09: Added procurement review notification support so linked members receive audited direct emails when finance changes their item-purchase request status.
- 2026-07-09: Added finance/admin review for submitted food-purchase accounting so month-end committee reports can be accepted or rejected for correction with audit evidence.
- 2026-07-09: Added a food purchase CSV export so workspace admins can download monthly released funds, member applications, approval evidence, accounting totals, and profit evidence from Reports.
- 2026-07-09: Added a procurement CSV export so workspace admins can download item-purchase requests, requested and approved costs, repayment estimates, and review notes from Reports.
- 2026-07-09: Added project financing review notification support so linked members receive audited direct emails when finance changes their business funding request status.
- 2026-07-09: Added a project financing CSV export so workspace admins can download member business funding requests, approval structures, payback evidence, and review notes from Reports.
- 2026-07-09: Added member-scoped project financing self-service so linked members can submit business funding requests from `/project-financing` and track only their own review history.
- 2026-07-09: Added member-scoped procurement self-service so linked members can submit item-purchase requests from `/procurement` and track only their own review history.
- 2026-07-09: Added member-scoped food purchase self-service so linked members can submit applications for open cycles from `/food-purchase` and track only their own application history.
- 2026-07-09: Added support-backed member profile/document update requests with a dashboard profile quick link, `account_update` prefill, optional initial attachment URL, and attachment links in support timelines.
- 2026-07-09: Added a member-role dashboard root that shows linked members their profile status, savings, special savings, financing/procurement/project/food-purchase activity, receipts, support cases, shares, and recent ledger activity without exposing staff overview data.
- 2026-07-09: Added a `/project-financing` staff workspace, dashboard actions, Finance navigation entry, and overview action-queue visibility for staged project financing request review.
- 2026-07-09: Added a tenant-scoped project financing request foundation with staged member business funding requests, structure clarification on approval, principal-only payback evidence for repayable facilities, and audit entries; accounting/posting remains future work.
- 2026-07-09: Added a `/food-purchase` dashboard workspace and action queue visibility for monthly committee fund releases, member applications, staff reviews, and month-end accounting/profit capture.
- 2026-07-09: Added a tenant-scoped food purchase workflow foundation with monthly committee fund-release cycles, member applications, committee review, released-fund capacity checks, end-of-month accounting, computed profit, and audit entries.
- 2026-07-09: Added pending brought-forward opening balance reviews to the overview action queue so finance staff can see unresolved opening-position approvals.
- 2026-07-09: Added member backfill baseline UI and dashboard actions for finance staff to stage, inspect, approve, and reject brought-forward opening balances without posting them to live financial records.
- 2026-07-09: Added staged brought-forward member opening balances with review/audit evidence for current book balances and active obligations; approval remains non-posting until a dedicated apply workflow is implemented.
- 2026-07-09: Added a support financial-adjustment approval gate so money-impact support cases requiring finance correction cannot be resolved until approved; review evidence is audited and exportable, without posting money from support.
- 2026-07-09: Tightened share configuration surfaces so monthly share history and unit-based shareholding are treated as mutually exclusive active models; unsaved model changes now hide inactive workflow panels until the selected model is saved.
- 2026-07-02: Initialized `apps/mobile` as the Halaalvest managed Expo starter from the reusable GND mobile shell, with Halaalvest app identity/assets, trimmed UI primitives, mock member/admin SecureStore sessions, member/admin tab surfaces, warm cooperative mobile tokens, and typed tRPC client wiring prepared for the future API-backed auth/workflow phase.
- 2026-03-21: Initialized Project Brain scaffold for the cooperative savings and loans SaaS repository, including system, product, engineering, database, API, task, and template documentation.
- 2026-04-10: Scaffolded the application codebase as a Bun and Turbo monorepo with `apps/web`, `apps/api`, and shared `auth`, `db`, `domain`, `ui`, `utils`, `eslint-config`, and `tsconfig` packages. Added a Next.js dashboard shell, sample domain scaffolds, and synchronized Brain documentation.
- 2026-04-10: Implemented a full Prisma 7 cooperative schema in `packages/db` using a file-grouped layout for enums and models, then validated the schema successfully with Prisma.
- 2026-04-13: Re-scoped the product as a generic cooperative SaaS platform, aligned the multi-app architecture to `plot-keys`, and added tenant host resolution, Next proxy entry points, and `portless` local named-host support.
- 2026-04-13: Completed phases 1-5 foundation work with seed-backed tenant resolution, scoped session/auth helpers, DB query ownership scaffolding, platform identity modules, and shared domain modules.
- 2026-04-13: Completed phase 6 bridge work by generating the Prisma client, adding an optional Prisma runtime adapter, and wiring dashboard and tenant-site pages to server-side tenant context loaders.
- 2026-04-13: Verified Phase 7.7 as complete for the DB-backed runtime path: `apps/api/src/routers/workspace.route.ts` now uses repository-backed dashboard metrics when the database is configured, with seed-mode fallback kept for local scaffold operation.
- 2026-04-13: Completed Phase 8 by adding tenant onboarding bootstrap queries in `packages/db/src/queries/onboarding.ts`, exposing `trpc/onboarding.status` and `trpc/onboarding.bootstrap`, and surfacing onboarding progress plus routing defaults in the dashboard.
- 2026-04-13: Redesigned the main `apps/web` landing page, added a distinct pre-launch variant, and introduced `MARKETING_STAGE` to switch between pre-launch and launch marketing states without changing routes.
- 2026-04-14: Added a public `apps/web` signup and onboarding flow using a `midday`-style `useZodForm`, a shared dev autofill helper, signed verification tokens, and shared notification email drafts for verification and workspace-ready follow-up.
- 2026-04-14: Moved signup and onboarding email dispatch under the shared notification system by adding `NotificationService.email(...)`, a console email transport, and server-side notification service wiring in the web app.
- 2026-04-14: Added an env-driven Resend transport to the shared notification system, with console fallback for local development when mail credentials are absent.
- 2026-04-14: Added retry-aware notification email delivery with structured failure metadata; signup verification now fails closed on delivery errors, while post-onboarding workspace email failures are surfaced without rolling back tenant creation.
- 2026-04-14: Added reusable DB audit helpers and persisted tenant-scoped onboarding email delivery outcomes to `audit_logs`, leaving pre-tenant signup verification persistence as an explicitly documented future schema gap.
- 2026-04-14: Closed the pre-tenant email persistence gap by adding a `notification_outbox` Prisma model, migration, generated client update, DB query helpers, and route wiring so signup verification and onboarding workspace emails both record durable outbox entries.
- 2026-04-14: Simplified the public signup and onboarding flow to use `primary contact` language, collect a short cooperative profile, derive the workspace slug automatically, defer financial policy configuration to server-side defaults and later dashboard setup, and persist `currentSize`, `officeAddress`, and `startDate` on the tenant record.
- 2026-04-14: Added a role-filtered dashboard shell and navigation registry inspired by the local `gnd` site-nav architecture, wired dedicated routes for members, contributions, charges, loans, repayments, notifications, tenant-site, domains, and settings, and documented the rollout in Brain plus ADR-005.
- 2026-04-14: Added server-action-backed Phase 9-11 operator flows in the dashboard for member creation and status changes, contribution recording, and charge definition/apply/activation actions, all gated by the simplified role-based system.
- 2026-04-14: Added Phase 12-13 loan and repayment workflows through `packages/db/src/queries/loans.ts` and dashboard server actions, including loan request submission, review decisions, approval-to-loan conversion, disbursement, repayment schedule creation, and repayment posting on `/loans` and `/repayments`.
- 2026-04-14: Added Phase 15-18 dashboard follow-through for notifications, domains, tenant-site readiness, and settings by exposing notification outbox history, custom domain registration, tenant profile updates, and richer public-site readiness views inside the shared role-filtered shell.
- 2026-04-14: Reworked the finance model so members can have different monthly commitments, loan requests now capture chosen repayment months plus estimated monthly servicing and extra monthly savings, and payment posting can split one member payment across savings and loan servicing with support for overpayment allocation.
- 2026-04-14: Added internal admin workflows for tenant-user role provisioning and primary-domain management, keeping the architecture aligned to the simplified role-based system without introducing a separate permission matrix.
- 2026-04-14: Added tenant-level notification preference toggles and collections refresh/follow-up workflows so internal operators can control shared email notification routing and surface overdue repayment items more directly.
- 2026-04-14: Added an admin reporting route plus domain verification state management, so the dashboard now exposes audit visibility, finance snapshots, notification delivery totals, and explicit custom-domain verification before primary promotion.
- 2026-04-14: Added downloadable CSV exports for audit activity, collections status, and notification delivery history from the admin reporting surface.
- 2026-04-14: Expanded reporting exports with contributions, loans, and member statement summaries, and added a manual custom-domain verification-check workflow that validates hostname shape and updates verification state more explicitly.
- 2026-04-14: Added a member detail route in the dashboard that surfaces commitment history, contribution activity, loans, repayment schedules, and repayment history from the same statement-oriented finance model.
- 2026-04-14: Reworked domain management so verification guidance is routing-scope-aware, custom domains carry expected DNS target instructions, and primary promotion now applies across site-facing versus dashboard-facing hostnames instead of only within the raw `kind` bucket.
- 2026-04-14: Expanded the reporting surface with a printable member statement route, member ledger timeline visibility, an audit viewer page, date-windowed exports, and new CSV downloads for charges, repayments, and member ledgers.
- 2026-04-14: Added editable commitment-plan lifecycle, member payment allocation presets, charge waivers/reversals with savings restoration, dual-approval-aware loan review, collections follow-up logging, tenant-role notification triggers for key finance workflows, stricter tenant-user scoping in dashboard server context, and initial member KYC fields.
- 2026-04-14: Standardized the dashboard’s main create/update/filter forms and remaining visible-input inline forms on shared shadcn-style primitives and `useZodForm`, added reusable dashboard client form modules for settings, members, finance, domains, and reports, and introduced a dev-only quick-fill helper for local operator testing.
- 2026-04-14: Deepened the next dashboard phase by adding DNS-backed custom-domain verification with persisted verification details, persisted collections follow-up records plus next-action dates and reporting surfaces, notification filter UX plus broader workflow-triggered notifications, richer KYC review fields, and related reporting updates.
- 2026-04-14: Added the next reporting and operator-support slice by introducing member-specific statement downloads, detailed member-ledger exports, filterable contribution and repayment views, richer notification analytics, and stronger loan review/disbursement context.
- 2026-04-14: Added a reusable dashboard imports and migrations workspace under settings with shared CSV parsing, live preview validation, dev quick-fill samples, and server-action-backed import flows for members, deduction sources, loan products, contributions, charges, migrated loans, and migrated repayments.
- 2026-04-14: Deepened the import, collections, KYC, and hardening slice by adding live import reconciliation hints against existing workspace records, richer collections case metadata and assignee tracking, multi-document KYC support on member profiles, expanded member/KYC notification triggers, tighter report-route access, and updated reporting visibility for collections and document review.
- 2026-04-14: Added review-gated import confirmations for existing matches and in-file duplicates, plus queue-style open and resolved collections views with stage-, assignee-, and resolution-aware repayment filtering.
- 2026-04-14: Added persisted import batches and staged apply flow for the settings import workspace, including stored batch rows, recent batch history, and apply-from-batch actions for safer operator-led migrations.
- 2026-04-14: Introduced a Midday-inspired dashboard UI slice with dedicated authenticated shell and reusable primitives under `apps/dashboard/components/dashboard/`, then rebuilt the overview and charges routes on top of that denser page system while preserving server-first route ownership.
- 2026-04-14: Extended the Midday-inspired dashboard pass across the remaining main workspace routes plus member detail, printable statement, and audit drill-down pages, so the dashboard now uses one consistent shell, primitive layer, and page-composition language across overview, list, detail, and reporting surfaces.
- 2026-04-15: Collapsed the old split tenant-site/dashboard host model into one tenant-hosted app by moving protected workspace routes under `/app`, making `{slug}.halaalvest.com` the canonical tenant surface, keeping `dashboard.{slug}...` as a redirect alias, deleting `apps/tenant-site`, and updating onboarding, routing, env defaults, seeds, and docs to match the new single-site flow.
- 2026-04-15: Redesigned the tenant-root homepage in `apps/dashboard`, introduced the same `SHOW_HOME_PAGE` gate there so tenant `/` can redirect to `/login` when disabled, and moved homepage visibility parsing into a shared `packages/domain/src/modules/marketing.ts` module consumed by both apps.
- 2026-04-15: Started the Midday-style dashboard structure migration by introducing canonical `components/dashboard/layout`, `components/dashboard/data-display`, and `components/dashboard/feedback` folders with compatibility exports, moving auth redirect usage behind `features/auth/lib/auth-redirect.ts`, documenting folder ownership in `apps/dashboard/STRUCTURE.md`, and removing the duplicate web-local `useZodForm` hook in favor of `@halaalvest/ui/hooks/use-zod-form`.
- 2026-04-15: Continued the migration on public/auth entry flows by rebuilding `apps/web` signup and onboarding forms on shared `Form` / `FormField` primitives plus `@halaalvest/ui/hooks/use-zod-form`, and by switching the dashboard login screen to shared input and button components instead of raw styled controls.
- 2026-04-15: Took the `members` module through the next Midday-style slice by adding feature-owned `server/` loaders plus `data-display/` views, shrinking the member list/detail/statement route files down to orchestration and preserving the heavy UI in reusable member-specific surfaces.
- 2026-04-15: Reworked the members list page again to follow the Midday invoices pattern more closely, with separate summary widgets, a dedicated page-header/action row, and a dedicated members data-table module instead of one bundled registry block.
- 2026-04-15: Pushed the members list further toward the Midday reference by dropping the older shared dashboard `data-display` wrappers from the visible page UI and replacing them with page-owned Midday-style summary cards, badges, filter row, and table shell.
- 2026-04-15: Extended the same Midday-style route-thinning pattern to `contributions` by introducing feature-owned `server/` loaders and a contribution-specific `data-display/` view, leaving the route focused on database-runtime fallback and page composition.
- 2026-04-15: Extended the same pattern to `loans` by introducing feature-owned `server/` loaders and a loan-specific `data-display/` view, shrinking the route to runtime fallback plus orchestration while preserving review, liquidity, and disbursement workflows.
- 2026-04-15: Added an in-office-by-default member signup gate plus a dedicated `/app/member-signup-links` control page, with tenant-level access mode, staff-issued signed signup links, expiry/cap controls, link rotation, per-link analytics, and shortcut entry points from the members and membership approvals pages.
- 2026-05-01: Hardened dashboard auth against the `plot-keys` reference by adding a Next `proxy.ts` guard/header injector, signing host-scoped session tokens, ignoring spoofable auth headers in server context, and limiting passwordless dev quick-login to non-production.
- 2026-05-01: Refactored the members page search/filter architecture toward the Midday invoice search-filter pattern by introducing `components/search-filter`, moving member page widgets into `components/members`, preserving URL/server filter behavior, improving filter labels, and documenting the updated folder ownership.
- 2026-06-30: Completed Phase 0-2 of the Midday dashboard table-core parity rollout by auditing the table contract, adding Midday table runtime dependencies, restoring the advanced `tables/core` surface, splitting legacy static table wrappers into `components/dashboard/static-table.tsx`, and adding initial table settings/config support primitives.
- 2026-06-30: Completed Phase 3 of the Midday dashboard table-core parity rollout by adding Midday-style settings persistence, initial settings loading, DnD, horizontal scroll, infinite scroll, sort URL params, scroll-header behavior, draggable headers, resize handles, and horizontal pagination primitives.
- 2026-06-30: Completed Phase 4 of the Midday dashboard table-core parity rollout by tightening table ID/config coverage for operational table migration targets, including default hidden columns, sticky columns, sort maps, non-reorderable columns, row heights, and summary heights.

### Add automatic local database readiness to dev starters

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-20-feature-automatic-local-database-readiness-for-dev-starters.md`.
- Related Feature: Automatic Local Database Readiness for Dev Starters
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-20-feature-automatic-local-database-readiness-for-dev-starters.md
- Created Date: 2026-06-20

### Add Midday Finance Secondary Menu

- Priority: Medium
- Description: Track plan in `brain/plans/2026-06-21-feature-midday-finance-secondary-menu.md`.
- Related Feature: Midday Finance Secondary Menu
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-21-feature-midday-finance-secondary-menu.md
- Created Date: 2026-06-21

### Staged Monthly Contribution Generation

- Priority: High
- Description: Implemented current-month staged contribution visibility backed by generated monthly-record member rows.
- Related Feature: Monthly contribution generation
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-staged-monthly-contribution-generation.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Password Signup And Reset Flow

- Priority: High
- Description: Added tenant-admin password setup during onboarding and verified the existing non-enumerating reset flow.
- Related Feature: Authentication
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-password-signup-and-reset.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Admin Controlled Signup Visibility And Approval

- Priority: High
- Description: Added hidden and disabled signup modes while preserving admin approval for member applicants.
- Related Feature: Member signup and approvals
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-admin-controlled-signup-approval.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Marketing And Auth Experience Redesign

- Priority: Medium
- Description: Cleaned public/auth positioning, removed fake proof claims, and made signup CTA visibility policy-aware.
- Related Feature: Public marketing and auth UX
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-ux-ui-marketing-and-auth-redesign.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### First Run Onboarding Wizard

- Priority: High
- Description: Added an empty-workspace onboarding route and admin redirect that guides charges, shares, business, members, migration, loans, and commitments.
- Related Feature: Tenant onboarding
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-06-27-feature-first-run-onboarding-wizard.md
- Intake File: brain/intake/2026-06-27-halaalvest-product-and-onboarding.md
- Created Date: 2026-06-27
- Completed Date: 2026-06-27

### Business Profit Policy Settings

- Priority: High
- Description: Added tenant business profit policy storage, settings form, audit-backed update action, and migration readiness support for explicit no-historical-profit mode.
- Related Feature: Business profit policy
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-02-feature-business-profit-policy-settings.md
- Intake File: brain/intake/2026-07-02-business-profit-and-policy-workspaces.md
- Created Date: 2026-07-02
- Completed Date: 2026-07-02

### Business Profit Operations Workspace

- Priority: High
- Description: Added `/business` as the operational business profit workspace with Finance sidebar navigation, members-style summary/header/table structure, and moved the business registry table out of settings.
- Related Feature: Business profit operations
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-02-feature-business-profit-operations-workspace.md
- Intake File: brain/intake/2026-07-02-business-profit-and-policy-workspaces.md
- Created Date: 2026-07-02
- Completed Date: 2026-07-02

### Inclusive Interest-Free Cooperative Positioning

- Priority: Medium
- Description: Track plan in `brain/plans/2026-07-03-feature-inclusive-interest-free-cooperative-positioning.md`.
- Related Feature: Inclusive interest-free cooperative positioning
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-03-feature-inclusive-interest-free-cooperative-positioning.md
- Created Date: 2026-07-03

### Loan Policy And Monthly Financing Cycle Model

- Priority: High
- Description: Added tenant financing-cycle policy fields, monthly cycle snapshots, preview/open/status/policy DB helpers, seed/test defaults, and focused query tests.
- Related Feature: Monthly financing cycle loan settings
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-08-feature-loan-policy-and-monthly-financing-cycle-model.md
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`

### Financing Settings Workspace

- Priority: High
- Description: Added the live `/settings/finance/loan` financing settings workspace with current-month capacity preview, audited tenant policy/product/cycle actions, client forms, and a separated legacy loan migration section.
- Related Feature: Monthly financing cycle loan settings
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-08-feature-financing-settings-workspace.md
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`

### Loan Intake Capacity Enforcement And Dashboard Visibility

- Priority: High
- Description: Added current-cycle quota enforcement for quick/normal financing request intake, deployable-funds disbursement blocking, loan workspace capacity visibility, and overview financing-cycle warning counts.
- Related Feature: Monthly financing cycle loan settings
- Status: Done
- Plan Status: Done
- Plan File: brain/plans/2026-07-08-feature-loan-intake-capacity-enforcement-and-dashboard-visibility.md
- Intake File: brain/intake/2026-07-08-monthly-financing-cycle-loan-settings.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts`; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`

### Share Configuration Option

- Priority: High
- Description: Added tenant-level share unit amount, compulsory share units, and maximum share units with audited admin settings surfaces in Getting Started and finance share settings.
- Related Feature: Client-fit share policy
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only; `git -C /Users/M1PRO/Documents/code/halaal-coperative diff --check`

### Share Model Selection

- Priority: High
- Description: Added a tenant share configuration mode so each cooperative chooses either monthly share history or unit-based shareholding, with dashboard surfaces, backfill behavior, and policy saves honoring only the selected model.
- Related Feature: Client-fit share policy
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts src/queries/backfill-migration-input.test.ts`; `bun --cwd packages/db test src/queries/migration.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`

### Member Share Application Workflow

- Priority: High
- Description: Added tenant-scoped optional share applications for unit-based shareholding, with pending/reviewed statuses, approval posting to share capital, audit metadata, finance-role actions, and a shares settings review queue.
- Related Feature: Client-fit share policy
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Support Case Workflow

- Priority: High
- Description: Added staff-managed support cases with tenant/member scoping, messages, assignment, priority/status updates, resolution summaries, money-impact flags, audit entries, `/support` workspace, navigation, and dashboard action-queue visibility.
- Related Feature: Client-fit customer service and activity reporting
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Support Feature Request Intake

- Priority: High
- Description: Added a dedicated `feature_request` support case category so staff and members can capture, assign, discuss, export, and audit product feedback inside the existing support workflow.
- Related Feature: Client-fit feature request capture and triage
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/support.test.ts`

### Operational Trust Readiness

- Priority: High
- Description: Added a tenant-admin Trust Readiness settings page for pilot posture across exports, restore/legal readiness, monitoring, feature-request intake, beta reliability expectations, and safe error disclosure, plus a generic dashboard error boundary that hides raw crash details.
- Related Feature: Client-fit legal/security/reliability posture
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: Targeted `rg` for Trust Readiness, Sentry DSN detection, safe error boundary, and feature-request references; `git diff --check` scoped to touched tracked files; `git diff --check --no-index /dev/null ...` for new files

### Member Support Self-Service

- Priority: High
- Description: Added member-scoped support case creation, status visibility, message history, and member replies on `/support` for users with linked member profiles, while preserving the staff tenant-wide support queue.
- Related Feature: Client-fit customer service and activity reporting
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint

### Member Payment Receipt Submission And Review

- Priority: High
- Description: Added staged payment receipts with proof/reference metadata, category and target-period allocations, finance review decisions, audited allocation adjustments, duplicate non-rejected reference/proof checks, supported approval posting through contribution/repayment ledgers, `/payment-receipts` workspace, navigation, and dashboard action-queue visibility.
- Related Feature: Client-fit receipt submission and future/back payment allocation
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts src/queries/contributions.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Member Payment Receipt Self-Service

- Priority: High
- Description: Added member-scoped payment receipt submission, allocation splitting, status visibility, review-note visibility, and member-only plan/loan option loading on `/payment-receipts` for linked member profiles.
- Related Feature: Client-fit receipt submission and future/back payment allocation
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint

### Receipt-Linked Support Cases

- Priority: High
- Description: Added receipt-linked support case creation from staff and member payment receipt rows, with member receipt-link validation, support queue linked-record context, and audit-backed non-posting resolution evidence for payment mistakes.
- Related Feature: Client-fit customer service and member payment receipt issue resolution
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Cooperative Operation Profile Full QA

- Priority: High
- Description: Completed the website-first/mobile-second QA cycle for tenant Operation Profile configuration, including Getting Started, Settings, staff/member service workspaces, reports/navigation preservation, security/audit boundaries, visual/accessibility coverage, mobile DTO/screen consumption, and final ship recommendation.
- Related Feature: Cooperative Operation Profile
- Status: Done
- Plan Status: Done
- Plan File: `.scratch/cooperative-operation-profile-full-qa/map.md`
- Created Date: 2026-07-12
- Completed Date: 2026-07-12
- Checks: `bun --filter @halaalvest/dashboard typecheck`; `bun run typecheck:mobile`; `bun test apps/api/src/routers/mobile.route.test.ts`; `bun run --filter @halaalvest/mobile check:smoke`; `bun run --filter @halaalvest/mobile check:native-imports`; final compact regression `bun test packages/db/src/queries/operation-profile.test.ts apps/dashboard/src/lib/navigation/lib.test.ts apps/api/src/routers/mobile.route.test.ts packages/db/src/queries/members.test.ts` passed with 105 tests and 0 failures.

### Support Case CSV Export

- Priority: High
- Description: Added workspace-admin support-case CSV export with tenant scope, date filters, linked record fields, money-impact flags, assignment, resolution evidence, message counts, and Reports catalog access.
- Related Feature: Client-fit exportable support and governance records
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/support.test.ts`; package-local targeted ESLint commands with warnings only for DB and clean dashboard lint; `git diff --check`

### Support Case Notification Events

- Priority: High
- Description: Added registered support notification events for case creation, replies, and status updates, with staff role emails for member-created activity and direct audited member emails for staff-created cases, staff replies, and status changes when member email is available.
- Related Feature: Client-fit customer service notifications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun test packages/notifications/src/types/support.test.ts`; `bun --cwd packages/db test src/queries/support.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage

### Payment Receipt Status Notifications

- Priority: High
- Description: Added the registered `member_payment_receipt.status_changed` notification event and direct audited member emails when finance reviews move a receipt to approved, rejected, correction-requested, or under-review status and the linked member has an email address.
- Related Feature: Client-fit receipt submission notifications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun test packages/notifications/src/types/payment-receipts.test.ts`; `bun --cwd packages/db test src/queries/payment-receipts.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage

### Loan And Share Request Status Notifications

- Priority: High
- Description: Added direct audited member emails for financing request review status changes and optional share application review status changes, backed by registered notification events and member-email contact from the reviewed tenant-scoped records.
- Related Feature: Client-fit member request status notifications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun test packages/notifications/src/types/member-request-status.test.ts`; `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; `bun --cwd packages/db test src/queries/loans.test.ts`; targeted package ESLint commands with warnings only for existing `any` usage

### Member Share Self-Service

- Priority: High
- Description: Added member-scoped `/shares` self-service for linked member profiles, with unit-share position summary, optional share request submission, application history, and selected-model gating so monthly-history cooperatives do not expose unit-share requests.
- Related Feature: Client-fit share configuration and member optional share applications
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/tenant-finance.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Financing Policy Guards

- Priority: High
- Description: Added tenant-configurable financing guardrails for special-savings eligibility, strict commitment during active financing, active-financing quick/emergency blocking, and future procurement overlap policy, with enforcement in loan request submission and contribution-plan updates plus audited finance settings controls.
- Related Feature: Client-fit financing policy settings
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/financing-cycles.test.ts src/queries/loans.test.ts src/queries/contributions.test.ts`; package-local targeted ESLint commands with warnings only for DB/API and clean dashboard lint; `git diff --check`

### Financing Guarantor Approval

- Priority: High
- Description: Added tenant-scoped guarantor approval evidence for loan requests, optional guarantor selection on loan submission, direct email requests for guarantors with email addresses, finance-staff response recording, audit entries, dashboard visibility, and a final approval gate that blocks loan materialization until selected guarantors approve.
- Related Feature: Client-fit guarantor approval workflow
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/loans.test.ts`

### Procurement Request Workflow

- Priority: High
- Description: Added tenant-scoped procurement requests with item/vendor details, requested and approved cost, repayment months, monthly repayment estimate, finance review status, audit entries, active-financing policy enforcement, `/procurement` workspace, Finance navigation, and overview action-queue visibility.
- Related Feature: Client-fit procurement financing
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-08
- Completed Date: 2026-07-08
- Checks: `bun --cwd packages/db db:generate`; `bun --cwd packages/db test src/queries/procurement.test.ts`

### Financing Early Settlement

- Priority: High
- Description: Added repayment settlement behavior so a repayment that clears outstanding financing principal completes the loan, stops remaining unpaid schedule servicing through waived schedule rows, and records audit metadata for the settlement.
- Related Feature: Client-fit financing repayment controls
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/loans.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`

### Activity Report Governance Fields

- Priority: High
- Description: Upgraded the reports audit route into a clearer activity report with normalized performer, authorizer/reviewer, entity, timestamp, and compact metadata-summary fields, plus matching CSV export columns.
- Related Feature: Client-fit activity reporting
- Status: Done
- Plan Status: Done
- Plan File: brain/specs/2026-07-08-client-fit-cooperative-operations-expansion.md
- Created Date: 2026-07-09
- Completed Date: 2026-07-09
- Checks: `bun --cwd packages/db test src/queries/audit.test.ts`; package-local targeted ESLint commands with warnings only; `git diff --check`

### Cooperative Onboarding QA Gap Fixes

- Priority: High
- Description: Resolved the local onboarding QA gaps by adding member-detail portal access emails for existing staff-created members, opening `/loans` as a member-scoped self-service request route, and making local reserved-domain notification delivery console-backed in non-production.
- Related Feature: Member self-service dashboard; member signup gating and links
- Status: Done
- Plan Status: Done
- Plan File: .scratch/wayfinder-cooperative-onboarding-qa/QA-REPORT.md
- Created Date: 2026-07-14
- Completed Date: 2026-07-14
- Checks: `bun test packages/notifications/src/server.test.ts`; `bun test apps/dashboard/src/lib/navigation/lib.test.ts`; `bun test packages/db/src/queries/members.test.ts`; `bun --filter @halaalvest/notifications typecheck`; `bun --filter @halaalvest/api typecheck`; `bun --filter @halaalvest/dashboard typecheck`; `bun --filter @halaalvest/db typecheck`

### Workflow Sheet And Modal Presentation Audit

- Priority: High
- Description: Audited dashboard workflow sheets against Midday interaction patterns, added a typed presentation registry and shared responsive presentation shell, retained long contextual entry flows as sheets, and moved focused review, approval, import, settings, and confirmation workflows to centered presentations without changing URL parameters or backend contracts.
- Related Feature: Workflow sheet and modal presentations
- Status: Done
- Plan Status: Done
- Created Date: 2026-07-26
- Completed Date: 2026-07-26
- Checks: `bun test apps/dashboard/src/lib/workflow-presentations.test.ts apps/dashboard/src/lib/workflow-presentation-usage.test.ts apps/dashboard/src/lib/members/member-opening-position-modal.test.ts`; `bun --filter @halaalvest/dashboard typecheck`; dashboard lint; browser QA

### Payment Receipt Review Dialog UX

- Priority: High
- Description: Rebuilt the finance payment-receipt review dialog around receipt evidence, allocation verification, and a clear review decision; added a fixed header and action footer, an independently scrollable body, standard currency controls, category-specific allocation targets, reconciliation and required-note validation, and decision-specific posting consequences.
- Related Feature: Member payment receipts
- Status: Done
- Plan Status: Done
- Created Date: 2026-07-27
- Completed Date: 2026-07-27
- Checks: `bun --filter @halaalvest/dashboard typecheck`; targeted dashboard lint with no errors and one existing shared-wrapper warning; `bun test apps/dashboard/src/lib/workflow-presentations.test.ts apps/dashboard/src/lib/workflow-presentation-usage.test.ts`; browser QA of review, approval-selection, scrolling, and reset without submission

### Cooperative-Subdomain Email Sender Identity

- Priority: High
- Description: Replaced the global `Welcome to Halaalvest` sender label with tenant-scoped outbound identities using the cooperative display name and immutable workspace slug on the configured sender domain, while retaining platform fallback email before a workspace slug exists.
- Related Feature: Cooperative email sender identity; internal QA email routing; public signup and onboarding
- Status: Done
- Plan Status: Done
- Rollout Status: Pending confirmation that `halaalvest.com` is verified in Resend and tenant/platform canary delivery is successful
- Created Date: 2026-07-27
- Completed Date: 2026-07-27
- Checks: `bun test packages/notifications/src` (50 pass); notification, API, dashboard, marketing, jobs, and database typechecks; targeted lint with no errors; `bun test` (643 pass, with four unrelated existing failures in Quick Fill coverage and dashboard operation-profile mocks); source audit. External Resend domain verification and delivery canaries remain pending.

### School Clerk Local-Infra Standardization

- Priority: Medium
- Description: Replaced Halaalvest's project-local dev router, env loader, PostgreSQL starter, and port cleanup with the shared `local-infra-kit` profile; standardized mode files and database commands; and configured local PostgreSQL for `127.0.0.1:55432/halaalvest`.
- Related Decision: ADR-015
- Status: Done
- Rollout Status: Database backup completed and validated; runtime rename and container recreation pending because `school-clerk-postgres` owns port `55432`
- Created Date: 2026-07-28
- Completed Date: 2026-07-28
- Checks: focused database-router, fail-closed launcher, and infrastructure-contract tests; configuration parsing; legacy-reference scan; inherited env-mode validation; local port-owner rejection; Prisma generation; monorepo typecheck; validated custom-format database backup. Live database cutover and local dev smoke intentionally skipped while port `55432` is occupied.

### Organic Trust Marketing And Public Setup Redesign

- Priority: High
- Description: Replaced the generic split launch/prelaunch landing variants with one responsive Organic Trust marketing experience, added a domain-shaped sample cooperative workspace, clarified product, migration, trust, and subscription narratives, preserved the full five-plan comparison on a dedicated pricing page, and unified early access, signup, verification, profile, and ready states into a five-stage public setup presentation without changing signed-token or API behavior.
- Related Feature: Public signup and onboarding; cooperative platform positioning
- Status: Done
- Plan Status: Done
- Created Date: 2026-08-01
- Completed Date: 2026-08-01
- Checks: focused marketing regression tests; marketing typecheck and lint; responsive browser screenshots; live anchor, early-access field, and onboarding recovery QA; `git diff --check`

### Versioned Marketing Experience Activation

- Priority: High
- Description: Added typed, lazily loaded marketing experience versions; retained Organic Trust as the production-ready fallback; implemented Ramp v2 as a distinct responsive editorial landing experience with domain-shaped product, migration, trust, pricing, and early-access sections; added a noindex, token-gated production preview route; and separated visual activation from launch stage and early-access policy without changing signup or onboarding contracts.
- Related Feature: Public signup and onboarding; Ramp-inspired marketing redesign
- Related Decision: ADR-019
- Status: Done
- Plan Status: Done
- Created Date: 2026-08-11
- Completed Date: 2026-08-11
- Checks: focused marketing/domain tests; marketing and domain typechecks; marketing lint; live desktop browser QA with no console errors; `git diff --check`

## Logly QA analytics exclusion — source complete 1 October 2026

- [x] Exclude server-confirmed QA accounts, QA sessions and QA workspaces.
- [x] Separate collection permission from attribution availability.
- [x] Gate Dashboard, Marketing and Android capture/retry; clear queued analytics on denial.
- [x] Suppress authenticated browser QA submissions at ingest.
- [x] Add focused policy, queue and mobile-server contract regression coverage.
- [x] Update feature, API contract and decision documentation.

Source complete; deployment and live browser/device acceptance are separate release work. No Prisma changes or migration commands required. See [feature](../features/logly-analytics.md) and [decision](../decisions/2026-10-01-logly-qa-exclusion.md).

QA-exclusion validation: 45 focused tests / 204 assertions pass. Events, API, Dashboard, Marketing and Mobile full TypeScript checks pass; scoped diff checks pass. No deployment or live network acceptance is claimed.


## 2026-10-01 — Environment launcher icon source implementation

- Integrated the approved green Production, cobalt Preview and red Development
  PNG families, including dedicated Preview launcher/adaptive/iOS light/dark files.
- Expo config, 71 image/config assertions, focused formatting/diff checks,
  NativeWind/UI contract and disposable Android Preview prebuild pass.
- Generated Preview launcher raster inspected. Native installation is separate
  release work; existing phone icons have not been changed.
- Feature record: [mobile launcher icons](../features/mobile-launcher-icons.md).
