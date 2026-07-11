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
  "src/app/(member)/(tabs)/_layout.tsx",
  "src/app/(member)/(tabs)/index.tsx",
  "src/app/(member)/(tabs)/financing.tsx",
  "src/app/(member)/(tabs)/shares.tsx",
  "src/app/(member)/(tabs)/more.tsx",
  "src/app/(member)/receipts.tsx",
  "src/app/(member)/support.tsx",
  "src/app/(member)/procurement.tsx",
  "src/app/(member)/project-financing.tsx",
  "src/app/(member)/food-purchase.tsx",
  "src/app/(member)/guarantor-approvals.tsx",
  "src/app/(admin)/(tabs)/_layout.tsx",
  "src/app/(admin)/(tabs)/index.tsx",
  "src/app/(admin)/(tabs)/finance.tsx",
  "src/app/(admin)/(tabs)/members.tsx",
  "src/app/(admin)/(tabs)/reports.tsx",
  "src/app/(admin)/(tabs)/more.tsx",
  "src/app/(admin)/members/[memberId].tsx",
  "src/app/notifications.tsx",
]

for (const route of requiredRoutes) {
  assertFile(route)
}

assertFile("qa/mobile-visual-qa.md")

assertIncludes("src/app/index.tsx", [
  "<LoadingScreen />",
  "/(admin)/(tabs)",
  "/(member)/(tabs)",
  "/(auth)/sign-in",
])

assertIncludes("src/screens/sign-in-screen.tsx", [
  "FloatingBottomSheet",
  "Sign in",
  "Continue as Member",
  "Continue as Admin",
  "disabled={!canSubmit || isSubmitting}",
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

assertIncludes("src/screens/more-screen.tsx", [
  "switchRole(role.id)",
  "Sign out",
  "CachedReadBanner",
])

for (const screen of [
  "src/screens/receipts-screen.tsx",
  "src/screens/support-screen.tsx",
  "src/screens/financing-screen.tsx",
  "src/screens/procurement-screen.tsx",
  "src/screens/project-financing-screen.tsx",
  "src/screens/food-purchase-screen.tsx",
  "src/screens/shares-screen.tsx",
  "src/screens/admin-finance-screen.tsx",
  "src/screens/admin-members-screen.tsx",
]) {
  assertIncludes(screen, [
    "useMobileFormDraft",
    "isMobileReadCacheStale",
    "CachedReadBanner",
  ])
}

for (const screen of [
  "src/screens/receipts-screen.tsx",
  "src/screens/notifications-screen.tsx",
  "src/screens/financing-screen.tsx",
  "src/screens/procurement-screen.tsx",
  "src/screens/project-financing-screen.tsx",
  "src/screens/food-purchase-screen.tsx",
  "src/screens/guarantor-approvals-screen.tsx",
  "src/screens/shares-screen.tsx",
  "src/screens/admin-finance-screen.tsx",
  "src/screens/admin-members-screen.tsx",
  "src/screens/admin-reports-screen.tsx",
]) {
  assertIncludes(screen, ["VirtualizedCardList"])
}

const matrix = JSON.parse(read("qa/mobile-smoke-matrix.json"))
const viewportIds = new Set(matrix.viewports.map((viewport) => viewport.id))
const flowIds = new Set(matrix.flows)

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
  `Mobile smoke coverage passed (${requiredRoutes.length} routes, ${matrix.viewports.length} viewports, ${matrix.flows.length} flows).`
)
