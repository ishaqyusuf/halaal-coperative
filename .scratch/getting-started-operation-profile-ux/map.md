# Getting Started Operation Profile UX Map

## Destination

An implementation-ready UX and technical specification for simplifying the Getting Started Operation Profile into a guided sub-step flow. The final spec should decide the sub-step sequence, per-service option sets, copy, motion behavior, URL/navigation model, settings parity, and acceptance criteria for implementation.

## Notes

- Domain: Halaalvest tenant Getting Started, Operation Profile, cooperative service configuration, member self-service access, procurement, Foodstuff Purchase, payment receipts, Collection Sources, and first-run setup.
- Consult `.brain/product/halaal-cooperative-operating-model.md`, `.brain/plans/2026-07-03-ux-ui-getting-started-backfill-simplification.md`, `.scratch/cooperative-feature-configuration/spec.md`, `.scratch/cooperative-operation-profile-full-qa/final-report.md`, and `apps/dashboard/src/components/getting-started-page-view.tsx`.
- Planning only. Do not implement application code from this map; resolve decisions until the route is clear, then produce an implementation handoff.
- Local tracker convention: child tickets live in `.scratch/getting-started-operation-profile-ux/issues/`.
- User direction: hide/drop the visible full step sequence, use Next/Previous navigation, make Operation Profile a set of clean sub-steps, use a title like "Let's know about your operation", add polished UI and motion, and reduce option overload where four access modes are unnecessary.

## Decisions so far

- [Getting Started Operation Profile Guided UX Spec](./spec.md) — approved conversation context synthesized into an implementation-ready spec with the `ready-for-agent` label.

## Not yet specified

- Exact production component boundaries after the sub-step navigation model is chosen.
- Exact animation library/API usage after the prototype decides the motion style.
- Exact wording for every helper line after the service option model is approved.
- Whether the same guided sub-step treatment should later apply to member backfill and other Getting Started steps, beyond this Operation Profile slice.

## Out of scope

- Reworking the underlying Operation Profile data model, server guards, mobile DTOs, or runtime feature gating.
- Changing finance rules for procurement, Foodstuff Purchase, Collection Source batch posting, payment receipts, or support cases.
- Replacing the broader Getting Started migration/backfill workflow outside the navigation needed to enter and leave the Operation Profile sub-step flow.
