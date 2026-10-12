# API identity comes only from signed sessions

Status: accepted, 12 October 2026.

## Context

The hosted API runs inside the dashboard deployment at `/api/trpc` (`release.config.ts`). Mobile also uses that origin. The marketing app and dashboard server components call `buildRequestContext` in-process. The standalone Hono server in `apps/api/src/index.ts` is local development only.

On the cookie (non-bearer) path, `apps/api/src/context.ts` took identity from client-controlled inputs:

- The user came from the `x-user-id` header or the unsigned `halaalvest_user_<scope>` cookie.
- The session token came from `x-session-token` or the session cookie, and its HMAC signature was never required.
- `x-user-role` replaced the active membership role, in any environment.

So any non-empty token string, together with a known user ID, authenticated as that user. Any signed-in user could also send `x-user-role: super_admin` to take every tenant permission. Both worked through the real dashboard `/api/trpc` route in a local run. The dashboard proxy's stripping of `x-user-id` and `x-session-token` did not protect that route in that run, and the proxy never stripped `x-user-role`. Nothing in the repository sent these headers. Dashboard pages (`apps/dashboard/src/lib/server-context.ts`) already required a verified signed cookie, so pages and the API disagreed.

## Decision

- The cookie path requires `verifySignedSessionToken` to succeed for the request host's session scope. The user ID comes from the signed payload.
- The unsigned user cookie is only a consistency hint. If it is present and names a different user, the session is rejected. If it is absent, the signed payload alone is enough.
- An inactive QA authorization in the signed cookie still rejects the session.
- The API never reads `x-user-id`, `x-session-token` or `x-user-role`. There is no internal caller and no environment flag that re-enables them. A future internal caller must present an ordinary signed session or use its own authenticated channel.
- `x-user-role` is removed from the Hono CORS `allowHeaders`.
- The mobile bearer, durable mobile-session and QA bearer paths are unchanged.
- Cookie-path membership selection is unchanged: it is the resolved tenant's membership, or the default one. A signed web `membershipId` is still ignored there, as it is in dashboard pages.

## Consequences

- Web sign-in flows must set the signed session cookie for the scope of the host that will call the API. Login, QA entry and the planned One Path handoff already do this, and they also set the matching user cookie.
- A platform-scope cookie no longer authenticates API calls on a tenant host. Dashboard pages already behaved this way.
- Role changes for testing must use real memberships, for example QA profiles or `auth.mobile.switchRole`, not request headers.
- The proxy's header stripping is now defence in depth only. Authority lives in `buildRequestContext`.
