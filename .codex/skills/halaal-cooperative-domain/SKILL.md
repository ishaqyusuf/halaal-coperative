---
name: halaal-cooperative-domain
description: Apply expert Halaal investment cooperative product, finance, compliance, dashboard, and engineering judgment. Use when designing, reviewing, planning, or implementing Halaalvest cooperative workflows including member onboarding, contributions, savings, charges, interest-free financing, repayments, collections, profit allocation, admin dashboards, reporting, KYC, auditability, tenant policy, and financial safety.
---

# Halaal Cooperative Domain

Use this skill to keep Halaalvest work grounded in cooperative finance, member trust, Halaal constraints, and admin operations.

## Required Reading

Before making product, dashboard, API, data-model, or finance workflow decisions, read the relevant Brain docs:

- `brain/product/halaal-cooperative-operating-model.md`: domain model, users, money principles, and safety rules.
- `brain/product/admin-dashboard-kpi-framework.md`: admin dashboard metric hierarchy and content rules.
- `brain/features/member-commitments-and-payment-allocation.md`: member commitments, payment splits, savings, and loan servicing.
- `brain/features/core-cooperative-platform.md`: core product rules and release scope.
- `brain/AI_PROMPT_RULES.md`: durable prompt-level constraints for financial correctness.

Read only the docs needed for the task, but always read the first two for dashboard, reporting, finance, or admin-workflow work.

## Domain Lens

For every recommendation or implementation, check:

- Money safety: balances, reserves, commitments, disbursements, repayments, and allocations must be explainable and auditable.
- Halaal model: do not introduce interest-bearing logic, guaranteed lending, hidden fees, or unclear profit treatment.
- Cooperative trust: members and admins must be able to understand how balances, eligibility, charges, and profits were derived.
- Admin actionability: dashboards and reports should prioritize pending, overdue, blocked, risky, or compliance-sensitive items.
- Tenant isolation: every query, action, and report must be scoped to the current tenant and role.
- Governance: privileged finance actions need role checks, audit logs, and clear state transitions.
- Offline and migration safety: staged, imported, or backfilled financial records must not silently rewrite posted history.

## Dashboard Rules

When designing or reviewing an admin dashboard:

- Lead with exception-led cooperative operations, not platform diagnostics.
- Prefer primary metrics: deployable funds, collection coverage, portfolio at risk, and action queue total.
- Show daily admin work: pending approvals, KYC/document review, financing approvals, disbursement holds, overdue follow-ups, failed imports, and setup warnings.
- Show contribution health: expected, received, collection gap, paid members, unpaid members, and deduction-source issues when available.
- Show financing risk: outstanding principal, overdue amount, PAR-style buckets, pending disbursements, and escalations when available.
- Show Halaal/compliance watch: KYC gaps, audit exceptions, missing documentation, non-compliant income handling if modeled, and pending profit review.
- Demote developer diagnostics such as session state, routing, tenant host, scaffolded product areas, and runtime mode unless they are setup warnings.

## Implementation Guidance

- Follow Midday-style app structure and API call patterns when working in the dashboard.
- Keep route files thin: prefetch, hydrate, and compose feature views.
- Put read aggregation in `packages/db/src/queries/*`.
- Expose dashboard reads through typed tRPC routers in `apps/api/src/routers/*`.
- Keep React components focused on rendering returned DTOs.
- Update Brain docs when changing durable finance, dashboard, permission, or architecture behavior.

