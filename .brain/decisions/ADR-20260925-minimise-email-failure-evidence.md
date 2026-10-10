# ADR: Minimise email failure evidence

Status: Accepted, 25 September 2026.

## Context

The shared Resend transport included the provider's raw non-2xx response body in its thrown error. Retry logging included that error text and the recipient address, while `NotificationService.tryEmail` copied the error message into delivery evidence consumed by tenant notification audits. Provider messages can contain addresses, tokens or request details, including for account-deletion verification email.

## Decision

On a non-2xx response, retain only the HTTP status in a bounded transport error and discard the provider response body. Other transport failures receive a generic message; known local sender-validation errors still fail before provider delivery. Retry logs retain only channel and attempt/max-attempt count, omitting recipient, notification type and raw cause. Failed `NotificationEmailDelivery.errorMessage`, including the value written to notification-delivery audits, is the generic `Email delivery failed.` The in-memory failure cause remains available to the existing classified diagnostics boundary, whose outbound sanitizer must still exclude original recipient/routing identity.

This applies across notification emails, not only deletion links. It does not change recipient routing, retry count, send outcomes or the explicitly local console-delivery mode.

## Verification

A mocked provider response containing an email address and token yields a generic delivery-audit message and a safe HTTP-status cause. A server retry test confirms logs contain neither the recipient nor provider body. Notification transport/server and API observability tests pass (19 tests, 50 assertions); package TypeScript and scoped formatting pass. No email was sent during this verification.

The notification test file had switched `NODE_ENV` after loading React, causing caught `dispatcher.getOwner` stacks from mixed development JSX and production server rendering. Routing tests now keep the test process in development React mode while selecting policy through `APP_ENV`; the stacks disappear. A fresh production Bun process separately rendered the real deletion template and completed one mocked provider send with HTML present. The release preflight repeats a synthetic render with target configuration; none of these checks proves a live provider delivery.
