import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const plugin = require("./with-fully-drawn-marker.cjs")
// Expo SDK 54 prebuild output (with the splash-screen block), as generated.
const template = readFileSync(
  join(import.meta.dir, "__fixtures__/expo-sdk54-MainActivity.kt"),
  "utf8"
)

test.each(["com.halaalvest.mobile", "com.halaalvest.mobile.dev"])(
  "draws the fully-drawn marker into MainActivity: %s",
  async (applicationId) => {
    const config = plugin({
      name: "test",
      slug: "test",
      android: { package: applicationId },
    })
    const source = template.replace(/^package .*$/m, `package ${applicationId}`)
    const result = await config.mods.android.mainActivity({
      ...config,
      modResults: { contents: source, language: "kt", path: "MainActivity.kt" },
      modRequest: { platform: "android", modName: "mainActivity" },
    })
    const contents: string = result.modResults.contents

    expect(contents).toStartWith(
      `package ${applicationId}\nimport com.facebook.react.bridge.ReactMarker\n`
    )
    expect(contents).toContain(
      "import com.facebook.react.bridge.ReactMarkerConstants"
    )
    expect(contents).toContain("ReactMarkerConstants.CONTENT_APPEARED")
    expect(contents).toContain("reportFullyDrawn()")
    expect(contents).toContain("unregisterFullyDrawnMarker()")
    expect(contents).toMatch(
      /super\.onCreate\(null\)\n\s+ReactMarker\.addListener\(fullyDrawnMarker\)/
    )
    expect(contents).toContain("override fun onDestroy()")
    // Prebuild re-runs mods on an existing android/ tree: stay idempotent.
    expect(plugin.addFullyDrawnMarker(contents)).toBe(contents)
  }
)

test("fails loudly when the template changes shape", () => {
  expect(() =>
    plugin.addFullyDrawnMarker("package x\nclass Other : Activity() {\n}\n")
  ).toThrow("unexpected shape")
})
