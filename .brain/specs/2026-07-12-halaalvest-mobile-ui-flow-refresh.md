# Spec: Halaalvest Mobile UI Flow Refresh

## Problem Statement

The Halaalvest mobile MVP now has the right architectural foundation and feature coverage, but the current UI still reads like a functional starter shell rather than a polished cooperative finance app. The user wants the mobile app to stay exactly aligned with the EwaTrade mobile app principles while adopting a cleaner, more trustworthy UI flow inspired by the top three selected finance app references.

From the member's perspective, the app should feel calm, obvious, and useful from the first sign-in: cooperative identity, account readiness, balances, obligations, service actions, and pending tasks should be easy to scan without feeling like a generic banking clone.

From the admin's perspective, the app should become a practical field-operations companion: exception-led, queue-driven, compact, and safe for quick reviews without hiding role boundaries or finance controls behind decorative cards.

The risk is visual drift. If the UI refresh copies a public fintech shot too literally, it may introduce speculative-investment language, crypto styling, decorative gradients, or interaction patterns that do not fit cooperative operations. If it becomes a design-system rewrite, it may break the completed MVP structure. The refresh must improve flow, hierarchy, and polish while preserving the existing Expo Router, typed API, NativeWind, reusable mobile primitives, bottom-sheet, and server-owned business-rule architecture.

## Solution

Refresh the Halaalvest mobile UI flow using a "warm cooperative fintech" direction.

Use the first three selected references as inspiration only:

- Musemind Finance Dashboard UI Mobile Banking App: https://dribbble.com/shots/26805472-Finance-Dashboard-UI-Mobile-Banking-App
- Pocketbook UI Design by Jaja Studio: https://dribbble.com/shots/14037543-Pocketbook-UI-Design-by-Jaja-Studio
- PaySense / Asset Management Fintech APP by Slick: https://dribbble.com/shots/21464498-Asset-Management-Fintech-APP

The desired result is a polished, member-trust-first and admin-exception-first mobile app. Borrow the references' clean hierarchy, finance dashboard rhythm, onboarding warmth, bottom navigation clarity, card spacing, service-grid discoverability, and action-focused lists. Do not copy their brand, exact artwork, speculative finance tone, crypto/investment framing, purple-heavy gradients, or oversized decorative onboarding.

Gemini should update the mobile app UI within the existing mobile architecture. It should refine screen composition, reusable primitives, spacing, typography, status patterns, service tiles, bottom sheets, list rows, action queues, empty states, stale/offline banners, and form flow. It should not introduce a new navigation model, a new data contract, a parallel design system, or screen-local finance calculations.

The target flow should be:

1. Auth: a warm branded first screen with a white sign-in bottom sheet, cooperative code, email, password, clear error states, and development shortcuts only outside production.
2. Bootstrap and role switch: a simple loading state, then direct routing into member or admin workspace, with a clean switcher for users who have both roles.
3. Member home: a trust-first overview with cooperative/member identity, readiness, stale/offline status, priority actions, four financial summary cards, and a compact service grid.
4. Member detail flows: commitments, financing, shares, receipts, guarantor approvals, procurement, project financing, Foodstuff Purchase, statements, support, and notifications should use the same list/detail/form rhythm.
5. Member forms: sectioned input groups, sticky primary action, draft state, stale/offline warnings, server-confirmed submit states, and review screens before money-affecting submission.
6. Admin overview: exception-led dashboard with deployable funds, collection coverage, overdue/risk indicators, and a priority queue before secondary metrics.
7. Admin members: search-first member list, status chips, member detail summary, and mobile-safe create/invite/onboarding/KYC states.
8. Admin finance: queue cards for receipts, financing, procurement, Foodstuff Purchase, project financing, collections, and support-linked finance work, with clear review statuses.
9. Admin reports: compact report cards and filters; no spreadsheet-style editing on mobile.
10. More/menu: service-grid and grouped menu sections with role/workspace switch, updates, support, settings, security, and sign-out.

## User Stories

1. As a member, I want the sign-in screen to feel branded and trustworthy, so that I know I am entering my cooperative workspace.
2. As a member, I want the login fields to be grouped in a clean bottom sheet, so that sign-in feels focused on a phone.
3. As a member, I want cooperative code, email, and password fields to have clear labels and errors, so that I can recover from mistakes quickly.
4. As a member, I want production sign-in to hide development shortcuts, so that the app does not feel unfinished.
5. As a member, I want the app to show a calm loading/bootstrap state, so that role and tenant resolution feels intentional.
6. As a user with member and staff access, I want a clean role switcher, so that I can move between personal and admin work without confusion.
7. As a member, I want the home screen to show my cooperative, member number, profile status, and KYC status near the top, so that I immediately know the app is scoped to me.
8. As a member, I want stale or offline account data to be visible near the top, so that I know when information may be outdated.
9. As a member, I want urgent action items above secondary service discovery, so that I can handle missing documents, pending receipts, guarantor requests, or overdue obligations quickly.
10. As a member, I want savings, special savings, commitment, financing exposure, and shares summarized in compact cards, so that I can understand my position at a glance.
11. As a member, I want ordinary savings and special savings to remain visually distinct, so that voluntary funds are not mixed with commitments.
12. As a member, I want share capital to be visually separate from savings and financing, so that ownership is not confused with cash balance.
13. As a member, I want active financing to show status and next obligation without interest-like language, so that cooperative financing remains clear.
14. As a member, I want service shortcuts for commitments, financing, shares, receipts, statement, support, procurement, project financing, Foodstuff Purchase, guarantor approvals, notifications, and updates, so that all MVP features are discoverable.
15. As a member, I want service tiles to use recognizable icons and short labels, so that the grid is easy to scan.
16. As a member, I want long service labels such as Foodstuff Purchase and Project Financing to fit cleanly, so that the UI does not look broken.
17. As a member, I want detail screens to use consistent status rows and cards, so that every cooperative product feels part of one app.
18. As a member, I want receipt submission to guide me through amount, allocation, period intent, evidence, and review, so that finance staff can understand my payment.
19. As a member, I want receipt statuses to be visible in list and detail views, so that I know what is pending, approved, rejected, or needs correction.
20. As a member, I want financing requests to show server-provided eligibility and policy notes, so that I do not guess why a request is blocked.
21. As a member, I want financing forms to preview estimated servicing only when the server provides it, so that the app does not calculate finance rules on device.
22. As a member, I want procurement, Foodstuff Purchase, and project financing to have distinct flows, so that they do not look like generic loans.
23. As a member, I want guarantor approval screens to show consent, risk, and notes clearly, so that approving or rejecting feels deliberate.
24. As a member, I want support cases to show replies, linked receipts or requests, and finance-adjustment boundaries, so that I know support does not silently change money.
25. As a member, I want statements and reports to open from compact cards, so that records are accessible without desktop-style tables.
26. As a member, I want empty states to name the missing record and next action, so that blank screens do not feel like app errors.
27. As a member, I want form drafts to be visible but quiet, so that interrupted work can be resumed without anxiety.
28. As a member, I want submit buttons to stay reachable at the bottom of long forms, so that phone form completion is ergonomic.
29. As a member, I want confirmation sheets before money-affecting submissions, so that I can review intent before sending.
30. As a member, I want successful submissions to show a clear server-confirmed state, so that I know the cooperative has received the request.
31. As a member, I want offline submit attempts to explain what cannot be completed, so that stale drafts do not look posted.
32. As an admin, I want the admin home screen to lead with exceptions, so that pending work is visible before decorative metrics.
33. As an admin, I want deployable funds, collection coverage, overdue/risk, and pending reviews to be compact and legible, so that field decisions are quick.
34. As an admin, I want pending approvals, KYC, receipts, financing, procurement, Foodstuff Purchase, project financing, support, and setup warnings in one action queue, so that daily work is not scattered.
35. As an admin, I want each queue item to show status, member context, age, and next action, so that I know what to open first.
36. As an admin, I want member search to be the primary action on the members screen, so that I can find a member during office or field work.
37. As an admin, I want member list rows to show member name, number, status, KYC, and high-level risk, so that scanning is fast.
38. As an admin, I want member detail to use a compact summary followed by grouped sections, so that I can inspect profile, commitments, savings, financing, receipts, shares, and support without clutter.
39. As an admin, I want create/invite/onboarding screens to stay visually consistent with member forms, so that staff workflows do not feel like a separate app.
40. As a finance officer, I want receipt review cards to expose allocation and evidence state, so that approval decisions are not hidden.
41. As a finance officer, I want financing review cards to show policy guardrails and server-provided risk state, so that mobile approval stays safe.
42. As a finance officer, I want collection follow-up notes to use a compact mobile form, so that field conversations can be recorded quickly.
43. As a committee user, I want Foodstuff Purchase applications to be labeled exactly as Foodstuff Purchase, so that staple purchase work is product-facing and clear.
44. As an admin, I want reports to be summary-first on mobile, so that desktop spreadsheet workflows are not forced into small screens.
45. As an admin, I want role and workspace switching to be obvious but not dominant, so that my current operating context is always clear.
46. As a user, I want bottom tabs to use five or fewer primary destinations, so that navigation stays predictable.
47. As a user, I want all bottom sheets to feel consistent, so that menus, search, filters, role switching, and confirmations share a familiar pattern.
48. As a user, I want status badges to use stable semantic colors, so that success, warning, stale, blocked, and destructive states are easy to distinguish.
49. As a user, I want the app to use warm ivory backgrounds, near-white panels, black primary actions, gold highlights, and green success states, so that the UI feels like Halaalvest rather than a generic bank.
50. As a user, I want the app to avoid purple crypto-style gradients and oversized illustrations, so that cooperative operations remain serious and trustworthy.
51. As a user, I want typography to stay readable on compact Android and iOS screens, so that labels and values do not clip.
52. As a user, I want cards, buttons, tabs, and tiles to have stable dimensions, so that dynamic text and loading states do not shift the layout.
53. As a user, I want every icon button or tile to have accessible naming, so that assistive technology can navigate the app.
54. As a designer, I want the app to borrow reference hierarchy without copying reference branding, so that the result is original and product-fit.
55. As a designer, I want a reusable screen rhythm for home, lists, details, forms, and confirmations, so that future mobile features stay coherent.
56. As a developer, I want the UI refresh to use existing mobile primitives where possible, so that it does not create a second component library.
57. As a developer, I want reusable primitives to be improved only when multiple screens benefit, so that the app remains maintainable.
58. As a developer, I want mobile screens to keep rendering server-shaped data, so that visual polish does not introduce business-rule drift.
59. As a developer, I want styling to stay NativeWind-first, so that it follows the EwaTrade-aligned architecture.
60. As a developer, I want no imports from dashboard-only web components, so that the native app remains safe.
61. As a tester, I want visual QA across compact and standard phone sizes, so that the refreshed UI is usable on real devices.
62. As a tester, I want smoke coverage for auth, member tabs, admin tabs, forms, role switch, stale data, and offline states, so that the refreshed UI does not regress MVP flows.
63. As a product owner, I want the first UI refresh to focus on the existing mobile feature set, so that the app becomes pilot-ready before adding new scope.
64. As a product owner, I want the app to feel close to the selected templates while staying cooperative-specific, so that the user can recognize the intended direction without losing domain clarity.

## Implementation Decisions

- Treat this as a UI flow refresh for the existing mobile MVP, not a new mobile architecture or feature expansion.
- Preserve the accepted EwaTrade-aligned mobile architecture: Expo Router route groups, typed API calls, NativeWind-first styling, secure session handling, bottom-sheet patterns, safe-area wrappers, reusable mobile primitives, thin screens, read-cache stale markers, draft forms, and server-owned business rules.
- Keep member and admin workspaces separate. Use the existing role/workspace switcher pattern for users with both member and staff roles.
- Use the existing mobile theme tokens as the starting palette: warm ivory page background, near-white surfaces, near-black text and primary actions, gold accent, deep green success, amber warning, red destructive, and low-contrast warm borders.
- Keep repeated data cards close to the existing 8px radius. Use larger radii only for bottom sheets, auth panels, and major profile/readiness panels where the current mobile direction already allows it.
- Improve reusable mobile primitives before repeating one-off screen styling. Prioritize app-level primitives for section cards, stat cards, service tiles, profile headers, stale banners, virtualized lists, bottom sheets, buttons, inputs, status badges, and confirmation rows.
- Keep cards purposeful. Do not place cards inside cards. Do not use decorative page sections, gradient blobs, or unrelated imagery.
- The Musemind reference should guide dashboard hierarchy: visible top summary, organized finance cards, recent activity or transaction-like rows, clean spacing, and fast scanning.
- The Pocketbook reference should guide warmth and approachability: friendly onboarding rhythm, soft but readable surfaces, and personal finance clarity without heavy operational density.
- The PaySense reference should guide bottom navigation, app-store polish, analytics/card rhythm, and secondary finance surfaces. Avoid its speculative investment language and any overly playful or marketing-heavy parts.
- Pinterest should be used only as supplemental moodboard discovery with search terms such as `fintech mobile app dashboard clean UI`, `mobile banking app dashboard cards`, `personal finance app onboarding UI`, `wallet app bottom navigation UI`, `mobile finance app transaction list`, and `financial app form UI mobile`.
- Auth should remain a branded warm background plus sign-in bottom sheet. Keep cooperative code, email, password, error copy, submit state, and dev-only shortcuts.
- Member home should reorder toward trust: profile/cooperative context, stale/offline banner, readiness/status, action queue, financial summaries, service grid, recent activity.
- Admin home should reorder toward operations: profile/workspace context, stale/offline banner, priority queue, risk/coverage metrics, follow-up lists, secondary shortcuts.
- Use service grids for discovery, but keep high-priority work in action queues. A member should not have to hunt in the service grid for urgent receipts, KYC, guarantor requests, overdue obligations, or support replies.
- Use compact list rows for queues. Each row should communicate actor/member context, status, amount or count where safe, age/period where useful, and next action.
- Forms should use sectioned groups, inline validation, sticky submit, draft indicator, stale/offline guard, and a confirmation sheet for money-affecting or review actions.
- Money-affecting forms must never calculate balances, eligibility, share capital, repayment state, receipt posting effects, procurement settlement, Foodstuff Purchase accounting, or audit-sensitive decisions on device. They may render server-provided previews and policy notes.
- Copy should stay inclusive and cooperative-specific. Prefer terms such as cooperative, member, commitment, savings, special savings, share capital, interest-free financing, procurement, Foodstuff Purchase, project financing, support, receipt, approval, and statement.
- Avoid copy such as interest, APR, compounding, speculative return, trading, crypto, portfolio growth promise, wallet yield, or investment gain unless the server/domain already provides an approved product term.
- Keep Foodstuff Purchase as the product-facing label. Do not shorten it to a generic food loan or commodity loan in UI labels.
- Keep mobile report surfaces summary-first. Show report cards, filters, and download/share entry points; do not recreate full desktop table management.
- Keep development fixture behavior visibly separate from production behavior. UI polish should not make mock sessions look like production finance state.
- Add a small UI flow reference note in the local scratch area with source links and borrowing guidance. Do not vendor copyrighted Dribbble/Pinterest images unless explicit license approval is obtained.
- Suggested implementation order for Gemini:
  1. Audit current mobile screens against the target flow and identify shared primitive changes.
  2. Refresh auth, loading/bootstrap, bottom tab polish, and common primitives.
  3. Refresh member home and member service flows.
  4. Refresh member form/confirmation patterns.
  5. Refresh admin overview, member search/detail, finance queues, and reports.
  6. Run smoke, native import, type/lint checks, and visual QA on compact and standard phone sizes.

## Testing Decisions

- Tests should verify externally visible mobile behavior: screen routing, visible labels, status ordering, server-provided values rendered, form state, disabled offline submissions, stale banners, role switching, and accessible navigation.
- The highest testing seam for business correctness remains the typed API/query/action layer. UI refresh tests should not assert internal component structure or duplicate finance calculations.
- Preserve existing native import checks so the mobile app cannot import dashboard-only components, Next.js helpers, browser utilities, or unsafe shared barrels.
- Preserve existing smoke coverage for startup, sign-in, role switch, member tabs, admin tabs, notification/update screens, stale cache banners, and form drafts.
- Add visual QA checks for compact Android, standard Android, compact iOS, standard iOS, and tablet-width layouts where practical.
- Visual QA should inspect auth bottom sheet height, bottom tab label fit, service tile label wrapping, status badge fit, long cooperative names, long member names, Foodstuff Purchase labels, Project Financing labels, sticky form footers, and bottom sheet safe-area padding.
- Interaction QA should cover login error, loading state, member home, member More grid, receipt form, financing form, support form, guarantor response, admin overview, admin member search, admin finance queues, report cards, role switch, stale/offline state, and sign out.
- Accessibility QA should cover accessible names for icon buttons, service tiles, bottom tabs, role switcher controls, confirmation actions, and destructive actions.
- Snapshot or component tests may be added only where they protect a reusable primitive contract. Prefer behavior and visual smoke over brittle structure tests.
- Good tests should catch clipping, overlap, hidden primary actions, incorrect role workspace context, missing stale/offline indicators, and mobile-only copy regressions.

## Out of Scope

- Rebuilding the mobile app architecture.
- Adding a new mobile-only API or data model.
- Adding new cooperative product features beyond those already present in the MVP.
- Changing tenant isolation, role hierarchy, finance policy, receipt posting, statement generation, or audit behavior.
- Implementing offline write queues for money-affecting workflows.
- Introducing push notification delivery as part of the UI refresh.
- Creating tenant-specific App Store or Play Store binaries.
- Copying Dribbble or Pinterest artwork, exact layouts, brand marks, icons, or proprietary assets.
- Rebranding Halaalvest away from the existing warm black/gold cooperative direction.
- Making the app look like a crypto, trading, neobank, or speculative investment product.
- Replacing existing NativeWind primitives with a separate component library.
- Recreating full desktop dashboard tables inside mobile report screens.

## Further Notes

- Triage label: done.
- Implementation completed on 2026-07-15 across `.scratch/mobile-ui-flow-refresh/issues/01-09`: shared app primitives, auth/bootstrap/tabs, member home and service flows, member form review sheets, admin exception queues, member/admin review surfaces, reports/More polish, and final mobile QA gates.
- Validation completed with mobile typecheck, native import guard, NativeWind token guard, mobile smoke coverage, mobile API router tests, lint, Prettier checks, and a NativeWind `className`/`style` collision scan. Lint passes with the existing generated `.expo/types/router.d.ts` unused eslint-disable warning.
- This spec should be handed to Gemini as a focused UI implementation guide.
- The selected source references were checked on July 12, 2026.
- Direct Pinterest pin capture was not reliable in the browsing environment. Use Pinterest as a search/moodboard source with the supplied query terms instead of relying on specific pin URLs.
- A local scratch reference index was added for Gemini with the selected links and design borrowing notes.
- This spec extends the existing mobile MVP spec and the accepted mobile ADR. It does not replace them.
