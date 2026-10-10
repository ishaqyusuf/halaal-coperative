# Mobile Share And Profit Governance

## Status

Ticket 26 complete on 2026-08-31. Primary Android implementation, real command, populated-data, Light/Dark, keyboard, exception-state, tenant-isolation, and contract evidence pass. Cross-device accessibility and release-profile evidence remain in Tickets 28–32.

## Product boundary

- Share capital and profit allocation are separate governed books. Share ownership is not savings, and a profit allocation is not an advertised or guaranteed return.
- Share policy supports explicit unit-based and monthly-history models. Unit-based policy distinguishes compulsory ownership, approved optional units, pending reserved units, remaining capacity, price snapshot, and posted ledger evidence.
- Profit periods distinguish live and historical records, gross result, reviewed expenses/deductions, distributable amount, allocation reconciliation, approval, and publication.
- Members receive only their own tenant-scoped published allocation/dividend evidence. Draft, reviewed, approved-but-unpublished, and other members' allocations remain private.
- Mobile supports oversight, application review, profit approval, and publication. Dense allocation construction and historical migration authoring remain web-first.

## Server contract

- The signed request owns tenant, actor, and role. Clients never select tenant or actor identity.
- Workspace/detail reads require `view_share_profit_governance`; share review requires `review_share_request`; profit approval requires `approve_profit_distribution`; publication requires `publish_profit_distribution`.
- Share review requires a pending expected state, UUID command id, decision, bounded evidence, and approved units only for approval. Approval rechecks policy/capacity and posts share capital once.
- Profit approval requires reviewed expected state, reconciled allocation evidence, UUID command id, and bounded notes. Publication requires approved expected state and publishes the reconciled member evidence once while rebuilding authoritative period totals.
- Tenant ownership, legal state, permission, command fingerprint/idempotency, and publication secrecy are rechecked at the database transaction boundary. Client capability flags shape presentation only.

## Mobile contract

- `/share-profit-governance` is a thin admin route backed by feature-owned model, API adapter, controller, screen, fixtures, and the sanitized Sentry source `mobile.share_profit_governance`.
- The selected `A — Two books` design uses one flat Share capital/Profit allocation switch, restrained position summaries, divider-led rows, semantic NativeWind Light/Dark tokens, and no hard-coded screen colors.
- Browse detail, confirmation, and success use shared floating sheets. Review/approval entry is separate from lists, keyboard safe, and includes icon-only development Quick Fill.
- Server-backed search and cursor paging remain authoritative. Initial failures do not fabricate zero financial totals; cached offline/stale reads remain visible while every command is disabled.
- Switching books waits for the selected book's own workspace response before showing its summary or queue. A missing selected-book response shows an unavailable retry state instead of zero counts or posted capital; commands remain blocked until that book loads.

## Evidence

- `.scratch/mobile-architecture-hardening-and-feature-completion/screenshots/ticket-26/README.md`
- `.scratch/mobile-architecture-hardening-and-feature-completion/designs/ticket-26-share-profit-governance/`
- `.brain/decisions/ADR-032-separate-share-capital-and-profit-governance-books.md`
