# Public Signup And Onboarding

## Summary

- Public web flow that captures a cooperative primary contact, prepares an email verification link, and finishes tenant bootstrap from a signed onboarding token using a short cooperative profile instead of policy-heavy setup.

## Problem

- The platform had tenant bootstrap logic in the backend, but no public route to collect signup details, verify the primary contact email, or continue into onboarding from the marketing app.

## Users

- Prospective tenant admin.
- Platform operators validating signup handoff behavior in local development.

## Business Rules

- Primary contact email must be captured before onboarding continues.
- Verification links are signed and expire after 24 hours.
- In development mode, the UI may expose a bypass link to continue without waiting for email delivery.
- The verified email is treated as the authoritative primary contact email when the tenant workspace is created.
- Public onboarding only collects cooperative profile details; policy defaults are created server-side during workspace bootstrap.
- Tenant-admin onboarding collects and hashes the first workspace password before tenant bootstrap creates the owner user.

## UI Flow

- `/signup`: collect primary contact name, primary contact email, and cooperative name with `useZodForm`.
- Success state: show the verification email draft and, in dev mode, a direct continue link.
- `/onboarding?token=...`: validate the token server-side, prefill verified contact details, and submit the simplified cooperative profile with `useZodForm`.
- Onboarding fields now focus on cooperative name, current size range, office address, city, state, country, cooperative start date, and admin password setup.
- Completion state: show dashboard/site hostnames and a workspace-ready email draft; in development, the Get Started action offers the supported tenant URL variants for local routing checks.

## API/Data Impact

- `apps/marketing/app/api/signup/route.ts` creates a signed onboarding token and verification email draft.
- `apps/marketing/app/api/onboarding/route.ts` verifies the token, derives the workspace slug from the cooperative name, and calls `createTenantWorkspaceBootstrap`.
- `packages/notifications/src/index.ts` now owns the email-delivery path through `NotificationService.email(...)`, plus shared email-draft builders for signup verification and workspace-ready follow-up.
- `apps/marketing/src/lib/server-notifications.ts` creates the server-side notification service used by the marketing signup and onboarding routes.
- When `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are configured, notification emails are delivered through Resend; otherwise the system falls back to console delivery for local development.
- Notification email delivery now retries provider-backed sends and returns structured failure metadata. Verification email failure blocks signup continuation, while workspace-ready email failure is surfaced as a non-blocking warning after tenant creation.
- Signup verification and onboarding workspace emails are now persisted in `notification_outbox`, which supports nullable `tenantId` so pre-tenant verification delivery can be tracked durably.
- Tenant-scoped workspace-ready email outcomes are still mirrored into `audit_logs` using `notification.email_sent|queued|failed` actions for operational history inside the tenant workspace.
- `apps/marketing/.env.example` documents `SIGNUP_TOKEN_SECRET` for production-safe signing.
- Cooperative profile details beyond tenant name and primary contact are persisted on the tenant record as `currentSize`, `officeAddress`, `city`, `state`, `country`, and `startDate`; `currentSize` is selected from shared range options and stored as the existing representative integer, while `region` is mirrored from `state` for older readers.
- The onboarding API hashes the submitted admin password and stores it on the owner user created during `createTenantWorkspaceBootstrap`.

## Permissions

- Public route access for signup and verification handoff.
- Final tenant creation remains constrained by possession of a valid signed verification token.

## Edge Cases

- Expired or malformed tokens should block onboarding and send the user back to signup.
- Duplicate cooperative name-derived slug or primary contact email should return a user-readable onboarding error.
- Production must set an explicit token secret instead of using the development fallback.

## Open Questions

- Whether outbox delivery should later move to an async background worker instead of synchronous route-time sending.
- Whether the onboarding completion flow should also mint a real authenticated session into the dashboard.
