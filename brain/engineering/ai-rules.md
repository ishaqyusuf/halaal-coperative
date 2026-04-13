# AI Rules

## Purpose
This file defines repository-specific delivery rules for AI contributors.

## How To Use
- Read before implementation.
- Add new durable rules when recurring mistakes or patterns emerge.

## Rules
- Read relevant Brain docs before changing code.
- Update Brain docs as part of the same task when behavior changes.
- Create ADRs for durable architecture or domain decisions.
- Treat ledger, loans, charges, and balances as high-risk areas requiring extra caution.
- Prefer safe defaults when requirements are underspecified.
- Do not bypass tenant scoping in queries or service calls.
- When useful, consult `~/Documents/code/_kitchen_sink/midday`, `~/Documents/code/_turbo/gnd`, `~/Documents/code/ewatrade`, and `~/Documents/code/plotkeys` as standing reference projects for coding standards, architecture, and implementation patterns.
