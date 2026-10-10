# Cooperative Ledger Email System Implementation

Status: Complete
Approved design: Direction 01, **Cooperative Ledger**
Execution guide: Midday migration planner

## Goal

Replace the string-built notification email markup with a reusable React Email system that applies the approved Cooperative Ledger structure to every registered Halaalvest notification type while preserving delivery, QA routing, tenant sender identity, and plain-text fallbacks.

## Source-to-target contract

| Concern | Source contract | Halaalvest target | Migration decision |
| --- | --- | --- | --- |
| Visual system | Approved Cooperative Ledger HTML direction | `packages/email/src/components/*` | Preserve the navy header, green status rule, mobile-first 600px canvas, strong subject hierarchy, optional amount/status card, audit details, CTA, and cooperative footer. |
| Template composition | Midday/GND React Email package patterns | `packages/email/src/emails/notification.tsx` | Use a shared package-owned shell and small semantic modules; keep transport code free of presentation markup. |
| Runtime rendering | Current synchronous `NotificationEmailTemplate(...)` string return | `renderNotificationEmail(...)` backed by React static markup | Preserve synchronous notification draft creation so existing API and public-action callers do not change. |
| Event semantics | 40 entries in `halaalVestNotificationTypes` | Exhaustive email-presentation map in `packages/notifications` | Every registered type must have an email channel and an explicit presentation family/label. |
| Sender identity | Tenant display name + immutable slug, with platform fallback | Existing `NotificationEmailDraft.sender` contract | Preserve ADR-014 behavior; presentation may display the tenant name but must not infer or mutate sender identity. |
| Delivery and QA | Resend/console delivery, test override, QA-domain banner | Existing `packages/notifications/src/index.ts` transport path | No transport rewrite; rendered HTML continues through the existing routing and banner logic. |
| Plain text | Existing `bodyText` field | Existing delivery `text` payload | Preserve human-readable text and visible action URL independently of HTML. |

## Target package and file plan

- `packages/email/src/components/email-shell.tsx`: document, responsive canvas, header, and footer.
- `packages/email/src/components/email-content.tsx`: hero, amount/status card, detail rows, notice, and action button.
- `packages/email/src/emails/notification.tsx`: runtime composition and default preview.
- `packages/email/src/emails/*-preview.tsx`: representative previews for finance, member, access, operations, and support families.
- `packages/email/src/render.ts`: synchronous React-to-HTML bridge.
- `packages/notifications/src/types/email-presentation.ts`: exhaustive 40-type semantic mapping.
- `packages/notifications/src/types/shared.ts` and `registry.ts`: pass recipient, tenant, variant, amount, and presentation data into the shared renderer.

## Non-applicable migration surfaces

- Route table: not applicable; no URL or page ownership changes.
- API procedure table: not applicable; no request/response contract changes.
- Database table: not applicable; no schema, query, or migration changes.
- Jobs/outbox table: not applicable; delivery orchestration is intentionally preserved.
- Permissions table: not applicable; emails continue to use the same notification creation and delivery authorization paths.

## Invariants

- All 40 registered notification types remain email-capable.
- No notification subject, action, recipient resolution, or sender local-part behavior is removed.
- Global copy stays faith-neutral; tenant-specific greetings can be added later through tenant configuration.
- Financial copy must not introduce interest, hidden fees, guaranteed returns, or invented monetary facts.
- Amounts are displayed only when already present in the notification body data.
- The email remains usable at mobile widths and with images disabled.

## Verification

- Narrow package typecheck/lint for `@halaalvest/email` and `@halaalvest/notifications`.
- Unit tests for safe rendering, responsive structure, neutral greeting, sender identity, amount extraction, and exhaustive registry coverage.
- React Email browser QA for the five representative families at desktop and mobile widths.
- Screenshots attached in the implementation task for user review.
- Final conformance audit against this contract and the approved Direction 01 design.

## Progress checklist

- [x] Inspect current email/notification boundaries and local Midday, GND, and School Clerk references.
- [x] Lock source-to-target migration contract.
- [x] Build shared React Email shell and rendering bridge.
- [x] Map all 40 notification types to semantic presentations.
- [x] Verify package behavior with narrow tests and checks.
- [x] Complete browser QA and attach screenshots.
- [x] Update Brain feature/task documentation and close the goal.
