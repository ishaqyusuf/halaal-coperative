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

const requiredRoutes = [
  "src/app/index.tsx",
  "src/app/(auth)/sign-in.tsx",
  "src/app/(auth)/recovery.tsx",
  "src/app/(member)/(tabs)/_layout.tsx",
  "src/app/(member)/(tabs)/index.tsx",
  "src/app/(member)/(tabs)/commitments.tsx",
  "src/app/(member)/(tabs)/financing.tsx",
  "src/app/(member)/financing-requests.tsx",
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
  "src/app/notifications.tsx",
  "src/app/updates.tsx",
  "src/app/sessions.tsx",
  "src/app/app-lock.tsx",
  "src/app/cooperative-shortcuts.tsx",
  "src/app/cooperative-shortcut/[shortcutId].tsx",
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
  "<BootstrapSplash",
  "<ProgressDots",
  'accessibilityRole="progressbar"',
  "presentation.note",
])

assertIncludes("src/features/auth/screens/sign-in-screen.tsx", [
  "<DockedHeroScreen",
  "<SignInHero",
  "<QaAccessPanel bottomInset={dockHeight} />",
  "<SignInForm",
  "loading={signIn.submitting}",
  '<LegalLinks variant="inline" />',
])

assertIncludes("src/features/auth/components/sign-in-form.tsx", [
  'submitBehavior="submit"',
  "<AuthErrorBanner",
  "error={fieldErrors.cooperativeNumber}",
  "error={fieldErrors.password}",
])

assertIncludes("src/features/auth/components/qa-access-panel.tsx", [
  '"Opens QA domain setup above the keyboard"',
  '"Set up QA access"',
  "Open ${count} QA profiles",
  "Keyboard.dismiss()",
  "visible={composerOpen}",
  "visible={chooserOpen}",
])
assertIncludes("src/features/auth/components/qa-profile-chooser.tsx", [
  "qaChooserLayout",
  "<AppSheet",
  'variant="form"',
  "Change QA domain",
])

assertIncludes("src/features/auth/screens/recovery-screen.tsx", [
  "DockedHeroScreen",
  "Quick fill recovery",
  "<RecoveryRequestStep",
  "<RecoveryCodeStep",
  "<RecoveryPasswordStep",
  "<ResultScreen",
])

assertIncludes("src/features/auth/components/recovery-step-content.tsx", [
  "Six-digit code",
  "Resend code in",
  "PasswordField",
  "<PasswordRules",
])

assertIncludes("src/components/app/docked-hero-screen.tsx", [
  "AppKeyboardAwareScrollView",
  "<KeyboardStickyView",
  "useScreenChrome",
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

// T05: the overview is a ScreenShell hero screen; the shell owns the
// status bar (transparent, light icons over the hero).
assertIncludes(
  "src/features/admin-member-lifecycle/screens/admin-overview-screen.tsx",
  ["<ScreenShell", "<AdminOverviewHero", 'testID="admin-overview-screen"']
)

assertIncludes("src/components/app/screen-status-bar.tsx", [
  "useIsFocused()",
  "return appearance ? <StatusBar animated {...appearance} /> : null",
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
  "<AppSheet",
  'variant="form"',
  "<ConfirmSheet",
  "AppLockPinPad",
  "Relock after leaving the app",
  "Privacy protection is active",
])

assertIncludes("src/features/app-lock/hooks/use-app-lock.tsx", [
  "registerMobileLocalSecurityClearer",
  "enableAppLockPrivacy",
  'AppState.addEventListener("change"',
  "shouldRelockApp",
])

// Android fully drawn (cold-start timing): the config plugin is the source of
// truth; android/ is generated and git-ignored.
const fullyDrawnMarkers = [
  "ReactMarkerConstants.CONTENT_APPEARED",
  "reportFullyDrawn()",
  "unregisterFullyDrawnMarker()",
]
assertIncludes("plugins/with-fully-drawn-marker.cjs", [
  ...fullyDrawnMarkers,
  "withMainActivity",
])
assertIncludes("app.config.ts", ['"./plugins/with-fully-drawn-marker.cjs"'])
// A local prebuild, when present, must be current: check MainActivity under
// whichever variant package it was generated for.
for (const variantPath of ["", "/dev", "/preview"]) {
  const generated = `android/app/src/main/java/com/halaalvest/mobile${variantPath}/MainActivity.kt`
  if (!existsSync(join(root, generated))) continue
  assert(
    read(generated).includes("@generated begin with-fully-drawn-marker"),
    `${generated} predates the fully-drawn plugin; run expo prebuild for this variant.`
  )
  assertIncludes(generated, fullyDrawnMarkers)
}

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
  "src/features/shares-profit/screens/member-shares-screen.tsx",
  "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
]) {
  assertIncludes(screen, [
    "useMobileFormDraft",
    "isMobileReadCacheStale",
    "CachedReadBanner",
  ])
}

assertIncludes("src/features/financing/screens/member-financing-screen.tsx", [
  "useFinancingSnapshot",
  "useIsOnline",
  "FinanceNotice",
  "useInvalidateAppQueries",
])
assertIncludes("src/features/financing/components/financing-request-form.tsx", [
  "useMobileFormDraft",
  "<AppSheet",
  "<ResultScreen",
])
assertIncludes("src/features/financing/screens/member-financing-requests-screen.tsx", [
  "useAppInfiniteQuery",
  "<AppList",
  "onEndReached",
])
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

assertIncludes(
  "src/features/mobile-app-access/routes/mobile-app-access-route-controller.tsx",
  [
    "projectAccessGate(",
    "access.refresh()",
    "LegalLinks",
  ]
)
