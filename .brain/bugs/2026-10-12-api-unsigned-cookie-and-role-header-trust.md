# API trusted unsigned identity and a role header on the cookie path

- Status: fixed in source on 12 October 2026. Not released yet.
- Severity: critical. Authentication bypass and privilege escalation on the hosted API.
- Affected area: `apps/api/src/context.ts` `buildRequestContext`. This covers the dashboard `/api/trpc` route (the hosted API), dashboard server tRPC, the marketing in-process callers and the local Hono server.

## Reproduction (before the fix)

- A request with `x-user-id: <id>` and any `x-session-token` got a session for that user.
- A request with an unsigned `halaalvest_user=<id>` cookie and any `halaalvest_session` value got a session for that user.
- A valid finance-officer cookie session plus `x-user-role: tenant_admin` or `super_admin` passed `manage_subscription`.
- All three were shown with synthetic demo-seed identities through the real dashboard `/api/trpc` route on a local `next dev`. Header-only identity worked there even though `src/proxy.ts` deletes those headers.

## Root cause

The cookie path verified the signed token but used the result only for scope, expiry and QA fields. It took identity from unsigned inputs. `auth.session` was built whenever a user resolved and any token string was present. `x-user-role` was an ungated override of the active membership role.

## Fix

See [ADR-20261012](../decisions/ADR-20261012-api-identity-from-signed-sessions-only.md).

- The signed cookie for the host scope is required, and the user comes from its payload.
- A contradicting user cookie rejects the session.
- `x-user-id`, `x-session-token` and `x-user-role` are no longer read.
- `x-user-role` is removed from CORS.

## Tests

`apps/api/src/context.test.ts` adds 10 cookie-path cases:

- signed cookie accepted
- signed cookie accepted without the user hint
- header identity rejected
- unsigned cookie identity rejected
- mismatched hint rejected
- spoof headers ignored beside a signed cookie
- `x-user-role` `super_admin` and `tenant_admin` ignored
- cross-scope cookie rejected
- expired cookie rejected

Nine of these failed before the fix, and all pass after it.

## Follow-up

- Once deployed, decide whether to rotate `AUTH_SECRET` to end all existing web sessions. Rotation does not help with past forged requests, because those never needed the secret. Review audit logs for privileged actions by unexpected actors where that is feasible.
- Why the dashboard proxy's header deletes did not reach the route handler in local dev was not investigated further. Authority now lives in the API context.
- `apps/dashboard/proxy.ts` (repository root) appears to be an inactive duplicate of `src/proxy.ts`. Next resolves the proxy that sits at the same level as `src/app`. `proxy.test.ts` imports the root copy.
