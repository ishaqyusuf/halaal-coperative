# ADR: Quarantine Preview email delivery to routed QA domains

Status: Accepted, 25 September 2026.

## Context

The production-mode marketing Preview can show a public deletion request form once its database, challenge secret and email provider are configured. Preview email routing resolves to console mode with explicit `.test` domain routes. Before this change, form readiness did not reject a live delivery mode, and a non-QA recipient in console mode could write its address and verification link to deployment logs.

## Decision

Show the Preview deletion form only when routing resolves to console mode and at least one approved QA-domain route exists. Reject a Preview/Production mismatch between `APP_ENV` and Vercel's deployment environment before selecting email delivery. In a Preview environment, console-mode transport rejects recipients outside configured QA domains rather than logging their email drafts. The deletion request keeps its neutral public response and discards a challenge when delivery fails. Local development without a Preview environment retains console delivery. Production continues to require live mode and its separate target preflight.

This is a routing and log-exposure guard, not proof of email delivery or complete account erasure.

## Verification

The focused marketing/notification suite passes 25 tests and 56 assertions, including a non-QA Preview deletion-link draft that fails without a console log and both deployment-identity conflicts. Marketing and notifications TypeScript and formatting pass. The synthetic production-mode Preview preflight resolves to console mode with a routed `.test` domain and renders the template without sending email. Current source deployed as protected marketing Preview `dpl_2TzBPMbjXhVrWZD489qb7rA4gDRd`; the remote build and TypeScript passed. Authenticated read-only checks found the draft/noindex deletion page, unavailable notice, no request form and accurate fallback wording. Its legal bundle remains empty. Preview still lacks its database, challenge secret and QA routing; no real email was sent.
