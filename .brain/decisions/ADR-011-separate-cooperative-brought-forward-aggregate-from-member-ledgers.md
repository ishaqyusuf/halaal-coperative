# ADR-011: Separate Cooperative Brought-Forward Aggregate From Member Ledgers

## Status

Accepted

## Context

A cooperative may migrate only a reviewed sample of member records while still needing to preserve the current totals for its full membership. Deriving cooperative-wide savings or share totals from that sample is incorrect, while assigning the missing total to sampled members would violate member share limits and distort eligibility.

## Decision

Store one tenant-scoped `TenantBroughtForwardSnapshot` as reconciliation evidence for brought-forward setup. It records the as-of date, full member-count snapshot, total member savings, total special savings, total share units, share-unit price snapshot, derived share capital, and notes.

The snapshot is separate from `tenant_policies`, member opening balances, contribution ledgers, and share ledgers. Saving it does not post money, create member share ownership, change loan eligibility, or bypass per-member share limits.

## Consequences

- Cooperatives can preserve full-population opening totals while importing only a sample or staged subset of member records.
- Reports can compare detailed migrated records with the declared cooperative-wide position without treating the declaration as a ledger balance.
- Member-level financial operations continue to rely only on audited member records and posting workflows.
- The snapshot is editable only while historical setup tools remain open and brought-forward mode is selected.
