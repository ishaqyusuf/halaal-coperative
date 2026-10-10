# ADR-031: Adopt Package-Owned Cooperative Ledger React Email System

## Status

Accepted

## Context

- The notification registry contains 40 email-capable event types, but the shared template was one manually concatenated HTML string with no React Email preview.
- The approved Direction 01 design requires a consistent cooperative identity, mobile hierarchy, financial-fact modules, and audit context across every event family.
- Existing API and public-action call sites create notification drafts synchronously, and changing that contract would spread presentation migration concerns into orchestration code.
- Tenant sender identity, QA routing, and plain-text delivery are established contracts that must survive a visual migration.

## Decision

- Own reusable email layout and content modules in `packages/email` using React Email.
- Use the Cooperative Ledger system as the single standard shell for all registered notification email.
- Render React synchronously with `react-dom/server` at the package boundary so existing notification draft creation stays synchronous.
- Keep an exhaustive presentation map in `packages/notifications` so every registered notification type has an explicit semantic family, eyebrow, and optional amount label.
- Pass tenant display name and recipient display name into presentation without changing the sender local-part authority defined by ADR-014.
- Preserve the existing notification transport, QA routing, subject, body text, action, retry, and audit contracts.
- Maintain representative React Email previews for finance, member lifecycle, account access, operations, and support.

## Consequences

- A new notification type cannot index the presentation registry until it adds an email presentation entry, and the registry-coverage test will fail if the sets diverge.
- Shared structure changes can be reviewed in one package and verified in live React Email previews.
- Runtime notification creation remains compatible with current synchronous callers.
- Core email comprehension does not depend on remote images.
- Rich event-specific facts beyond the current subject/body/action contract require an explicit typed extension rather than string parsing; only explicit Naira amounts are currently promoted into the amount card.

## Alternatives Considered

- Keep concatenating HTML strings.
  - Rejected because it has no component boundary, preview catalog, or scalable semantic structure.
- Make all notification draft builders asynchronous to use `@react-email/render` directly.
  - Rejected because it would broaden a visual migration into API, public-action, and test call sites without user value.
- Build 40 independent email components.
  - Rejected because it would duplicate the approved standard and make visual drift likely; semantic families and exhaustive presentation data provide variation without forking structure.
