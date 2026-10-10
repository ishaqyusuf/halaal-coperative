# ADR — Keep mobile query inputs out of request URLs

Date: 24 September 2026
Status: Accepted for local implementation; signed-release verification pending.

## Context

Native admin list screens send search text to tRPC queries. The default `httpLink` transport puts query input in GET URL parameters. Hosting request logs and drains can retain URLs, so application-level Sentry sanitisation alone cannot establish that search text is transient. Apple App Privacy classification depends on actual collection and retention, including integrated services.

## Decision

The mobile tRPC link sends queries as POST with input in the body, and the shared API fetch handler explicitly accepts the tRPC POST query override. Web query transport is unchanged. Mobile query inputs no longer appear in the request URL; API error capture still uses procedure name and safe request ID rather than input/body.

## Consequences

A local client-to-handler test verifies POST, no input URL parameter and unchanged query execution. This reduces exposure in URL-based logs; it does not prove that hosting, proxies, diagnostics, analytics or other processors never retain request bodies. Before final Apple Search History and Google Data safety answers, inspect a signed iOS/Android request and all enabled production logging/processor settings. The hosting provider's request retention and any log drains need explicit review.
