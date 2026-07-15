# 06 - Refresh Admin Overview And Priority Queue Flow

**What to build:** The admin home screen becomes an exception-led field-operations companion that highlights what needs review today before secondary metrics or navigation.

**Blocked by:** 01 - Shared Mobile UI Rhythm And Primitive Audit; 02 - Refresh Auth, Bootstrap, Role Switcher, And Bottom Tabs.

**Status:** done

- [x] Admin overview leads with workspace context, role context, stale/offline state, and a priority queue for pending approvals, KYC, receipts, financing, procurement, Foodstuff Purchase, project financing, support, and setup warnings.
- [x] Deployable funds, collection coverage, overdue/risk indicators, and pending review counts are compact, legible, and clearly server-provided.
- [x] Queue rows show member or actor context, status, age/period where useful, safe amount/count metadata where appropriate, and a clear next action.
- [x] Offline or stale admin states block privileged review actions with clear refresh guidance.
- [x] The screen avoids decorative dashboard filler and does not hide role boundaries or finance guardrails behind generic cards.

## Implementation Notes

- Reordered admin home so workspace/role context and the priority queue appear before secondary stat cards.
- Added queue severity badges, queue-specific icons, next-action language, and stale refresh guidance before privileged support actions.
- Expanded the admin overview query to expose up to eight non-empty queue categories so mobile can surface KYC/member, receipt, financing, procurement, Foodstuff Purchase, Project Financing, support, and related exceptions more reliably.

## Validation

- `bun --cwd apps/mobile typecheck`
- `bun test apps/api/src/routers/mobile.route.test.ts`
- `bun --cwd apps/mobile check:smoke`
- `bun --cwd apps/mobile check:native-imports`
- `bunx prettier --check apps/mobile/src/screens/admin-home-screen.tsx packages/db/src/queries/mobile.ts`
