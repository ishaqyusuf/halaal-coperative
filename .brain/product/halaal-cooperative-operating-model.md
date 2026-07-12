# Halaal Cooperative Operating Model

## Purpose
- Define the durable product and finance lens for Halaalvest as a Halaal-standard, interest-free cooperative operations platform.
- Use this document when designing dashboards, finance workflows, member operations, policy rules, reporting, permissions, and data models.

## Product Posture
- Halaalvest is a software platform for cooperatives, thrift societies, and member-owned finance groups.
- The addressable audience is any cooperative that wants transparent, interest-free, member-owned finance operations; public copy should not imply the product is only for Muslim cooperatives.
- The platform is not positioned as a direct lender unless a future regulated business line explicitly changes that.
- The system should help tenant cooperatives manage member savings, charges, interest-free financing, repayments, profit allocation, statements, approvals, and audit history.
- Default platform communications should use neutral greetings and inclusive operating language. Islamic greetings or explicitly religious communication tone should be tenant-configurable later, not the global default.

## Primary Users
- Tenant admin: owns cooperative setup, policy configuration, roles, approvals, and governance.
- Finance officer: manages contributions, savings, charges, financing, repayments, backfill, reports, and collections.
- Operations officer: manages member records, onboarding, KYC, documents, follow-ups, and notifications.
- Member: views personal savings, charges, financing, repayment progress, statements, and eligible actions.

## Core Finance Principles
- Preserve the 100% Halaal / interest-free finance model: no interest-bearing loan logic.
- Treat member financing as cooperative pool deployment, not guaranteed credit.
- Make fees, charges, and levies explicit, policy-backed, and auditable.
- Keep member savings, share capital, loan/financing principal, repayment servicing, charges, and profit allocation distinct.
- Prefer append-only ledger thinking for posted money events.
- Use reversals, waivers, adjustments, and audit entries instead of destructive rewrites.
- Keep staged, imported, generated, and posted records visibly separate.

## Halaal And Compliance Guardrails
- Do not model time-based interest, compounding interest, penalty interest, or hidden interest-like fees.
- Profit allocation should be tied to actual cooperative business or investment results.
- Non-compliant income handling, if modeled, should be visible, reviewable, and separable from distributable profit.
- KYC/document completeness, approval status, and audit-sensitive actions should be available to staff.
- Role checks and tenant scoping are mandatory for finance configuration, disbursement, reversals, waivers, and profit publication.

## Admin Decision Priorities
- Money safety: Is the cooperative financially safe today?
- Collection health: Are expected member contributions arriving?
- Portfolio risk: Which financing or repayments are late, risky, or blocked?
- Action queue: What approvals, reviews, follow-ups, imports, or setup tasks need attention?
- Compliance watch: Which KYC, audit, documentation, or Halaal-sensitive items need review?
- Member trust: Can members and staff explain how each balance was derived?

## Operation Profile
- Each cooperative can describe how it operates through a tenant Operation Profile during Getting Started and later from Settings.
- The profile controls service access modes for payment receipts, procurement, Foodstuff Purchase, support cases, Collection Source assignment, and Collection Source batch posting.
- Service access modes are operational, not destructive: `disabled`, `office_only`, `member_self_service`, and `read_only` change new-action availability and default visibility while preserving existing records, obligations, reports, statements, and audit evidence.
- Procurement and Foodstuff Purchase keep separate policy rules for maximum payback months, commitment-reduction behavior during active payback, and active obligation limits. Foodstuff Purchase can also require an open cycle before applications are accepted.
- Collection Source is the product-facing label for ministry, employer, payroll, transfer, cash, manual, or other collection grouping. It is separate from member type and is used for staged batch posting when enabled.
- Manual/self-employed members remain valid even when payroll-style sources are enabled. They should use receipt or office-posting workflows instead of being silently included in source batches.

## Dashboard Operating Principle
- The admin dashboard should be exception-led.
- Show pending, overdue, blocked, risky, and financially meaningful items before normal completed records.
- Demote platform diagnostics such as runtime mode, routing, tenant host, and scaffolded product areas unless they are setup warnings.

## Data And Architecture Implications
- Dashboard read models should be aggregated in `packages/db/src/queries/*` and exposed through typed API routes.
- UI components should render decision-oriented DTOs instead of performing finance aggregation.
- Every query that touches tenant data must scope by tenant and respect role boundaries.
- Long-running generation, imports, backfill, notifications, or reconciliation work should use jobs where the repo already has that pattern.

## Open Items
- TODO: Confirm formal terminology for cooperative financing products across UI: loan, financing, qard, facility, or tenant-configurable label.
- TODO: Confirm whether Halaal compliance review requires an explicit Sharia-review workflow in the MVP.
- TODO: Confirm non-compliant income and purification handling if tenant investment pools later require it.
