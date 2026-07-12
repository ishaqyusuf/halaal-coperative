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
- For Halaalvest product, dashboard, and finance work, apply the Halaal cooperative domain lens from `brain/product/halaal-cooperative-operating-model.md` and `brain/product/admin-dashboard-kpi-framework.md`.
- Admin dashboards should be exception-led: prioritize money safety, contribution health, portfolio risk, pending actions, KYC/compliance gaps, and member trust over platform diagnostics.
- Prefer safe defaults when requirements are underspecified.
- Do not bypass tenant scoping in queries or service calls.
- Run `bun run db:migrate` and `bun run db:push` only when a change touches Prisma schema, migrations, database tables, constraints, indexes, or DB behavior that may require schema synchronization; skip them for UI-only, routing-only, and component-only changes.
- When useful, consult `~/Documents/code/_kitchen_sink/midday`, `~/Documents/code/_turbo/gnd`, `~/Documents/code/ewatrade`, and `~/Documents/code/plotkeys` as standing reference projects for coding standards, architecture, and implementation patterns.
