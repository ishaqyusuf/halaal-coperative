# ADR: Bind mobile financing submission to reviewed charges

Status: Accepted, 25 September 2026.

## Context

The member financing quote showed charge totals, but the submission command recalculated and applied charges without checking that they still matched what the member reviewed. Percentage charges were also displayed using their configured percentage value instead of the calculated monetary charge.

## Decision

Return calculated charge amounts, collection modes, and a SHA-256 fingerprint of the monetary charge terms and requested amount in the mobile quote. Require the fingerprint on mobile member submission. Requote and compare inside the existing Serializable transaction before creating the request or applying charges. A mismatch asks the member to review a fresh quote. Dashboard submissions retain their existing contract.

The fingerprint is a stale-terms check, not an authorization credential: the server still derives member and tenant from the session and enforces all financing guards. The client displays collection method and assessed charge status without treating a request as approval or inferring final total payable.

## Consequences

Old mobile clients without the fingerprint cannot submit financing requests until updated. Charge configuration changes between preview and submit cause a safe retry. This does not resolve final agreement wording, whether optional configured charges need a separate opt-in, or signed-device acceptance; those remain launch review items.
