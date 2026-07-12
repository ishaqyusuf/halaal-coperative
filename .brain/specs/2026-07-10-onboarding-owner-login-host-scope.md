# Spec: Onboarding Owner Login Host Scope

## Problem Statement

After creating a new test cooperative workspace, the newly created account cannot sign in on the cooperative host. The login screen shows:

`The account could not be used for this cooperative host, or the credentials were invalid.`

From the tenant admin's perspective, onboarding appears to complete successfully, but the first account cannot be used to enter the workspace. This breaks the most important handoff in the product: a verified cooperative admin creates a workspace, sets the first password, clicks through to the dashboard, and should immediately be able to continue into first-run setup.

The account creation path already collects an admin password, stores an owner user, attaches a tenant-admin membership, and returns dashboard/site URLs. The failure indicates the login path is not resolving the newly created account, tenant host, tenant membership, password, or session scope consistently with the onboarding bootstrap path.

## Solution

Make the public onboarding-to-dashboard handoff verifiably sign-in ready.

When a new cooperative workspace is created, the owner email and password collected during onboarding must authenticate on the generated cooperative host. The login flow should resolve the same tenant that onboarding created, find the owner account within that tenant, verify the stored password hash, confirm the tenant-admin membership, create the correct host-scoped session, and redirect the admin into the first-run setup flow.

The generic invalid-account message should remain for genuinely wrong credentials, cross-tenant accounts, missing memberships, pending member-only onboarding without a role, or invalid session scope. It should not appear for the freshly created tenant owner using the password they just set.

## User Stories

1. As a prospective tenant admin, I want to sign in with the email and password I used during onboarding, so that I can enter the workspace I just created.
2. As a prospective tenant admin, I want the first Get Started login attempt to work, so that workspace creation feels complete.
3. As a prospective tenant admin, I want the cooperative host to recognize my new account, so that I am not told my account belongs to a different cooperative.
4. As a prospective tenant admin, I want the password I set during onboarding to be accepted on the dashboard login screen, so that I do not need a password reset immediately after signup.
5. As a prospective tenant admin, I want the login redirect after workspace creation to land on the correct tenant host, so that I authenticate in the right cooperative context.
6. As a tenant admin, I want a successful first login to send me to the first-run setup flow when the workspace is empty, so that I can continue setup without hunting for the next step.
7. As a tenant admin, I want the login flow to create a session scoped to my cooperative host, so that my session stays isolated from other cooperatives.
8. As a tenant admin, I want the login flow to work whether I arrive from the on-screen completion CTA or the workspace-ready email, so that both handoff paths are reliable.
9. As a platform operator, I want onboarding and login to resolve the same tenant for the generated host, so that tenant domains, slugs, and session scopes do not drift.
10. As a platform operator, I want the owner user created during onboarding to have a tenant-admin membership that login can find, so that the first admin is never stranded.
11. As a platform operator, I want the login route to look up credentials inside the resolved tenant, so that duplicate emails in different cooperatives remain isolated.
12. As a platform operator, I want cross-tenant login attempts to stay blocked, so that fixing the onboarding owner does not weaken tenant isolation.
13. As a platform operator, I want platform-owner behavior to remain separate from tenant-owner behavior, so that super-admin access rules are not accidentally changed.
14. As a platform operator, I want local test cooperative hosts to work the same way as production-style cooperative hosts, so that the bug can be reproduced and verified in development.
15. As a platform operator, I want path-style local routing, local subdomain routing, and configured tenant-root routing to resolve tenant context consistently, so that all supported dev URL variants stay usable.
16. As a platform operator, I want the session cookie name and signed session scope to match the cooperative host, so that the protected dashboard shell recognizes the user after login.
17. As a platform operator, I want failed login errors to remain intentionally generic, so that the UI does not leak whether an email, tenant, membership, or password was wrong.
18. As a tester, I want an automated regression that creates a workspace and then logs in as the new owner, so that this handoff cannot break silently again.
19. As a tester, I want the regression to assert the final redirect target, so that login success is not confused with simply avoiding the error banner.
20. As a tester, I want wrong-password and wrong-host checks alongside the success case, so that the security guardrails remain intact.
21. As a product owner, I want first-run tenant setup to be reachable immediately after signup, so that demos and pilot onboarding do not require manual database fixes.
22. As a product owner, I want this handled as a blocking onboarding bug, so that new cooperative acquisition is not undermined at the first login.

## Implementation Decisions

- Treat this as a focused onboarding/auth handoff bug, not a redesign of authentication, roles, or tenant domains.
- Preserve the current model where public onboarding creates the tenant, owner user, owner member record when supplied, tenant-admin membership, tenant policy defaults, tenant domain, and hashed password.
- The owner password hashing used during public onboarding must stay compatible with the password verification used by dashboard login.
- The dashboard login flow must resolve tenant context from the same generated cooperative host or tenant slug that the onboarding completion link uses.
- The credential lookup should remain tenant-scoped for tenant users. A newly created owner should be found by email only when the resolved tenant matches the tenant created during onboarding.
- The login flow should continue to reject users whose tenant does not match the resolved cooperative host, unless the user is a platform owner and the platform-owner path explicitly allows that behavior.
- The membership lookup must use the resolved tenant id and the created owner user id. A tenant-admin membership created during onboarding should satisfy login authorization.
- Session token creation should use the host/session scope expected by the protected dashboard context for the same cooperative host.
- The login success redirect for an empty admin workspace should continue to honor the first-run setup gate.
- The onboarding dashboard URL correction from the companion onboarding URL spec should be considered part of the same handoff surface: the owner should be sent to the canonical tenant dashboard root, not a stale `/app` path.
- Keep the invalid-account UI copy generic for failed attempts. Improve internal diagnostics or test assertions if needed, but do not expose whether the email, password, tenant, or membership check failed to public users.
- No database schema change is expected unless investigation proves onboarding-created users or memberships lack durable data required by login.

## Testing Decisions

- Tests should prove observable auth behavior: a newly created owner can authenticate on the generated cooperative host and enter the protected workspace or first-run setup. Avoid tests that only assert private helper calls.
- The highest-value seam is an onboarding-to-login integration test: create a new cooperative through the same bootstrap path used by public onboarding, then submit the owner credentials to dashboard login with the generated tenant host headers/context.
- The integration should assert that login does not redirect back to the invalid-account error and does set the expected scoped session cookies.
- The integration should assert the final redirect target is the first-run setup flow for an empty tenant-admin workspace.
- Add a wrong-password case for the same new owner and host to confirm the generic invalid-account error still appears.
- Add a wrong-host or different-tenant case to confirm the newly created owner cannot authenticate into another cooperative host.
- Add or update tenant URL/session-scope tests if investigation shows the bug is caused by generated host, local path-style host, local subdomain host, or configured root-domain mismatch.
- Add or update login route tests if the bug is caused by credential lookup, membership lookup, password verification, or session-cookie scope.
- Add or update onboarding route tests if the bug is caused by missing owner password hash, incorrect owner email source, missing tenant-admin membership, or inconsistent tenant domain creation.
- Existing prior art includes public signup/onboarding validation tests, tenant workspace URL tests, password hashing/verification helpers, tenant resolution helpers, and dashboard server-context/session guard behavior.
- Manual QA should cover the full path in development: create a test cooperative, use the returned dashboard link, enter the exact onboarding email/password, sign in, and confirm the admin reaches first-run setup.

## Out of Scope

- Changing the role model or adding a role switcher.
- Implementing passwordless signup or automatically minting a dashboard session at onboarding completion.
- Changing member signup approval behavior.
- Allowing cross-tenant login with the same email address.
- Revealing detailed login failure reasons to public users.
- Replacing host-scoped session cookies with a new auth architecture.
- Adding mobile authentication behavior.
- Changing tenant finance setup, member backfill, or money workflows after login.

## Further Notes

- The reported failure happened after creating a new test cooperative account.
- The exact user-facing error was: `The account could not be used for this cooperative host, or the credentials were invalid.`
- This issue is closely related to the onboarding completion URL polish already specified separately: the admin should be sent to the canonical tenant dashboard URL without `/app`, and that destination must be login-ready for the new owner.
- The public onboarding documentation already states that tenant-admin onboarding collects and hashes the first workspace password before tenant bootstrap creates the owner user. This spec makes the missing end-to-end guarantee explicit: that owner must be able to use the account immediately.
