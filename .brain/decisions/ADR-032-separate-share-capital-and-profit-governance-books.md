# ADR-032: Separate Share Capital And Profit Governance Books

## Status

Accepted

## Context

- Share capital represents member ownership; cooperative profit allocation represents governed distribution of realized business results.
- Combining them in one balance or workflow would invite incorrect savings language, implied returns, premature member disclosure, and unsafe cross-posting.
- Cooperatives may retain monthly share history or use unit-based compulsory/optional ownership, while profit periods have separate review, reconciliation, approval, and publication states.
- Mobile staff need bounded oversight and deliberate commands without importing dense allocation construction or historical migration authoring into the client.

## Decision

- Present and operate Share capital and Profit allocation as two explicit books under one tenant-scoped mobile governance workspace.
- Keep share policy, approved/pending units, price snapshots, share applications, and immutable share-ledger postings in the Share capital book.
- Keep gross result, reviewed expenses/deductions, distributable amount, member allocation reconciliation, approval, and publication in the Profit allocation book.
- Use separate named permissions for workspace visibility, share review, profit approval, and profit publication.
- Require signed tenant/actor scope, legal expected state, UUID idempotency, transaction-owned validation, and audit evidence for every command.
- Publish member allocation evidence only after the governed publication command succeeds. Never expose draft, reviewed, or approved-but-unpublished allocations through member contracts.
- Keep dense allocation construction and historical migration authoring web-first; mobile performs bounded oversight and supported decisions.

## Consequences

- Share approval may post share capital exactly once but cannot create savings or a profit allocation.
- Profit approval/publication cannot change member share ownership or imply a guaranteed future return.
- Both monthly-history and unit-based cooperatives can use the same mobile route without presenting controls that their policy does not support.
- The UI, API, database queries, audit evidence, and tests must preserve the two-book boundary even when summaries appear in one workspace.
- Offline or stale clients may read authorized cached evidence but cannot queue or replay financial commands.

## Alternatives considered

- Use one combined member investment balance.
  - Rejected because it conflates ownership capital, savings, and realized-profit distribution.
- Expose all allocation stages to members.
  - Rejected because unpublished allocations are governance work-in-progress, not member evidence.
- Move full allocation construction to mobile.
  - Rejected because the dense, high-risk authoring workflow is better retained in the existing web operations surface while mobile provides review and publication controls.
