# Member Signup Gating And Links

## Goal

- Keep member signup locked to in-office flows by default while still allowing controlled remote signup through staff-issued links.

## Flow

- Public member signup now lives at `/signup/members`.
- If `tenant_policies.member_signup_access_mode` is `public`, the route accepts direct signup without a token.
- If the mode is `in_office`, the route blocks direct signup and only opens when the request includes a valid signed `?token=...` for a current `member_signup_links` record.
- If the mode is `hidden`, public CTAs are suppressed and direct signup is blocked, but a valid staff-issued token can still open the form.
- If the mode is `disabled`, both direct signup and staff-issued token signup are blocked.
- The signup submit action revalidates the token and the backing link state before creating the onboarding request, so forged form posts cannot bypass the gate.
- Verification handoff now uses `/signup/members/verify`.
- Member-created requests stay pending until an admin approves them.

## Admin UI

- `/member-signup-links` is the dedicated control center for member signup access.
- The route exports page metadata, resolves URL workflow parameters at the server boundary, and delegates tenant, role, database-runtime, signed-token URL construction, date serialization, and analytics aggregation to a dedicated loader. Route loading and unexpected failures have page-specific skeleton and retry boundaries.
- Staff can switch the tenant between `in_office`, `public`, `hidden`, and `disabled` signup access.
- Staff can create multiple signup links with optional expiry, optional max-signup cap, notes, enable/disable state, and token regeneration.
- The page shows per-link analytics based on onboarding requests created through that link, including total signups, verified requests, approved requests, rejected requests, remaining capacity, and last-used date.
- Link availability reflects every enforceable blocker: the tenant-wide disabled gate, link-level disabled state, expiry, and exhausted capacity. The summary counts only links that applicants can currently use.
- The management surface uses flat divided settings rows instead of nested cards. Analytics are hidden below `md`; mobile header actions collapse to accessible icons, and page/form actions remain full-width with 44-pixel targets through 767px.
- Access, create, and edit workflows remain URL-owned. Successful mutations close the focused workflow and refresh server data; unsaved changes continue to use the shared discard guard.
- When signup is not public, the members list and membership approvals pages surface a direct shortcut to the link generator page.
- `/membership-approvals` follows the Midday Customers/Inbox list contract: the server route exports metadata, resolves URL search/status/sort input once for prefetch and client reuse, and isolates unexpected failures behind a retryable route boundary. Desktop keeps the approval summary and configurable virtual table, while screens below `md` hide analytics and the desktop table in favor of a flat virtualized shadcn Item list with labeled phone, verification, and request-status values.
- Mobile approval search stays directly available; status and sort controls open in a bottom drawer, active controls expose a clear action, and link-generator plus per-request review actions use bottom drawers. Breakpoint resolution renders the matching Item skeleton instead of flashing the desktop table.
- Tenant root and login CTAs only expose member signup when the mode is `public`.
- Staff-created members can be invited into the member portal from the member detail page. The action provisions or reuses a tenant user, links the member profile, ensures the `member` role, sends a one-hour password setup link through the existing reset-confirm flow, and records notification/audit evidence.

## Data Model

- `tenant_policies.member_signup_access_mode` stores the tenant-wide gate.
- `member_signup_links` stores staff-issued link metadata, lifecycle state, token rotation version, and last-used timestamp.
- `member_onboarding_requests.signup_link_id` optionally links an onboarding request back to the signup link that created it for analytics and auditing.

## Security Rules

- Signup links are signed with `SIGNUP_TOKEN_SECRET`.
- Tokens embed `linkId`, `tenantId`, and `tokenVersion`; the database remains the source of truth for enable/disable state, expiry, and max-signup enforcement.
- Rotating a link increments `tokenVersion`, which invalidates previously shared URLs immediately.
- The admin workflow requires explicit confirmation before rotation and explains that the existing shared URL will stop working.
- Disabling a link or letting it expire blocks new signups without removing historical analytics.

## Permissions

- Member-management roles manage signup access and links.
- `trpc.onboarding.membershipApprovals` and `trpc.onboarding.membershipApprovalSummary` enforce the shared `manage_members` permission at the API boundary; page-level visibility is not the only protection for applicant identity data.
- Member-management roles can send portal access email for existing member profiles that have an email address.
- Public applicants can only use the signup form when tenant policy or a valid staff-issued link allows it.

## Edge Cases

- Expired, disabled, mismatched, or capacity-exhausted links show a blocked signup state instead of the form.
- Existing shared links stop accepting new applicants immediately when the tenant-wide mode changes to `disabled`.
- Legacy `/signup/member` and `/signup/member/verify` routes now redirect to the pluralized equivalents so older bookmarks do not break.

## Validation

- On 2026-08-03, authenticated Portless QA passed at `https://safa.halaalvest-dash.localhost/member-signup-links`: 360px, 390px, and 767px hid analytics, used icon-only accessible header actions, retained full-width 44-pixel page actions, and produced no horizontal overflow; 768px, 1280px, and the native 1632px viewport restored desktop analytics and compact actions. Create and access workflows opened from URL parameters, exposed labeled controls and mobile-sized submit actions, and returned to the base route on close. No browser errors or warnings were emitted.
- On 2026-07-30, authenticated Portless QA passed at `https://kaduna-reliable-health-workers-society-723.halaalvest-dash.localhost/membership-approvals`: 360×800, 390×844, and 767px rendered the flat Item list without analytics, a visible table, duplicate page heading, or horizontal overflow; 768px and 1604×994 restored the summary and seven-column desktop table.
- Mobile reload showed only the Item skeleton, status filtering produced and cleared the expected no-results state, page and row action drawers opened, and row navigation reached the approval detail route. The shared short-list scroll edge now restores the global header when expansion removes the remaining scroll range, while the longer Members list still hides on downward scroll and reveals on upward scroll.
- On 2026-08-01, Safa portal-access QA verified that the notification artifact exposes its action as one real accessible link with no button-role substitution or browser errors. The public workspace-ready handoff also retains a real primary `Get Started` link, and all six early-access setup choices expose distinct accessible names and runtime IDs.
