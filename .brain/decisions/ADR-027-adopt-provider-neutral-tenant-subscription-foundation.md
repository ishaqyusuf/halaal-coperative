# ADR-027: Adopt Provider-Neutral Tenant Subscription Foundation

**Owner scope correction, 28 September 2026:** the tenant subscription foundation and member-login enforcement below remain source history but are not authority for the first-release mobile charge. The owner made web dashboard access free and set a separate per-user Apple/Google mobile app subscription for all mobile roles. Reconcile existing tenant entitlement gates with the free-web direction; do not apply a personal store purchase to `TenantSubscription`. See [the new ADR](ADR-20260928-per-user-mobile-app-access-subscriptions.md).

## Status

Accepted — 2026-08-30

## Context

Halaalvest needs tenant SaaS plans, entitlement and active-member-capacity enforcement, trial/grace behavior, plan-change intent, invoices, and eventual provider integration. Binding those rules directly to one billing vendor would mix product policy with provider state, make idempotency and tenant isolation harder to audit, and tempt clients to treat a checkout response as finance authority.

## Decision

Own the canonical Free Beta, Starter, Standard, Growth, and Enterprise policy in the domain layer and persist provider-neutral plan, tenant subscription, add-on, checkout-intent, invoice, and provider-event records. Derive one effective tenant snapshot server-side. Enforce member login in account access and active-member expansion in membership commands. Reconcile time-driven lifecycle states with audit evidence, preserve bounded grace behavior, and fail closed for unsafe expansion when billing state is unavailable. Provider identifiers, payload hashes, and hosted URLs are adapters around this model; they do not own tenant policy. A first Free Beta period begins at subscription provisioning time, not historical tenant creation time.

## Consequences

- SaaS subscription billing remains separate from cooperative/member finance ledgers.
- Provider selection can be deferred without fabricating live checkout or payment success.
- Tenant-scoped idempotency and provider-event deduplication are durable and testable.
- Roles and Operation Profile/finance rules remain stricter than paid entitlements.
- Live checkout, webhooks, reconciliation, payment collection, provider observability, and production canaries remain explicit follow-up work.
