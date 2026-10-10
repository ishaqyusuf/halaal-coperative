# ADR: Bind project-financing submission to reviewed charges

Status: Accepted, 25 September 2026.

## Context

The mobile project-financing form estimated charges from a catalogue snapshot. The final review originally omitted them, and the server recalculated charges when saving the request. A cooperative configuration change could therefore assess terms the member had not reviewed.

## Decision

The member requests a server-calculated charge quote for the exact requested amount before opening final review. The review shows each charge amount and collection mode. The member submits the quote fingerprint with the request. The database requotes at the request timestamp inside a Serializable transaction and compares the fingerprint before request, audit, or charge writes. A mismatch requires a fresh review. Dashboard/staff request commands retain their existing contract.

The fingerprint detects stale terms; it is not an authorization credential. Tenant, actor, member ownership, financial-write readiness and idempotency remain server-owned. The production mobile client does not recalculate financial charges; the development-only fixture simulates a quote without server writes.

## Consequences

Older mobile clients without the fingerprint cannot submit project-financing requests until updated. No configured charges still produce a fingerprint tied to the requested amount. Signed-device review, final agreement wording, optional-charge consent and launch-market classification remain separate release gates.
