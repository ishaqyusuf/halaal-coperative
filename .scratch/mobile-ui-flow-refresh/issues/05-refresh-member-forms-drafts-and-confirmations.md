# 05 - Refresh Member Forms, Drafts, And Confirmations

**What to build:** Member submission flows become easier and safer on phones, with sectioned forms, reachable actions, visible draft/offline behavior, review confirmations, and server-confirmed outcomes.

**Blocked by:** 01 - Shared Mobile UI Rhythm And Primitive Audit; 04 - Refresh Member Detail And Read-Only Service Flows.

**Status:** done

- [x] Receipt, financing, procurement, Foodstuff Purchase, project financing, optional share, guarantor response, and support forms use sectioned input groups with inline validation and accessible labels.
- [x] Primary submit actions stay reachable on long forms through sticky or bottom-safe placement that respects keyboard and safe-area behavior.
- [x] Draft state is visible but quiet, and stale/offline submit attempts explain what cannot be completed until fresh server data is available.
- [x] Money-affecting or review-sensitive submissions show a confirmation/review sheet before sending.
- [x] Successful submissions show a clear server-confirmed state and clear relevant local drafts without pretending offline drafts were posted.

## Implementation Notes

- Added shared `FormStateBanner` and `SubmissionReviewSheet` primitives for local draft visibility, stale server-data guardrails, and review-before-submit confirmation.
- Wired the primitives into financing, receipts, procurement, Foodstuff Purchase, Project Financing, optional shares, support cases, and guarantor approve/reject decisions without changing server-owned calculations or submission payload semantics.
- Added visible labels/accessibility labels around refreshed member submission inputs and preserved the server-confirmed success/draft-clear paths.

## Validation

- `bun --cwd apps/mobile typecheck`
- `bun --cwd apps/mobile check:native-imports`
- `bun --cwd apps/mobile check:nativewind-theme-vars`
- `bun --cwd apps/mobile check:smoke`
- `rg -n "className=.*style=|style=.*className=" apps/mobile/src`
