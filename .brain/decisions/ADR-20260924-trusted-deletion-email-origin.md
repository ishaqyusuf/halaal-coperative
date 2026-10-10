# ADR — Require a trusted origin for deletion verification emails

Date: 24 September 2026
Status: Accepted for local implementation; production delivery remains unverified.

## Context

The public deletion request previously formed its email verification link with the general marketing origin resolver. That resolver can use local development values or the incoming request URL when deployment settings are incomplete. Emailing a secret-bearing link to a request-controlled host would expose the one-time token; emailing a localhost link would make the workflow unusable.

## Decision

In production, construct deletion email links only from an explicitly configured `MARKETING_APP_URL`, `NEXT_PUBLIC_MARKETING_APP_URL`, or `PLATFORM_ROOT_DOMAIN`, in that order. Require a non-local HTTPS root origin with no credentials, path, query or fragment. Validate the origin before rate-limit/challenge/database work. Keep request-URL fallback only for local development.

26 September follow-up: the Vercel marketing project currently sets `MARKETING_APP_URL=https://halaalvest.com` for both Production and Preview. A Preview deletion request must reject the known Production marketing/API/dashboard hosts as its email-link origin. The form-readiness check and POST route both pass `APP_ENV` to the same origin validator, so a future otherwise-ready Preview cannot issue a token pointing at the public 404 verification page. A distinct trusted Preview marketing origin is required for isolated QA. This is a fail-closed target check, not proof that the alternative origin is reachable or that an email was delivered.

Later follow-up: the current Vercel Preview inventory does not list `APP_ENV`. The shared validator now also reads `VERCEL_ENV` to reject Production hosts on Preview and fails on conflicting Preview/Production labels. The deletion form-readiness check uses this same validator.

## Consequences

Missing or invalid production origin configuration stops the request before a challenge is created or email attempted. A valid configured origin still needs deployment and delivered-email/browser redemption testing. This decision does not complete account erasure or remove the separate credential-rotation gate.
