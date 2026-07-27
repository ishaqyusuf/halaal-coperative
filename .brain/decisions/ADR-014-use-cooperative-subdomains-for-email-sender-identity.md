# ADR-014: Use Cooperative Subdomains For Email Sender Identity

## Status

Accepted

## Context

- The shared transport previously labeled every bare sender address as `Welcome to Halaalvest`, so inboxes presented unrelated messages under the same misleading sender identity.
- Tenant emails need a recognizable cooperative identity without provisioning a separate provider domain or mailbox for every cooperative.
- `Tenant.slug` is unique, stable across cooperative renames, DNS-label safe, and limited to 63 characters, which also fits the email local-part limit.
- Resend requires the domain in the provider `From` address to exactly match a verified sending domain.

## Decision

- Carry an optional structured sender identity on notification email drafts: cooperative display name plus stored tenant slug.
- For tenant email, use `"Cooperative Name" <tenant-slug@configured-domain>`.
- Derive the configured domain from `EMAIL_FROM_ADDRESS`; its configured local part remains the fallback for messages created before tenant context exists.
- Require tenant name and slug at registered tenant-email schemas and direct tenant-email boundaries. Never derive the sender local part from the cooperative name, subject, recipient, or action URL.
- Sanitize and quote display names, validate tenant local parts and the configured sender domain, and fail before provider delivery when either is invalid.
- Keep early-access request and approval email on the configured platform sender because the workspace slug has not been chosen yet.
- Preserve notification subjects, body headings, reply-to behavior, QA recipient routing, and delivery audits.

## Consequences

- Recipients can identify the cooperative from both the sender name and address.
- Renaming a cooperative changes the display name but not the sender address.
- One verified provider domain can support all tenant sender identities without per-tenant mailbox provisioning.
- Production must verify the exact domain configured through `EMAIL_FROM_ADDRESS`.
- These addresses are outbound identities only; inbound mailbox or reply routing remains a separate concern.

## Alternatives Considered

- Keep one `Halaalvest` sender for all email.
  - Rejected because it hides the cooperative context from members and staff.
- Generate the local part from the current cooperative name.
  - Rejected because renames could unexpectedly change sender identity and create collisions.
- Verify a separate sending domain for each cooperative.
  - Rejected because it adds provider and DNS lifecycle work without improving the current outbound-only requirement.
