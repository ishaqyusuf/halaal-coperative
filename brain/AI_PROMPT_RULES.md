# AI Prompt Rules

## Purpose
This file captures prompt-level instructions and durable context that future AI sessions should respect.

## How To Use
- Add stable project rules here, not temporary task notes.
- Keep rules concrete and testable.

## Project Rules
- Treat this product as a financial system, not a generic CRUD app.
- Preserve the project's 100% halal financial model in product and engineering decisions.
- Multi-tenant isolation is mandatory in all data and authorization decisions.
- Use append-only ledger thinking for money-related events whenever possible.
- Do not model loan eligibility as guaranteed disbursement.
- Do not introduce interest-bearing loan logic.
- Prefer configurable policy tables over hard-coded charges and cooperative rules.
- Build for explainability: admins and members should understand how balances were derived.
- Design offline flows so sync preserves auditability and does not silently rewrite financial history.

## Product Context
- Primary market assumption: Nigeria/Africa cooperative and thrift societies.
- Initial product posture: software platform for cooperatives, not a direct lender.
- Initial trust strategy: strong audit history, approvals, and transparent statements.

## Prompting Guidance
- Ask for clarification only when a hidden assumption could create financial risk.
- When uncertain, choose safer and more auditable designs.
- Summarize impacts on product, data, and permissions when making changes.
