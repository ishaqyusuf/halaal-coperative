import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const plugin = require("./with-launch-screen-refresh.cjs")
// Expo SDK 54 prebuild output for the dev client, as generated.
const template = readFileSync(
  join(import.meta.dir, "__fixtures__/expo-sdk54-AppDelegate.swift"),
  "utf8"
)
const projectRoot = join(import.meta.dir, "..")

function splashConfig(backgroundColor: string) {
  return {
    name: "test",
    slug: "test",
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor,
          image: "./assets/icons/splash-logo.png",
          imageWidth: 64,
        },
      ],
    ],
  }
}

async function runMod(config: ReturnType<typeof splashConfig>, source: string) {
  const withMod = plugin(config)
  const result = await withMod.mods.ios.appDelegate({
    ...withMod,
    modResults: { contents: source, language: "swift", path: "AppDelegate.swift" },
    modRequest: { platform: "ios", modName: "appDelegate", projectRoot },
  })
  return result.modResults.contents as string
}

test("drops a stale launch snapshot before React Native starts", async () => {
  const contents = await runMod(splashConfig("#F3F6F5"), template)
  const revision = plugin.launchScreenRevision(
    splashConfig("#F3F6F5"),
    projectRoot
  )

  expect(revision).toMatch(/^[0-9a-f]{16}$/)
  expect(contents).toMatch(
    new RegExp(
      `refreshLaunchScreenSnapshot\\(revision: "${revision}"\\) // @generated with-launch-screen-refresh\\n\\s+let delegate = ReactNativeDelegate\\(\\)`
    )
  )
  expect(contents).toContain('appendingPathComponent("SplashBoard"')
  expect(contents).toContain('"HalaalVestLaunchScreenRevision"')
  // Prebuild re-runs mods on an existing ios/ tree: stay idempotent.
  expect(await runMod(splashConfig("#F3F6F5"), contents)).toBe(contents)
})

test("a changed launch screen gets a new revision in place", async () => {
  const before = await runMod(splashConfig("#F3F6F5"), template)
  const after = await runMod(splashConfig("#0E0F0F"), before)
  const next = plugin.launchScreenRevision(splashConfig("#0E0F0F"), projectRoot)

  expect(next).not.toBe(
    plugin.launchScreenRevision(splashConfig("#F3F6F5"), projectRoot)
  )
  expect(after).toContain(`refreshLaunchScreenSnapshot(revision: "${next}")`)
  expect(after.match(/@generated begin with-launch-screen-refresh/g)).toHaveLength(1)
})

test("fails loudly when the template changes shape", () => {
  expect(() =>
    plugin.addLaunchScreenRefresh("class AppDelegate {}\n", "abc")
  ).toThrow("unexpected shape")
})
