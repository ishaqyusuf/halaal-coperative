import { createHash } from "node:crypto"
import { writeFile } from "node:fs/promises"
import {
  inspectAndroidAppConfig,
  inspectBundleOrigins,
  readAndroidBundleFromAab,
  readAndroidConfigFromAab,
} from "./mobile-artifact-origins"

const maxArtifactBytes = 180_000_000

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function publicArtifactUrl(value: string, base?: string) {
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    throw new Error("Selected EAS build has an invalid artifact URL.")
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    hostname === "localhost" ||
    /\.(?:localhost|local|internal|invalid)$/.test(hostname) ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname.startsWith("[")
  ) {
    throw new Error("Selected EAS build artifact URL must be public HTTPS.")
  }
  return url.toString()
}

export function androidArtifactUrl(buildValue: unknown) {
  const build = record(buildValue)
  const artifacts = record(build?.artifacts)
  const value = artifacts?.buildUrl
  if (typeof value !== "string")
    throw new Error("Selected EAS build has no Android AAB artifact URL.")
  return publicArtifactUrl(value)
}

async function inspectDownloadedAab(
  path: string,
  expected: { api: string; dashboard: string; legal: string }
) {
  const origins = inspectBundleOrigins(
    await readAndroidBundleFromAab(path),
    expected
  )
  const identity = inspectAndroidAppConfig(await readAndroidConfigFromAab(path))
  if (!origins.ready || !identity.matches) {
    throw new Error(
      `Selected Android AAB failed endpoint/identity inspection: ${[
        ...origins.missing.map(() => "missing-origin"),
        ...origins.reserved.map(() => "invalid-origin"),
        ...identity.mismatches,
      ].join(", ")}`
    )
  }
}

export async function inspectEasAndroidArtifact(
  buildValue: unknown,
  input: {
    apiUrl: string
    dashboardUrl: string
    legalOrigin: string
    path: string
  },
  fetchArtifact: typeof fetch = fetch,
  inspectArtifact: typeof inspectDownloadedAab = inspectDownloadedAab
) {
  let response: Response | undefined
  let url = androidArtifactUrl(buildValue)
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
    throw new Error(
      "Selected Android AAB could not be downloaded for inspection."
    )
  }
  const declaredLength = Number(response?.headers.get("content-length"))
  if (
    !response?.ok ||
    !response.body ||
    (Number.isFinite(declaredLength) && declaredLength > maxArtifactBytes)
  ) {
    throw new Error(
      "Selected Android AAB could not be downloaded for inspection."
    )
  }
  let bytes: Buffer
  try {
    const chunks: Uint8Array[] = []
    const reader = response.body.getReader()
    let total = 0
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
    bytes = Buffer.concat(chunks, total)
  } catch {
    throw new Error(
      "Selected Android AAB could not be downloaded for inspection."
    )
  }
  if (!bytes.length || bytes.length > maxArtifactBytes)
    throw new Error("Selected Android AAB exceeds the inspection size limit.")
  await writeFile(input.path, bytes, { mode: 0o600 })

  await inspectArtifact(input.path, {
    api: new URL(input.apiUrl).origin,
    dashboard: new URL(input.dashboardUrl).origin,
    legal: new URL(input.legalOrigin).origin,
  })
  return createHash("sha256").update(bytes).digest("hex")
}
