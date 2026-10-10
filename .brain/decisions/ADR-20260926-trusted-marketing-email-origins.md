# ADR — Use a trusted origin for every signed marketing email link

Date: 26 September 2026
Status: Accepted for local implementation; deployed delivery remains unverified.

## Context

Deletion verification already required a configured marketing origin, but early-access approval, approved setup and signup verification still used a resolver that could fall back to the incoming request URL. A misconfigured production deployment could therefore email a signed link to a request-controlled host.

## Decision

All production marketing routes that email signed handoff links use the shared trusted-origin validator from [the deletion origin ADR](ADR-20260924-trusted-deletion-email-origin.md). It chooses `MARKETING_APP_URL`, `NEXT_PUBLIC_MARKETING_APP_URL`, then `PLATFORM_ROOT_DOMAIN`; requires a non-local HTTPS root without credentials, path, query or fragment; and rejects known Production hosts when either `APP_ENV` or `VERCEL_ENV` identifies Preview. Conflicting Preview/Production labels fail closed. This matters because the current Vercel marketing Preview inventory does not list `APP_ENV`. The request URL remains a local-development fallback only. Resolve the origin before signing a new handoff token or attempting email delivery.

## Consequences

Missing or invalid configuration returns `PROVIDER_UNAVAILABLE` and stops the flow. Preview needs a distinct configured marketing host. Source tests do not establish that the host is deployed, reachable, isolated or that email was delivered and redeemed. Existing owner/legal, policy-publication and release gates remain open.
