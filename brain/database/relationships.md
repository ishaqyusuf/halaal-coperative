# Database Relationships

## Purpose
This file explains important entity relationships and tenant boundaries.

## How To Use
- Update when cardinality or ownership rules change.
- Keep relationship notes tied to business meaning.

## Core Relationships
- A tenant has many members.
- A tenant has many charge definitions.
- A tenant has many loan products.
- A member belongs to one tenant.
- A member may have one category and one primary deduction source.
- A member has many contributions.
- A member can have many loan requests.
- An approved loan has many repayment schedule items.
- A dividend period has many dividend allocations.
- Financial events may create one or more ledger entries.

## Tenant Rules
- Every money-related record should be traceable to a tenant.
- Cross-tenant references are forbidden.
- Indexes and unique constraints should include tenant context where appropriate.

## Open Questions
- Whether organizations should exist as a distinct entity under a tenant.
- Whether dividend periods should be tenant-wide, plan-specific, or both.
- TODO: decide how offline-created records are uniquely identified before sync.
