# 09 - Refresh Admin Reports, More Menu, And Final Mobile QA Gate

**What to build:** The refreshed mobile UI is finished with summary-first reports, polished More/menu surfaces, and a repeatable QA gate that proves the app remains native-safe, accessible, and usable on compact phones.

**Blocked by:** 02 - Refresh Auth, Bootstrap, Role Switcher, And Bottom Tabs; 05 - Refresh Member Forms, Drafts, And Confirmations; 07 - Refresh Admin Members, Detail, Onboarding, And KYC Flow; 08 - Refresh Admin Finance Queues And Review Surfaces.

**Status:** done

- [x] Admin reports use compact report cards, filters, summary previews, and download/share entry points without recreating desktop spreadsheet-style management.
- [x] More/menu surfaces are grouped by role and include workspace switch, updates, support, settings/security where available, and sign-out without burying urgent work.
- [x] Smoke coverage exercises auth, loading, role switch, member tabs, admin tabs, forms, stale/offline states, report cards, More/menu, and sign-out.
- [x] Native import, typecheck, and existing mobile smoke commands pass for the refreshed work.
- [x] Visual QA covers compact Android, standard Android, compact iOS, standard iOS, and wider layouts for bottom tabs, auth sheet height, service labels, status badges, long names, sticky form footers, bottom-sheet safe areas, and accessible names.

## Implementation Notes

- Refreshed admin reports with shared status chips and empty states around report previews, audit evidence, and collection evidence.
- Refreshed More workspace access with shared invite draft/stale state, accessible invite inputs, and shared empty states for users and roles.
- Completed the final mobile QA gate using the existing smoke coverage script, which covers 21 routes, 5 viewports, and 14 flows.

## Validation

- `bun --cwd apps/mobile typecheck`
- `bun test apps/api/src/routers/mobile.route.test.ts`
- `bun --cwd apps/mobile check:native-imports`
- `bun --cwd apps/mobile check:nativewind-theme-vars`
- `bun --cwd apps/mobile check:smoke`
- `bun --cwd apps/mobile lint` (passes with existing generated `.expo/types/router.d.ts` unused eslint-disable warning)
- `bunx prettier --check apps/mobile/src/components/app/confirmation-row.tsx apps/mobile/src/components/app/empty-state.tsx apps/mobile/src/components/app/form-state-banner.tsx apps/mobile/src/components/app/profile-header.tsx apps/mobile/src/components/app/section-card.tsx apps/mobile/src/components/app/service-tile.tsx apps/mobile/src/components/app/stat-card.tsx apps/mobile/src/components/app/status-badge.tsx apps/mobile/src/components/app/submission-review-sheet.tsx apps/mobile/src/components/app/virtualized-card-list.tsx apps/mobile/src/screens/sign-in-screen.tsx apps/mobile/src/screens/loading-screen.tsx apps/mobile/src/screens/member-home-screen.tsx apps/mobile/src/screens/more-screen.tsx apps/mobile/src/screens/detail-list-screen.tsx apps/mobile/src/screens/financing-screen.tsx apps/mobile/src/screens/shares-screen.tsx apps/mobile/src/screens/receipts-screen.tsx apps/mobile/src/screens/support-screen.tsx apps/mobile/src/screens/procurement-screen.tsx apps/mobile/src/screens/project-financing-screen.tsx apps/mobile/src/screens/food-purchase-screen.tsx apps/mobile/src/screens/guarantor-approvals-screen.tsx apps/mobile/src/screens/notifications-screen.tsx apps/mobile/src/screens/statement-screen.tsx apps/mobile/src/screens/admin-home-screen.tsx apps/mobile/src/screens/admin-members-screen.tsx apps/mobile/src/screens/admin-member-detail-screen.tsx apps/mobile/src/screens/admin-finance-screen.tsx apps/mobile/src/screens/admin-reports-screen.tsx packages/db/src/queries/mobile.ts .scratch/mobile-ui-flow-refresh/issues/*.md`
- `rg -n "className=.*style=|style=.*className=" apps/mobile/src`
