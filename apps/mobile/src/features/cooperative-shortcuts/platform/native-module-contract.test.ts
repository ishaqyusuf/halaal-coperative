import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { SHORTCUT_ID_PATTERN } from "../model/shortcut-intent"
import { SHORTCUT_DISABLED_MESSAGE } from "../model/shortcut-policy"

const moduleDir = join(
  import.meta.dir,
  "../../../../modules/cooperative-shortcuts"
)
const kotlinDir = join(
  moduleDir,
  "android/src/main/java/expo/modules/cooperativeshortcuts"
)
const read = (path: string) => readFileSync(path, "utf8")

// Static contract until the installed-device matrix (Phase 4) runs.
describe("cooperative shortcuts native module contract", () => {
  const manifest = read(join(moduleDir, "android/src/main/AndroidManifest.xml"))
  const nativeModule = read(join(kotlinDir, "CooperativeShortcutsModule.kt"))
  const registry = read(join(kotlinDir, "CooperativeShortcutRegistry.kt"))
  const receiver = read(join(kotlinDir, "CooperativeShortcutPinReceiver.kt"))

  test("is an Android-only local Expo module named like the JS bridge", () => {
    expect(
      JSON.parse(read(join(moduleDir, "expo-module.config.json")))
    ).toEqual({
      android: {
        modules: [
          "expo.modules.cooperativeshortcuts.CooperativeShortcutsModule",
        ],
      },
      platforms: ["android"],
    })
    expect(nativeModule).toContain('Name("CooperativeShortcuts")')
  })

  test("declares only an unexported receiver and no permissions or launcher aliases", () => {
    expect(manifest).toContain('android:exported="false"')
    expect(manifest).not.toContain("uses-permission")
    expect(manifest).not.toContain("activity-alias")
    expect(manifest).not.toContain("intent-filter")
    expect(nativeModule).not.toContain("setComponentEnabledSetting")
    expect(nativeModule).not.toContain("INSTALL_SHORTCUT")
  })

  test("validates the same opaque id format as JS", () => {
    expect(registry).toContain(`Regex("${SHORTCUT_ID_PATTERN.source}")`)
    expect(receiver).toContain("isValidId(id)")
  })

  test("uses package-explicit intents and immutable callbacks", () => {
    expect(nativeModule).toContain(".setPackage(ctx.packageName)")
    expect(nativeModule).toContain("PendingIntent.FLAG_IMMUTABLE")
    expect(nativeModule).toContain("requestPinShortcut(")
  })

  test("persists deactivation before disabling and disables late approvals", () => {
    const disable = nativeModule.slice(
      nativeModule.indexOf('AsyncFunction("disable")')
    )
    expect(disable.indexOf("deactivate(")).toBeLessThan(
      disable.indexOf("disableShortcuts(")
    )
    expect(receiver).toContain("disableShortcuts(")
    expect(registry).toContain(`"${SHORTCUT_DISABLED_MESSAGE}"`)
    expect(registry).toContain(".commit()")
  })
})
