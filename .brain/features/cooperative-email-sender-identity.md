# Cooperative Email Sender Identity

## Summary

- Tenant-scoped email uses the cooperative display name and immutable workspace slug on the configured provider domain.
- Example: `Kaduna Reliable Health Workers Society <kaduna-reliable-health-workers-society-723@halaalvest.com>`.

## Configuration

- `EMAIL_FROM_ADDRESS` supplies the verified base address and sending domain, for example `notifications@halaalvest.com`.
- Tenant delivery replaces only the configured local part with `Tenant.slug`.
- Pre-workspace platform email retains the configured sender address and uses `Halaalvest` when a bare address needs a display name.

## Behavior

- Registered tenant-email payloads require both `tenantName` and `tenantSlug`.
- Direct tenant flows such as password reset, portal access, and tenant-role notification delivery pass the active tenant identity explicitly.
- The provider transport sanitizes and quotes the cooperative display name, validates the tenant slug as an email local part, and validates the configured sender domain before delivery.
- Cooperative renames update only the display name. The sender address remains stable because it uses `Tenant.slug`.
- Event-specific subjects and HTML headings remain unchanged.
- QA routing changes only recipient delivery and QA evidence; it preserves the cooperative sender identity.

## Boundaries

- Early-access request and approval email use the platform sender because no workspace slug exists yet.
- Sender identities do not provision inboxes and do not alter `EMAIL_REPLY_TO`.
- Invalid tenant slugs or configured sender domains fail closed before a provider request.
- Production delivery requires the exact configured domain to be verified with the email provider.

## Verification

- Transport tests cover tenant sender formatting, rename stability, maximum-length slugs, display-name sanitization, malformed configuration, platform fallback, and QA routing.
- Registry tests prove tenant drafts carry sender identity while pre-workspace email does not.

## Related Decision

- `.brain/decisions/ADR-014-use-cooperative-subdomains-for-email-sender-identity.md`
