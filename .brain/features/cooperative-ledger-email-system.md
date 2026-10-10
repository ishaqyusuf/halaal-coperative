# Cooperative Ledger Email System

## Summary

Halaalvest notification email uses the approved **Cooperative Ledger** visual system across all registered notification types. The system is implemented with React Email and keeps presentation in `packages/email`, event semantics in `packages/notifications`, and delivery orchestration in the existing notification transport.

## Approved structure

- 600px email-safe canvas with a mobile full-width layout.
- Navy Halaalvest header, green status rule, and tenant cooperative name when tenant context exists.
- Event-family eyebrow, strong subject heading, and neutral recipient greeting.
- Optional amount/status card only when an explicit Naira amount already exists in notification copy.
- Audit-oriented detail rows, one primary action, record context, and a neutral cooperative/platform footer.
- No external image dependency for core identity or comprehension.

## Runtime ownership

- `packages/email/src/components/email-shell.tsx` owns the document, responsive canvas, header, and footer.
- `packages/email/src/components/email-content.tsx` owns hero, amount/status, detail, and action modules.
- `packages/email/src/emails/notification.tsx` composes the standard runtime template and exposes the synchronous rendering helper.
- `packages/email/src/render.ts` renders React to static HTML synchronously so existing API and public-action callers keep their current contract.
- `packages/notifications/src/types/email-presentation.ts` maps all 40 registered notification types to an explicit family and event label.
- Existing Resend, console, QA-domain, global test override, plain-text, retry, and audit behavior remains unchanged.

## Semantic preview families

- Finance and cooperative ledger activity.
- Member lifecycle and membership records.
- Account verification and workspace access.
- Workspace operations and migration/import records.
- Member support and case updates.

These previews demonstrate semantic variation inside one standard structure; production notification subjects, body copy, actions, recipients, and tenant identity continue to come from the registered notification definitions.

## Cooperative and Halaal safeguards

- Global copy is faith-neutral; tenant-configured greetings can be introduced separately without changing the shell.
- The template does not invent interest, fees, returns, balances, or decision facts.
- Amount extraction recognizes only explicit `₦` or `NGN` facts already present in notification copy.
- Footer copy describes recorded activity without representing provisional evidence as a completed financial posting.
- Tenant display name is presentational only; the immutable tenant slug remains the sender-address authority under ADR-014.

## Verification

- All 40 presentation keys exactly match the registered notification type list and remain email-capable.
- Email package typecheck and lint pass.
- Notification package typecheck passes; lint has zero errors and retains seven pre-existing warnings outside this change.
- 54 focused tests pass: two renderer tests plus the complete 52-test notification suite.
- React Email 5.2.10 live preview renders all five families.
- Browser QA at 390px confirms the expected heading and CTA for each family with no horizontal overflow.
- Desktop and mobile screenshots were captured and attached to the implementation task.

## Related records

- `.brain/plans/2026-08-30-feature-cooperative-ledger-email-system-implementation.md`
- `.brain/decisions/ADR-031-adopt-package-owned-cooperative-ledger-react-email-system.md`
- `.brain/features/cooperative-email-sender-identity.md`
