# Reconcile known personal store chains after account access revocation

Date: 29 September 2026
Status: Accepted source rule; signed provider delivery and retention approval open

## Context

Revoking a HalaalVest account removes login and device access but does not cancel an Apple or Google subscription. The personal purchase writer previously rejected every provider notification once `User.deletedAt` was set. A renewal, cancellation or refund for a purchase already recorded by HalaalVest would therefore keep failing the webhook instead of updating the retained billing evidence.

## Decision

After access revocation, accept only server-verified **system notifications** for an existing personal purchase chain or a new provider token explicitly linked to a same-user, same-environment predecessor. Preserve the normal provider ownership, environment, ordering, duplicate-evidence and QA-purge checks. Reject client-initiated verification and any unlinked new chain for the deleted account. Record an audit marker when verified evidence is applied after revocation. This reconciles store state; it does not restore login, mobile access or an account-deletion completion state.

The access snapshot also filters purchase rows through `User.deletedAt IS NULL`. A retained, still-active store chain can therefore support billing reconciliation without returning a paid-access grant for a revoked login, even if the snapshot query is called outside normal session resolution.

## Limits

An initial purchase notification that arrives only after revocation and has no recorded predecessor remains unmatched for manual review. Provider redelivery, actual refunds, acknowledgement and signed-device behavior need sandbox evidence. Store purchase and event retention basis, duration, processor copies and erasure treatment still require owner/legal approval; this rule does not approve permanent retention or cancel a store subscription.
