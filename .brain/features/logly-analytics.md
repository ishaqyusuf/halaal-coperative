# Logly analytics integration

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
