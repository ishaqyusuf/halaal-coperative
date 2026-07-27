# ADR-013: Keep Local Tenant Workspaces Behind Portless HTTPS

## Status

Accepted

## Date

2026-07-27

## Context

- Portless terminates local TLS on port 443 and forwards dashboard traffic to the internal Next.js listener on port 1441.
- Redirecting a local `*.halaalvest-dash.localhost` request to `*.halaalvest.localhost:1441` bypasses Portless, exposes the internal port, and downgrades the browser to HTTP.
- The marketing and dashboard apps use separate Portless route roots, so the dashboard needs its dedicated local root to preserve correct wildcard routing.

## Decision

- Use `https://<tenant>.halaalvest-dash.localhost` as the primary local tenant workspace URL.
- Serve local dashboard hosts directly through the dashboard proxy without redirecting them to the tenant-site root.
- Keep production dashboard-alias redirects to the canonical production tenant hostname.
- Retain direct-port, path-style, and LAN-IP URLs only as explicit development fallbacks.

## Consequences

- Local workspace URLs use trusted HTTPS without exposing port 1441.
- Portless owns TLS and wildcard routing while Next.js continues listening internally over HTTP.
- Local and production canonical-host behavior intentionally differ.
- Onboarding and QA surfaces must treat the Portless URL as primary and label direct-port variants as fallbacks.

## Alternatives Considered

- Redirect local dashboard aliases to `http://<tenant>.halaalvest.localhost:1441`.
  - Rejected because it bypasses TLS and exposes the internal listener.
- Route both marketing and dashboard wildcard traffic through `halaalvest.localhost`.
  - Rejected because Portless cannot map the shared parent route to two different application listeners.
