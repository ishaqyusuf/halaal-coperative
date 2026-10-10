# ADR: Require effective platform documents at marketing launch

Status: Accepted, 26 September 2026. This is a source gate, not approval of the current drafts.

## Context

Prelaunch cooperative onboarding intentionally permits draft Terms and Privacy without recording contractual acceptance. The same bundle previously reported `acceptanceRequired: false` when both documents were drafts even if `MARKETING_STAGE=launch`. A launch-configured signup could therefore proceed without an effective versioned acceptance.

## Decision

The published legal bundle reports `acceptanceRequired: true` whenever the marketing stage is `launch`, even if neither document has been published. The signup UI then blocks submission while the bundle is unavailable; `POST /api/signup` rejects before creating an onboarding token or sending a verification email; tenant bootstrap reads the same flag and rejects a missing or stale acknowledgement before creating a tenant. Prelaunch behavior remains unchanged. Publishing one document still requires both approved effective documents before acceptance can proceed. Owner/legal sign-off, source-bound publication hashes and live route verification remain separate release gates.

## Verification

The legal-publication test exercises both prelaunch and launch with the current drafts. An in-process `POST /api/signup` request at launch stage returns HTTP 412 before a database lookup or email call. Focused legal-publication, acceptance and signup-route suites pass 11 tests/79 assertions; database and marketing TypeScript and formatting checks pass. No production configuration, policy publication or live signup was changed.
