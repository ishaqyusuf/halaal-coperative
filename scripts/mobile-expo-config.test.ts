import { describe, expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"

const appRoot = path.resolve(import.meta.dir, "../apps/mobile")
const expoCli = createRequire(import.meta.url).resolve("expo/bin/cli", {
  paths: [appRoot],
})

function readExpoConfig(env: Record<string, string>) {
  const directory = mkdtempSync(path.join(tmpdir(), "halaalvest-expo-config-"))
  try {
    const outputPath = path.join(directory, "config.json")
    const result = Bun.spawnSync({
      cmd: [
        "sh",
        "-c",
        'node --no-experimental-strip-types "$1" config --json > "$2"',
        "sh",
        expoCli,
        outputPath,
      ],
      cwd: appRoot,
      env: { ...process.env, EXPO_NO_DOTENV: "1", ...env },
    })
    expect(result.exitCode).toBe(0)
    return JSON.parse(readFileSync(outputPath, "utf8")) as {
      name: string
      runtimeVersion: { policy: "fingerprint" }
      version: string
      icon: string
      ios: { bundleIdentifier?: string; icon: { light: string; dark: string } }
      android: {
        package?: string
        adaptiveIcon: { foregroundImage: string; backgroundColor: string }
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe("Node Expo config evaluation", () => {
  test("keeps variant app versions and fingerprint runtime policy", () => {
    const metadata = readExpoConfig({
      APP_VARIANT: "",
      EAS_BUILD_PROFILE: "",
      EXPO_PUBLIC_APP_VARIANT: "",
      EXPO_PUBLIC_API_URL: "",
      EXPO_PUBLIC_DASHBOARD_URL: "",
      EXPO_PUBLIC_LEGAL_ORIGIN: "",
    })
    expect(metadata.android?.package).toBe("com.halaalvest.mobile")

    const development = readExpoConfig({
      APP_VARIANT: "development",
      EAS_BUILD_PROFILE: "development",
    })
    expect(development).toMatchObject({
      name: "HalaalVest Dev",
      runtimeVersion: { policy: "fingerprint" },
      version: "0.2.0",
    })

    const preview = readExpoConfig({
      APP_VARIANT: "preview",
      EAS_BUILD_PROFILE: "preview",
      EXPO_PUBLIC_API_URL: "https://api.qa.halaalvest.com",
      EXPO_PUBLIC_DASHBOARD_URL: "https://app.qa.halaalvest.com",
    })
    expect(preview.ios?.bundleIdentifier).toBe("com.halaalvest.mobile.preview")
    expect(preview.android?.package).toBe("com.halaalvest.mobile.preview")

    const storeIdentity = readExpoConfig({
      APP_VARIANT: "production",
      EAS_BUILD_PROFILE: "native-validation",
      EXPO_PUBLIC_API_URL: "https://api.validation.invalid",
      EXPO_PUBLIC_DASHBOARD_URL: "https://app.validation.invalid",
    })
    expect(storeIdentity).toMatchObject({
      name: "HalaalVest",
      runtimeVersion: { policy: "fingerprint" },
      version: "1.0.0",
      android: { package: "com.halaalvest.mobile" },
    })
    expect(storeIdentity.ios?.bundleIdentifier).toBe("com.halaalvest.mobile")

    const environments = [
      { config: development, prefix: "dev-", background: "#FFF1CC" },
      { config: preview, prefix: "preview-", background: "#EAF2FF" },
      { config: storeIdentity, prefix: "", background: "#F7FAF7" },
    ]
    const launcherHashes = new Set<string>()
    const adaptiveHashes = new Set<string>()
    const darkHashes = new Set<string>()
    for (const { config, prefix, background } of environments) {
      expect(config.icon).toBe(`./assets/icons/${prefix}app-icon.png`)
      expect(config.ios.icon.light).toBe(
        `./assets/icons/${prefix}ios-light.png`
      )
      expect(config.ios.icon.dark).toBe(`./assets/icons/${prefix}ios-dark.png`)
      expect(config.android.adaptiveIcon).toMatchObject({
        foregroundImage: `./assets/icons/${prefix}adaptive-icon.png`,
        backgroundColor: background,
      })
      const assets = [
        { file: config.icon, alpha: false, hashes: launcherHashes },
        { file: config.ios.icon.light, alpha: false },
        { file: config.ios.icon.dark, alpha: false, hashes: darkHashes },
        {
          file: config.android.adaptiveIcon.foregroundImage,
          alpha: true,
          hashes: adaptiveHashes,
        },
      ]
      for (const { file, alpha, hashes } of assets) {
        const bytes = readFileSync(path.resolve(appRoot, file))
        expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a")
        expect(bytes.readUInt32BE(16)).toBe(1024)
        expect(bytes.readUInt32BE(20)).toBe(1024)
        // RGB launcher/iOS files are opaque; adaptive foregrounds retain alpha.
        expect(bytes[25]).toBe(alpha ? 6 : 2)
        hashes?.add(createHash("sha256").update(bytes).digest("hex"))
      }
    }
    expect(launcherHashes.size).toBe(3)
    expect(adaptiveHashes.size).toBe(3)
    expect(darkHashes.size).toBe(3)
  }, 15_000)
})
