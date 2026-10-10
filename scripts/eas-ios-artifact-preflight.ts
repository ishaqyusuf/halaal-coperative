import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { MOBILE_STORE_APP_VERSION } from "../apps/mobile/release-version"
import { approvedIosReleaseIdentity } from "../packages/domain/src/modules/ios-release-identity"
import { publicArtifactUrl } from "./eas-android-artifact-preflight"

const maxArtifactBytes = 350_000_000
const projectId = "3fb3e5e2-bd84-4308-8739-e9f4436d0da9"
const appOwnedPrivacyTypes = [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypePhoneNumber",
  "NSPrivacyCollectedDataTypePhysicalAddress",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeDeviceID",
  "NSPrivacyCollectedDataTypeOtherFinancialInfo",
  "NSPrivacyCollectedDataTypePurchaseHistory",
  "NSPrivacyCollectedDataTypeCustomerSupport",
  "NSPrivacyCollectedDataTypeOtherUserContent",
]

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function iosArtifactUrl(buildValue: unknown) {
  const build = record(buildValue)
  const artifacts = record(build?.artifacts)
  if (typeof artifacts?.buildUrl !== "string")
    throw new Error("Selected EAS build has no iOS IPA artifact URL.")
  return publicArtifactUrl(artifacts.buildUrl)
}

function archiveEntries(path: string) {
  try {
    return execFileSync("zipinfo", ["-1", path], {
      encoding: "utf8",
      maxBuffer: 8_000_000,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .filter(Boolean)
  } catch {
    throw new Error("Selected iOS artifact is not a readable IPA archive.")
  }
}

function readPlist(path: string, entry: string) {
  let bytes: Buffer
  try {
    bytes = execFileSync("unzip", ["-p", path, entry], {
      maxBuffer: 2_000_000,
      stdio: ["ignore", "pipe", "ignore"],
    })
    if (!bytes.length) throw new Error("empty plist")
    return JSON.parse(
      execFileSync("plutil", ["-convert", "json", "-o", "-", "-"], {
        input: bytes,
        encoding: "utf8",
        maxBuffer: 2_000_000,
        stdio: ["pipe", "pipe", "ignore"],
      })
    ) as unknown
  } catch {
    throw new Error(`Selected iOS IPA has no readable ${entry}.`)
  }
}

export function inspectIosBundleMetadata(
  input: { info: unknown; expo: unknown; privacy: unknown },
  expectedBundleIdentifier = approvedIosReleaseIdentity().bundleIdentifier
) {
  const info = record(input.info)
  const expo = record(input.expo)
  const privacy = record(input.privacy)
  const collected = Array.isArray(privacy?.NSPrivacyCollectedDataTypes)
    ? privacy.NSPrivacyCollectedDataTypes
    : []
  const declaredTypes = new Set(
    collected
      .map(record)
      .map((entry) => entry?.NSPrivacyCollectedDataType)
      .filter((value): value is string => typeof value === "string")
  )
  const validPrivacyTypes = collected
    .map(record)
    .filter(
      (entry) =>
        entry &&
        entry.NSPrivacyCollectedDataTypeLinked === true &&
        entry.NSPrivacyCollectedDataTypeTracking === false &&
        Array.isArray(entry.NSPrivacyCollectedDataTypePurposes) &&
        entry.NSPrivacyCollectedDataTypePurposes.includes(
          "NSPrivacyCollectedDataTypePurposeAppFunctionality"
        )
    )
    .map((entry) => entry?.NSPrivacyCollectedDataType)
  const completeTypes = new Set(validPrivacyTypes)
  const mismatches = [
    ...(info?.CFBundleIdentifier === expectedBundleIdentifier
      ? []
      : ["bundle-identifier"]),
    ...(info?.CFBundleDisplayName === "HalaalVest" ? [] : ["display-name"]),
    ...(info?.CFBundleShortVersionString === MOBILE_STORE_APP_VERSION
      ? []
      : ["app-version"]),
    ...(info?.CFBundlePackageType === "APPL" ? [] : ["package-type"]),
    ...(expo?.EXUpdatesURL === `https://u.expo.dev/${projectId}`
      ? []
      : ["update-url"]),
    ...(expo?.EXUpdatesRuntimeVersion === MOBILE_STORE_APP_VERSION
      ? []
      : ["update-runtime"]),
    ...(privacy?.NSPrivacyTracking === false ? [] : ["privacy-tracking"]),
    ...appOwnedPrivacyTypes
      .filter((type) => !declaredTypes.has(type))
      .map(() => "privacy-data-type"),
    ...appOwnedPrivacyTypes
      .filter((type) => declaredTypes.has(type) && !completeTypes.has(type))
      .map(() => "privacy-data-purpose"),
  ]
  return { matches: mismatches.length === 0, mismatches }
}

export async function inspectIosIpa(path: string) {
  const entries = archiveEntries(path)
  const rootInfo = entries.filter((entry) =>
    /^Payload\/[^/]+\.app\/Info\.plist$/.test(entry)
  )
  if (rootInfo.length !== 1)
    throw new Error("Selected iOS IPA must contain one root app Info.plist.")
  const appRoot = rootInfo[0].slice(0, -"Info.plist".length)
  for (const name of ["Expo.plist", "PrivacyInfo.xcprivacy"]) {
    if (!entries.includes(`${appRoot}${name}`))
      throw new Error(`Selected iOS IPA is missing root app ${name}.`)
  }
  const metadata = inspectIosBundleMetadata({
    info: readPlist(path, rootInfo[0]),
    expo: readPlist(path, `${appRoot}Expo.plist`),
    privacy: readPlist(path, `${appRoot}PrivacyInfo.xcprivacy`),
  })
  if (!metadata.matches)
    throw new Error(
      `Selected iOS IPA failed identity/version/privacy inspection: ${[...new Set(metadata.mismatches)].join(", ")}`
    )
}

export async function inspectEasIosArtifact(
  buildValue: unknown,
  path: string,
  fetchArtifact: typeof fetch = fetch,
  inspectArtifact: typeof inspectIosIpa = inspectIosIpa
) {
  let url = iosArtifactUrl(buildValue)
  let response: Response | undefined
  const signal = AbortSignal.timeout(300_000)
  try {
    for (let redirects = 0; redirects <= 5; redirects++) {
      response = await fetchArtifact(url, { signal, redirect: "manual" })
      if (![301, 302, 303, 307, 308].includes(response.status)) break
      const location = response.headers.get("location")
      if (!location || redirects === 5) throw new Error("Invalid redirect")
      url = publicArtifactUrl(location, url)
      await response.body?.cancel()
    }
  } catch {
    throw new Error("Selected iOS IPA could not be downloaded for inspection.")
  }
  const declaredLength = Number(response?.headers.get("content-length"))
  if (
    !response?.ok ||
    !response.body ||
    (Number.isFinite(declaredLength) && declaredLength > maxArtifactBytes)
  )
    throw new Error("Selected iOS IPA could not be downloaded for inspection.")
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    const reader = response.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxArtifactBytes) {
        await reader.cancel()
        throw new Error("Artifact size limit exceeded")
      }
      chunks.push(value)
    }
  } catch {
    throw new Error("Selected iOS IPA could not be downloaded for inspection.")
  }
  if (!total) throw new Error("Selected iOS IPA is empty.")
  const bytes = Buffer.concat(chunks, total)
  await writeFile(path, bytes, { mode: 0o600 })
  await inspectArtifact(path)
  return createHash("sha256").update(bytes).digest("hex")
}

if (import.meta.main) {
  const [candidate] = process.argv.slice(2)
  if (!candidate || !candidate.endsWith(".ipa"))
    throw new Error(
      "Usage: bun scripts/eas-ios-artifact-preflight.ts <candidate.ipa>"
    )
  const path = resolve(candidate)
  if (!(await stat(path)).isFile())
    throw new Error("Expected a local IPA file.")
  await inspectIosIpa(path)
  console.log(
    "iOS IPA identity, version and app-owned privacy manifest check passed."
  )
}
