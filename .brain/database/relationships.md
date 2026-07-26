# Database Relationships

## Purpose
This file explains important entity relationships and tenant boundaries.

## How To Use
- Update when cardinality or ownership rules change.
- Keep relationship notes tied to business meaning.

## Core Relationships
- A tenant has many members.
- A tenant has many charge definitions.
- A member belongs to one tenant.
- A member has many contributions.
- A member can have many loan requests.
- An approved loan has many repayment schedule items.
- Financial events may create one or more ledger entries.
- A tenant can have one cooperative-wide brought-forward snapshot; the snapshot has no member relation and does not create financial ledger entries.
- A member can have many special-savings withdrawals; each withdrawal belongs to one tenant and member and links one-to-one to its originating support case and balanced ledger transaction.

## Current Scaffold State
- Prisma relations are now implemented in grouped schema files under `packages/db/prisma/models`.
- Tenant scoping is explicit across money-related records via `tenantId`.
- Reverse relations exist for contribution, charge, loan, repayment, ledger, dividend, offline sync, and audit entities.

## Tenant Rules
- Every money-related record should be traceable to a tenant.
- Cross-tenant references are forbidden.
- Indexes and unique constraints should include tenant context where appropriate.

## Open Questions
- Whether organizations should exist as a distinct entity under a tenant.
- Whether dividend periods should be tenant-wide, plan-specific, or both.
- TODO: decide how offline-created records are uniquely identified before sync.
