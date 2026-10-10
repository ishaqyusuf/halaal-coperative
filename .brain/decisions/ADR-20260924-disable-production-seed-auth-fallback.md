# ADR — Disable production seed authentication fallback

Date: 24 September 2026
Status: Accepted for local implementation; deployment pending.

## Context

The original seed-backed tenant/session scaffold predates persistent production authentication. Its asynchronous user and membership lookups could still return demo identities when `HALAALVEST_DATABASE_URL` was absent, and non-UUID seed IDs bypassed the database lookup even when it was configured. The linked hosted projects have not yet been verified with the current runtime database variable. An absent setting must not turn a production session into a demo identity.

## Decision

In `NODE_ENV=production`, asynchronous auth user and membership lookups never resolve seed identities. Missing database configuration returns no account or membership; non-UUID seed IDs also cannot resolve. Development/test seed behavior remains available for local scaffolding. Database-backed user-by-ID resolution separately requires `deletedAt: null` so revoked accounts lose signed-session authority.

## Consequences

Production login and existing session authorization fail closed until `HALAALVEST_DATABASE_URL` is configured with a working database. Tenant seed presentation may still appear in unrelated read paths; this ADR covers authentication, not a claim that all seed-backed production behavior has been removed. Before release, provision and verify the current variable on each hosted runtime, then test ordinary login, deleted-account denial and tenant scoping against the deployed database. The shared Neon credential rotation remains a separate prerequisite.
