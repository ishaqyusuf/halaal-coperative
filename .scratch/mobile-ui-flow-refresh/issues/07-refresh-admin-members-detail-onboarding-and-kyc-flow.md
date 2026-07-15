# 07 - Refresh Admin Members, Detail, Onboarding, And KYC Flow

**What to build:** Admin member workflows become search-first and review-friendly for field work, while member creation, invitations, onboarding, and KYC states stay visually consistent and role-safe.

**Blocked by:** 01 - Shared Mobile UI Rhythm And Primitive Audit; 06 - Refresh Admin Overview And Priority Queue Flow.

**Status:** done

- [x] Admin members opens around search/filter and compact member rows that show name, member number, status, KYC, and high-level risk or readiness indicators.
- [x] Member detail shows a compact profile summary followed by grouped sections for commitments, savings, financing, receipts, shares, support, documents, and account status.
- [x] Create, invite, onboarding, and KYC review states use the same mobile form/list rhythm as member-facing flows.
- [x] Role-gated actions remain visibly unavailable or blocked when the current workspace role cannot perform them.
- [x] Long member names, cooperative names, status chips, and KYC labels fit compact phone layouts without clipping or overlap.

## Implementation Notes

- Moved member search/filter controls ahead of summary/review content so the admin members screen opens around lookup.
- Replaced inline member/onboarding status pills and empty copy with shared `StatusBadge`, `EmptyState`, and `FormStateBanner` primitives.
- Refreshed admin member detail with compact member/KYC/login chips and grouped section row status badges.

## Validation

- `bun --cwd apps/mobile typecheck`
- `bun test apps/api/src/routers/mobile.route.test.ts`
- `bun --cwd apps/mobile check:smoke`
- `bun --cwd apps/mobile check:native-imports`
- `bunx prettier --check apps/mobile/src/screens/admin-members-screen.tsx apps/mobile/src/screens/admin-member-detail-screen.tsx`
- `rg -n "className=.*style=|style=.*className=" apps/mobile/src/screens/admin-members-screen.tsx apps/mobile/src/screens/admin-member-detail-screen.tsx`
