import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import {
  androidArtifactUrl,
  inspectEasAndroidArtifact,
} from "./eas-android-artifact-preflight"

const build = {
  artifacts: { buildUrl: "https://expo.dev/artifacts/candidate.aab" },
}
const expected = {
  apiUrl: "https://api.halaalvest.com",
  dashboardUrl: "https://app.halaalvest.com",
  legalOrigin: "https://halaalvest.com",
}

describe("exact Android EAS artifact preflight", () => {
  test("rejects missing or local artifact URLs", () => {
    expect(() => androidArtifactUrl({})).toThrow("no Android AAB")
    expect(() =>
      androidArtifactUrl({ artifacts: { buildUrl: "http://localhost/aab" } })
    ).toThrow("public HTTPS")
  })

  test("downloads the exact AAB for inspection and records its digest", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-aab-test-"))
    const bytes = Buffer.from("synthetic-aab-bytes")
    const artifactPath = path.join(directory, "download.aab")
    try {
      const digest = await inspectEasAndroidArtifact(
        build,
        { ...expected, path: artifactPath },
        (async (url) => {
          expect(url).toBe(build.artifacts.buildUrl)
          return new Response(bytes)
        }) as typeof fetch,
        async (path, origins) => {
          expect(await readFile(path)).toEqual(bytes)
          expect(origins).toEqual({
            api: expected.apiUrl,
            dashboard: expected.dashboardUrl,
            legal: expected.legalOrigin,
          })
        }
      )
      expect(digest).toBe(createHash("sha256").update(bytes).digest("hex"))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test("follows a public HTTPS artifact redirect only after checking its URL", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-aab-test-"))
    const seen: string[] = []
    try {
      await inspectEasAndroidArtifact(
        build,
        { ...expected, path: path.join(directory, "download.aab") },
        (async (url, options) => {
          expect(options?.redirect).toBe("manual")
          seen.push(String(url))
          return seen.length === 1
            ? new Response(null, {
                status: 302,
                headers: { location: "https://storage.expo.dev/release.aab" },
              })
            : new Response("candidate")
        }) as typeof fetch,
        async () => {}
      )
      expect(seen).toEqual([
        build.artifacts.buildUrl,
        "https://storage.expo.dev/release.aab",
      ])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test("rejects a redirect to an insecure or local artifact host", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-aab-test-"))
    let requests = 0
    try {
      await expect(
        inspectEasAndroidArtifact(
          build,
          { ...expected, path: path.join(directory, "download.aab") },
          (async () => {
            requests++
            return new Response(null, {
              status: 302,
              headers: { location: "http://127.0.0.1/private.aab" },
            })
          }) as typeof fetch
        )
      ).rejects.toThrow("could not be downloaded")
      expect(requests).toBe(1)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test("stops before submission when the downloaded AAB fails inspection", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-aab-test-"))
    try {
      await expect(
        inspectEasAndroidArtifact(
          build,
          { ...expected, path: path.join(directory, "download.aab") },
          (async () =>
            new Response(Buffer.from("invalid-aab"))) as typeof fetch,
          async () => {
            throw new Error("invalid-origin")
          }
        )
      ).rejects.toThrow("invalid-origin")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test("rejects an oversized artifact before reading its body", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-aab-test-"))
    try {
      await expect(
        inspectEasAndroidArtifact(
          build,
          { ...expected, path: path.join(directory, "download.aab") },
          (async () =>
            new Response("small", {
              headers: { "content-length": "180000001" },
            })) as typeof fetch
        )
      ).rejects.toThrow("could not be downloaded")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
