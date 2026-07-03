# Project Brain

## Purpose
This folder is the structured memory for halaalvest. It keeps product, architecture, engineering, data, API, and task context in one place so humans and AI agents can work consistently.

## How To Use
- Update the most relevant document whenever a meaningful product or technical decision is made.
- Prefer small, factual edits over long prose.
- Link related docs when one change affects multiple areas.

## Sections
- `SYSTEM_OVERVIEW.md`: top-level summary of the system and current direction.
- `PROJECT_INDEX.md`: quick map of important folders and files in the repo.
- `AI_WORKFLOW.md`: how AI agents should operate in this project.
- `AI_PROMPT_RULES.md`: prompt and collaboration constraints for future AI work.
- `system/`: architecture, boundaries, and stack.
- `system/reference-projects.md`: absolute paths for external local repositories used as architecture and coding pattern references.
- `product/`: problem, users, roadmap, and business model.
- `product/halaal-cooperative-operating-model.md`: durable Halaal cooperative finance and admin-operating lens.
- `product/admin-dashboard-kpi-framework.md`: admin dashboard KPI and content hierarchy for cooperative operators.
- `engineering/`: repo rules, coding standards, and AI delivery rules.
- `database/`: schema, relationships, and migration history.
- `api/`: endpoints, contracts, and permissions.
- `features/`: feature-level documentation.
- `decisions/`: ADRs for durable technical decisions.
- `bugs/`: incident memory and prevention notes.
- `tasks/`: backlog, in-progress work, completed work, and roadmap.
- `templates/`: starter templates for consistent documentation.

## Current Status
- Repository initialized with Brain docs before application code.
- Product concept: multi-tenant cooperative savings and interest-free financing management SaaS.
- Highest-risk domains: financial correctness, auditability, permissions, trust, and financing liquidity.
- Domain operating lens: Halaal-standard cooperative money safety, contribution health, portfolio risk, admin action queues, compliance watch, and member trust.
- Primary external architecture and coding-standard reference for performance-sensitive work: `midday` at `/Users/M1PRO/Documents/code/_kitchen_sink/midday`.
