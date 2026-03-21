# AI Workflow

## Purpose
This file defines how AI agents should explore, change, and document work in this repository.

## How To Use
- Read before making non-trivial changes.
- Treat these steps as the default operating workflow for AI contributors.

## Workflow
1. Read `brain/SYSTEM_OVERVIEW.md` and relevant area docs before coding.
2. Confirm whether an ADR is needed for any new architectural pattern or durable business rule.
3. Implement the smallest complete change that solves the current problem.
4. Update Brain docs that changed because of the implementation.
5. Record completed work in `brain/tasks/done.md` and move active work appropriately.

## Documentation Expectations
- Update product docs for business rule changes.
- Update database docs for schema changes.
- Update API docs for route or payload changes.
- Update decisions when tradeoffs are important and long-lived.

## Quality Bar
- Preserve financial correctness over speed.
- Prefer explicit, auditable domain logic.
- Avoid hidden side effects in balance or loan calculations.
- Keep permissions strict and role-aware.

## When To Pause
- If a change may affect money movement, repayment logic, or tenant isolation.
- If the requested implementation conflicts with existing Brain decisions.
- If a new integration introduces compliance or security risk.
