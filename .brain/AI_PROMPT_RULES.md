# AI Prompt Rules

## Purpose
This file captures prompt-level instructions and durable context that future AI sessions should respect.

## How To Use
- Add stable project rules here, not temporary task notes.
- Keep rules concrete and testable.

## Project Rules
- Treat this product as a financial system, not a generic CRUD app.
- Preserve the project's 100% halal financial model in product and engineering decisions.
- Public, signup, notification, and marketing copy must not assume the audience is Muslim; use neutral greetings and inclusive terms like interest-free, ethical, transparent, cooperative, financing, and member-owned unless a tenant explicitly configures a religious tone.
- For cooperative finance and admin workflow prompts, think like a Halaal investment cooperative operator: protect member funds, surface pending/overdue/risky work, preserve auditability, and keep member trust central.
- Multi-tenant isolation is mandatory in all data and authorization decisions.
- Use append-only ledger thinking for money-related events whenever possible.
- Do not model loan eligibility as guaranteed disbursement.
- Do not introduce interest-bearing loan logic.
- Prefer configurable policy tables over hard-coded charges and cooperative rules.
- Build for explainability: admins and members should understand how balances were derived.
- Dashboard and report surfaces should be exception-led: show deployable funds, collection coverage, portfolio risk, action queues, KYC/compliance gaps, and profit/share status before normal completed records or platform diagnostics.
- Design offline flows so sync preserves auditability and does not silently rewrite financial history.
- Treat these repositories as standing coding architecture and implementation references when patterns, structure, or logic guidance is needed:
  - `~/Documents/code/_kitchen_sink/midday`
  - `~/Documents/code/_turbo/gnd`
  - `~/Documents/code/ewatrade`
  - `~/Documents/code/plotkeys`
- Reuse relevant standards and proven implementation patterns from those reference projects when they fit this repository's domain and safety constraints.

## Product Context
- Primary market assumption: Nigeria/Africa cooperative and thrift societies.
- Initial product posture: software platform for cooperatives, not a direct lender.
- Initial trust strategy: strong audit history, approvals, and transparent statements.

## Prompting Guidance
- Ask for clarification only when a hidden assumption could create financial risk.
- When uncertain, choose safer and more auditable designs.
- Summarize impacts on product, data, and permissions when making changes.

## Global Personal Coding Rules
<!-- BEGIN: global-personal-coding-rules -->
- Canonical global rules: `/Users/M1PRO/.me/coding-standards/global.md`
- Canonical Next.js/App Router/web rules: `/Users/M1PRO/.me/coding-standards/nextjs.md`
- Canonical Expo/React Native/mobile rules: `/Users/M1PRO/.me/coding-standards/expo.md`
- Treat these files as the source of truth for personal coding standards; do not copy full rule text into project Brain docs.
<!-- END: global-personal-coding-rules -->

## Non-Negotiable Architecture Rules
- Midday is the primary standard for pages, tables, modals, sheets, sidebar, forms, onboarding, layouts, tRPC calls, loading states, error states, and caching patterns.
- Use shadcn standard components and patterns for UI. Never directly modify shadcn source components; create wrapper components for project-specific behavior.
- Use GND as the reference for the standard notification package system.
- Use Plot Keys as the reference for local URL handling, portless/proxy support, and generated links.
- Add `app/[...slug]/page.tsx` as a catch-all route that redirects to `/` unless the repository has an explicit reason to diverge.
- For Prisma database updates, when the repository root has `db:migrate` and `db:push` scripts, run `bun db:migrate` and `bun db:push` after schema changes; do not manually create migration files.
