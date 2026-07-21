# ADR-010: Adopt Explicit QA Email Domain Routing

## Status

Accepted

## Context

- Internal testers need to exercise signup, authentication, member, finance, and operational notification flows with many distinct synthetic identities while receiving messages in their own inboxes.
- A single global test recipient prevents parallel tester ownership, while BCC-based test mode still sends to the original recipient and is not a safe staging boundary.
- Rewriting stored user or member emails would change application identity and could invalidate signed onboarding or password-reset flows.
- Internal QA may need to exercise real production configuration and host behavior, so runtime-based restrictions can prevent intended controlled testing.

## Decision

- Add explicit `console`, `qa_routed`, and `live` email delivery modes in the shared notification package.
- Allow `qa_routed` in every runtime, including production, only when `EMAIL_DELIVERY_MODE=qa_routed` and a valid route map are explicitly configured.
- Configure exact reserved `.test` domain-to-inbox routes through a validated JSON environment value.
- Change only the provider delivery envelope. Keep notification drafts, persisted identities, signed-token inputs, and tenant/member records unchanged.
- Fail closed for every unmatched recipient while QA routing is active.
- Preserve original and delivered recipient evidence in delivery and audit metadata without logging rendered email content.
- Keep legacy global override and BCC behavior temporarily, but reject mixed QA and legacy routing configuration.

## Consequences

- Multiple testers can use arbitrary synthetic identities without risking delivery to real members or unrelated domains.
- QA routing configuration errors fail visibly instead of silently leaking email.
- QA messages remain easy to identify through their subject prefix, message banner, provider headers, and audit metadata.
- While QA routing is active, data in that environment must use configured `.test` domains for every workflow expected to send email; real and unmapped recipients are blocked.

## Alternatives Considered

- Use `QA_EMAILS` as a comma-separated allowlist.
  - Rejected because it does not express domain ownership or preserve parallel synthetic identities.
- Use `test1.com`, `test2.com`, or other real-looking domains.
  - Rejected because ownership can change and a routing failure could deliver outside the test environment.
- Rewrite application email addresses before notification creation.
  - Rejected because it would corrupt identity and token semantics.
- Use Resend simulation recipients for all QA.
  - Rejected for human inbox testing; provider simulation addresses remain useful for automated delivery, bounce, complaint, and suppression tests.
