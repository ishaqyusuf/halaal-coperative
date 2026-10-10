# Per-user mobile app access subscriptions

Date: 28 September 2026
Status: Accepted product direction; implementation and store validation open

Implementation note (28 September): the native first-release flow offers both durations to a new subscriber but blocks a second in-app purchase while an existing personal store receipt is present. Existing subscribers use the store's Manage surface for duration changes and Restore to recheck access. This avoids a duplicate charge across Google's two base plans on one subscription product until signed-device change-plan behavior is verified. The server accepts a provider-verified linked-token/deferred state when notified; no client can declare a switch or grant locally. Ordinary mobile feature calls now require verified personal access, while member sign-in, billing/recovery and web sessions do not require that personal payment.

## Owner decision

The web dashboard is free to use. Mobile app access is a separate paid convenience purchased by **each mobile user**, including members, staff and administrators, through their own Apple or Google account. The launch prices chosen by the owner are **₦500 for six months** and **₦1,000 for one year**. These are target Nigerian consumer prices; actual available store price points, tax presentation and other storefront currencies must be checked in each provider console before sale. The first public mobile release still requires working native subscriptions on both platforms. The owner wants an expired/unpaid user unable to enter the app's normal feature area.

## Architecture consequence

Create an app-access entitlement keyed to the authenticated mobile user/account, with tenant and role context retained for authorization. It must not change the cooperative's tenant plan, member-finance ledger, savings, financing, repayment or web dashboard access. Provider transactions bind to that user's stable server identity; a purchase cannot grant access to a different user merely because the same device or store account is used. Server-verified current provider state, ownership, idempotent events and notifications determine access, never the local callback alone. A six-month and annual product grant the same app access; concurrent or replacement receipts need explicit ownership/transition handling without double-granting.

The access check follows that user across their cooperative memberships in one store environment. The purchase row's tenant link preserves provenance and audit ownership; it is not a second payment boundary. Client purchase verification must confirm membership in the currently selected cooperative, and every ordinary feature operation keeps its existing tenant and role authorization. This avoids requiring an impossible second purchase of the same Apple subscription when the user switches cooperative workspaces.

After sign-in, gate normal mobile feature routes on the server app-access decision. Keep a pre-entry billing surface available to start purchase, Restore purchases and Manage subscription, and keep sign-out, support, account/privacy deletion and legal information reachable. This is the operational meaning of “require subscription to enter”: a user must still be able to recover a paid purchase or resolve an account problem. A cached grant cannot silently outlive its verified expiry; service outage policy must be explicit and fail safely. Signed-device QA must exercise new purchase, restore, renewal, cancellation with remaining paid period, billing retry/grace, expiry, refund, account mismatch and role changes.

## Source conflict and migration boundary

Current `subscriptions.storeCatalog` and `verifyStorePurchase` require `manage_subscription`; mobile `/subscription` tells users only a cooperative administrator can manage billing. It offers monthly Starter/Standard/Growth and binds purchases to `TenantSubscription`, so one admin purchase can change access for a whole cooperative. That is **not** this decision. Do not map new app-access products into the existing `STORE_BILLING_CATALOG` or repurpose `TenantSubscription` rows for individual access. Introduce a separate model/API/catalog/UI and retire the tenant-plan native purchase route before sale. Existing provider safety logic may be factored and reused only with an explicit user-ownership boundary. Preserve historical tenant subscription records and provider events; do not silently migrate them to personal purchases.

## Catalog shape and open checks

Propose two Apple auto-renewable products in the existing `HalaalVest Software Plans` group at the **same access level**, durations six months and one year. Propose one Google subscription product with two auto-renewing base plans, every six months and yearly. No introductory trial or offer was requested; do not configure one by inference. Product IDs remain proposals until console creation. The owner chose exact Nigerian targets, but paid-sale territories beyond Nigeria, obtainable price points, grace policy and renewal/cancellation copy require review. Worldwide app download availability does not enable worldwide paid sales.

The owner hold on EAS cloud builds, deployment, OTA and store submission remains until the monthly reset and an explicit lift. See [the replacement catalog](../runbooks/halaalvest-mobile-app-access-catalog.md) and [release gates](../runbooks/halaalvest-launch-release-gates.md).

Production sale configuration must include both approved durations on both stores before any new personal offer is served. Google uses one subscription product with two base plans; two separate Google products are rejected as a catalog error. This keeps a partial configuration from silently launching one store or one duration while preserving Restore and server verification for existing receipts.
