# ADR — Isolate mobile store-review grants from purchases

Status: Accepted in local source on 29 September 2026; no Production grant or reviewer account issued.

## Context

The first public mobile release requires individual Apple/Google subscriptions. A store reviewer also needs reusable access to paid features without making a purchase, while a separate unpaid reviewer must see the paywall. A historical tenant-plan override cannot satisfy the personal mobile gate, and a fabricated store purchase would corrupt provider evidence.

## Decision

Persist review access in a separate `MobileAppReviewGrant` row, unique per user. A current platform owner may issue or renew it only for a non-owner account whose home and all current memberships belong to one active QA-classified tenant with a QA source domain. The grant is bound to that tenant and the server-selected store environment; it expires in more than one hour and at most 30 days. Issuance, renewal and revocation write audit events in the same serializable transaction. Reissue before expiry for repeat store review. There is no client-grant or self-service path.

The personal snapshot reads a current grant only when no verified store purchase already grants access, and only for the selected QA tenant and matching environment. The existing signed-mobile API gate consumes that same snapshot. Expiry, revocation, deleted users, QA purge or a different tenant remove grant access; ordinary role and record permissions remain independent. No provider purchase/event or `TenantSubscription` row is written.

## Consequences

One synthetic account can inspect its actual member and staff/admin roles through one user ID; a second synthetic account without purchase or grant reaches the existing pre-entry paywall. Both paths need signed-device verification, isolated harmless fixture data, account maintenance and credential rotation before store review. The maximum grant period requires an operator renewal process. No Production entitlement, user, store product or release is created by this source decision.
