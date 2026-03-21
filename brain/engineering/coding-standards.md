# Coding Standards

## Purpose
This file tracks coding expectations for maintainability, safety, and clarity.

## How To Use
- Apply these standards to all new code.
- Add project-specific conventions as the codebase grows.

## Standards
- Prefer explicit domain naming over generic helper names.
- Keep money values typed and consistently represented.
- Centralize business rules for contributions, charges, and loans.
- Avoid duplicating financial calculations across UI and backend.
- Add tests for any non-trivial financial rule.
- Favor pure functions for calculation logic where possible.
- Keep authorization checks close to entry points and service boundaries.

## Financial Safety Rules
- Never trust client-supplied balances.
- Derive balances from ledger or authoritative transaction records.
- Use transactions for multi-step financial writes.
- Record who performed approvals and when.
