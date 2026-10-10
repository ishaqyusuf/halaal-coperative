# ADR — Gate new mobile store offers on launch readiness

Status: Accepted in source on 25 September 2026; no live store sale enabled.

The mobile `subscriptions.storeCatalog` endpoint previously exposed configured Apple/Google products whenever provider credentials were present, even while public legal, billing, deletion and support pages were drafts. A configured catalog alone is not approval to sell.

The endpoint now returns an empty product list unless one of these conditions holds:

- Sandbox: the signed tenant is currently QA-classified, has a QA source domain and is not being purged. This permits isolated purchase testing before final public policy approval. The existing entitlement write independently rechecks QA status and purchase ownership.
- Production new offers: `STORE_BILLING_SALES_ENABLED=true` and the exact approved, effective snapshots of platform Terms, Privacy, software billing, account deletion, support and cooperative disclosures all validate. The switch defaults off. Each policy's approval hash covers its reviewed content and metadata.

This gates **new offers**, not purchase verification, restoration, provider notifications or existing renewals. Those paths must remain available to reconcile a prior store charge. The gate does not prove the public URLs work, the contact mailbox is monitored, the product prices are approved, or a signed-device purchase succeeds. Verify those separately before enabling Production sales or submitting a store build.

## Recovery clarification

A configured Production environment returns the signed tenant’s existing subscription account binding to an authorized subscription administrator even when the sales switch or policy approvals gate new products. The mobile client opens the store with an empty offer list and keeps Restore purchases and Manage subscription available. If fetching configured new products fails after store connection, it also keeps those recovery actions available while explaining that new plans could not be loaded. Sandbox returns a binding only for an active QA tenant with a QA source; an invalid/unset environment returns neither binding nor offers. Provider verification and entitlement application still enforce their own tenant/account and QA rules. This corrects the previous source behavior that disabled restoration together with new offers.
