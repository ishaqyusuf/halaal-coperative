# ADR-029 — Adopt Immutable Financing Cycle Snapshots And Governed Disbursement

## Status

Accepted — 2026-08-30

## Context

Financing qualification, cycle allocation, approval, and cash availability change at different times. Recomputing a previously opened cycle after policy changes would rewrite the basis on which requests were accepted. Treating approval as a promise to disburse would also let a stale decision exceed current deployable cash.

The mobile staff workspace needs useful live operational data without becoming an authorization or accounting authority.

## Decision

- The first transition that opens a monthly financing cycle persists its capacity, reserve, and quick/normal allocation snapshot. Pausing and resuming the cycle does not rewrite that snapshot.
- A closed cycle is terminal. Every cycle command supplies the expected current state and uses a tenant-scoped compare-and-set.
- Final request approval revalidates the active product, captured eligibility, term, active-obligation overlap, guarantor evidence, dual-approval requirements, and remaining request capacity. Approval reserves capacity but does not guarantee cash release.
- Disbursement performs a fresh deployable-funds check inside the transaction, claims only an approved loan in its expected state, and records append-only ledger, schedule, audit, and idempotent command-receipt evidence.
- Mobile reads and commands use feature-owned DB, API, route-controller, and screen boundaries. Tenant and actor come only from the signed session. Offline or stale reads remain visible but cannot execute cycle, approval, or disbursement commands.
- The staff UI presents cycle truth, allocations, review/disbursement lanes, and blockers in the tokenized flat NativeWind system. Data entry and confirmations stay in keyboard-safe shared floating sheets.

## Consequences

- Historical cycle decisions remain explainable after policy or collection changes.
- Approval and disbursement remain separate governance events with separate evidence.
- Retried or concurrent commands fail closed or replay the canonical completed receipt instead of duplicating financial effects.
- The mobile client may preview server-provided capacity but cannot calculate or override authority locally.
- Repayment and collections operations can build on a disbursed loan with canonical schedule and ledger evidence; see Ticket 22.

## Related

- `.brain/features/financing-policy-guards.md`
- `.brain/features/financing-guarantor-approval.md`
- `.brain/features/mobile-architecture-hardening.md`
- `.brain/decisions/ADR-021-centralize-mobile-runtime-and-ban-offline-command-replay.md`
- `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-21/review-2026-08-30/README.md`
