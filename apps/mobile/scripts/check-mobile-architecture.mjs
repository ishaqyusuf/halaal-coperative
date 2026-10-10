import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const MOBILE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE_DIR = join(MOBILE_DIR, "src")
const APP_DIR = join(SOURCE_DIR, "app")
const CONTRACT_FILE = join(MOBILE_DIR, "qa/mobile-architecture-contract.json")
const contract = JSON.parse(readFileSync(CONTRACT_FILE, "utf8"))
const failures = []

const sourceFiles = findFiles(SOURCE_DIR, [".ts", ".tsx"])
const routeFiles = findFiles(APP_DIR, [".tsx"]).map(toMobilePath).sort()
const inventoriedFiles = [...contract.shells, ...contract.routes]
  .map((entry) => entry.file)
  .sort()

compareInventory(routeFiles, inventoriedFiles)
validateContract()
checkEntrypoints()
checkRootShell()
checkPublicAuthContract()
checkLegacyProductionModules()
checkFeatureBoundaries()
checkAdminMemberLifecycleOwnership()
checkAdminFinanceSupportOwnership()
checkAdminReportsAccessNotificationOwnership()
checkBrowsingFormSeparation()
checkUnsafeBarrels()
checkFinancialAuthority()

if (failures.length > 0) {
  console.error("Mobile architecture contract failed:\n")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(
  `Mobile architecture contract passed (${contract.routes.length} routes, ${contract.shells.length} shells).`
)

function validateContract() {
  const routePaths = new Set()
  const routeFilesSeen = new Set()

  for (const route of contract.routes) {
    if (routeFilesSeen.has(route.file)) {
      failures.push(`duplicate route inventory entry: ${route.file}`)
    }
    routeFilesSeen.add(route.file)

    if (routePaths.has(route.path)) {
      failures.push(`duplicate public route path: ${route.path}`)
    }
    routePaths.add(route.path)

    if (!Array.isArray(route.roles) || route.roles.length === 0) {
      failures.push(`${route.file} has no role boundary`)
    }
    if (!route.tenantBoundary?.trim()) {
      failures.push(`${route.file} has no tenant boundary`)
    }
    if (!route.feature?.trim()) {
      failures.push(`${route.file} has no feature owner`)
    }
    if (route.controller !== undefined && !route.controller?.trim()) {
      failures.push(`${route.file} has an empty feature controller contract`)
    }
  }

  const requiredPrinciples = [
    "entrypoints",
    "authorization",
    "financialCommands",
    "financialCalculations",
    "offline",
    "styling",
    "keyboard",
    "errors",
  ]
  for (const principle of requiredPrinciples) {
    if (!contract.principles?.[principle]?.trim()) {
      failures.push(`architecture principle is missing: ${principle}`)
    }
  }
}

function checkEntrypoints() {
  const forbidden = [
    ["useQuery(", "query orchestration"],
    ["useMutation(", "command orchestration"],
    ["fetch(", "network access"],
    ["AsyncStorage", "persistence access"],
    ["SecureStore", "secure persistence access"],
    ["useEffect(", "lifecycle orchestration"],
    ["useState(", "feature state"],
    ["@/trpc", "tRPC transport access"],
    ["@/lib/mobile-", "legacy mobile transport access"],
  ]

  for (const route of contract.routes) {
    const filePath = join(MOBILE_DIR, route.file)
    const source = readFileSync(filePath, "utf8")
    const lines = source.split("\n").length

    if (lines > 40) {
      failures.push(
        `${route.file} is ${lines} lines; route entrypoints must stay thin`
      )
    }

    for (const [marker, concern] of forbidden) {
      if (source.includes(marker)) {
        failures.push(`${route.file} contains ${concern} (${marker})`)
      }
    }

    if (route.controller) {
      const controllerImport = new RegExp(
        `from\\s+["']${escapeRegExp(route.controller)}["']`
      )
      if (!controllerImport.test(source)) {
        failures.push(
          `${route.file} must compose its declared feature controller (${route.controller})`
        )
      }
      if (source.includes("@/screens/")) {
        failures.push(
          `${route.file} is controller-owned and must not import the generic screen directory`
        )
      }
    }
  }
}

function checkRootShell() {
  const source = readFileSync(join(APP_DIR, "_layout.tsx"), "utf8")
  for (const marker of ["useQuery(", "useMutation(", "@/features/"]) {
    if (source.includes(marker)) {
      failures.push(
        `src/app/_layout.tsx contains feature orchestration (${marker})`
      )
    }
  }
}

function checkPublicAuthContract() {
  const repositoryRoot = resolve(MOBILE_DIR, "../..")
  const forbiddenMobileFiles = [
    "src/app/(auth)/sign-up.tsx",
    "src/features/auth/screens/activation-screen.tsx",
  ]

  for (const file of forbiddenMobileFiles) {
    if (existsSync(join(MOBILE_DIR, file))) {
      failures.push(
        `${file} reintroduces retired mobile membership activation; mobile auth is sign-in and recovery only`
      )
    }
  }

  const mobileAuthRouter = readFileSync(
    join(repositoryRoot, "apps/api/src/routers/mobile-auth.route.ts"),
    "utf8"
  )
  if (
    mobileAuthRouter.includes("mobileActivationRouter") ||
    mobileAuthRouter.includes("activation: mobileActivationRouter")
  ) {
    failures.push(
      "apps/api/src/routers/mobile-auth.route.ts exposes retired mobile membership activation"
    )
  }

  const accountAccessRouter = readFileSync(
    join(repositoryRoot, "apps/api/src/routers/mobile-account-access.route.ts"),
    "utf8"
  )
  if (accountAccessRouter.includes("mobileActivationRouter")) {
    failures.push(
      "apps/api/src/routers/mobile-account-access.route.ts retains a public mobile activation router"
    )
  }

  const accountAccessQueries = readFileSync(
    join(repositoryRoot, "packages/db/src/queries/mobile-account-access.ts"),
    "utf8"
  )
  for (const symbol of [
    "verifyMobileMemberEmail",
    "completeMobileMemberActivation",
  ]) {
    if (accountAccessQueries.includes(symbol)) {
      failures.push(
        `packages/db/src/queries/mobile-account-access.ts retains retired mobile activation command ${symbol}`
      )
    }
  }

  const memberOnboardingQueries = readFileSync(
    join(repositoryRoot, "packages/db/src/queries/member-onboarding.ts"),
    "utf8"
  )
  if (
    memberOnboardingQueries.includes("verificationChallenge") ||
    memberOnboardingQueries.includes('purpose: "member_email_verification"')
  ) {
    failures.push(
      "packages/db/src/queries/member-onboarding.ts must not persist a retired mobile activation challenge"
    )
  }

  const quickFill = readFileSync(
    join(MOBILE_DIR, "src/dev/mobile-dev-quick-fill.ts"),
    "utf8"
  )
  if (/\bactivation\s*:/.test(quickFill)) {
    failures.push(
      "src/dev/mobile-dev-quick-fill.ts must not persist a mobile activation fixture"
    )
  }
}

function checkLegacyProductionModules() {
  if (existsSync(join(MOBILE_DIR, "src/lib/mobile-home-api.ts"))) {
    failures.push(
      "src/lib/mobile-home-api.ts is a forbidden generic production boundary; use feature-owned modules"
    )
  }
  const legacyScreenDirectory = join(MOBILE_DIR, "src/screens")
  if (
    existsSync(legacyScreenDirectory) &&
    findFiles(legacyScreenDirectory, [".ts", ".tsx"]).length > 0
  ) {
    failures.push(
      "src/screens contains forbidden generic production screens; use feature-owned screens"
    )
  }

  const repositoryRoot = resolve(MOBILE_DIR, "../..")
  for (const file of [
    "apps/api/src/routers/mobile.route.ts",
    "packages/db/src/queries/mobile.ts",
  ]) {
    const absolutePath = join(repositoryRoot, file)
    if (file.endsWith("queries/mobile.ts") && existsSync(absolutePath)) {
      failures.push(
        `${file} is a forbidden monolithic database query module; use feature-owned queries`
      )
    }
    if (
      file.endsWith("routers/mobile.route.ts") &&
      readFileSync(absolutePath, "utf8").split("\n").length > 60
    ) {
      failures.push(
        `${file} must remain a thin composition-only router (60 line maximum)`
      )
    }
  }
}

function checkFeatureBoundaries() {
  const importPattern = /from\s+["']@\/features\/([^/"']+)([^"']*)["']/g

  for (const filePath of sourceFiles) {
    const relativePath = relative(SOURCE_DIR, filePath)
    const segments = relativePath.split(sep)
    if (segments[0] !== "features" || segments.length < 3) continue

    const owner = segments[1]
    const source = readFileSync(filePath, "utf8")
    for (const match of source.matchAll(importPattern)) {
      const importedFeature = match[1]
      const importedPath = match[2]
      if (importedFeature === owner) continue
      if (importedPath.startsWith("/public/")) continue

      failures.push(
        `${toMobilePath(filePath)} imports internal code from feature ${importedFeature}; use an explicit /public/<module> contract or move shared behavior`
      )
    }
  }
}

function checkUnsafeBarrels() {
  const forbiddenFiles = [
    "src/features/index.ts",
    "src/features/index.tsx",
    "src/runtime/index.ts",
    "src/runtime/index.tsx",
    "src/platform/index.ts",
    "src/platform/index.tsx",
  ]
  for (const file of forbiddenFiles) {
    if (existsSync(join(MOBILE_DIR, file))) {
      failures.push(
        `${file} is an unsafe shared barrel; import explicit modules`
      )
    }
  }

  const unsafeImport = /from\s+["']@\/(features|runtime|platform)["']/
  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8")
    if (unsafeImport.test(source)) {
      failures.push(`${toMobilePath(filePath)} imports an unsafe shared barrel`)
    }
  }
}

function checkAdminMemberLifecycleOwnership() {
  const required = [
    "src/features/admin-member-lifecycle/api/admin-member-lifecycle-api.ts",
    "src/features/admin-member-lifecycle/model/admin-member-lifecycle-types.ts",
    "src/features/admin-member-lifecycle/screens/admin-overview-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-members-screen.tsx",
    "src/features/admin-member-lifecycle/screens/admin-member-detail-screen.tsx",
  ]
  for (const file of required) {
    if (!existsSync(join(MOBILE_DIR, file))) {
      failures.push(`admin member lifecycle boundary is missing: ${file}`)
    }
  }
}

function checkAdminFinanceSupportOwnership() {
  const required = [
    "src/features/admin-finance-support/api/admin-finance-support-api.ts",
    "src/features/admin-finance-support/components/admin-finance-action-stack.tsx",
    "src/features/admin-finance-support/hooks/use-admin-finance-support-controller.ts",
    "src/features/admin-finance-support/model/admin-finance-support-types.ts",
    "src/features/admin-finance-support/screens/admin-finance-support-screen.tsx",
    "src/features/admin-finance-support/routes/admin-finance-support-route-controller.tsx",
  ]
  for (const file of required) {
    if (!existsSync(join(MOBILE_DIR, file))) {
      failures.push(`admin finance/support boundary is missing: ${file}`)
    }
  }

  const screen = readFileSync(join(MOBILE_DIR, required[4]), "utf8")
  for (const marker of [
    "useAdminFinanceSupportController",
    "AdminFinanceWorkQueue",
    "AdminFinanceActionStack",
  ]) {
    if (!screen.includes(marker)) {
      failures.push(`${required[4]} is missing composition marker ${marker}`)
    }
  }

  const actionStack = readFileSync(join(MOBILE_DIR, required[1]), "utf8")
  for (const marker of [
    "CompactFormSheet",
    "FullScreenFormSheet",
    "SubmissionReviewSheet",
    "DevQuickFill",
  ]) {
    if (!actionStack.includes(marker)) {
      failures.push(`${required[1]} is missing safe review marker ${marker}`)
    }
  }

  const controller = readFileSync(join(MOBILE_DIR, required[2]), "utf8")
  for (const marker of [
    "runOnlineOperation",
    "expectedState",
    "showSuccessAfterReviewRef.current = true",
    "reopenIntentRef.current = intent",
  ]) {
    if (!controller.includes(marker)) {
      failures.push(`${required[2]} is missing safe review marker ${marker}`)
    }
  }
}

function checkAdminReportsAccessNotificationOwnership() {
  const required = [
    "src/features/admin-reports-access/api/admin-reports-access-api.ts",
    "src/features/admin-reports-access/model/admin-reports-access-policy.ts",
    "src/features/admin-reports-access/model/admin-reports-access-types.ts",
    "src/features/admin-reports-access/routes/admin-reports-route-controller.tsx",
    "src/features/notifications/api/notification-center-api.ts",
    "src/features/notifications/model/notification-center-types.ts",
    "src/features/notifications/routes/notifications-route-controller.tsx",
    "src/features/settings-access/routes/more-route-controller.tsx",
    "src/features/updates/routes/updates-route-controller.tsx",
  ]
  for (const file of required) {
    if (!existsSync(join(MOBILE_DIR, file))) {
      failures.push(`reports/access/notifications boundary is missing: ${file}`)
    }
  }

  const reportsController = readFileSync(
    join(
      SOURCE_DIR,
      "features/admin-reports-access/routes/admin-reports-route-controller.tsx"
    ),
    "utf8"
  )
  for (const marker of [
    "getAdminReports",
    "canViewMobileAdminReports",
    "canUseMobileReportActions",
    "presentAdminReportsForQa",
  ]) {
    if (!reportsController.includes(marker)) {
      failures.push(`reports controller is missing ownership marker ${marker}`)
    }
  }

  const reportsScreen = readFileSync(
    join(
      SOURCE_DIR,
      "features/admin-reports-access/screens/admin-reports-screen.tsx"
    ),
    "utf8"
  )
  for (const marker of ["CachedReadBanner", "Retry reports"]) {
    if (!reportsScreen.includes(marker)) {
      failures.push(`reports screen is missing hardened state marker ${marker}`)
    }
  }
  for (const marker of [
    "getAdminReports",
    "useAuthContext",
    "Linking.openURL",
  ]) {
    if (reportsScreen.includes(marker)) {
      failures.push(`reports screen retains controller concern ${marker}`)
    }
  }

  const notificationController = readFileSync(
    join(
      SOURCE_DIR,
      "features/notifications/routes/notifications-route-controller.tsx"
    ),
    "utf8"
  )
  for (const marker of [
    "getNotificationCenter",
    "markNotificationsRead",
    "runOnlineOperation",
    "presentNotificationCenterForQa",
  ]) {
    if (!notificationController.includes(marker)) {
      failures.push(
        `notification controller is missing ownership marker ${marker}`
      )
    }
  }

  const notificationScreen = readFileSync(
    join(SOURCE_DIR, "features/notifications/screens/notifications-screen.tsx"),
    "utf8"
  )
  for (const marker of ["Retry notifications", "summary.unread"]) {
    if (!notificationScreen.includes(marker)) {
      failures.push(
        `notification screen is missing hardened state marker ${marker}`
      )
    }
  }
  for (const marker of [
    "getNotificationCenter",
    "markNotificationsRead",
    "runOnlineOperation",
    "useAuthContext",
  ]) {
    if (notificationScreen.includes(marker)) {
      failures.push(`notification screen retains controller concern ${marker}`)
    }
  }

  const moreController = readFileSync(
    join(
      SOURCE_DIR,
      "features/settings-access/routes/more-route-controller.tsx"
    ),
    "utf8"
  )
  for (const marker of [
    "getAdminAccess",
    "getMemberMore",
    "inviteAdminAccessUser",
    "runOnlineOperation",
    "switchRole",
    "signOut",
  ]) {
    if (!moreController.includes(marker)) {
      failures.push(`more controller is missing ownership marker ${marker}`)
    }
  }

  const moreScreen = readFileSync(
    join(SOURCE_DIR, "features/settings-access/screens/more-screen.tsx"),
    "utf8"
  )
  for (const marker of ["FullScreenFormSheet", "Signing out"]) {
    if (!moreScreen.includes(marker)) {
      failures.push(`more screen is missing hardened state marker ${marker}`)
    }
  }
  for (const marker of [
    "getAdminAccess",
    "getMemberMore",
    "inviteAdminAccessUser",
    "runOnlineOperation",
    "useAuthContext",
  ]) {
    if (moreScreen.includes(marker)) {
      failures.push(`more screen retains controller concern ${marker}`)
    }
  }

  const updatesController = readFileSync(
    join(SOURCE_DIR, "features/updates/routes/updates-route-controller.tsx"),
    "utf8"
  )
  for (const marker of [
    "Updates.useUpdates",
    "Updates.checkForUpdateAsync",
    "Updates.fetchUpdateAsync",
    "Updates.reloadAsync",
  ]) {
    if (!updatesController.includes(marker)) {
      failures.push(`updates controller is missing ownership marker ${marker}`)
    }
  }

  const updatesScreen = readFileSync(
    join(SOURCE_DIR, "features/updates/screens/updates-screen.tsx"),
    "utf8"
  )
  for (const marker of ["expo-updates", "Updates.useUpdates"]) {
    if (updatesScreen.includes(marker)) {
      failures.push(
        `updates screen retains native controller concern ${marker}`
      )
    }
  }

  const contextTransition = readFileSync(
    join(SOURCE_DIR, "lib/mobile-context-transition.ts"),
    "utf8"
  )
  const transitionOrder = [
    "loadNextContext",
    "clearDrafts",
    "clearReads",
    "persistNextContext",
  ].map((marker) => contextTransition.indexOf(`input.${marker}`))
  if (
    transitionOrder.some((index) => index < 0) ||
    transitionOrder.some(
      (index, position) =>
        position > 0 && index <= transitionOrder[position - 1]
    )
  ) {
    failures.push(
      "mobile context transition must load, clear scoped state, then persist the next context"
    )
  }
}

function checkBrowsingFormSeparation() {
  const screens = sourceFiles.filter((filePath) =>
    toMobilePath(filePath).includes("/screens/")
  )
  for (const filePath of screens) {
    const source = readFileSync(filePath, "utf8")
    const hasBrowsableContent =
      /<(?:FlatList|LegendList|SectionList|VirtualizedCardList)\b/.test(source)
    const hasInputs = /<(?:Input|Textarea)\b/.test(source)
    if (!hasBrowsableContent || !hasInputs) continue

    const hasDedicatedFormSurface = [
      "CompactFormSheet",
      "FullScreenFormSheet",
      "FloatingBottomSheet",
      "WorkflowModalScreen",
    ].some((marker) => source.includes(marker))

    if (!hasDedicatedFormSurface) {
      failures.push(
        `${toMobilePath(filePath)} combines browsable content and data entry without a dedicated form sheet`
      )
    }
  }
}

function checkFinancialAuthority() {
  const declarationPattern =
    /(?:function|const|let|var)\s+(?:calculate|compute|derive)(?:Loan)?(?:Eligibility|Repayment|Allocation|Balance|Charge|Dividend|Profit|Settlement|Ledger)/i
  const forbiddenPackages = ["decimal.js", "dinero.js", "@halaalvest/db"]

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8")
    if (declarationPattern.test(source)) {
      failures.push(
        `${toMobilePath(filePath)} declares an authoritative-looking financial calculation; move it to the server and return a typed preview`
      )
    }

    for (const packageName of forbiddenPackages) {
      if (
        source.includes(`from "${packageName}`) ||
        source.includes(`from '${packageName}`)
      ) {
        failures.push(
          `${toMobilePath(filePath)} imports ${packageName} into the mobile client`
        )
      }
    }
  }
}

function compareInventory(actual, expected) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)

  for (const file of actual) {
    if (!expectedSet.has(file))
      failures.push(`route is not inventoried: ${file}`)
  }
  for (const file of expected) {
    if (!actualSet.has(file))
      failures.push(`inventory references a missing route: ${file}`)
  }
}

function findFiles(directory, extensions) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...findFiles(entryPath, extensions))
    else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(entryPath)
    }
  }
  return files
}

function toMobilePath(filePath) {
  return relative(MOBILE_DIR, filePath).split(sep).join("/")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
