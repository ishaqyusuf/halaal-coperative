# Internal QA Email Routing

## Summary

- Any environment, including production, can explicitly route synthetic `.test` recipient domains to designated internal tester inboxes without changing the email identity stored by auth, onboarding, member, or tenant workflows.

## Configuration

```dotenv
EMAIL_DELIVERY_MODE=console # use live in production
EMAIL_QA_DOMAIN_ROUTES='{"tester-one.qa.test":"tester-one@example.com","tester-two.qa.test":"tester-two@example.com"}'
```

- `console` is the default delivery mode outside production and does not call the external provider.
- QA routes are independent of the base mode and remain active in local, preview, staging, remote-development, and production.
- Halaalvest accepts `qa_routed` temporarily as a deprecated compatibility alias while deployment settings move to `console` or `live`.
- `live` remains the default mode in production when `EMAIL_DELIVERY_MODE` is not set.
- QA route keys must be exact reserved `.test` domains. Route values must be valid deliverable email addresses.
- Legacy global recipient overrides are not part of the QA isolation boundary.

## Behavior

- The shared notification transport resolves the original recipient domain immediately before provider delivery.
- Any local part at a configured domain routes to the same tester inbox.
- Only the provider envelope changes; persisted users, member profiles, notification drafts, verification tokens, and tenant data keep the synthetic recipient.
- QA-routed messages include a subject prefix, an HTML/text banner, and provider headers identifying the original recipient.
- Unmapped `.test` domains fail closed. Ordinary recipients use console delivery outside production and live provider delivery in production.
- Mixed recipient lists are split and routed independently.
- Delivery results and tenant audit metadata record the routing mode, original recipient, delivered recipients, attempts, status, and provider message ID without logging rendered email bodies.
- New tenants created by a configured QA-domain owner are explicitly marked QA. Existing candidates require platform-owner adoption.
- `/platform/qa-maintenance` discovers candidates, previews counts/files/provider blockers, requires the exact `PURGE ALL QA DATA` confirmation, starts the Trigger job, and exposes counts-only run status.
- Purge revokes sessions, blocks writes, removes tracked files before database records, cleans non-live hosting attachments, blocks live commercial resources, and supports partial retries.

## Verification

- Parser coverage rejects malformed JSON, duplicate normalized domains, non-`.test` route keys, reserved destinations, empty route maps, and mixed legacy configuration, while proving explicit QA routing works in every runtime including production.
- Routing coverage proves exact case-insensitive domain matching, arbitrary local parts, unmapped `.test` blocking, mixed routing, console ordinary delivery, live ordinary delivery, and the deprecated alias.
- Transport coverage proves Resend receives only the routed tester inbox while the original draft remains unchanged.

## Related Decision

- `.brain/decisions/ADR-010-adopt-explicit-qa-email-domain-routing.md`
