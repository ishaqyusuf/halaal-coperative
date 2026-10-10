# ADR — Accept verified cooperative domains for external deletion requests

Date: 25 September 2026
Status: Accepted for local implementation; public delivery remains unverified.

## Context

The public deletion form required a cooperative workspace slug. A member who signs in through a custom domain may know only that domain, so a working web request path could still be unusable for that member. User email is not globally unique; email alone cannot safely select a cooperative account.

## Decision

Accept a workspace slug or bare website hostname in the existing workspace field. Normalize case before lookup. Match a hostname only through a `TenantDomain` record with `verificationStatus: verified`; use the same tenant filter for the user lookup and selected membership that owns the challenge. Ambiguous same-email matches remain unanswered with the neutral public response. Key the per-account initiation rate limit to normalized email so alternate domains cannot multiply the allowance; keep the separate network limit.

## Consequences

Members on a verified custom domain can start the existing email-control flow without knowing the slug. Unverified domains, unrelated tenants, unknown accounts and ambiguous same-email accounts receive no challenge. A full URL is not accepted in the field; the form requests a workspace name or website domain. This change does not complete deletion, verify email delivery or publish the public page.
