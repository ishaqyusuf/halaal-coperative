# 04 - Refresh Member Detail And Read-Only Service Flows

**What to build:** Member service screens share a coherent list/detail rhythm so commitments, financing, shares, receipts, guarantor approvals, procurement, Foodstuff Purchase, project financing, statements, support, and notifications feel like one app.

**Blocked by:** 01 - Shared Mobile UI Rhythm And Primitive Audit; 03 - Refresh Member Home And More Service Discovery.

**Status:** done

- [x] Member read-only service screens use consistent status rows, summary cards, compact list rows, empty states, and stale/offline banners.
- [x] Receipt, financing, procurement, Foodstuff Purchase, project financing, share, support, guarantor, statement, and notification statuses are visible in list/detail contexts where relevant.
- [x] Procurement, Foodstuff Purchase, and project financing remain visually and verbally distinct from ordinary cooperative financing.
- [x] Support case screens show linked receipts or requests and finance-adjustment boundaries without implying support can silently mutate money.
- [x] Screens render server-provided values and policy notes only; they do not calculate balances, eligibility, repayment state, share capital, receipt posting effects, or audit-sensitive decisions on device.

## Implementation Notes

- Added shared status tone mapping and reused `StatusBadge`/`EmptyState` across member detail, financing, shares, receipts, support, procurement, Foodstuff Purchase, project financing, guarantor approvals, notifications, and statement screens.
- Preserved Foodstuff Purchase and Project Financing as distinct product labels and kept server-provided figures/statuses as the only source for balances, eligibility, and workflow state.

## Validation

- `bun --cwd apps/mobile typecheck`
- `bun --cwd apps/mobile check:native-imports`
- `bun --cwd apps/mobile check:nativewind-theme-vars`
- `bun --cwd apps/mobile check:smoke`
- `bunx prettier --check apps/mobile/src/components/app/status-badge.tsx apps/mobile/src/screens/detail-list-screen.tsx apps/mobile/src/screens/financing-screen.tsx apps/mobile/src/screens/shares-screen.tsx apps/mobile/src/screens/receipts-screen.tsx apps/mobile/src/screens/support-screen.tsx apps/mobile/src/screens/procurement-screen.tsx apps/mobile/src/screens/project-financing-screen.tsx apps/mobile/src/screens/food-purchase-screen.tsx apps/mobile/src/screens/guarantor-approvals-screen.tsx apps/mobile/src/screens/notifications-screen.tsx apps/mobile/src/screens/statement-screen.tsx`
