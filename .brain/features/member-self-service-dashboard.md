# Member Self-Service Dashboard

## Purpose

- Give linked members a first-screen account view after login.
- Surface the member's profile status, savings, special savings, obligations, receipts, shares, support cases, and recent statement activity without exposing tenant-wide staff data.

## Implemented Behavior

- Member-role users now see a member portal dashboard at the dashboard root instead of the staff operations overview.
- The route derives the member record from the authenticated user and tenant.
- The dashboard shows member number, type, status, KYC state, contact profile, deduction source, monthly commitment, savings snapshot, special savings, outstanding financing, active obligations, and recent ledger activity.
- It includes recent member-scoped payment receipts, support cases, share applications/position, procurement requests, project financing requests, and food purchase applications.
- Quick links route members to existing self-service receipt, procurement, project financing, food purchase, guarantor approval, support, and share workflows.
- Below `md`, the quick-link cluster collapses to 44px Statement and More controls; More opens the shared bottom action drawer so the full action set remains reachable without wrapping across the phone header.
- Member summary metrics use a compact two-column phone grid, status rows stack on constrained widths, and member links preserve 44px touch targets until the desktop shell begins at `md`.
- Members can download their own tenant-scoped text statement from the dashboard without staff access to another member's statement route.
- Member statement downloads and dashboard cards show published dividend allocation totals and recent published dividend periods with allocation amount and share/savings basis.
- Members can request cooperative-purchased procurement items from `/procurement` and see only their own request history.
- Members can request cooperative loan financing from `/loans`; the member view is scoped to their linked profile, their own submitted requests, and their own approved loans.
- Members can request project financing for their own business from `/project-financing` and see only their own request history.
- Members can apply for food purchase from `/food-purchase` and see only their own application history.
- The profile status card includes a prefilled `account_update` support request path for profile or document correction requests.
- If the account is not linked to a member profile, the member sees a scoped empty state instead of tenant-wide data.
- Linked members may still sign in when readiness is incomplete, but the dashboard clearly marks the account `Action required` and shows a verification alert. Existing records, statements, document remediation, and support remain available.
- Financial and operational submissions require operational readiness: the member must be active, KYC verified, and complete for any tenant-required historical backfill or brought-forward opening position. Web server actions and mobile mutation procedures enforce the same rule.
- Request-item, request-business, and Foodstuff Purchase entry actions are suppressed on the member dashboard while readiness is incomplete; support and document update paths remain available so the member can resolve the blocker.

## QA Verification — 2026-08-01

- Safa portal access was issued to Hauwa Ilyas through the `ishaq.qa.test` QA artifact, and the password-setup/member-login flow completed successfully.
- The signed-in member received member-only navigation and saw the unit-based share model, NGN 10,000 unit value, and 1 approved compulsory unit.
- Because Safa uses brought-forward migration, submission actions remain locked until Hauwa's opening position is applied. This is the intended readiness boundary: login, member-scoped reads, support, and remediation remain available.
- The verified member dashboard and admin re-login produced no browser console errors.

## Boundaries

- Profile and document update requests are support-backed review requests; they do not directly mutate member profile, KYC, or document records.
- Operational-readiness blocking is intentionally read-preserving and remediation-preserving. It does not block login, tenant/member-scoped reads, support cases or replies, or document submission.
- This slice does not add managed document upload/storage.
- Staff continue to see the existing operations overview at the dashboard root.
- Shared route metadata, Suspense/loading states, and retryable error isolation are documented in `.brain/features/dashboard-overview.md`.
- Staff keep the tenant-wide loan operations workspace on `/loans`; member-role users see the self-service version and cannot load tenant-wide loan queues from that route.
- Staff continue to use the member-detail statement export route for staff-selected members; those exports now include published dividend allocation evidence.
