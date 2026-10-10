#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8")
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertFile(relativePath) {
  assert(existsSync(join(root, relativePath)), `Missing ${relativePath}`)
}

function assertIncludes(relativePath, snippets) {
  const source = read(relativePath)

  for (const snippet of snippets) {
    assert(
      source.includes(snippet),
      `${relativePath} is missing required smoke marker: ${snippet}`
    )
  }
}

function assertMatches(relativePath, pattern, label) {
  assert(
    pattern.test(read(relativePath)),
    `${relativePath} is missing ${label}`
  )
}

const requiredRoutes = [
  "src/app/index.tsx",
  "src/app/(auth)/sign-in.tsx",
  "src/app/(auth)/recovery.tsx",
  "src/app/(member)/(tabs)/_layout.tsx",
  "src/app/(member)/(tabs)/index.tsx",
  "src/app/(member)/(tabs)/commitments.tsx",
  "src/app/(member)/(tabs)/financing.tsx",
  "src/app/(member)/(tabs)/shares.tsx",
  "src/app/(member)/(tabs)/more.tsx",
  "src/app/(member)/receipts.tsx",
  "src/app/(member)/statement.tsx",
  "src/app/(member)/support.tsx",
  "src/app/(member)/procurement.tsx",
  "src/app/(member)/project-financing.tsx",
  "src/app/(member)/food-purchase.tsx",
  "src/app/(member)/guarantor-approvals.tsx",
  "src/app/(admin)/(tabs)/_layout.tsx",
  "src/app/(admin)/(tabs)/index.tsx",
  "src/app/(admin)/(tabs)/finance.tsx",
  "src/app/(admin)/contributions.tsx",
  "src/app/(admin)/share-profit-governance.tsx",
  "src/app/(admin)/(tabs)/members.tsx",
  "src/app/(admin)/(tabs)/reports.tsx",
  "src/app/(admin)/(tabs)/more.tsx",
  "src/app/(admin)/members/[memberId].tsx",
  "src/app/(admin)/subscription.tsx",
  "src/app/notifications.tsx",
  "src/app/updates.tsx",
  "src/app/sessions.tsx",
  "src/app/app-lock.tsx",
  "src/app/+not-found.tsx",
]

for (const route of requiredRoutes) {
  assertFile(route)
}

assertFile("qa/mobile-visual-qa.md")
assertFile("qa/mobile-visual-routes.json")

assertIncludes("src/app/index.tsx", [
  "<BootstrapScreen />",
  "/(admin)/(tabs)",
  "/(member)/(tabs)",
  "/(auth)/sign-in",
])

assertIncludes("src/features/bootstrap/screens/bootstrap-screen.tsx", [
  'mode = "loading"',
  'mode === "fatal"',
  'accessibilityRole="progressbar"',
  "presentation.note",
])

assertIncludes("src/features/auth/screens/sign-in-screen.tsx", [
  "AppKeyboardAwareScrollView",
  "bottomOffset={224}",
  "Sign in to mobile workspace",
  "<QaAccessPanel />",
  "<SignInForm",
])

assertIncludes("src/features/auth/components/sign-in-form.tsx", [
  'submitBehavior="submit"',
  "const submitDisabled = !canSubmit || isSubmitting",
  'submitDisabled && "bg-muted opacity-100 active:bg-muted"',
  "disabled={submitDisabled}",
])

assertIncludes("src/features/auth/components/qa-access-panel.tsx", [
  'accessibilityHint="Opens optional tester access in a floating bottom sheet"',
  "Choose a test profile.",
  "Keyboard.dismiss()",
  "Update QA access",
  "CompactFormSheet",
  "visible={sheetVisible}",
])

assertIncludes("src/features/auth/screens/recovery-screen.tsx", [
  "AuthScreenShell",
  "Quick fill recovery",
  "<RecoveryRequestStep",
  "<RecoveryCodeStep",
  "<RecoveryPasswordStep",
])

assertIncludes("src/features/auth/components/recovery-step-content.tsx", [
  "Six-digit code",
  "presentation.actionLabel",
  "PasswordField",
])

assertIncludes("src/features/auth/components/auth-screen-shell.tsx", [
  "AppKeyboardAwareScrollView",
  "bottomOffset={224}",
  "contentContainerClassName",
])

assertIncludes("src/app/(member)/(tabs)/_layout.tsx", [
  "Home",
  "Commitments",
  "Financing",
  "Shares",
  "More",
])

assertIncludes("src/app/(admin)/(tabs)/_layout.tsx", [
  "Overview",
  "Finance",
  "Members",
  "Reports",
  "More",
])

assertIncludes("src/features/settings-access/screens/more-screen.tsx", [
  "handleOpenManagedDeviceAccess",
  "Device access",
  "Sign out",
  "CachedReadBanner",
  "<ScreenStatusBar />",
])

assertIncludes(
  "src/features/subscription/routes/store-subscription-route-controller.tsx",
  ["<ScreenStatusBar />"]
)

assertIncludes(
  "src/features/admin-member-lifecycle/screens/admin-overview-screen.tsx",
  ['<ScreenStatusBar tone="brand" />']
)

assertIncludes("src/components/app/screen-status-bar.tsx", [
  "useIsFocused()",
  "return appearance ? <StatusBar {...appearance} /> : null",
])

assertIncludes(
  "src/features/settings-access/routes/more-route-controller.tsx",
  [
    "switchRole(membershipId)",
    "inviteAdminAccessUser(input)",
    "getAdminAccess()",
    "getMemberMore()",
  ]
)

assertIncludes(
  "src/features/device-sessions/routes/device-sessions-route-controller.tsx",
  [
    "canManageMobileDeviceSessions",
    "getManagedMobileDeviceSessions",
    "revokeAllOwnMobileDeviceSessions",
    "invalidateLocalSession",
    'runOnlineOperation("command"',
  ]
)

assertIncludes(
  "src/features/device-sessions/screens/device-sessions-screen.tsx",
  [
    "LegendList",
    "FloatingBottomSheet",
    'presentation="compact"',
    'scrollable="auto"',
    "Sign out all devices",
  ]
)

assertIncludes("src/features/app-lock/screens/app-lock-screen.tsx", [
  "FullScreenFormSheet",
  "ConfirmationSheet",
  "AppLockPinPad",
  "DevQuickFill",
  "After leaving the app",
  "Privacy protection is active",
])

assertIncludes("src/features/app-lock/hooks/use-app-lock.tsx", [
  "registerMobileLocalSecurityClearer",
  "enableAppLockPrivacy",
  'AppState.addEventListener("change"',
  "shouldRelockApp",
])

assertIncludes(
  "src/features/subscription/routes/store-subscription-route-controller.tsx",
  [
    "ScrollView",
    "getMobileSubscriptionSnapshot",
    "useStoreSubscriptions",
    "store.restore()",
    "store.manage()",
    "LegalLinks",
  ]
)
assertMatches(
  "src/features/subscription/routes/store-subscription-route-controller.tsx",
  /store\.purchase\(\s*offer,\s*snapshot\?\.subscriptionId\s*\?\?\s*null\s*\)/,
  "subscription-bound store purchase dispatch"
)

assertIncludes(
  "android/app/src/main/java/com/halaalvest/mobile/MainActivity.kt",
  [
    "ReactMarkerConstants.CONTENT_APPEARED",
    "reportFullyDrawn()",
    "unregisterFullyDrawnMarker()",
  ]
)

assertIncludes(
  "src/features/subscription/routes/subscription-route-controller.tsx",
  ["StoreSubscriptionRouteController"]
)

assertIncludes(
  "src/features/subscription/routes/store-subscription-route-controller.tsx",
  [
    "canRoleManageSubscription",
    "getMobileSubscriptionSnapshot",
    "useStoreSubscriptions",
    "canManage && online",
    "store.restore()",
    "store.manage()",
    "LegalLinks",
  ]
)

for (const controller of [
  "src/features/member-core/routes/member-commitments-route-controller.tsx",
  "src/features/member-core/routes/member-statement-route-controller.tsx",
  "src/features/shares-profit/routes/member-shares-route-controller.tsx",
]) {
  assertIncludes(controller, ["useMemberActivity", "activeMembershipId"])
}

assertIncludes("src/features/member-core/public/member-activity-history.tsx", [
  "VirtualizedCardList",
  "Load more",
  "MemberActivityHistoryState",
])

for (const screen of [
  "src/features/receipts/screens/member-receipts-screen.tsx",
  "src/features/support/screens/member-support-screen.tsx",
  "src/features/financing/screens/member-financing-screen.tsx",
  "src/features/shares-profit/screens/member-shares-screen.tsx",
  "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
]) {
  assertIncludes(screen, [
    "useMobileFormDraft",
    "isMobileReadCacheStale",
    "CachedReadBanner",
  ])
}

assertIncludes(
  "src/features/admin-finance-support/hooks/use-admin-finance-support-controller.ts",
  ["useMobileFormDraft", "isMobileReadCacheStale"]
)
assertIncludes(
  "src/features/admin-finance-support/components/admin-finance-work-queue.tsx",
  ["CachedReadBanner", "LegendList"]
)

for (const screen of [
  "src/features/procurement/screens/member-procurement-screen.tsx",
  "src/features/project-financing/screens/member-project-financing-screen.tsx",
]) {
  assertIncludes(screen, [
    "useMobileFormDraft",
    "isMobileReadCacheStale",
    "CooperativeServiceFreshness",
    "CooperativeServiceStateNotice",
  ])
}

assertIncludes(
  "src/features/food-purchase/hooks/use-member-food-purchase-controller.ts",
  ["useMobileFormDraft", "isMobileReadCacheStale"]
)
assertIncludes(
  "src/features/food-purchase/screens/member-food-purchase-screen.tsx",
  [
    "useMemberFoodPurchaseController",
    "CooperativeServiceFreshness",
    "CooperativeServiceStateNotice",
  ]
)

for (const screen of [
  "src/features/receipts/screens/member-receipts-screen.tsx",
  "src/features/notifications/screens/notifications-screen.tsx",
  "src/features/financing/screens/member-financing-screen.tsx",
  "src/features/procurement/screens/member-procurement-screen.tsx",
  "src/features/project-financing/screens/member-project-financing-screen.tsx",
  "src/features/food-purchase/screens/member-food-purchase-screen.tsx",
  "src/features/shares-profit/screens/member-shares-screen.tsx",
  "src/features/admin-reports-access/screens/admin-reports-screen.tsx",
]) {
  assertIncludes(screen, ["VirtualizedCardList"])
}

assertIncludes(
  "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
  ["FullScreenFormSheet", "CompactFormSheet", "SubmissionReviewSheet"]
)

assertIncludes(
  "src/features/admin-finance-support/screens/admin-finance-support-screen.tsx",
  [
    "useAdminFinanceSupportController",
    "AdminFinanceWorkQueue",
    "AdminFinanceOperationsSheet",
    "AdminFinanceItemDetailSheet",
    "AdminFinanceActionStack",
  ]
)

assertIncludes(
  "src/features/admin-finance-support/components/admin-finance-action-stack.tsx",
  [
    "FullScreenFormSheet",
    "CompactFormSheet",
    "SubmissionReviewSheet",
    "DevQuickFill",
    "CalendarPickerSheet",
  ]
)

assertIncludes(
  "src/features/admin-finance-support/hooks/use-admin-finance-support-controller.ts",
  [
    "runOnlineOperation",
    "expectedState",
    "showSuccessAfterReviewRef.current = true",
    "void loadOverview()",
    "reopenIntentRef.current = intent",
  ]
)

assertIncludes(
  "src/features/admin-contribution-operations/screens/admin-contribution-operations-screen.tsx",
  [
    "AdminContributionWorkspace",
    "CompactFormSheet",
    "FullScreenFormSheet",
    "SubmissionReviewSheet",
    "runOnlineOperation",
    "expectedState",
    "DevQuickFill",
  ]
)

assertIncludes(
  "src/features/admin-contribution-operations/components/admin-contribution-workspace.tsx",
  ["VirtualizedCardList", 'testID="admin-contribution-operations-screen"']
)

assertIncludes(
  "src/features/admin-share-profit-governance/screens/admin-share-profit-governance-screen.tsx",
  [
    "VirtualizedCardList",
    "FloatingBottomSheet",
    "DevQuickFill",
    "commandsBlocked",
    "expectedState",
    'testID="admin-share-profit-governance-screen"',
    'captureMobileError(error, "mobile.share_profit_governance")',
  ]
)

const matrix = JSON.parse(read("qa/mobile-smoke-matrix.json"))
const visualRoutes = JSON.parse(read("qa/mobile-visual-routes.json"))
const viewportIds = new Set(matrix.viewports.map((viewport) => viewport.id))
const flowIds = new Set(matrix.flows)

assert(
  visualRoutes.requiredThemes.includes("light") &&
    visualRoutes.requiredThemes.includes("dark"),
  "Visual route manifest must require both light and dark evidence."
)
assert(
  viewportIds.has(visualRoutes.requiredViewport),
  "Visual route manifest must reference a known required viewport."
)

const visualScreenIds = new Set()
for (const screen of visualRoutes.screens) {
  assert(
    !visualScreenIds.has(screen.id),
    `Duplicate visual screen id ${screen.id}`
  )
  visualScreenIds.add(screen.id)
  assertFile(screen.source)
}

for (const viewportId of [
  "compact-ios",
  "typical-ios",
  "compact-android",
  "typical-android",
  "wide-layout",
]) {
  assert(viewportIds.has(viewportId), `QA matrix missing ${viewportId}`)
}

for (const flowId of [
  "startup-routing",
  "login-password",
  "logout",
  "role-switch",
  "device-session-revocation",
  "member-tabs",
  "admin-tabs",
  "receipt-form-state",
  "admin-review-state",
  "stale-cache-banner",
  "virtualized-long-lists",
]) {
  assert(flowIds.has(flowId), `QA matrix missing ${flowId}`)
}

console.log(
  `Mobile smoke coverage passed (${requiredRoutes.length} routes, ${visualRoutes.screens.length} visual screens, ${matrix.viewports.length} viewports, ${matrix.flows.length} flows).`
)
