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

// T01 design-system gallery: dev/QA builds only; production redirects home.
assertIncludes(
  "src/features/design-system/routes/design-system-route-controller.tsx",
  ['if (!isMobileQaClientBuild) return <Redirect href="/" />']
)

assertIncludes("src/dev/mobile-dev-quick-fill.ts", [
  "foodPurchase: {",
  'requestedPaybackMonths: "3"',
  "projectFinancing: {",
  'requestedPaybackMonths: "18"',
])

const quickFillScreens = [
  "src/features/auth/screens/recovery-screen.tsx",
  "src/features/financing/components/financing-request-form.tsx",
  "src/features/receipts/components/receipt-submit-flow.tsx",
  "src/features/receipts/components/receipt-support-flow.tsx",
  "src/features/support/components/member-support-create.tsx",
  "src/features/support/components/member-support-thread.tsx",
  "src/features/guarantors/components/member-guarantor-response-form.tsx",
  "src/features/shares-profit/screens/share-request-flow.tsx",
  "src/features/admin-member-lifecycle/components/create-member-sheet.tsx",
  "src/features/admin-member-lifecycle/components/member-change-sheet.tsx",
  "src/features/settings-access/components/invite-user-sheet.tsx",
  "src/features/operation-profile/components/operation-profile-edit-sheet.tsx",
  "src/features/admin-charge-operations/screens/admin-charge-operations-screen.tsx",
  "src/features/admin-contribution-operations/screens/admin-contribution-operations-screen.tsx",
  "src/features/admin-financing-operations/screens/admin-financing-operations-screen.tsx",
  "src/features/admin-food-purchase-operations/screens/admin-food-purchase-operations-screen.tsx",
  "src/features/admin-procurement-operations/screens/admin-procurement-operations-screen.tsx",
  "src/features/admin-project-financing-operations/screens/admin-project-financing-operations-screen.tsx",
  "src/features/admin-repayment-operations/screens/admin-repayment-operations-screen.tsx",
  "src/features/admin-share-profit-governance/screens/admin-share-profit-governance-screen.tsx",
]

for (const screen of quickFillScreens) {
  assertIncludes(screen, ["DevQuickFill", "mobileDevQuickFill"])
}

assertIncludes("src/features/member-service-requests/service-request-editor.tsx", ["<DevQuickFill"])
assertIncludes(
  "src/features/member-service-requests/service-request-adapters.ts",
  ["mobileDevQuickFill.procurement", "mobileDevQuickFill.projectFinancing", "mobileDevQuickFill.foodPurchase"]
)

// Passwords, OTPs, app PINs, and QA Domains stay manual. The per-form
// inventory and its discovery test live in src/dev/mobile-qa-form-coverage*.
assertExcludes("src/dev/mobile-dev-quick-fill.ts", [
  "newPassword",
  "pin:",
  "code:",
])
for (const screen of [
  "src/features/app-lock/screens/app-lock-screen.tsx",
  "src/features/auth/components/sign-in-form.tsx",
  "src/features/auth/components/qa-domain-composer.tsx",
]) {
  assertExcludes(screen, ["DevQuickFill"])
}
assertExcludes("src/features/auth/screens/recovery-screen.tsx", [
  "setCode(devRecoveryCode",
  "setPassword(fixture",
])
assertIncludes("src/dev/mobile-qa-form-coverage.ts", [
  "export const mobileQaFormCoverage",
  "export const mobileQaNonFormFieldSources",
])

assertIncludes(
  "src/features/admin-finance-support/components/admin-finance-action-stack.tsx",
  ["DevQuickFill"]
)
assertIncludes(
  "src/features/admin-finance-support/hooks/use-admin-finance-support-controller.ts",
  ["mobileDevQuickFill"]
)

assertIncludes("src/features/auth/screens/sign-in-screen.tsx", [
  "<QaAccessPanel bottomInset={dockHeight} />",
  "<SignInHero",
  "profile={signIn.confirmedProfile}",
])
assertIncludes("src/features/auth/components/auth-hero.tsx", [
  "profile?.tenant.name",
  "Cooperative confirmed",
])

assertIncludes("src/features/auth/components/qa-access-panel.tsx", [
  "authorizeMobileQa",
  "listMobileQaProfiles",
  "enterMobileQaProfile",
  "Keyboard.dismiss()",
  "acceptServerProfile(response.profile)",
])
assertIncludes("src/features/auth/components/qa-profile-chooser.tsx", [
  "No password is",
  "returned, displayed, or filled.",
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
]

assertIncludes(
  "src/dev/mobile-dev-fixtures.ts",
  fixtureFunctions.map((name) => `export function ${name}`)
)

const fixtureAdapters = [
  "src/features/settings-access/api/member-more-api.ts",
  "src/features/settings-access/api/workspace-access-api.ts",
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
