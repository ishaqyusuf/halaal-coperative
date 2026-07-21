# Internal QA Email Routing

## Summary

- Any environment, including production, can explicitly route synthetic `.test` recipient domains to designated internal tester inboxes without changing the email identity stored by auth, onboarding, member, or tenant workflows.

## Configuration

```dotenv
EMAIL_DELIVERY_MODE=qa_routed
EMAIL_QA_DOMAIN_ROUTES='{"tester-one.qa.test":"tester-one@example.com","tester-two.qa.test":"tester-two@example.com"}'
```

- `console` is the default delivery mode outside production and does not call the external provider.
- `qa_routed` is explicitly opt-in and supported in local, development, preview, staging, remote-development, and production runtimes.
- `live` remains the default mode in production when `EMAIL_DELIVERY_MODE` is not set.
- QA route keys must be exact reserved `.test` domains. Route values must be valid deliverable email addresses.
- QA routing cannot be combined with `EMAIL_TEST_MODE`, `EMAIL_TEST_RECIPIENT`, or `TEST_EMAIL`.

## Behavior

- The shared notification transport resolves the original recipient domain immediately before provider delivery.
- Any local part at a configured domain routes to the same tester inbox.
- Only the provider envelope changes; persisted users, member profiles, notification drafts, verification tokens, and tenant data keep the synthetic recipient.
- QA-routed messages include a subject prefix, an HTML/text banner, and provider headers identifying the original recipient.
- Unmatched synthetic or real recipient domains fail closed in `qa_routed` mode and are never passed to Resend.
- Delivery results and tenant audit metadata record the routing mode, original recipient, delivered recipients, attempts, status, and provider message ID without logging rendered email bodies.
- Existing global test-recipient and BCC test behavior remains available outside `qa_routed` for compatibility, but should not be used as the QA isolation boundary.

## Verification

- Parser coverage rejects malformed JSON, duplicate normalized domains, non-`.test` route keys, reserved destinations, empty route maps, and mixed legacy configuration, while proving explicit QA routing works in every runtime including production.
- Routing coverage proves exact case-insensitive domain matching, arbitrary local parts, real-recipient blocking, live delivery, and the legacy global override.
- Transport coverage proves Resend receives only the routed tester inbox while the original draft remains unchanged.

## Related Decision

- `.brain/decisions/ADR-010-adopt-explicit-qa-email-domain-routing.md`
