import { describe, expect, test } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseAdbDevicesOutput,
  resolveAdbPath,
  selectAndroidDevice,
} from "./android-adb-cli.mjs"
import {
  buildOpenUrlArgs,
  isPackageResumed,
  parseArguments as parseOpenArguments,
  validateAppUrl,
} from "./open-android-app-url.mjs"
import {
  buildDevClientUrl,
  buildLaunchCommands,
  classifyQaCapability,
  parseArguments,
  parseReverseList,
  portlessApiPort,
  reverseMappings,
} from "./prepare-android-dev.mjs"

const devices = parseAdbDevicesOutput(
  [
    "List of devices attached",
    "emulator-5554  device product:sdk_gphone64 model:Pixel_8",
    "R5CX123  unauthorized usb:1-1",
    "emulator-5556  device product:sdk_gphone64 model:Pixel_9",
    "",
  ].join("\n")
)

describe("adb device selection", () => {
  test("parses states and refuses to guess between online devices", () => {
    expect(devices.map((d) => `${d.serial}:${d.state}`)).toEqual([
      "emulator-5554:device",
      "R5CX123:unauthorized",
      "emulator-5556:device",
    ])
    expect(() => selectAndroidDevice(devices, undefined)).toThrow(
      "Pass --device <serial>"
    )
    expect(selectAndroidDevice(devices, "emulator-5556").serial).toBe(
      "emulator-5556"
    )
    expect(() => selectAndroidDevice(devices, "R5CX123")).toThrow("not online")
    expect(selectAndroidDevice(devices.slice(0, 2), undefined).serial).toBe(
      "emulator-5554"
    )
  })

  test("resolves adb from explicit paths before the SDK default", () => {
    expect(resolveAdbPath({ ANDROID_ADB_PATH: "/opt/adb" })).toBe("/opt/adb")
    expect(resolveAdbPath({ ADB_PATH: "/opt/other-adb" })).toBe(
      "/opt/other-adb"
    )
    expect(resolveAdbPath({ ANDROID_HOME: "/sdk" })).toBe(
      "/sdk/platform-tools/adb"
    )
  })
})

describe("mobile:android:connect", () => {
  test("maps the app's API port to the Portless host port and Metro 1:1", () => {
    expect(reverseMappings({ apiHostPort: 4123, metroPort: 1443 })).toEqual([
      { device: "tcp:1442", host: "tcp:4123" },
      { device: "tcp:1443", host: "tcp:1443" },
    ])
    expect(
      parseReverseList(
        "UsbFfs tcp:1442 tcp:4123\nemulator-5554 tcp:1443 tcp:1443\n"
      )
    ).toEqual(new Set(["tcp:1442 tcp:4123", "tcp:1443 tcp:1443"]))
  })

  test("reads the API port from Portless routes, falling back cleanly", () => {
    const dir = mkdtempSync(join(tmpdir(), "portless-routes-"))
    try {
      expect(portlessApiPort(dir)).toBeUndefined()
      writeFileSync(
        join(dir, "routes.json"),
        JSON.stringify([
          { hostname: "halaalvest-dash.localhost", port: 1441, pid: 1 },
          { hostname: "api.halaalvest.localhost", port: 4123, pid: 2 },
        ])
      )
      expect(portlessApiPort(dir)).toBe(4123)
      writeFileSync(join(dir, "routes.json"), "{not json")
      expect(portlessApiPort(dir)).toBeUndefined()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("opens the Halaalvest dev client at the reversed Metro URL", () => {
    const url = buildDevClientUrl({ metroPort: 1443 })
    expect(url).toBe(
      "exp+halaalvest://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A1443"
    )
    expect(
      buildLaunchCommands({
        devClientUrl: url,
        packageName: "com.halaalvest.mobile.dev",
      })
    ).toEqual([
      ["shell", "am", "force-stop", "com.halaalvest.mobile.dev"],
      [
        "shell",
        "am",
        "start",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        url,
        "com.halaalvest.mobile.dev",
      ],
    ])
  })

  test("QA capability is classified, not assumed", () => {
    const body = (json: unknown) =>
      JSON.stringify({ result: { data: { json } } })
    expect(classifyQaCapability({ error: new Error("down") })).toBe(
      "api_unreachable"
    )
    expect(classifyQaCapability({ status: 404 })).toBe("stale_api")
    expect(
      classifyQaCapability({ status: 200, body: body({ available: true }) })
    ).toBe("ready")
    expect(
      classifyQaCapability({
        status: 200,
        body: body({ available: false, status: "upgrade-required" }),
      })
    ).toBe("client_upgrade_required")
    expect(
      classifyQaCapability({
        status: 200,
        body: body({ available: false, status: "unavailable" }),
      })
    ).toBe("qa_not_configured")
    expect(classifyQaCapability({ status: 200, body: "<html>" })).toBe(
      "api_incompatible"
    )
  })

  test("parses options with Halaalvest defaults", () => {
    expect(parseArguments([], {})).toMatchObject({
      metroPort: 1443,
      launch: true,
      packageName: "com.halaalvest.mobile.dev",
      requireQa: false,
    })
    expect(
      parseArguments(
        ["--device", "emulator-5556", "--api-host-port", "4123", "--no-launch"],
        {}
      )
    ).toMatchObject({
      device: "emulator-5556",
      apiHostPort: 4123,
      launch: false,
    })
    expect(() => parseArguments(["--metro-port", "99999"], {})).toThrow(
      "between 1 and 65535"
    )
    expect(() => parseArguments(["--reset"], {})).toThrow("Unknown option")
  })
})

describe("mobile:android:open", () => {
  test("accepts only dev-scheme app routes", () => {
    expect(
      validateAppUrl({
        expectedScheme: "halaalvest-dev",
        url: "halaalvest-dev://member/contributions?tab=history",
      })
    ).toBe("halaalvest-dev://member/contributions?tab=history")
    expect(() =>
      validateAppUrl({
        expectedScheme: "halaalvest-dev",
        url: "halaalvest://home",
      })
    ).toThrow("halaalvest-dev scheme")
    expect(() =>
      validateAppUrl({
        expectedScheme: "halaalvest-dev",
        url: "halaalvest-dev://expo-development-client/?url=x",
      })
    ).toThrow("expo-development-client")
    expect(() =>
      validateAppUrl({ expectedScheme: "halaalvest-dev", url: "not a url" })
    ).toThrow("Invalid app URL")
  })

  test("quotes the URL for the remote shell and targets the package", () => {
    const args = buildOpenUrlArgs({
      packageName: "com.halaalvest.mobile.dev",
      url: "halaalvest-dev://a?b=1&c='x'",
    })
    expect(args).toContain("'halaalvest-dev://a?b=1&c='\\''x'\\'''")
    expect(args.slice(-2)).toEqual(["-p", "com.halaalvest.mobile.dev"])
  })

  test("requires the dev app in the foreground", () => {
    const activities =
      "  topResumedActivity=ActivityRecord{1 u0 com.halaalvest.mobile.dev/.MainActivity t9}"
    expect(
      isPackageResumed({ activities, packageName: "com.halaalvest.mobile.dev" })
    ).toBe(true)
    expect(
      isPackageResumed({
        activities,
        packageName: "com.halaalvest.mobile.preview",
      })
    ).toBe(false)
  })

  test("parses --device and --url", () => {
    expect(
      parseOpenArguments(
        ["--device", "emulator-5554", "--url", "halaalvest-dev://x"],
        {}
      )
    ).toMatchObject({ device: "emulator-5554", url: "halaalvest-dev://x" })
  })
})
