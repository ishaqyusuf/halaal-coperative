# ADR-010: Adopt Explicit QA Email Domain Routing

## Status

Accepted

## Context

- Internal testers need to exercise signup, authentication, member, finance, and operational notification flows with many distinct synthetic identities while receiving messages in their own inboxes.
- A single global test recipient prevents parallel tester ownership, while BCC-based test mode still sends to the original recipient and is not a safe staging boundary.
- Rewriting stored user or member emails would change application identity and could invalidate signed onboarding or password-reset flows.
- Internal QA may need to exercise real production configuration and host behavior, so runtime-based restrictions can prevent intended controlled testing.

## Decision

- Use only `console` and `live` as canonical base delivery modes.
- Treat `EMAIL_QA_DOMAIN_ROUTES` as an orthogonal per-recipient routing layer that is active in either base mode and in every environment.
- Temporarily normalize `qa_routed` to the environment-appropriate base mode as a deprecated Halaalvest-only deployment compatibility alias.
- Configure exact reserved `.test` domain-to-inbox routes through a validated JSON environment value.
- Change only the provider delivery envelope. Keep notification drafts, persisted identities, signed-token inputs, and tenant/member records unchanged.
- Always provider-deliver mapped `.test` recipients to their configured tester inbox, including when ordinary mail is in `console` mode.
- Fail closed for unmapped `.test` recipients. Route ordinary recipients to console outside production and to the provider in production. Split mixed recipient lists per recipient.
- Preserve original and delivered recipient evidence in delivery and audit metadata without logging rendered email content.
- Classify QA tenants explicitly at creation or candidate adoption. Purge eligibility is based only on this stored marker, never inferred during deletion.
- Use a platform-owner-only, preview-token-protected background purge. Block live subscriptions/domains, delete tracked files first, revoke sessions, delete tenant aggregates transactionally, and retain only counts-only global purge receipts.

## Consequences

- Multiple testers can use arbitrary synthetic identities without risking delivery to real members or unrelated domains.
- QA routing configuration errors fail visibly instead of silently leaking email.
- QA messages remain easy to identify through their subject prefix, message banner, provider headers, and audit metadata.
- QA and ordinary identities cannot cross tenant lanes.
- The route map no longer changes ordinary delivery behavior. Production can simultaneously deliver ordinary mail normally and QA mail to designated tester inboxes.

## Alternatives Considered

- Use `QA_EMAILS` as a comma-separated allowlist.
  - Rejected because it does not express domain ownership or preserve parallel synthetic identities.
- Use `test1.com`, `test2.com`, or other real-looking domains.
  - Rejected because ownership can change and a routing failure could deliver outside the test environment.
- Rewrite application email addresses before notification creation.
  - Rejected because it would corrupt identity and token semantics.
- Use Resend simulation recipients for all QA.
  - Rejected for human inbox testing; provider simulation addresses remain useful for automated delivery, bounce, complaint, and suppression tests.
