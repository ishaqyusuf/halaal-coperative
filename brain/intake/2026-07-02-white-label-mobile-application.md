# Brain Intake: White-Label Cooperative Mobile Application

## Status
Draft

## Created Date
2026-07-02

## Last Updated
2026-07-02

## Raw Input
Build a full-fledged plan for a white-label mobile application for this project. The app should learn from the GND mobile app, GND Projects mobile app, and ALGOVA mobile app, and use the same standard architecture where appropriate. The app should support admin and customer login; in this product "customer" means member. Members should see commitments, profile, loan profile, share profile, request loans, and manage related self-service flows. Admins should manage the system from the app. The app and website should share the same role-based system, including super-admin ability to add other admin users or members.

## Skills And References Applied
- Halaal cooperative domain: Halaal finance guardrails, member trust, tenant isolation, auditability, contribution allocation, loan/financing rules, share/profit rules, and exception-led admin dashboards.
- Agency engineering: Mobile App Builder specialist, with cross-platform React Native, offline-first, platform-aware delivery, and deployment planning.
- Agency design: UX Architect specialist for the original app structure, plus UI Designer framing for the selected visual template.
- React Native best practices: measure-first performance, virtualized lists, bundle discipline, secure native storage, native-safe boundaries, and platform-aware navigation.
- Local GND reference: `/Users/M1PRO/Documents/code/_turbo/gnd`, especially Expo Router protected route groups, tRPC client patterns, build variants, native-safe package boundaries, update handling, and compact mobile dashboard patterns.
- Stitch design references inspected: GND mobile "Sales Overview UI Redesign" and "Projects Dashboard" boards. ALGOVA was not found locally by exact name and should be supplied as a repo path, Stitch project ID, or screenshots before final design lock.
- User-supplied mobile UI video inspected: `/Users/M1PRO/Downloads/WhatsApp Video 2026-07-02 at 19.51.29.mp4`. The selected visual direction is captured in `brain/product/mobile-ui-template-direction.md`.

## Selected UI Template Direction
The supplied video should become the primary visual template for the mobile app. The reference has a calm Nusuk-style mobile structure: warm sand background, white rounded sheets, black primary buttons, gold accents, compact icon grids, bottom navigation, profile-completion prompts, service cards, and bottom-sheet menus.

Halaalvest should borrow the template's layout and interaction language, not its brand, labels, icons, or travel/religious imagery. The adaptation should use cooperative modules such as Commitments, Savings, Financing, Shares, Statements, Documents, Notifications, and Support.

Design source of truth:
- `brain/product/mobile-ui-template-direction.md`

First template screens to design:
1. Login bottom sheet.
2. Member home.
3. Member commitment/savings detail.
4. Financing request wizard.
5. Member profile/KYC readiness.
6. Admin work dashboard.
7. Admin approvals queue.
8. More/menu sheet with role switcher.

## Product Direction
The mobile app should be a white-label cooperative operations app, not a generic fintech wallet. It should let members understand their cooperative position and let staff act on daily operational work without weakening money safety.

The first release should use one shared authentication and role system across website and mobile. Users should not have separate "mobile accounts." A signed-in user resolves to a tenant, active membership role, and optional member profile. The app then routes the user into the correct member or admin experience.

The app should preserve the 100% Halaal model:
- No interest-bearing loan logic.
- No compounding, penalty interest, or hidden fees.
- Loan/financing eligibility is a policy and liquidity check, not a guaranteed disbursement.
- Member balances, commitments, loan servicing, shares, charges, and profit allocations must remain explainable.
- Money events should be append-only or reversal-based, never silently rewritten.

Terminology should be tenant-configurable where needed. The code can keep `Loan` where the database already uses it, but the UI should support labels such as "Loan", "Financing", "Facility", or "Qard" per tenant policy.

## Product Goals
- Give every member a trusted mobile view of savings, commitments, financing, shares, documents, notifications, and statements.
- Give admins a focused operations console for approvals, members, KYC, contributions, financing, collections, and reports.
- Share backend APIs, role rules, and domain logic with the website.
- Support white-label branding at tenant level, with a path to tenant-specific app-store builds.
- Build with offline-aware behavior for low-connectivity environments without allowing unsafe offline financial posting.
- Keep mobile-native performance and navigation standards from the GND app.

## Non-Goals For MVP
- Do not rebuild every dashboard web workflow inside mobile.
- Do not allow high-risk finance configuration changes offline.
- Do not ship tenant-specific app-store binaries before the shared app architecture is stable.
- Do not introduce a separate mobile-only database model for balances or role permissions.
- Do not add interest, penalty interest, or automatic profit promises.

## Users And Roles

### Member
Member-facing user. Can view only their own profile, commitments, savings, shares, loan/financing records, repayment schedule, statements, documents, notifications, and eligible self-service actions.

### Operations Officer
Can manage member records, onboarding approvals, KYC/document review, member status, notes, and notifications. Should not perform privileged finance actions unless also granted finance role.

### Finance Officer
Can manage contributions, repayments, charges, financing requests, disbursement-prep workflows, collections follow-up, reports, and finance-sensitive operational queues.

### Tenant Admin
Can administer cooperative operations, tenant settings, staff invitations, role assignment inside the cooperative, policy review, and privileged approvals.

### Super Admin
Can manage platform-level or highest-level cooperative access depending on current product meaning. For tenant work, super admin can add other admin users or members, assign roles, review audit-sensitive activity, and access all tenant operations allowed by policy.

## Role And Permission Principles
- Reuse `@halaalvest/auth` roles: `super_admin`, `tenant_admin`, `finance_officer`, `operations_officer`, `member`.
- Mobile must call the same role-ranked server procedures as web.
- Every mobile read/write must be tenant-scoped.
- A user with multiple permissions should see a role/workspace switcher rather than separate login accounts.
- Member self-service endpoints must enforce "current user's member profile only" unless the active role is staff.
- Privileged finance actions need audit logs and explicit state transitions.

## White-Label Strategy

### Runtime White Labeling
Use runtime tenant branding for the shared app:
- Tenant name.
- Logo and app header mark.
- Primary, secondary, neutral, warning, success, and danger color tokens.
- Optional UI terminology overrides, especially for "loan" vs "financing".
- Tenant support contact and legal copy.
- Tenant-specific onboarding copy.

Runtime branding is enough for an initial shared "Halaalvest" app where members choose or are routed to a tenant.

### Build-Time White Labeling
Use build-time variants for cooperatives that need separate app-store identities:
- App name.
- Bundle ID / package name.
- App icon, adaptive icon, splash, and scheme.
- OTA update channel.
- Store metadata and screenshots.
- Push notification identity.
- Tenant bootstrap slug or tenant lookup domain.

Recommended Expo pattern:
- `apps/mobile/app.config.ts` reads `APP_VARIANT`, `APP_TENANT_SLUG`, and `APP_BRAND_ID`.
- Development builds install beside preview/production builds.
- Preview builds use separate OTA channels.
- Production tenant builds pin runtime version by app version.
- Automatic update checks should be conservative; expose a manual "App Updates" screen similar to GND.

## Recommended Technical Architecture

### App Location
Add a new workspace app:

```txt
apps/mobile
```

Use Expo + React Native + Expo Router, following the GND mobile architecture direction.

### Mobile Stack
- Expo Router for route groups and protected stacks.
- React Native with Hermes.
- TypeScript.
- `@tanstack/react-query` and tRPC for typed server state.
- `expo-secure-store` for session tokens and sensitive auth material.
- `react-native-mmkv` or SQLite for non-sensitive cache and offline queue storage.
- `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler`, Reanimated, and keyboard controller for native-feeling UX.
- FlashList, Legend List, or FlatList for large member, contribution, loan, notification, and report lists.
- Zod schemas shared from API/domain where they are pure TypeScript.

### Repo Boundary
Mobile must not import web UI packages or dashboard components.

Allowed shared imports:
- Pure domain helpers from `packages/domain`.
- Role helpers from `packages/auth`.
- API router types from `apps/api` or an exported API package entry.
- Shared utilities that do not import web-only modules.

Avoid:
- `@halaalvest/ui` web components.
- Dashboard TSX components.
- Next.js route helpers.
- Browser-only utilities.

Add a native-safety test similar to GND:
- Mobile-safe barrels must not export TSX web modules.
- `apps/mobile` must not import `apps/dashboard` or web UI packages.
- Shared domain modules must remain pure `.ts` where mobile consumes them.

### Backend/API Direction
The current API already uses Hono + tRPC with tenant procedures. Mobile should reuse this, but it needs mobile-friendly JSON endpoints instead of dashboard-only form actions.

Recommended router work:
- `auth.mobile`: login, logout, refresh, password reset, optional biometric enrollment challenge, tenant lookup.
- `me`: current session, active membership, role list, current member profile, tenant branding.
- `memberPortal`: member overview, commitments, savings, shares, financing, repayment schedule, statements, documents, notifications.
- `adminMobile`: admin overview, action queue, approval counts, collections queue, KYC queue.
- `loans`: submit request, list requests, review request, disbursement workflow, repayment schedule, collections follow-up.
- `roles`: invite user, assign role, revoke role, list staff, list member-linked users.
- `documents`: upload/review member documents and KYC evidence.
- `mobileSync`: offline queue submission and conflict review.

Important auth note: production mobile auth should not trust client-supplied `x-user-id`. Add signed bearer/mobile session verification or reuse signed session tokens in a mobile-safe way.

### Data Model Reuse
Reuse existing models:
- `User`, `Membership`, `Member`.
- `ContributionPlan`, `Contribution`, monthly/staged contribution records.
- `LoanProduct`, `LoanRequest`, `Loan`, `RepaymentScheduleItem`, `Repayment`, `CollectionFollowUp`.
- Share, dividend, business profit, ledger, audit, notification, and offline sync models.

Possible additions:
- `MobileDevice` for device registration, push token, platform, app version, tenant, and user.
- `MobileSession` if browser-scoped session cookies are not sufficient.
- `TenantMobileBrand` if runtime app branding outgrows existing tenant profile fields.
- `RoleInvitation` if web role invitation is not already formalized enough for mobile parity.

## Information Architecture

### Auth And Tenant Entry
1. Splash/loading with tenant branding if known.
2. Tenant lookup by invite link, cooperative code, tenant domain, or email.
3. Login with email/phone and password.
4. Password reset.
5. Optional biometric unlock after first successful login.
6. Role/workspace resolver:
   - Member-only users land in Member App.
   - Staff-only users land in Admin App.
   - Users with both roles choose a workspace and can switch later.

### Member App Tabs
Recommended tabs:
- Home
- Commitments
- Financing
- Shares
- More

Member Home:
- Current savings/commitment summary.
- Next expected contribution.
- Active loan/financing status.
- Share capital and profit/share snapshot.
- Pending actions: KYC, missing document, overdue repayment, request status.
- Recent activity feed.
- Primary CTA: request financing, complete KYC, or view statement depending on state.

Commitments:
- Active monthly commitment plan.
- Contribution history.
- Payment allocation preference.
- Extra savings history.
- Staged/current month obligation visibility.

Financing:
- Eligibility preview.
- Active loan/financing cards.
- Repayment schedule.
- Loan request status.
- Loan request wizard:
  1. Select product.
  2. Enter amount and purpose.
  3. Select term where policy allows.
  4. Review estimated monthly servicing.
  5. Add optional extra monthly savings.
  6. Confirm Halaal/cooperative terms and submit.

Shares:
- Share capital profile.
- Share ledger.
- Profit/dividend allocation history.
- Business profit period statements if available.

More:
- Profile and KYC.
- Documents.
- Notifications.
- Statements/export.
- Security settings.
- Help/support.
- App updates.

### Admin App Tabs
Recommended tabs:
- Work
- Members
- Finance
- Reports
- More

Admin Work:
- Deployable funds.
- Collection coverage.
- Portfolio at risk.
- Action queue.
- KYC/compliance watch.
- Recent audit-sensitive activity.

Members:
- Search and filter members.
- Member detail.
- Create member.
- Invite/link user.
- KYC document review.
- Membership approval queue.
- Member status change.

Finance:
- Contributions and staged monthly records.
- Loan/financing requests.
- Active loans.
- Disbursement holds.
- Repayment and collections follow-up.
- Charges where mobile-safe.
- Shares/profit quick views.

Reports:
- Member statement.
- Contributions report.
- Loan/repayment report.
- Collections report.
- Audit activity.
- Export/share report links where mobile supports it.

More:
- Staff and roles.
- Tenant profile and branding preview.
- Finance policy quick links.
- Notifications.
- App updates.
- Support.

## Website Parity
The mobile app and website should use the same backend permissions and business rules. The website remains the full administrative surface, while mobile focuses on the most useful field/operations workflows.

Parity rules:
- Same roles and role hierarchy.
- Same tenant resolution and membership status.
- Same loan products and eligibility rules.
- Same member commitment plans and payment allocation rules.
- Same KYC statuses and document review statuses.
- Same notification records.
- Same audit trail for privileged actions.
- Same member statement numbers.

Do not duplicate finance calculations in mobile UI. Mobile should display server DTOs and use pure shared helpers only for formatting or local previews that are revalidated by the server.

## MVP Scope

### Member MVP
- Login/logout/password reset.
- Tenant branding after login.
- Member home overview.
- View profile and KYC status.
- View active commitment and contribution history.
- View savings total and recent ledger activity.
- View active loan/financing profile and repayment schedule.
- Submit loan/financing request.
- View share profile and profit/share allocation history.
- Notifications.
- Statement view or statement download link.

### Admin MVP
- Login/logout/password reset.
- Role-based admin landing.
- Admin action queue and primary metrics.
- Member search/list/detail.
- Create member or invite member.
- Approve/reject member onboarding.
- Review KYC/documents.
- View contributions and staged current-month records.
- View loan requests.
- Approve/reject loan requests for permitted roles.
- Record collection follow-up notes.
- Staff/role management for tenant admin and super admin.

### White-Label MVP
- Tenant logo/name/theme loaded from API.
- App theme applies after tenant resolution.
- One shared app binary.
- Development and preview build variants.
- Manual app update screen.

## Post-MVP Scope
- Tenant-specific app-store builds.
- Push notifications with tenant-specific channels.
- Offline write queue for selected low-risk actions.
- Admin contribution or repayment posting from mobile with stricter controls.
- Biometric login.
- Document capture and upload.
- In-app PDF statement rendering.
- Deep links from email/SMS notifications.
- Advanced reports and analytics.
- Multi-tenant account switching for platform operators.

## Offline And Sync Strategy
Offline behavior must protect financial correctness.

MVP:
- Cache read-only member profile, commitments, savings summary, loan schedule, shares, notifications, and recent activity.
- Allow composing low-risk notes or drafts offline.
- Require network confirmation before submitting loan requests or admin approvals.
- Show clear stale-data timestamps.

Post-MVP:
- Use `OfflineSyncEvent` for queued events with tenant, user, device, aggregate, sequence key, captured time, payload, and conflict status.
- Do not post ledger transactions directly on device.
- Server must process queued money-related events into posted records only after validation.
- Conflicts must surface to admin review rather than silently overwriting posted history.

## Security And Compliance
- Store tokens only in secure native storage.
- Add mobile session verification that does not rely on user-id headers.
- Use role checks server-side for every operation.
- Keep tenant ID server-derived, not client-trusted.
- Add audit logs for role assignment, loan approval, disbursement, KYC review, contribution posting, repayment posting, reversals, waivers, and policy changes.
- Consider app lock/biometric unlock after session bootstrap.
- Redact sensitive document URLs unless the user is authorized.
- Add rate limiting for login, password reset, and OTP/email verification.
- Push notifications must avoid sensitive financial amounts unless explicitly safe by policy.

## Design System Direction
The app should feel calm, trustworthy, and operational, using the selected warm mobile template direction in `brain/product/mobile-ui-template-direction.md`. It should not look like a marketing landing page.

Design principles:
- Mobile-first, dense but breathable finance UI.
- Compact metric cards and list rows.
- Status badges for pending, approved, overdue, blocked, verified, rejected, posted, reversed.
- 8px default radius for repeated data cards and controls, with larger rounded bottom sheets and profile prompts where the selected template calls for it.
- Clear top bars, bottom tabs, bottom sheets, and modal review screens.
- Large enough tap targets and readable text.
- Light/dark/system theme support.
- Tenant brand tokens should accent the UI, not overwhelm financial readability.
- No one-note color palette; preserve neutral surfaces and semantic colors.

Reusable GND-inspired patterns:
- Protected route groups by role/workspace.
- Bottom tabs for primary mobile sections.
- Action sheets for secondary actions.
- Bottom-sheet forms for quick review/approval flows.
- Status-first list cards.
- Floating primary action only where there is one dominant task.
- App update screen with build diagnostics.

## Performance Plan
- Measure startup, list scrolling, and key interactions before optimizing.
- Use virtualized lists for members, contributions, requests, notifications, and reports.
- Avoid barrel imports in mobile.
- Keep shared domain imports pure and small.
- Use React Query cache boundaries per tenant/user.
- Avoid broad global state for server data.
- Use local Zustand/MMKV only for auth/session preferences, draft state, theme, role switcher, and offline queue.
- Track cold start time, JS bundle size, memory, crash-free sessions, slow renders, and network error rate.

Targets:
- Cold start to usable shell under 3 seconds on target mid-range Android devices.
- Crash-free rate above 99.5%.
- Smooth 60 FPS interactions for core navigation and lists on supported devices.
- Financial action submission must have explicit loading, success, and failure states.

## Implementation Phases

### Phase 0: Intake Closure And Reference Capture
- Confirm final inspiration references for GND Projects mobile and ALGOVA.
- Capture screenshots, screen lists, architectural patterns, and selected-template screens from the supplied mobile video.
- Approve terminology for loan/financing labels.
- Decide whether MVP is shared app only or includes first tenant-specific build.

### Phase 1: Mobile Foundation
- Create `apps/mobile`.
- Configure Expo Router, TypeScript, lint/typecheck, NativeWind or chosen styling system, safe area, gesture handler, Reanimated, keyboard provider, and error boundary.
- Add tRPC client and React Query provider.
- Add secure session storage.
- Add tenant branding bootstrap.
- Add route groups for auth, member, admin, and shared modals.
- Add native-safety import tests.

### Phase 2: Mobile Auth And Role Resolver
- Add mobile login/session API.
- Add tenant lookup.
- Add password reset.
- Add current user/tenant/role endpoint.
- Add role/workspace switcher.
- Add logout and session expiry handling.
- Add basic app update screen and build metadata.

### Phase 3: Member Portal MVP
- Add member home overview DTO.
- Add commitments screen.
- Add contribution history.
- Add financing profile screen.
- Add loan request wizard.
- Add share profile screen.
- Add profile/KYC screen.
- Add notifications and activity feed.
- Add statement view/download link.

### Phase 4: Admin Operations MVP
- Add admin mobile overview DTO based on exception-led dashboard metrics.
- Add members list/detail.
- Add create/invite member.
- Add membership approval queue.
- Add KYC/document review queue.
- Add loan request review.
- Add contributions and staged monthly record read views.
- Add collections follow-up notes.
- Add role management for tenant admin/super admin.

### Phase 5: White-Label Build System
- Add dynamic Expo app config.
- Add development and preview profiles.
- Add brand asset pipeline.
- Add tenant runtime theme API.
- Add tenant-specific build documentation.
- Add store metadata checklist.

### Phase 6: Offline, Notifications, And Hardening
- Add read cache and stale-data indicators.
- Add push token registration.
- Add notification center parity.
- Add offline draft/queue foundation for safe actions.
- Add audit review for mobile-originated privileged actions.
- Add crash reporting and performance monitoring.

### Phase 7: QA And Release
- Unit tests for pure domain and mobile-safe helpers.
- API tests for member-only and role-gated endpoints.
- E2E smoke tests for login, member overview, loan request, admin approval, role invite.
- Device testing on Android and iOS.
- Accessibility pass.
- App-store build rehearsal.
- Release checklist and rollback plan.

## API And Backend Work Packages
- Mobile auth/session hardening.
- Member portal read DTOs.
- Loan router extraction from dashboard form actions into typed JSON procedures.
- Role management router.
- Mobile admin overview read DTO.
- Document upload/review API.
- Notification device registration.
- Tenant branding API.
- Offline sync processing workflow.
- Audit log coverage for mobile-originated actions.

## Design Work Packages
- Convert the selected mobile video template into Halaalvest-specific UI frames.
- Mobile IA map.
- Auth and tenant lookup flow.
- Member home, commitment, financing, shares, profile, statement screens.
- Admin work, members, finance, reports, role management screens.
- Empty, loading, error, offline, stale-data, and permission-denied states.
- Tenant theme tokens.
- Component inventory:
  - App shell.
  - Metric tile.
  - Status badge.
  - Money row.
  - Activity row.
  - Member list row.
  - Loan request card.
  - Approval sheet.
  - KYC document card.
  - Report row.
  - Role assignment row.

## Acceptance Criteria
- A member can sign in and see only their own profile, commitment, savings, loan/financing, share, notification, and statement data.
- A member can submit a loan/financing request with server-calculated eligibility and servicing preview.
- An admin can sign in and see an exception-led admin dashboard.
- A permitted admin can create/invite members and review membership/KYC workflows.
- A permitted admin can review loan/financing requests from mobile.
- A super admin or tenant admin can add staff and assign roles according to policy.
- Website and mobile use the same role hierarchy and tenant-scoped API rules.
- Mobile does not import dashboard/web UI modules.
- Tenant branding can change the app look after tenant resolution.
- Money-related data remains auditable and explainable.
- Offline/stale data is clearly labeled.
- Mobile build variants can be produced for development and preview.

## Risks
- Mobile auth could become unsafe if it relies on development headers instead of signed sessions.
- Dashboard form actions may slow mobile parity unless JSON/tRPC procedures are extracted.
- White-label app-store builds can multiply release complexity if introduced too early.
- Offline financial writes can damage trust if sync conflicts are hidden.
- Member and admin modes can become confusing if users with multiple roles do not get a clear switcher.
- Loan terminology can create Halaal compliance confusion if "interest", "rate", or "penalty" language slips into copy.

## Needs Clarification
- Provide the exact GND Projects mobile app reference: repo path, Stitch project ID, screenshots, or app package.
- Provide the ALGOVA mobile app reference: repo path, Stitch project ID, screenshots, or app package.
- Confirm whether first release should be a shared Halaalvest app, tenant-specific app, or both.
- Confirm preferred UI term: Loan, Financing, Facility, Qard, or tenant-configurable from day one.
- Confirm whether members can upload KYC documents in MVP or only view review status.
- Confirm whether admins can post contributions/repayments from mobile in MVP, or only review/read and add follow-up notes.
- Confirm whether super admin means platform owner across tenants or highest tenant role inside a cooperative for this app.
- Confirm target launch platforms: Android first, iOS first, or both.

## Recommended Next Step
Approve this intake, then split it into implementation plans:
1. Mobile Foundation And Auth.
2. Member Portal MVP.
3. Admin Operations MVP.
4. White-Label Build Variants.
5. Offline, Notifications, And Release Hardening.

After approval, use the Brain handoff workflow to turn each plan into implementation-ready tasks.
