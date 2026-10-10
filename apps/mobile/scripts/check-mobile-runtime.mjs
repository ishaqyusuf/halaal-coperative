import { readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const MOBILE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const failures = []

checkMarkers("src/app/_layout.tsx", [
  "TRPCReactProvider",
  "AuthProvider",
  "MobileRuntimeProvider",
  "MobileRuntimeBanner",
  "MobileRuntimeGate",
  "KeyboardProvider",
  "applyThemeOverride",
  "themeReady",
  "Stack.Protected",
  'guard={role === "admin" && access.accessAllowed}',
  'guard={role === "member" && access.accessAllowed}',
  "MobileAppAccessProvider",
  '<Stack.Screen name="mobile-access"',
  "guard={role === null}",
])
checkMarkers("src/lib/theme-runtime.ts", [
  "resolveThemeColorScheme",
  "toNativeColorScheme",
  "appThemeRuntime",
])
checkMarkers("src/hooks/use-color.ts", [
  "useSyncExternalStore",
  "appThemeRuntime",
])
checkMarkers("src/components/app/theme-selector.tsx", [
  'value: "system"',
  'value: "light"',
  'value: "dark"',
  "setThemeOverride",
  "setColorScheme",
])
checkMarkers("metro.config.js", ["inlineRequires: true"])
checkMarkers("src/runtime/mobile-runtime-state.ts", [
  '"cold"',
  '"hydrating"',
  '"unauthenticated"',
  '"authenticated"',
  '"fatal"',
  '"online"',
  '"offline"',
  '"retrying"',
  '"stale"',
  '"financial-command"',
  "MOBILE_ONLINE_REQUIRED",
])
checkMarkers("src/runtime/mobile-runtime-provider.tsx", [
  "NetInfo.addEventListener",
  "AppState.addEventListener",
  "focusManager.setFocused",
  "onlineManager.setOnline",
  'refetchQueries({ type: "active" })',
  "queryClient.clear()",
])
checkMarkers("src/runtime/mobile-runtime-banner.tsx", [
  "SafeAreaView",
  'edges={["top"]}',
  'accessibilityLiveRegion="polite"',
])
checkMarkers("src/trpc/query-client.ts", [
  'networkMode: "always"',
  "retry: false",
  "refetchOnReconnect: false",
  "refetchOnWindowFocus: false",
])
checkMarkers("src/lib/read-cache.ts", [
  "requireMobilePersistenceScope",
  "ageMs",
  "cachedAt",
  'status: "stale"',
])
checkMarkers("src/hooks/use-mobile-form-draft.ts", [
  "requireMobilePersistenceScope",
  "MobileFormDraftMetadata",
  "ageMs",
  "updatedAt",
])

const runtimeProvider = read("src/runtime/mobile-runtime-provider.tsx")
if (runtimeProvider.includes("resumePausedMutations")) {
  failures.push(
    "src/runtime/mobile-runtime-provider.tsx must not replay paused commands after reconnect"
  )
}

for (const file of sourceFiles(join(MOBILE_DIR, "src"))) {
  const source = readFileSync(file, "utf8")
  if (source.includes(".toSorted(")) {
    failures.push(
      `${file.replace(`${MOBILE_DIR}/`, "")} uses Array.prototype.toSorted, which is unavailable in the supported Hermes runtime`
    )
  }
}

if (failures.length > 0) {
  console.error("Mobile runtime contract failed:\n")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Mobile runtime contract passed.")

function checkMarkers(file, markers) {
  const source = read(file)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${file} is missing ${marker}`)
  }
}

function read(file) {
  return readFileSync(join(MOBILE_DIR, file), "utf8")
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(absolutePath)
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [absolutePath] : []
  })
}
