# Public Signup And Onboarding

## Summary

- Public web flow that captures a cooperative early access request, lets a platform admin approve by signed API link, sends the cooperative an approved setup link, prepares an email verification link, and finishes tenant bootstrap from a signed onboarding token using a short cooperative profile instead of policy-heavy setup.

## Problem

- The platform had tenant bootstrap logic in the backend, but no public route to collect signup details, verify the primary contact email, or continue into onboarding from the marketing app.

## Users

- Prospective tenant admin.
- Platform operators validating signup handoff behavior in local development.

## Business Rules

- Primary contact email must be captured before onboarding continues.
- When `MARKETING_EARLY_ACCESS_ENABLED=true`, cooperative setup requires a signed early access approval token before `/api/signup` will create the email-verification link. The flag defaults on in production and can be enabled locally for QA.
- Marketing early access requests email configured platform admins with a signed approval link; opening that link sends the cooperative primary contact a private setup link.
- Verification links are signed and expire after 24 hours.
- Verification links are single-use at workspace level: once the verified cooperative name or reserved workspace slug has been used to create a tenant, revisiting or resubmitting that link returns the expired-link state.
- Early access admin approval links are signed and expire after 30 days; approved setup links are signed and expire after 7 days.
- In development mode, the UI may expose a bypass link to continue without waiting for email delivery.
- The verified email is treated as the authoritative primary contact email when the tenant workspace is created.
- Public onboarding only collects cooperative profile details; policy defaults are created server-side during workspace bootstrap.
- Tenant-admin onboarding collects and hashes the first workspace password before tenant bootstrap creates the owner user.

## UI Flow

- Marketing homepage: launch and prelaunch modes share one responsive public experience. The hero leads with trustworthy cooperative records, the sample workspace demonstrates collections, financing safeguards, approvals, and member-visible statements, and the remaining sections explain operating areas, setup, migration, trust, and pricing without invented customer or traction claims.
- Production CTAs point to the early access request section instead of direct signup. Launch-ready environments may use the same page structure while sending the primary action to cooperative setup.
- Public marketing presentation uses the Organic Trust direction: warm off-white surfaces, deep navy editorial typography, restrained cooperative green, subtle ledger grids, and domain-shaped product previews. It must remain inclusive and operator-focused and must not imply that Halaalvest is a lender, bank, or custodian of member funds.
- Public marketing links expose an absolute 1200×630 Open Graph image plus matching Open Graph and Twitter title/description metadata, so supported messaging and social clients render a branded Halaalvest preview instead of a text-only link.
- The homepage keeps pricing concise, while `/pricing` preserves the five-plan capacity bands, feature availability matrix, and fee-separation principles for detailed comparison.
- Early access form: collect cooperative name, cooperative admin name/email, phone, current member-size range, current record system, target setup timeline, one or more setup areas, and an optional additional note with `useZodForm`; the form explains that this admin receives the setup link and becomes the first workspace owner, and submitting sends platform admins the approval email.
- Early access, approved signup, verification, profile, and ready states are presented as one five-stage setup journey. Stateful forms advance the shared shell to verification and ready after successful requests; signed-token gates and existing API contracts remain authoritative.
- `/api/early-access/approve?token=...`: platform admin approval link sends the cooperative primary contact an approved setup link.
- `/signup?approvalToken=...`: the private setup form opens only from an approved setup link when early access mode is enabled and locks the approved cooperative/contact fields.
- The workspace address suggestion is derived from the first two normalized words of the cooperative name (or the available single word), including for approved setup links. It never derives from the admin email, and the customer may edit the suggestion before continuing.
- `/signup`: when early access mode is enabled and no token is present, redirects to `/#early-access` instead of exposing the setup form. When early access mode is disabled, the same route can be used for direct development setup.
- Success state: show the verification email draft and, in dev mode, a direct continue link.
- `/onboarding?token=...`: validate the token and its still-available cooperative/workspace identity server-side, prefill verified contact details, and submit the simplified cooperative profile with `useZodForm`.
- Onboarding fields now focus on cooperative name, current size range, office address, city, state, country, cooperative start date, and admin password setup.
- `/settings/profile`: presents the persisted tenant profile as always-visible flat identity, office-location, and regional-setting sections. Summary cards are desktop-only, while authorized administrators edit the coupled profile fields from one URL-owned, full-width mobile sheet. The finance start date remains read-only in this workflow and points administrators to Finance Setup because it controls migration calculations.
- Completion state: show dashboard/site hostnames and a workspace-ready email draft; in development, the Get Started action offers the supported tenant URL variants for local routing checks.
- After successful workspace creation, the completion state removes the bearer token from browser history. If the completed page is restored through the browser back-forward cache, it reloads the token-free URL into the expired-link state.

## API/Data Impact

- The 2026-08-01 public-experience redesign changed presentation and content only. It did not alter early-access, approval, signup, verification, onboarding, tenancy, or notification contracts.
- `apps/marketing/app/api/early-access/route.ts` creates a signed early access request token and emails configured marketing admins from `MARKETING_ADMIN_EMAILS`; the signed request and admin email preserve the selected cooperative size, record system, setup timeline, and setup-area labels.
- `apps/marketing/app/api/early-access/approve/route.ts` verifies the admin approval token, mints a signed setup approval token, and emails the approved cooperative contact a private setup link.
- `apps/marketing/app/api/signup/route.ts` creates a signed onboarding token and verification email draft; while early access mode is enabled it first verifies that the request includes a valid setup approval token matching the cooperative name and primary contact email.
- Early access, approved setup, and onboarding verification URLs are built from the configured marketing public origin, so local QA links use `https://halaalvest.localhost/...` instead of the direct `http://localhost:1440/...` fallback when the Portless host is configured. Primary local tenant workspace links use `https://<tenant>.halaalvest-dash.localhost` without exposing the dashboard app port.
- `apps/marketing/app/api/onboarding/route.ts` verifies the token, rejects links whose cooperative name or reserved workspace slug has already been used, treats the verified identity fields as authoritative, and calls `createTenantWorkspaceBootstrap`.
- `apps/marketing/src/lib/signup-verification.server.ts` owns the shared page/API verification check so direct revisits and repeated submissions return the same expired-link behavior.
- `packages/notifications/src/index.ts` now owns the email-delivery path through `NotificationService.email(...)`, plus shared email-draft builders for signup verification and workspace-ready follow-up.
- Provider tag values are normalized to the provider-safe alphanumeric, underscore, and hyphen character set at the shared notification boundary, so dotted application notification types remain valid metadata without causing delivery rejection.
- `apps/marketing/src/lib/server-notifications.ts` creates the server-side notification service used by the marketing signup and onboarding routes.
- When `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are configured, notification emails are delivered through Resend; otherwise the system falls back to console delivery for local development.
- Early-access request and approval email retain the configured platform sender because no workspace slug exists yet. After signup selects a workspace slug, verification and workspace-ready email use `"Cooperative Name" <workspace-slug@configured-domain>`.
- Email delivery mode is explicit: local development defaults to `console`, production defaults to `live`, and any environment may explicitly enable validated `.test` domain routing so verification and workspace-ready links reach designated testers without changing the synthetic contact identity stored in tokens or tenant data.
- Notification email delivery now retries provider-backed sends and returns structured failure metadata. Verification email failure blocks signup continuation, while workspace-ready email failure is surfaced as a non-blocking warning after tenant creation.
- Signup verification and onboarding workspace emails are now persisted in `notification_outbox`, which supports nullable `tenantId` so pre-tenant verification delivery can be tracked durably.
- Tenant-scoped workspace-ready email outcomes are still mirrored into `audit_logs` using `notification.email_sent|queued|failed` actions for operational history inside the tenant workspace.
- `apps/marketing/.env.example` documents `MARKETING_EARLY_ACCESS_ENABLED`, `SIGNUP_TOKEN_SECRET`, `EARLY_ACCESS_TOKEN_SECRET`, and `MARKETING_ADMIN_EMAILS` for production-safe signing and approval routing.
- Cooperative profile details beyond tenant name and primary contact are persisted on the tenant record as `currentSize`, `officeAddress`, `city`, `state`, `country`, and `startDate`; `currentSize` is selected from shared range options and stored as the existing representative integer, while `region` is mirrored from `state` for older readers.
- Dashboard profile edits reuse the existing role-gated, tenant-scoped `updateCooperativeProfileAction` and audited `updateTenantProfile` query. Successful sheet saves close the URL workflow and refresh the server-owned profile snapshot; no profile API or database contract changed in the 2026-08-03 settings-page completion pass.
- The onboarding API hashes the submitted admin password and stores it on the owner user created during `createTenantWorkspaceBootstrap`.

## Permissions

- Public route access for early access request submission and verification handoff.
- Early-access-gated setup requires possession of a valid signed setup approval token.
- The admin approval API link is bearer-style; whoever possesses the signed link can trigger the approval email until the link expires.
- Final tenant creation remains constrained by possession of a valid signed verification token.

## Edge Cases

- Expired or malformed tokens should block onboarding and send the user back to signup.
- A token whose cooperative workspace has already been created should show the expired-link state on refresh, direct revisit, repeated submission, or browser Back restoration.
- Expired or malformed early access approval tokens should block approval and show a clear browser response.
- Early-access-gated `/signup` without a valid approval token should redirect to the early access request form, not expose the direct setup form.
- Duplicate cooperative name-derived slug or primary contact email should return a user-readable onboarding error.
- Production must set an explicit token secret instead of using the development fallback.

## Open Questions

- Whether outbox delivery should later move to an async background worker instead of synchronous route-time sending.
- Whether the onboarding completion flow should also mint a real authenticated session into the dashboard.
