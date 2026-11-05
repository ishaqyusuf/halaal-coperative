#!/usr/bin/env node

import { existsSync } from "node:fs"
import { pathToFileURL } from "node:url"
import {
  DEV_APP_SCHEME,
  DEV_PACKAGE,
  parseAdbDevicesOutput,
  requiredValue,
  resolveAdbPath,
  runAdb,
  selectAndroidDevice,
} from "./android-adb-cli.mjs"

export const usage =
  "Usage: bun run mobile:android:open --device <serial> --url halaalvest-dev://<path> [--package com.halaalvest.mobile.dev] [--scheme halaalvest-dev]"

/** @param {{ expectedScheme: string, url: string }} options */
export function validateAppUrl({ expectedScheme, url }) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`Invalid app URL: ${url}.`)
  }
  const scheme = parsed.protocol.slice(0, -1)
  if (scheme !== expectedScheme)
    throw new Error(
      `Use an app URL with the ${expectedScheme} scheme. Received ${scheme || "no scheme"}.`
    )
  if (parsed.hostname === "expo-development-client")
    throw new Error(
      "Use an app route, not the expo-development-client URL (run mobile:android:connect)."
    )
  return parsed.toString()
}

// adb shell joins arguments into one remote command line; quote the URL so
// `&` and `?` reach the activity manager intact.
/** @param {string} value */
export function quoteShellArgument(value) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

/** @param {{ packageName: string, url: string }} options */
export function buildOpenUrlArgs({ packageName, url }) {
  return [
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-c",
    "android.intent.category.BROWSABLE",
    "-d",
    quoteShellArgument(url),
    "-p",
    packageName,
  ]
}

/** @param {{ activities: string, packageName: string }} options */
export function isPackageResumed({ activities, packageName }) {
  return activities
    .split("\n")
    .some(
      (line) =>
        /(?:topResumedActivity=|mResumedActivity:|ResumedActivity:)/.test(
          line
        ) && line.includes(`${packageName}/`)
    )
}

/** @param {string[]} argv @param {NodeJS.ProcessEnv} env */
export function parseArguments(argv, env = process.env) {
  const options = {
    device: env.ANDROID_SERIAL?.trim() || undefined,
    expectedScheme: DEV_APP_SCHEME,
    packageName: DEV_PACKAGE,
    url: /** @type {string | undefined} */ (undefined),
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--device")
      options.device = requiredValue(argv, ++index, argument)
    else if (argument === "--url")
      options.url = requiredValue(argv, ++index, argument)
    else if (argument === "--package")
      options.packageName = requiredValue(argv, ++index, argument)
    else if (argument === "--scheme")
      options.expectedScheme = requiredValue(argv, ++index, argument)
    else if (argument === "--help" || argument === "-h") options.help = true
    else throw new Error(`Unknown option ${argument}.`)
  }
  return options
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2))
    if (options.help) {
      console.log(usage)
      return
    }
    if (!options.url) throw new Error("--url is required.")
    // Opening a URL changes app state, so the device is never inferred.
    if (!options.device)
      throw new Error(
        "--device is required so another session's emulator or device is never changed."
      )
    const url = validateAppUrl({
      expectedScheme: options.expectedScheme,
      url: options.url,
    })
    const adbPath = resolveAdbPath()
    if (!existsSync(adbPath))
      throw new Error(`adb was not found at ${adbPath}.`)
    const selected = selectAndroidDevice(
      parseAdbDevicesOutput(runAdb(adbPath, ["devices", "-l"])),
      options.device
    )
    const activities = runAdb(adbPath, [
      "-s",
      selected.serial,
      "shell",
      "dumpsys",
      "activity",
      "activities",
    ])
    if (!isPackageResumed({ activities, packageName: options.packageName }))
      throw new Error(
        `${options.packageName} is not in the foreground on ${selected.serial}. Run mobile:android:connect, wait for the app to load, then retry.`
      )
    runAdb(adbPath, [
      "-s",
      selected.serial,
      ...buildOpenUrlArgs({ packageName: options.packageName, url }),
    ])
    console.log(`Opened ${url} on ${selected.serial}.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main()
