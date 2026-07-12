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
- Members can download their own tenant-scoped text statement from the dashboard without staff access to another member's statement route.
- Member statement downloads and dashboard cards show published dividend allocation totals and recent published dividend periods with allocation amount and share/savings basis.
- Members can request cooperative-purchased procurement items from `/procurement` and see only their own request history.
- Members can request project financing for their own business from `/project-financing` and see only their own request history.
- Members can apply for food purchase from `/food-purchase` and see only their own application history.
- The profile status card includes a prefilled `account_update` support request path for profile or document correction requests.
- If the account is not linked to a member profile, the member sees a scoped empty state instead of tenant-wide data.

## Boundaries
- Profile and document update requests are support-backed review requests; they do not directly mutate member profile, KYC, or document records.
- This slice does not add managed document upload/storage.
- Staff continue to see the existing operations overview at the dashboard root.
- Staff continue to use the member-detail statement export route for staff-selected members; those exports now include published dividend allocation evidence.
