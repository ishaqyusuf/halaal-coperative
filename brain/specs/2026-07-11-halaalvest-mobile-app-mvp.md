# Spec: Halaalvest Mobile App MVP

## Problem Statement

Halaalvest now has a broad cooperative operations platform for member onboarding, commitments, savings, shares, interest-free financing, procurement, Foodstuff Purchase, project financing requests, payment receipts, support cases, exports, and audit history. The web dashboard has moved far enough for a pilot cooperative, but mobile delivery is still only a starter shell with mock roles and static cards.

From the cooperative member's perspective, the platform is incomplete until they can open a trusted mobile app, see their own cooperative position, submit receipts and requests, respond to guarantor approvals, follow support cases, and understand what needs action without visiting the office or using the staff dashboard.

From the cooperative admin's perspective, the app must also support daily field work: reviewing urgent queues, finding members, checking KYC or payment status, following up on overdue obligations, approving safe workflows, and seeing operational risk. It must not become a second, divergent product. The mobile app must follow the same principle as the ongoing EwaTrade mobile app: Expo, typed tRPC, NativeWind-first reusable primitives, thin screens, server-owned business rules, and no drift into screen-local finance logic.

The current risk is architectural drift. Halaalvest already has an Expo mobile workspace, but it uses local mock sessions and static template data. If the MVP is built by copying dashboard behavior directly into mobile screens, the app will duplicate finance calculations, weaken tenant/role boundaries, and make money state harder to audit. If the MVP waits for a perfect full mobile rewrite, members and staff lose a major adoption surface.

## Solution

Evolve the existing Halaalvest mobile starter into a production-ready MVP using the same mobile architecture principles demonstrated in EwaTrade.

The mobile app should remain an Expo Router app with separate auth, member, and admin route groups. It should keep the provider stack, typed tRPC client, NativeWind UI primitives, safe-area handling, keyboard controller, bottom-sheet forms, theme support, and manual update surface that already match the EwaTrade direction. The current local mock role flow should be replaced by signed mobile sessions, tenant resolution, active membership resolution, and a role/workspace switcher.

The MVP should deliver two production experiences:

1. A member app for self-service account trust: home, commitments, financing, shares, receipts, requests, guarantor approvals, statements, notifications, support, KYC/profile readiness, procurement, project financing, and Foodstuff Purchase visibility.
2. An admin app for daily cooperative operations: exception-led overview, member search/detail, onboarding/KYC queues, payment receipt review, financing request review, procurement/Foodstuff Purchase/project financing queues, support cases, reports, staff role visibility, and safe follow-up actions.

The mobile app must call the same backend authorization and business rule layer as the web dashboard. Mobile screens render server-shaped DTOs and submit typed actions. They do not calculate balances, eligibility, repayment state, share capital, receipt posting effects, procurement settlement, Foodstuff Purchase profit, or audit-sensitive decisions on device. Offline behavior is read-cache and draft-first for MVP; privileged money actions require online server confirmation.

## User Stories

1. As a member, I want to sign in with my existing cooperative account, so that I do not have a separate mobile-only identity.
2. As a member, I want the mobile app to resolve my tenant and member profile automatically, so that I only see my own cooperative records.
3. As a member, I want to see my cooperative name, logo, and theme after login, so that I trust I am in the right workspace.
4. As a member, I want to see my member number, KYC status, membership status, and profile readiness, so that I know whether my account needs attention.
5. As a member, I want a home overview of savings, special savings, commitment, financing exposure, share capital, pending actions, and recent activity, so that I understand my current position quickly.
6. As a member, I want my home screen to highlight missing documents, pending receipts, overdue obligations, guarantor requests, and support replies, so that I can act before issues escalate.
7. As a member, I want to see my active monthly commitment, so that I know what I am expected to contribute.
8. As a member, I want to see current-month, future, and back/defaulted contribution status, so that payment expectations are clear.
9. As a member, I want to see my contribution history, so that I can verify posted savings and special savings.
10. As a member, I want to see extra savings separately from ordinary commitment savings, so that voluntary savings are not mixed with required contributions.
11. As a member, I want to submit a payment receipt from mobile, so that I can provide proof of payment without visiting the office.
12. As a member, I want to split a receipt across commitment, special savings, financing, shares, procurement, Foodstuff Purchase, or project financing where supported, so that one payment can reflect my real intent.
13. As a member, I want to mark whether a payment is current, future, or back/defaulted period, so that finance staff can review the allocation correctly.
14. As a member, I want to upload or attach proof metadata for a receipt, so that finance staff have evidence before posting.
15. As a member, I want to see receipt statuses such as submitted, under review, correction requested, approved, or rejected, so that I know what happened to my payment.
16. As a member, I want to open a support case from a receipt, so that payment mistakes stay connected to the reviewed receipt.
17. As a member, I want to see financing eligibility guidance from current tenant policy, so that I do not submit a request that is obviously outside policy.
18. As a member, I want to request interest-free cooperative financing from mobile, so that I can start the application without staff retyping my details.
19. As a member, I want the financing request form to show quick/normal product options, term limits, servicing estimate, and policy warnings, so that I understand the request before submitting.
20. As a member, I want to add purpose notes and optional extra monthly savings to a financing request, so that staff can review the complete context.
21. As a member, I want to see the status of my submitted financing requests, so that I know whether they are submitted, under review, awaiting guarantors, approved, rejected, disbursed, active, or completed.
22. As a member, I want to see my active financing profile and repayment schedule, so that I understand what is due and what has been paid.
23. As a member, I want to see whether disbursement is blocked by deployable funds or missing approvals, so that approval is not confused with guaranteed cash release.
24. As a guarantor member, I want to see pending guarantor approval requests, so that I can approve or reject only requests linked to my own member profile.
25. As a guarantor member, I want my guarantor response to require notes where appropriate and create audit evidence, so that my consent or rejection is traceable.
26. As a member, I want to request procurement for cooperative-purchased items, so that I can track item purchase requests separately from ordinary financing.
27. As a member, I want procurement requests to show item, vendor, requested cost, approved cost, repayment months, due schedule, paid amount, and outstanding amount, so that obligations are explainable.
28. As a member, I want to submit a project financing request for my business, so that the cooperative can review the request before deciding the accounting structure.
29. As a member, I want project financing to show whether the structure is undecided, repayable facility, investment partnership, or profit sharing, so that it is not treated like a normal loan by mistake.
30. As a member, I want to apply for Foodstuff Purchase within an active monthly cycle, so that staple purchase requests can be reviewed by the committee.
31. As a member, I want Foodstuff Purchase applications to show requested amount, approved amount, payback months, paid amount, outstanding amount, and review status, so that the monthly operation is transparent.
32. As a member, I want to see my share capital, compulsory shares, optional share applications, share ledger movement, and published dividend allocations, so that I understand my ownership position.
33. As a member, I want to apply for optional shares when the tenant uses unit-based shareholding, so that I can increase my shareholding within policy limits.
34. As a member, I want to download or open my statement from mobile, so that I can keep a personal record of savings, financing, shares, payments, and published dividends.
35. As a member, I want notifications for receipt review, financing review, procurement review, Foodstuff Purchase review, project financing review, share review, guarantor requests, and support replies, so that I do not miss important changes.
36. As a member, I want notifications to avoid unsafe sensitive detail when shown outside the app, so that private financial amounts are not leaked.
37. As a member, I want to open support cases and reply to staff, so that account questions and payment issues stay inside the cooperative record.
38. As a member, I want support cases that affect money to show that finance adjustment approval is needed, so that I know support replies do not silently change balances.
39. As a member with intermittent connectivity, I want cached read-only account data with a stale timestamp, so that I can still inspect recent information offline.
40. As a member, I want the app to require network confirmation before submitting money-affecting requests, so that offline drafts do not create unsafe records.
41. As a user with both member and staff roles, I want a workspace switcher, so that I can move between member self-service and admin operations without separate accounts.
42. As an operations officer, I want a mobile admin overview that leads with action queues, so that I can see what needs review today.
43. As an operations officer, I want the admin home screen to show pending membership approvals, KYC reviews, receipt reviews, financing requests, procurement requests, Foodstuff Purchase applications, project financing requests, support cases, and setup warnings, so that urgent work is visible.
44. As a finance officer, I want mobile metrics for deployable funds, collection coverage, portfolio risk, and overdue follow-ups, so that I can assess financial safety before approving work.
45. As a finance officer, I want every mobile admin metric to come from server DTOs, so that the app does not calculate money safety locally.
46. As an operations officer, I want to search and filter members, so that I can find a member during office or field work.
47. As an operations officer, I want member detail to show profile, KYC, status, linked user, commitments, savings, financing, shares, receipts, and support context, so that I can respond with full context.
48. As an operations officer, I want to create or invite members from mobile when permitted, so that field onboarding can start without returning to desktop.
49. As an operations officer, I want to review member onboarding and KYC queues from mobile, so that pending accounts are not blocked by desk availability.
50. As a finance officer, I want to review payment receipts from mobile, so that submitted proofs can move quickly from staged to approved, rejected, or correction requested.
51. As a finance officer, I want receipt approval to remain server-side and auditable, so that mobile review cannot bypass duplicate checks, allocation validation, or posting rules.
52. As a finance officer, I want to request correction on unclear receipt allocations, so that members can clarify without staff guessing.
53. As a finance officer, I want to review financing requests from mobile, so that urgent cooperative financing work can progress.
54. As a finance officer, I want financing approval to enforce policy caps, cycle capacity, guarantor state, member eligibility, and deployable-funds safeguards, so that mobile approval is not weaker than web approval.
55. As a finance officer, I want disbursement evidence and high-risk finance changes to remain explicit and role-gated, so that mobile actions are governed.
56. As a finance officer, I want to see repayment schedule risk and collections follow-up state, so that overdue member work can be prioritized.
57. As a finance officer, I want to record collection follow-up notes from mobile, so that field conversations are captured in the system.
58. As a finance officer, I want procurement requests to be reviewed separately from ordinary financing, so that item, vendor, cost, and repayment plan are explainable.
59. As a committee staff member, I want to review Foodstuff Purchase applications from mobile where my role permits, so that monthly committee work can happen quickly.
60. As a finance/admin user, I want Foodstuff Purchase accounting review to remain separate from member application approval, so that committee profit evidence does not accidentally post member savings or dividends.
61. As a finance officer, I want project financing requests to remain staged until structure and accounting treatment are clear, so that mobile does not turn every business request into a loan.
62. As a tenant admin, I want to view staff and role assignments from mobile, so that I can confirm access boundaries.
63. As a tenant admin, I want to invite staff or members from mobile only where permissions allow it, so that user provisioning remains controlled.
64. As a tenant admin, I want role changes and invitations from mobile to create audit evidence, so that access management is traceable.
65. As a staff user, I want mobile report previews and download/share links for member statements, collections, financing, shares, receipts, support, procurement, Foodstuff Purchase, project financing, and audit activity, so that governance data can be accessed away from desktop.
66. As a staff user, I want mobile report surfaces to show compact summaries before exports, so that phone screens stay usable.
67. As a staff user, I want recent activity to include actor, reviewer/authorizer, affected record, timestamp, and compact metadata, so that governance evidence is readable.
68. As a platform operator, I want the mobile app to use signed bearer/mobile sessions rather than trusted user-id headers, so that production mobile auth is secure.
69. As a platform operator, I want mobile tenant context to be server-derived, so that the client cannot choose another tenant by changing request headers.
70. As a platform operator, I want member self-service procedures to derive the member from the authenticated user, so that members cannot request another member's data.
71. As a platform operator, I want admin mobile procedures to reuse the same role hierarchy as web, so that tenant admin, finance officer, operations officer, and member access stay consistent.
72. As a platform operator, I want session refresh and logout to clear secure native storage, so that mobile session state is not stale or unsafe.
73. As a platform operator, I want app variant, build channel, and update metadata visible in a manual update screen, so that support can diagnose installed builds.
74. As a platform operator, I want development and preview app variants to install separately from production, so that test builds do not overwrite pilot builds.
75. As a platform operator, I want runtime tenant branding to load from API, so that one shared binary can serve multiple cooperatives.
76. As a platform operator, I want tenant-specific build-time branding to remain possible later, so that white-label app-store builds can be introduced without changing core architecture.
77. As a developer, I want mobile screens to stay thin, so that navigation files compose data hooks and views rather than owning domain logic.
78. As a developer, I want reusable mobile primitives for screen layout, safe area, pressable buttons, icon buttons, text, form fields, OTP/session forms, bottom sheets, status rows, metric cards, and empty states, so that workflows are consistent.
79. As a developer, I want keyboard-aware bottom sheets and forms, so that receipt, request, login, approval, and support inputs remain visible on small phones.
80. As a developer, I want NativeWind to be the default styling system, so that the app follows the EwaTrade mobile pattern and avoids scattered inline styles.
81. As a developer, I want long member, receipt, notification, and request lists to use virtualized lists, so that real cooperative data does not make mobile sluggish.
82. As a developer, I want tRPC inputs and outputs to be the production contract, so that mobile and API stay typed end to end.
83. As a developer, I want mobile-safe shared imports only, so that mobile never imports web UI, dashboard components, Next.js helpers, or browser-only modules.
84. As a developer, I want finance and policy calculations to live in database query/service/domain modules, so that mobile UI cannot drift from web behavior.
85. As a developer, I want native-safety checks for mobile imports, so that future work cannot accidentally pull web-only packages into the bundle.
86. As a tester, I want mobile auth tests to prove login, refresh, logout, role resolution, and tenant scoping, so that signed sessions are trustworthy.
87. As a tester, I want member self-service API tests to prove the authenticated member can only see their own records, so that privacy boundaries hold.
88. As a tester, I want admin mobile API tests to prove role-gated access for approvals and queues, so that staff cannot perform actions above their role.
89. As a tester, I want mobile receipt tests to prove submitted receipts remain staged until finance approval, so that member proofs do not update balances prematurely.
90. As a tester, I want mobile financing tests to prove policy, capacity, guarantor, and deployable-fund guardrails, so that approval behavior matches the web platform.
91. As a tester, I want mobile procurement, Foodstuff Purchase, and project financing tests to prove each workflow stays separate, so that obligations and accounting evidence do not mix.
92. As a tester, I want mobile UI smoke tests for startup routing, login, role switch, member tabs, admin tabs, form submission states, and offline/stale banners, so that the app works on real phone layouts.
93. As a tester, I want visual QA on compact Android and iOS viewports, so that buttons, tabs, sheets, and long labels do not overlap or clip.
94. As a product owner, I want the MVP to keep EwaTrade's architecture principles exactly, so that mobile work can move quickly without creating a second standard.
95. As a product owner, I want the first release to prioritize useful member self-service and safe admin operations, so that the app is pilot-ready without pretending every desktop workflow is complete.

## Implementation Decisions

- Treat this as the production mobile MVP specification for Halaalvest, replacing the earlier "future mobile" boundary in the client-fit cooperative operations spec.
- Preserve the existing mobile workspace and evolve it. Do not create a second mobile app, a separate mobile-only data model, or a separate mobile-only role system.
- Follow the EwaTrade mobile app principle exactly: Expo Router, NativeWind-first UI, typed tRPC, React Query, secure native session storage, keyboard-safe screens and bottom sheets, reusable mobile primitives, thin route files, and no screen-local business rules.
- Keep the current top-level mobile shell pattern: native gesture root, keyboard provider, navigation theme provider, auth provider, tRPC provider, bottom-sheet provider, toast/flash surfaces, status bar, manual update modal, and Expo Router stack.
- Keep route groups aligned to the current Halaalvest shell: auth routes, member routes, admin routes, shared notifications, shared updates, and not-found handling.
- Replace mock role sign-in with production mobile auth. The API must verify signed bearer/mobile session tokens or an equivalent signed session mechanism. Production mobile auth must not rely on client-supplied user-id headers.
- Add a mobile session contract that supports login, logout, refresh, current user, current tenant, active membership, available roles, member profile link, and tenant branding.
- Use one role/workspace resolver. Member-only users land in the member app, staff-only users land in the admin app, and users with both staff and member access get a switcher.
- Keep tenant context server-derived. The client may bootstrap with tenant lookup or a known slug, but every protected read/write must resolve tenant and membership on the server.
- Add mobile-friendly typed procedures rather than calling dashboard form actions directly. Recommended router areas are mobile auth/session, mobile me/bootstrap, member portal, admin mobile overview, mobile receipts, mobile financing, mobile requests, mobile support, mobile reports, and mobile notification/device registration.
- Reuse existing query/action modules for durable business behavior wherever possible. Add mobile DTO shaping only where the phone needs a different read shape from the dashboard.
- Keep server DTOs responsible for account summaries, balances, due/overdue status, eligibility previews, request state, action queues, and policy warnings.
- Do not duplicate finance calculations in mobile UI. Mobile may format values and render server-provided previews, but server procedures must revalidate every submission.
- Replace static template data with API-backed member and admin overview queries. Static data can remain only as development fallback fixtures when explicitly isolated from production mode.
- Keep member tabs: Home, Commitments, Financing, Shares, More. More should expose receipts, profile/KYC, procurement, project financing, Foodstuff Purchase, guarantor approvals, support, statements, notifications, security, and updates.
- Keep admin tabs: Overview/Work, Members, Finance, Reports, More. Finance should group receipt review, financing requests, procurement, Foodstuff Purchase, project financing, collections follow-up, shares/profit quick views, and mobile-safe charge visibility.
- Use the selected warm Halaalvest mobile template direction for visual language: calm background, compact white surfaces, dark primary actions, gold/green accents, bottom tabs, bottom sheets, status rows, and service grids. Do not use marketing-page hero composition inside the app.
- Preserve inclusive Halaalvest copy. Use interest-free, ethical, cooperative, transparent, financing, member-owned, and tenant-configurable terminology. Do not hard-code explicitly religious tone globally.
- Add runtime tenant branding from API: tenant name, mark/logo, primary/accent colors, support contact, and terminology overrides where available.
- Keep development and preview build variants separate through Expo app config. Tenant-specific app-store binaries remain a later build-time white-label layer.
- Keep manual app update behavior. Production updates should be conservative and user-visible, matching the EwaTrade/Halaalvest manual update pattern.
- Add device registration only when notification or sync work needs it. Device records should include user, tenant, platform, app version, build variant, push token when available, and revocation state.
- MVP offline behavior is read-cache and draft-first. Cached member/admin reads must show stale timestamps. Money-affecting submissions, approvals, postings, and role changes require network confirmation.
- Offline write queue for privileged money events is out of MVP unless it is server-validated, idempotent, conflict-aware, and routed through existing audit-safe procedures.
- Mobile receipt submission is staged only. Approval remains a finance/admin action and must reuse duplicate checks, allocation validation, supported posting paths, and audit logging.
- Mobile financing request submission must reuse existing product policy, monthly cycle capacity, special-savings eligibility, strict commitment mode, guarantor state, and deployable-funds safeguards.
- Mobile procurement, project financing, and Foodstuff Purchase workflows must remain separate from ordinary financing and from each other.
- Mobile support cases must not mutate money. Money-impact cases can show finance adjustment approval state, but actual posting, reversal, waiver, or adjustment remains in finance workflows.
- Mobile report surfaces should prioritize summaries, filters, and share/download links. Full spreadsheet-style management remains on the dashboard.
- Use virtualized lists for real member, receipt, request, notification, and report lists.
- Add native import safety rules so the mobile app cannot import dashboard components, web UI packages, Next.js route helpers, browser-only utilities, or unsafe shared barrels.
- Keep pure shared helpers in shared packages only when they are native-safe. Role helpers, formatting, route-neutral DTO types, and pure domain helpers are acceptable.
- Update Brain docs whenever mobile auth contracts, API DTOs, offline behavior, or product scope become durable.
- Implementation should be phased:
  - Phase 1: production mobile auth/session, tenant bootstrap, role resolver, tenant branding, and removal of mock sign-in from production mode.
  - Phase 2: member portal reads for home, commitments, savings, financing, shares, receipts, requests, support, notifications, and statement links.
  - Phase 3: member self-service submissions for receipts, financing, procurement, project financing, Foodstuff Purchase, optional shares, guarantor responses, and support.
  - Phase 4: admin operations reads for action queue, members, finance queues, collections, reports, and activity evidence.
  - Phase 5: admin mobile actions for safe review/follow-up flows: KYC/onboarding review, receipt review, financing review, procurement/Foodstuff Purchase/project review, support replies, collection notes, and staff/member invites where role permits.
  - Phase 6: hardening: native import tests, device registration, cached reads with stale markers, visual QA, performance checks, release checklist, and build/update documentation.

## Testing Decisions

- Tests should verify externally observable behavior: session acceptance/rejection, tenant scoping, member self-scoping, role-gated access, staged records, workflow state changes, server-returned DTOs, audit evidence, and mobile routing. Avoid tests that assert private component structure.
- The primary testing seam is the typed API/router caller backed by database query/action modules. This is the highest stable seam for mobile because the app should render server DTOs rather than own business rules.
- Add or extend database query/action tests for any mobile-exposed behavior not already covered by web tests, especially self-scoped member reads, receipt staging, financing request policy, guarantor response, procurement requests, Foodstuff Purchase applications, project financing requests, support cases, statements, and admin queue summaries.
- Add API/router tests for mobile auth/session bootstrap, role/workspace resolver, tenant branding bootstrap, member portal reads, admin mobile overview, and mobile-safe mutations.
- Add security tests proving that bearer/mobile sessions are verified and that client-supplied user-id, role, tenant, or member identifiers cannot override server context.
- Add member-boundary tests proving a member cannot read or mutate another member's receipts, statements, support cases, guarantor requests, financing requests, procurement requests, Foodstuff Purchase applications, project financing requests, or share applications.
- Add admin role tests proving operations officers, finance officers, tenant admins, and super admins see and can act only according to the shared role hierarchy.
- Add mobile auth flow tests or smoke tests for startup, login, logout, session refresh/expiry, role switch, and routing into member/admin tabs.
- Add mobile interaction tests for keyboard-heavy forms: login, receipt submission, financing request, procurement request, Foodstuff Purchase application, project financing request, support case, receipt review, and approval notes.
- Add visual QA on compact Android, typical Android, compact iOS, and tablet-width layouts for text fit, bottom tabs, safe areas, bottom sheets, status badges, and long cooperative/member names.
- Add native-safety tests that fail when mobile imports dashboard components, web UI packages, Next.js helpers, browser-only utilities, or shared barrels that re-export unsafe TSX modules.
- Add performance smoke checks for long lists using realistic member, receipt, notification, and request counts.
- Add update/build smoke checks for development and preview variants, including update screen metadata and manual update behavior.
- Prior art should come from EwaTrade mobile auth/routing/dashboard plans, Halaalvest mobile starter tests/checks, existing Halaalvest database query tests, existing tRPC router patterns, existing member self-service dashboard behavior, and existing client-fit finance/support tests.

## Out of Scope

- A separate mobile-only account system.
- A second mobile app with a different architecture from EwaTrade.
- Rebuilding every dashboard workflow inside mobile.
- Direct bank payment collection, bank reconciliation, card payments, or wallet behavior.
- Offline posting of ledger transactions, approvals, role changes, disbursement evidence, receipt approvals, or financial corrections in the MVP.
- Tenant-specific App Store or Play Store binaries in the first MVP, beyond preserving build-time white-label capability.
- Push notification delivery as a hard MVP requirement, unless device registration is selected during implementation.
- WhatsApp delivery, AI assistant workflows, and advanced automation.
- Complete project financing accounting for investment partnership or profit sharing structures.
- Foodstuff Purchase profit distribution or member dividend posting from Foodstuff Purchase accounting.
- Procurement cash/bank disbursement ledger automation.
- Full document management, virus scanning, or cloud object storage beyond the existing evidence/upload posture.
- Formal legal terms, uptime SLA, restore guarantees, or regulated financial-service commitments.
- Changing the core role hierarchy, tenant isolation model, or Halaal/interest-free finance guardrails.

## Further Notes

- This spec synthesizes the current Halaalvest Brain docs, the existing Halaalvest mobile starter, the client-fit cooperative operations spec, and the ongoing EwaTrade mobile app Brain/source patterns.
- The existing Halaalvest mobile starter already has the right direction: Expo Router groups, Halaalvest branding, member/admin tabs, secure local starter sessions, tRPC client wiring, NativeWind UI primitives, manual updates, and a warm cooperative mobile template. The MVP should harden and connect that foundation rather than replace it.
- The first architectural blocker is production mobile auth. The mobile client is prepared to send bearer authorization, but the API must verify signed mobile/session tokens before real member/admin data is exposed.
- The testing seam for this spec is intentionally API/query first. Mobile UI tests prove navigation, rendering, keyboard behavior, and form states; finance correctness belongs in the server/query/action layer.
- Open terminology should remain tenant-configurable where possible. Internal code may keep existing loan or food-purchase names, but member-facing copy should prefer cooperative financing and Foodstuff Purchase where the product docs require it.
