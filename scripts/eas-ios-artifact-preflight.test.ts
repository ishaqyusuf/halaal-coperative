import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { MOBILE_STORE_APP_VERSION } from "../apps/mobile/release-version"
import {
  inspectEasIosArtifact,
  inspectIosBundleMetadata,
  iosArtifactUrl,
} from "./eas-ios-artifact-preflight"

const projectId = "3fb3e5e2-bd84-4308-8739-e9f4436d0da9"
const privacyTypes = [
  "Name",
  "EmailAddress",
  "PhoneNumber",
  "PhysicalAddress",
  "UserID",
  "DeviceID",
  "OtherFinancialInfo",
  "PurchaseHistory",
  "CustomerSupport",
  "OtherUserContent",
].map((name) => `NSPrivacyCollectedDataType${name}`)
const validMetadata = {
  info: {
    CFBundleIdentifier: "com.example.halaalvest",
    CFBundleDisplayName: "HalaalVest",
    CFBundleShortVersionString: MOBILE_STORE_APP_VERSION,
    CFBundlePackageType: "APPL",
  },
  expo: {
    EXUpdatesRuntimeVersion: MOBILE_STORE_APP_VERSION,
    EXUpdatesURL: `https://u.expo.dev/${projectId}`,
  },
  privacy: {
    NSPrivacyTracking: false,
    NSPrivacyCollectedDataTypes: privacyTypes.map((type) => ({
      NSPrivacyCollectedDataType: type,
      NSPrivacyCollectedDataTypeLinked: true,
      NSPrivacyCollectedDataTypeTracking: false,
      NSPrivacyCollectedDataTypePurposes: [
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
      ],
    })),
  },
}

const inspectMetadata = (
  input: Parameters<typeof inspectIosBundleMetadata>[0]
) => inspectIosBundleMetadata(input, "com.example.halaalvest")

describe("exact iOS IPA preflight", () => {
  test("requires a public HTTPS EAS artifact URL", () => {
    expect(() => iosArtifactUrl({})).toThrow("no iOS IPA")
    expect(() =>
      iosArtifactUrl({ artifacts: { buildUrl: "http://localhost/a.ipa" } })
    ).toThrow("public HTTPS")
  })

  test("uses the approved Organization bundle for the real candidate path", () => {
    const organizationMetadata = {
      ...validMetadata,
      info: {
        ...validMetadata.info,
        CFBundleIdentifier: "com.halaalvest.mobile",
      },
    }
    expect(inspectIosBundleMetadata(organizationMetadata)).toEqual({
      matches: true,
      mismatches: [],
    })
    expect(inspectIosBundleMetadata(validMetadata).mismatches).toContain(
      "bundle-identifier"
    )
  })

  test("rejects wrong bundle identity and incomplete privacy data", () => {
    expect(inspectMetadata(validMetadata)).toEqual({
      matches: true,
      mismatches: [],
    })
    expect(
      inspectMetadata({
        ...validMetadata,
        info: { ...validMetadata.info, CFBundleIdentifier: "com.other.app" },
        privacy: {
          ...validMetadata.privacy,
          NSPrivacyCollectedDataTypes: [],
        },
      }).mismatches
    ).toContain("bundle-identifier")
    expect(
      inspectMetadata({
        ...validMetadata,
        expo: { EXUpdatesURL: "https://u.expo.dev/other" },
      }).mismatches
    ).toContain("update-url")
    expect(
      inspectMetadata({
        ...validMetadata,
        info: {
          ...validMetadata.info,
          CFBundleShortVersionString: "0.2.0",
        },
        expo: {
          ...validMetadata.expo,
          EXUpdatesRuntimeVersion: "0.2.0",
        },
      }).mismatches
    ).toEqual(["app-version", "update-runtime"])
    expect(
      inspectMetadata({
        ...validMetadata,
        privacy: {
          ...validMetadata.privacy,
          NSPrivacyCollectedDataTypes:
            validMetadata.privacy.NSPrivacyCollectedDataTypes.map((entry) => ({
              ...entry,
              NSPrivacyCollectedDataTypeLinked: false,
            })),
        },
      }).mismatches
    ).toContain("privacy-data-purpose")
  })

  test("downloads the selected IPA, checks it, and records its digest", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-ipa-test-"))
    const artifact = path.join(directory, "candidate.ipa")
    const bytes = Buffer.from("synthetic-ipa")
    const build = {
      artifacts: { buildUrl: "https://expo.dev/artifacts/candidate.ipa" },
    }
    try {
      const digest = await inspectEasIosArtifact(
        build,
        artifact,
        (async (url) => {
          expect(url).toBe(build.artifacts.buildUrl)
          return new Response(bytes)
        }) as typeof fetch,
        async (path) => {
          expect(await readFile(path)).toEqual(bytes)
        }
      )
      expect(digest).toBe(createHash("sha256").update(bytes).digest("hex"))
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  test("refuses an artifact redirect to a private destination", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "halaalvest-ipa-test-"))
    let requests = 0
    try {
      await expect(
        inspectEasIosArtifact(
          { artifacts: { buildUrl: "https://expo.dev/artifacts/a.ipa" } },
          path.join(directory, "candidate.ipa"),
          (async () => {
            requests++
            return new Response(null, {
              status: 302,
              headers: { location: "http://127.0.0.1/a.ipa" },
            })
          }) as typeof fetch
        )
      ).rejects.toThrow("could not be downloaded")
      expect(requests).toBe(1)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
