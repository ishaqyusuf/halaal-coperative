import { spawnSync } from "node:child_process"
import { homedir } from "node:os"
import { join } from "node:path"

export const DEV_PACKAGE = "com.halaalvest.mobile.dev"
export const DEV_APP_SCHEME = "halaalvest-dev"
export const DEV_CLIENT_SCHEME = "exp+halaalvest"

/** @param {string} output */
export function parseAdbDevicesOutput(output) {
  return output
    .split("\n")
    .slice(1)
    .map((line) => {
      const [serial, state, ...details] = line.trim().split(/\s+/)
      if (!serial || !state) return null
      return { details: details.join(" "), serial, state }
    })
    .filter((device) => device !== null)
}

/**
 * @param {{ serial: string, state: string }[]} devices
 * @param {string | undefined} requestedSerial
 */
export function selectAndroidDevice(devices, requestedSerial) {
  const online = devices.filter((device) => device.state === "device")
  if (requestedSerial) {
    const selected = online.find((device) => device.serial === requestedSerial)
    if (!selected)
      throw new Error(
        `Android device ${requestedSerial} is not online. Online devices: ${formatDevices(online)}.`
      )
    return selected
  }
  if (online.length === 0)
    throw new Error(
      "No online Android device. Start an emulator or connect a device."
    )
  if (online.length > 1)
    throw new Error(
      `More than one Android device is online (${formatDevices(online)}). Pass --device <serial> so another session's device is never changed.`
    )
  return /** @type {{ serial: string, state: string }} */ (online[0])
}

/**
 * @param {string[]} argv
 * @param {number} index
 * @param {string} option
 */
export function requiredValue(argv, index, option) {
  const value = argv[index]?.trim()
  if (!value || value.startsWith("--"))
    throw new Error(`${option} requires a value.`)
  return value
}

/** @param {string} value @param {string} option */
export function parsePort(value, option) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new Error(`${option} must be an integer between 1 and 65535.`)
  return port
}

export function resolveAdbPath(env = process.env) {
  if (env.ANDROID_ADB_PATH?.trim()) return env.ANDROID_ADB_PATH.trim()
  if (env.ADB_PATH?.trim()) return env.ADB_PATH.trim()
  const sdkRoot =
    env.ANDROID_HOME ||
    env.ANDROID_SDK_ROOT ||
    join(homedir(), "Library/Android/sdk")
  return join(sdkRoot, "platform-tools/adb")
}

/** @param {string} adbPath @param {string[]} args */
export function runAdb(adbPath, args) {
  const result = spawnSync(adbPath, args, { encoding: "utf8", timeout: 30_000 })
  if (result.status !== 0)
    throw new Error(
      `adb ${args.join(" ")} failed: ${(result.stderr || result.stdout || "unknown ADB error").trim()}`
    )
  return result.stdout
}

/** @param {{ serial: string }[]} devices */
function formatDevices(devices) {
  return devices.length > 0
    ? devices.map((device) => device.serial).join(", ")
    : "none"
}
