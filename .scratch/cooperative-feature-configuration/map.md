# Cooperative Feature Configuration Map

## Destination

An implementation-ready product and technical specification for making cooperative operations configurable during Getting Started and respected across admin, member, mobile, reports, and finance workflows. The spec must cover service activation, procurement settings, Foodstuff Purchase settings, commitment collection modes, deduction-source batch posting, runtime gating, defaults, and rollout rules.

## Notes

- Domain: Halaalvest cooperative tenant setup, operation profile configuration, member self-service access, procurement, Foodstuff Purchase, commitments, deduction sources, payroll/manual contribution posting, and feature gating.
- Consult `brain/product/halaal-cooperative-operating-model.md`, `brain/prds/2026-07-08-client-fit-cooperative-operations-expansion.md`, `brain/intake/2026-07-08-client-demo-visit-feature-discovery.md`, `brain/intake/2026-07-08-client-demo-recording-derived-notes.md`, and existing `.scratch/getting-started-migration-mode/` decisions when resolving tickets.
- Current implementation already has tenant policy fields for share configuration, financing policy, procurement payback policy, Foodstuff Purchase payback policy, migration setup mode, member signup access mode, and deduction sources. Prefer extending those concepts unless a ticket decides a separate feature settings model is safer.
- Treat staged/imported/generated/posting boundaries as finance-safety constraints. Member-submitted actions and payroll batches must not silently post money without the configured review/posting path.
- Planning only. Do not implement application code from this map; resolve decisions until the route is clear, then produce an implementation handoff.
- Local tracker convention: child tickets live in `.scratch/cooperative-feature-configuration/issues/`.

## Decisions so far

## Not yet specified

- Exact Prisma migration shape, API contract names, and form component boundaries after the persistence model is decided.
- Exact onboarding copy and field-level help text after the operation profile prototype is reviewed.
- Exact mobile UI changes after the gating rules decide which member services should appear, hide, or remain read-only.
- Whether emergency financing and project financing need the same feature-activation treatment in the first implementation wave, after the core service catalog is defined.
- Exact implementation tickets and sequencing after the final handoff spec is assembled.

## Out of scope

- Implementing the configuration changes inside this Wayfinder map.
- Re-deciding the already-built unit-share policy, except for how it appears in the broader operation profile.
- Full project financing accounting semantics; that remains separate until repayable vs partnership/profit-sharing behavior is confirmed.
- Bank integration, automatic bank reconciliation, or direct payroll/ministry API integration.
- Procurement vendor management, inventory management, or marketplace workflows.
