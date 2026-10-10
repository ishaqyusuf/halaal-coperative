# ADR-028: Preserve Immutable Charge Version And Correction Evidence

## Status

Accepted — 2026-08-30

## Context

Staff must be able to explain which dated rule produced a member charge and how a later settlement, waiver, or reversal affected the ledger. Re-resolving mutable configuration or overwriting a posted application would make historical amounts and correction evidence unreliable.

## Decision

Treat existing dated charge-definition versions as immutable after their definition has any member application. New commercial terms require a new dated version. Charge detail resolves the version effective at the application's assessment time and exposes that version, amount basis, workflow target, original posting, and audit trail. A pending separate-payment charge settles through a unique reference and balanced posting. Waiver and reversal change legal state only through explicit reasoned commands and, when the original charge was posted, append an opposite ledger transaction rather than editing or deleting the original one. Mobile commands also require an expected state, UUID receipt, and deterministic payload fingerprint.

## Consequences

- Historical charge amounts remain reproducible from stable dated evidence.
- Operators cannot repair a historical mistake by silently editing a used version; they must add a new version and use an explicit correction workflow where needed.
- Exact command retries are safe, while stale state and payload-changing receipt reuse fail closed.
- Pending waivers do not create synthetic money movement; posted corrections retain both original and opposite ledger evidence.
- The wider charge lifecycle still needs a cross-workflow audit of every automated applicability and target-ownership path.
