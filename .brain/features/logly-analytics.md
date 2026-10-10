# Logly analytics integration

On 24 September 2026, dashboard root layout was corrected to mount one `EventsProvider surface="dashboard"` around the notification/QA providers. The previous duplicate import/provider prevented dashboard TypeScript and preview build preparation. Dashboard typecheck passes after the correction; production Logly delivery still depends on environment configuration and runtime evidence.

## Runtime boundaries
- Dashboard provider and `/api/analytics` use `halaalvest-dashboard`; marketing uses `halaalvest-marketing`. Provider surface is fixed by each app layout. Legacy shared `NEXT_PUBLIC_LOGLY_PROJECT`, `NEXT_PUBLIC_LOGLY_ENABLED`, and `LOGLY_PROJECT_KEY` are ignored by the new code.
- Browser enable/project variables have `_DASHBOARD` or `_MARKETING` suffixes. Server keys are `LOGLY_DASHBOARD_PROJECT_KEY` / `LOGLY_MARKETING_PROJECT_KEY`; origin allowlists are exact comma-separated `LOGLY_DASHBOARD_ALLOWED_ORIGINS` / `LOGLY_MARKETING_ALLOWED_ORIGINS`.
- Android uses existing `halaalvest-mobile` and the marketing-hosted `/api/analytics/mobile`. `LOGLY_MOBILE_PROJECT_KEY` remains server-only, with explicit `LOGLY_MOBILE_ORIGIN`. Public EAS settings contain only enabled/project/endpoint. Runtime also requires Android and production app variant.
- Halaalvest Dashboard and Marketing projects were created under existing organization `halaalvest` on 2026-09-22. Historical `halaalvest-web` and events are preserved. Mobile credential was verified and reused.

## Privacy and delivery
- Browser events are only `site_visit` and `page_view`. Android emits `app_session` and `screen_view`, source `mobile`, platform `android`, bounded app version/build, and a random installation-local SecureStore identifier.
- Both projections discard identities, arbitrary properties, campaigns, referrers, query/hash values and private route segments. Unknown routes become `/other`.
- Browser respects DNT/GPC through Logly SDK. Native transport contains no browser globals; bounded in-memory retries and four-second transport deadlines do not block app navigation/startup. Native random IDs use Expo Crypto UUIDs.
- Server schema validates at most 25 events and bounded streaming input (48 KiB). Browser origins must match the configured exact surface allowlist. Native origin headers are rejected. Country derives only from trusted Vercel edge metadata. Public routes never reflect collector diagnostic bodies.
- The deployed Logly native wire contract is 0.3.0, while npm currently publishes core 0.2.0 and no native package. A small local schema extension implements the Android contract without relying on an unpublished dependency.

## Verification / release
See [completion checklist](../tasks/2026-09-22-logly-completion.md) for current evidence. Prior September 12 AAB build `37b6d3b5-580d-4108-9aaf-6aa0b2736833` (0.1.0/build9) and September 9 web deployments are historical, not acceptance evidence for the separate workspaces/native contract.
No database schema changes.

## Generic business groups — 1 October 2026

The earlier anonymous-only projection is superseded for deployments that explicitly configure `LOGLY_ATTRIBUTION_SECRET` (minimum 32 characters). This task changes source only; no private environment value, analytics enable switch, mobile platform gate or production release hold was activated.

- A signed, project-bound analytics context supplies an opaque account reference and generic `groups.business = { key, properties: { name, kind: "cooperative" } }`. Keys are server-derived HMAC references; names are labels and renaming a cooperative preserves its key. No raw account/tenant IDs or account names/emails enter collector events.
- Dashboard `GET /api/analytics/context` uses the existing host/session server context and active membership (or platform-owner status). Public tenant pages obtain the host-resolved business group without requiring a user. Responses are private/no-store. Browser context renews one minute before expiry even on an unchanged active page; failed renewal retries after one minute and disposal cancels timers. Shared marketing stays anonymous.
- Mobile sign-in, current profile, role switch and session refresh responses include optional `analyticsContext`. Source tracking still requires Android + production variant + existing enable/project flags. The runtime retries profile refresh every minute near or after the one-hour context expiry and on foreground; expired scoped context pauses capture until renewal. Same-scope renewal preserves pending events.
- Browser and native events snapshot the token when captured. Proxies verify project, signature, capture time and a maximum 24-hour delivery age, then remove the token and replace client-supplied identity with verified attribution. Malformed/forged submitted tokens return 400. Arbitrary actor/group fields are discarded.
- The application allowlist permits scalar `surface`, `app_area`, `audience`, `workspace_role`, `channel`, `payment_method`, `item_count`, `action`, `category`, `status`, `duration_ms`, and `success`; context-derived values win. Route, campaign, referrer and form-data safeguards remain in place. Automatic events remain coarse navigation/session events. Custom events use lowercase names (letters, digits, underscores or dots; maximum 80 characters) through browser `useEvents().track(name, properties)` or mobile `trackProductEvent(name, properties)` from `@/lib/analytics`. Both snapshot the current context and retain only permitted metadata. Calls made while browser identity resolution is pending or after context expiry return false. Signed `audience: internal | business | anonymous` and `workspace_role` override client metadata.
- Browser tracking uses a bounded 250-event memory queue rather than the old SDK's project-shared IndexedDB queue: another account/tab cannot claim and retag pending events. Context changes discard pending scoped events and rotate the visitor identifier. A persisted opaque scope marker detects full-navigation logout/account changes across adapter instances; it carries no raw account/tenant ID. Mobile scope changes similarly rotate the identifier and clear the previous queue; token renewal within the same scope preserves the queue. Already in-flight requests retain the old capture identity. Offline pending events do not survive process/tab closure. Both transports drain batches bounded by 25 events and 48 KiB of actual UTF-8 JSON. Browser privacy signals are checked again before each delivery; newly denied tracking clears the queue and persisted visitor.
- Group identity is observational attribution, not tenant authorization. No merchant-facing analytics read endpoint or unrestricted collector read credential is introduced. Tenant-owned reporting remains a separate authorized API/UI milestone.

Rollout requires the Logly generic-groups collector first, then the same private attribution secret on Dashboard, API (mobile context issuer) and Marketing (mobile proxy). Existing per-surface ingest credentials/origin allowlists remain required. Rotating the reference secret changes pseudonymous identity keys and must be coordinated as a history boundary.

See [ADR](../decisions/ADR-20261001-logly-generic-business-attribution.md) and [task](../tasks/2026-10-01-logly-business-attribution.md).

## QA exclusion — 1 October 2026

Source implementation excludes QA analytics before optional collection. The server denies mapped QA account emails (exact normalized reserved domains from `EMAIL_QA_DOMAIN_ROUTES`), QA-derived sessions, and authorized workspaces with QA data classification. Browser context endpoints return an explicit `enabled` decision; QA returns `enabled: false` and `context: null`. Missing attribution credentials still permit ordinary anonymous analytics and cannot turn QA denial into anonymous collection.

Dashboard and Marketing wait for the server policy before capture. Policy refresh pauses capture, checks on focus/navigation and periodically, and discards queued events plus persisted visitor state on denial. Browser ingest routes independently drop authenticated QA submissions with HTTP 204 before contacting Logly. Native clients recheck live permission before capture and retry, discard pending events when denied, and restart for an allowed account without replaying the old QA queue. Mobile profiles include server-derived `analyticsEnabled: boolean` alongside `analyticsContext`. QA identity is never sent as analytics metadata. Existing project, platform, privacy and release enable gates remain unchanged.

No Prisma or database change. Source validation covers mapped/unmapped email domains, QA sessions/workspaces, normal-user allowance, absent attribution secrets, queue denial, anonymous fallback and normal-user resume. Deployment and live browser/device network acceptance remain release work; requests already sent cannot be recalled.

Older installed mobile binaries do not enforce the new `analyticsEnabled` profile decision; release and live network acceptance must use updated clients. No production deployment is claimed.

See [QA exclusion decision](../decisions/2026-10-01-logly-qa-exclusion.md).
