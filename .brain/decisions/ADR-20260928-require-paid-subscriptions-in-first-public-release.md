# ADR: Require working software subscriptions in HalaalVest's first public release

Date: 28 September 2026
Status: Superseded on 28 September 2026 by [per-user mobile app access decision](ADR-20260928-per-user-mobile-app-access-subscriptions.md). The first-release paid-store requirement remains, but the tenant-plan purchaser and catalog described below do not.

## Decision

HalaalVest's first public mobile release must include working Apple and Google subscriptions for approved software plans. The app download remains free. A public release with paid checkout deferred does not satisfy this decision.

## Consequences

- Keep paid subscription product creation, localized price review, provider agreements and merchant setup, and signed-device purchase/restore/renewal/cancellation/expiry/refund evidence as first-release gates on each platform.
- Do not infer fixed prices, trials, sale countries or provider IDs from marketing ranges or worldwide app-download availability. The owner is being asked to approve these separately.
- Keep new Production offers disabled while policy snapshots remain drafts, the exact catalog is absent, or provider and device evidence is missing. Existing purchase verification and restoration must remain available for prior transactions.
- The reported monthly quota/reset hold on cloud builds, deployments, OTA publication and submissions still applies until the owner explicitly lifts it.

See [the catalog decision sheet](../runbooks/halaalvest-store-catalog-decision.md), [release gates](../runbooks/halaalvest-launch-release-gates.md) and [offer-gate ADR](ADR-20260925-gate-new-mobile-store-offers.md).
