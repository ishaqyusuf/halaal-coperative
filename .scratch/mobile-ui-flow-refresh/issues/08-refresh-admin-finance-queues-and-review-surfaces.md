# 08 - Refresh Admin Finance Queues And Review Surfaces

**What to build:** Admin finance review surfaces become compact, queue-driven, and safe for mobile decisions across receipts, financing, procurement, Foodstuff Purchase, project financing, collections, support-linked finance work, and optional shares.

**Blocked by:** 01 - Shared Mobile UI Rhythm And Primitive Audit; 06 - Refresh Admin Overview And Priority Queue Flow.

**Status:** done

- [x] Finance queue cards or rows expose record type, member context, status, age/period, safe amount metadata, and next review action.
- [x] Receipt review surfaces show allocation and evidence state before approval, rejection, correction request, or support escalation actions.
- [x] Financing review surfaces show server-provided policy guardrails, guarantor state, capacity/deployable-fund context, and risk state before any approval or disbursement action.
- [x] Procurement, Foodstuff Purchase, and project financing review surfaces remain separate and use product-specific labels, statuses, and accounting boundaries.
- [x] Collection follow-up and support-linked finance actions are compact enough for field use while preserving stale-data guards and audit-note expectations.

## Implementation Notes

- Refreshed admin finance request and collection rows with shared `StatusBadge` chips for review state, priority, and age context.
- Added shared `FormStateBanner` for finance review drafts and stale-data submit blocks.
- Replaced finance queue, recent request, and collection follow-up empty copy with shared `EmptyState` messaging that preserves product/accounting boundaries.

## Validation

- `bun --cwd apps/mobile typecheck`
- `bun test apps/api/src/routers/mobile.route.test.ts`
- `bun --cwd apps/mobile check:smoke`
- `bun --cwd apps/mobile check:native-imports`
- `bunx prettier --check apps/mobile/src/screens/admin-finance-screen.tsx`
- `rg -n "className=.*style=|style=.*className=" apps/mobile/src/screens/admin-finance-screen.tsx`
