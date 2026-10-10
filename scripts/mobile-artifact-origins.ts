import { execFileSync } from "node:child_process"
import { stat } from "node:fs/promises"
import { resolve } from "node:path"
import { MOBILE_STORE_APP_VERSION } from "../apps/mobile/release-version"

const androidBundleEntry = "base/assets/index.android.bundle"
const androidConfigEntry = "base/assets/app.config"
const expoProjectId = "3fb3e5e2-bd84-4308-8739-e9f4436d0da9"
const urlPattern = /https?:\/\/(?:\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::\d+)?/gi

function releaseOrigin(value: string) {
  const url = new URL(value)
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
  if (
    url.protocol !== "https:" ||
    url.origin !== value ||
    url.username ||
    url.password ||
    /(?:^|\.)(?:invalid|test|example|localhost|local|internal)$/.test(
      hostname
    ) ||
    /(?:^|\.)example\.(?:com|net|org)$/.test(hostname) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname.startsWith("[")
  ) {
    throw new Error("Expected release URLs must be public HTTPS origins.")
  }
  return url.origin.toLowerCase()
}

export function inspectBundleOrigins(
  bytes: Uint8Array,
  expected: { api: string; dashboard: string; legal: string }
) {
  const text = Buffer.from(bytes).toString("latin1")
  const origins = new Set<string>()
  for (const match of text.matchAll(urlPattern)) {
    try {
      origins.add(new URL(match[0]).origin.toLowerCase())
    } catch {
      // Ignore malformed binary-adjacent text.
    }
  }
  const observed = [...origins].sort()
  const missing = Object.values(expected)
    .map(releaseOrigin)
    .filter((value) => !origins.has(value))
  const reserved = observed.filter((origin) => {
    const hostname = new URL(origin).hostname
    // Bundled SDK documentation may contain example/test/localhost URLs.
    // The validation build's deliberately unreachable .invalid hosts are
    // release blockers even if expected origins also appear in the bundle.
    return /(?:^|\.)invalid$/.test(hostname)
  })
  return {
    observed,
    missing,
    reserved,
    ready: !missing.length && !reserved.length,
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function inspectAndroidAppConfig(value: unknown) {
  const config = record(value)
  const android = record(config?.android)
  const extra = record(config?.extra)
  const eas = record(extra?.eas)
  const updates = record(config?.updates)
  const mismatches = [
    ...(config?.name === "HalaalVest" ? [] : ["app-name"]),
    ...(config?.version === MOBILE_STORE_APP_VERSION ? [] : ["app-version"]),
    ...(record(config?.runtimeVersion)?.policy === "fingerprint"
      ? []
      : ["update-runtime"]),
    ...(android?.package === "com.halaalvest.mobile" ? [] : ["package"]),
    ...(extra?.appVariant === "production" ? [] : ["app-variant"]),
    ...(eas?.projectId === expoProjectId ? [] : ["expo-project"]),
    ...(updates?.url === `https://u.expo.dev/${expoProjectId}`
      ? []
      : ["update-url"]),
  ]
  return { matches: mismatches.length === 0, mismatches }
}

async function readAabEntry(path: string, entry: string, maxBytes: number) {
  let bundle: Buffer
  try {
    bundle = execFileSync("unzip", ["-p", path, entry], {
      encoding: "buffer",
      maxBuffer: maxBytes,
      stdio: ["ignore", "pipe", "ignore"],
    })
  } catch {
    throw new Error(`Android AAB does not contain a readable ${entry}.`)
  }
  if (bundle.byteLength === 0 || bundle.byteLength > maxBytes)
    throw new Error(`Android AAB does not contain a readable ${entry}.`)
  return new Uint8Array(bundle)
}

export function readAndroidBundleFromAab(path: string) {
  return readAabEntry(path, androidBundleEntry, 64_000_000)
}

export async function readAndroidConfigFromAab(path: string) {
  const bytes = await readAabEntry(path, androidConfigEntry, 1_000_000)
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8")) as unknown
  } catch {
    throw new Error("Android AAB app config is not valid JSON.")
  }
}

if (import.meta.main) {
  const [artifactPath, api, dashboard, legal] = process.argv.slice(2)
  if (!artifactPath || !api || !dashboard || !legal) {
    throw new Error(
      "Usage: bun scripts/mobile-artifact-origins.ts <candidate.aab> <api-origin> <dashboard-origin> <legal-origin>"
    )
  }
  const path = resolve(artifactPath)
  if (!path.endsWith(".aab")) throw new Error("Expected an Android AAB path.")
  if (!(await stat(path)).isFile())
    throw new Error("Expected a local AAB file.")
  const result = inspectBundleOrigins(await readAndroidBundleFromAab(path), {
    api,
    dashboard,
    legal,
  })
  const identity = inspectAndroidAppConfig(await readAndroidConfigFromAab(path))
  console.log(
    JSON.stringify({
      artifactCheckPassed: result.ready && identity.matches,
      missingExpectedOrigins: result.missing,
      invalidOrigins: result.reserved,
      observedOriginCount: result.observed.length,
      identityMismatches: identity.mismatches,
    })
  )
  if (!result.ready || !identity.matches) process.exitCode = 1
}
