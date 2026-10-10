# ADR: Show the request host and gate dashboard public legal links

Status: Accepted, 25 September 2026.

## Context

The protected no-data dashboard Preview login rendered `app.halaalvest.local` as its Host when no tenant resolved. Its Terms, Privacy, Delete account and Support links pointed to Production marketing URLs that still returned 404. Neither display described the active Preview deployment truthfully.

## Decision

Display the public request host on the login page, omitting the Host row if none is available. Do not fabricate a local or canonical tenant hostname for a platform-host login. The four public links are enabled only when `DASHBOARD_PUBLIC_LEGAL_ORIGIN` names a reviewed HTTPS marketing origin without credentials, path, query, fragment or local/reserved host. When unset or invalid, show an unavailable message instead of broken destinations. Configure the exact target origin only after its Terms, Privacy, Deletion and Support routes pass deployment checks; approval and effective publication remain separate gates.

## Verification and limits

Five focused host/origin tests and 12 assertions, dashboard TypeScript, formatting and remote Preview build passed. The first protected dashboard Preview `dpl_98y4QZjfyCCTT1fhvR2bH3XBBUVt` returned HTTP 200, displayed its actual host, omitted `app.halaalvest.local` and the 404 Production links, and showed the unavailable message. A later protected Preview `dpl_3hY6LgMeyHRnxbCAJusPquZ7LxKz` received a deployment-scoped `DASHBOARD_PUBLIC_LEGAL_ORIGIN` pointing to protected marketing Preview `dpl_2TzBPMbjXhVrWZD489qb7rA4gDRd`. Browser navigation opened the corrected draft deletion page directly; authenticated route checks found all four linked Terms, Privacy, Deletion and Support pages HTTP 200 with draft/noindex metadata. The dashboard project-wide setting and Production remain unchanged. No login, database connection, public legal publication or real deletion request occurred.
