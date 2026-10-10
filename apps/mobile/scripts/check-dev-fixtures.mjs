#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8")
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(relativePath, snippets) {
  const source = read(relativePath)
  for (const snippet of snippets) {
    assert(
      source.includes(snippet),
      `${relativePath} is missing development fixture marker: ${snippet}`
    )
  }
}

function assertExcludes(relativePath, snippets) {
  const source = read(relativePath)
  for (const snippet of snippets) {
    assert(
      !source.includes(snippet),
      `${relativePath} contains forbidden development fixture marker: ${snippet}`
    )
  }
}

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry)
    if (statSync(absolutePath).isDirectory())
      return collectSourceFiles(absolutePath)
    return /\.[cm]?[jt]sx?$/.test(entry) ? [absolutePath] : []
  })
}

assertIncludes("src/dev/mobile-dev-session.ts", [
  'process.env.NODE_ENV !== "production"',
  "isMockSessionToken(token)",
  "isMobileDevFixtureSession",
])

assertIncludes("src/runtime/mobile-runtime-gate.tsx", [
  "isMobileDevelopmentBuild",
  "EXPO_PUBLIC_MOBILE_BOOTSTRAP_PREVIEW",
  "resolveBootstrapPreviewMode",
])

assertIncludes("src/lib/session-store.ts", [
  'id: "mock-member-membership"',
  'id: "mock-admin-membership"',
  "getMockRoleForMembership",
])

assertIncludes("src/hooks/use-auth.tsx", [
  "getMockRoleForMembership(membershipId)",
  "isMockSessionToken(profile?.token)",
  "createMockProfile(mockRole)",
])

assertIncludes("src/components/app/dev-quick-fill.tsx", [
  "isMobileQaClientBuild",
  "getSessionProfile()?.qaAuthorized",
  'Keyboard.addListener("keyboardDidShow"',
  'Keyboard.addListener("keyboardDidHide"',
  'accessibilityHint="Fills this form with safe development test data"',
  'className="h-12 w-12',
  '"absolute left-4 h-12 w-12"',
])

assertIncludes("src/dev/mobile-dev-quick-fill.ts", [
  "foodPurchase: {",
  'requestedPaybackMonths: "3"',
  "projectFinancing: {",
  'requestedPaybackMonths: "18"',
])

const quickFillScreens = [
  "src/features/auth/screens/recovery-screen.tsx",
  "src/features/financing/screens/member-financing-screen.tsx",
  "src/features/procurement/screens/member-procurement-screen.tsx",
  "src/features/project-financing/screens/member-project-financing-screen.tsx",
  "src/features/food-purchase/screens/member-food-purchase-screen.tsx",
  "src/features/receipts/screens/member-receipts-screen.tsx",
  "src/features/support/screens/member-support-screen.tsx",
  "src/features/guarantors/screens/member-guarantor-approvals-screen.tsx",
  "src/features/shares-profit/screens/member-shares-screen.tsx",
  "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
  "src/features/admin-member-lifecycle/screens/admin-member-detail-screen.tsx",
  "src/features/settings-access/screens/more-screen.tsx",
]

for (const screen of quickFillScreens) {
  if (
    screen ===
    "src/features/food-purchase/screens/member-food-purchase-screen.tsx"
  ) {
    assertIncludes(screen, ["MemberFoodPurchaseQuickFill"])
    assertIncludes(
      "src/features/food-purchase/components/member-food-purchase-application-form.tsx",
      ["DevQuickFill"]
    )
    assertIncludes(
      "src/features/food-purchase/hooks/use-member-food-purchase-controller.ts",
      ["mobileDevQuickFill"]
    )
    continue
  }

  assertIncludes(screen, ["DevQuickFill", "mobileDevQuickFill"])
}

assertIncludes(
  "src/features/admin-finance-support/components/admin-finance-action-stack.tsx",
  ["DevQuickFill"]
)
assertIncludes(
  "src/features/admin-finance-support/hooks/use-admin-finance-support-controller.ts",
  ["mobileDevQuickFill"]
)

assertIncludes("src/features/auth/screens/sign-in-screen.tsx", [
  "<QaAccessPanel />",
  "<LivingCooperativeHero",
  "profile={verifiedProfile}",
])
assertIncludes("src/features/auth/components/living-cooperative-hero.tsx", [
  "profile?.tenant.name",
  "Cooperative confirmed",
])

assertIncludes("src/features/auth/components/qa-access-panel.tsx", [
  "authorizeMobileQa",
  "listMobileQaProfiles",
  "enterMobileQaProfile",
  'accessibilityHint="Opens optional tester access in a floating bottom sheet"',
  "Keyboard.dismiss()",
  "Choose a test profile.",
  "No password is returned, displayed, or filled.",
])
assertExcludes("src/features/auth/components/qa-access-panel.tsx", [
  "invalidateLocalSession",
  "dismissible={false}",
  "Optional QA access suggestion",
])

const fixtureFunctions = [
  "getDevMemberHome",
  "getDevMemberActivityPage",
  "getDevMemberStatement",
  "getDevMemberMore",
  "getDevMemberShares",
  "getDevMemberFinancing",
  "getDevMemberProcurement",
  "getDevMemberProjectFinancing",
  "getDevMemberFoodPurchase",
  "getDevMemberGuarantorApprovals",
  "getDevMemberReceipts",
  "getDevMemberSupport",
  "getDevAdminOverview",
  "getDevAdminMembers",
  "getDevAdminMemberDetail",
  "getDevAdminFinance",
  "getDevAdminReports",
  "getDevNotifications",
  "getDevAdminAccess",
  "getDevSubscriptionSnapshot",
  "requestDevPlanChange",
]

assertIncludes(
  "src/dev/mobile-dev-fixtures.ts",
  fixtureFunctions.map((name) => `export function ${name}`)
)

const fixtureAdapters = [
  "src/lib/mobile-subscription-api.ts",
  "src/features/settings-access/api/member-more-api.ts",
  "src/features/member-core/api/member-core-api.ts",
  "src/features/shares-profit/api/member-shares-api.ts",
  "src/features/financing/api/member-financing-api.ts",
  "src/features/guarantors/api/member-guarantor-api.ts",
  "src/features/receipts/api/member-receipts-api.ts",
  "src/features/support/api/member-support-api.ts",
  "src/features/procurement/api/member-procurement-api.ts",
  "src/features/project-financing/api/member-project-financing-api.ts",
  "src/features/food-purchase/api/member-food-purchase-api.ts",
  "src/features/admin-member-lifecycle/api/admin-member-lifecycle-api.ts",
  "src/features/admin-reports-access/api/admin-reports-access-api.ts",
  "src/features/notifications/api/notification-center-api.ts",
]

for (const adapter of fixtureAdapters) {
  assertIncludes(adapter, [
    "mobile-dev-fixtures",
    "isMobileDevFixtureSession()",
  ])
}

const allowedFixtureImports = new Set([
  "src/dev/mobile-dev-fixtures.ts",
  "src/dev/mobile-dev-fixture-contracts.ts",
  "src/dev/mobile-dev-fixtures.test.ts",
  ...fixtureAdapters,
])

for (const absolutePath of collectSourceFiles(join(root, "src"))) {
  const relativePath = relative(root, absolutePath)
  if (allowedFixtureImports.has(relativePath)) continue

  assert(
    !readFileSync(absolutePath, "utf8").includes("mobile-dev-fixtures"),
    `${relativePath} bypasses the API facade by importing development fixtures directly.`
  )
}

console.log(
  `Mobile development fixtures passed (${fixtureFunctions.length} feature snapshots, ${quickFillScreens.length} Quick Fill screens, ${fixtureAdapters.length} guarded API adapters).`
)
