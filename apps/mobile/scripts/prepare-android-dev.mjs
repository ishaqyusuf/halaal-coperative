#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"
import {
  DEV_CLIENT_SCHEME,
  DEV_PACKAGE,
  parseAdbDevicesOutput,
  parsePort,
  requiredValue,
  resolveAdbPath,
  runAdb,
  selectAndroidDevice,
} from "./android-adb-cli.mjs"

// The app defaults to API port 1442 on the Metro host (src/lib/base-url.ts) and
// Metro listens on 1443 (package.json dev). Portless may run the API elsewhere,
// so the device's 1442 is reversed to whichever host port Portless assigned.
export const DEVICE_API_PORT = 1442
export const METRO_PORT = 1443
const API_HOSTNAME = "api.halaalvest.localhost"

export const usage =
  "Usage: bun run mobile:android:connect [--device <serial>] [--api-host-port <port>] [--metro-port 1443] [--require-qa] [--no-launch] [--package com.halaalvest.mobile.dev]"

/** @param {string} [directory] */
export function portlessApiPort(directory = join(homedir(), ".portless")) {
  try {
    const routes = JSON.parse(
      readFileSync(join(directory, "routes.json"), "utf8")
    )
    const port = Array.isArray(routes)
      ? routes.find((route) => route?.hostname === API_HOSTNAME)?.port
      : undefined
    return Number.isInteger(port) ? port : undefined
  } catch {
    return undefined
  }
}

/** @param {{ apiHostPort: number, metroPort: number }} ports */
export function reverseMappings({ apiHostPort, metroPort }) {
  return [
    { device: `tcp:${DEVICE_API_PORT}`, host: `tcp:${apiHostPort}` },
    { device: `tcp:${metroPort}`, host: `tcp:${metroPort}` },
  ]
}

/** @param {string} output */
export function parseReverseList(output) {
  return new Set(
    output
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter((parts) => parts.length >= 2)
      .map((parts) => parts.slice(-2).join(" "))
  )
}

/** @param {{ metroPort: number }} options */
export function buildDevClientUrl({ metroPort }) {
  return `${DEV_CLIENT_SCHEME}://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${metroPort}`)}`
}

/** @param {{ devClientUrl: string, packageName: string }} options */
export function buildLaunchCommands({ devClientUrl, packageName }) {
  return [
    ["shell", "am", "force-stop", packageName],
    [
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      devClientUrl,
      packageName,
    ],
  ]
}

/** @param {{ body?: string, error?: unknown, status?: number }} probe */
export function classifyQaCapability({ body = "", error, status }) {
  if (error) return "api_unreachable"
  if (status === 404) return "stale_api"
  if (!status || status < 200 || status >= 300) return "api_incompatible"
  try {
    const capability = JSON.parse(body)?.result?.data?.json
    if (capability?.available === true) return "ready"
    if (capability?.status === "upgrade-required")
      return "client_upgrade_required"
    if (capability?.available === false) return "qa_not_configured"
  } catch {
    return "api_incompatible"
  }
  return "api_incompatible"
}

/** @param {string[]} argv @param {NodeJS.ProcessEnv} env */
export function parseArguments(argv, env = process.env) {
  const options = {
    apiHostPort: /** @type {number | undefined} */ (undefined),
    device: env.ANDROID_SERIAL?.trim() || undefined,
    metroPort: METRO_PORT,
    launch: true,
    packageName: DEV_PACKAGE,
    requireQa: false,
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--device")
      options.device = requiredValue(argv, ++index, argument)
    else if (argument === "--api-host-port")
      options.apiHostPort = parsePort(
        requiredValue(argv, ++index, argument),
        argument
      )
    else if (argument === "--metro-port")
      options.metroPort = parsePort(
        requiredValue(argv, ++index, argument),
        argument
      )
    else if (argument === "--package")
      options.packageName = requiredValue(argv, ++index, argument)
    else if (argument === "--require-qa") options.requireQa = true
    else if (argument === "--no-launch") options.launch = false
    else if (argument === "--help" || argument === "-h") options.help = true
    else throw new Error(`Unknown option ${argument}.`)
  }
  return options
}

/** @param {string} url */
async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) })
    return { body: await response.text(), status: response.status }
  } catch (error) {
    return { error }
  }
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2))
    if (options.help) {
      console.log(usage)
      return
    }
    const adbPath = resolveAdbPath()
    if (!existsSync(adbPath))
      throw new Error(`adb was not found at ${adbPath}.`)

    const apiHostPort =
      options.apiHostPort ?? portlessApiPort() ?? DEVICE_API_PORT
    const selected = selectAndroidDevice(
      parseAdbDevicesOutput(runAdb(adbPath, ["devices", "-l"])),
      options.device
    )
    const mappings = reverseMappings({
      apiHostPort,
      metroPort: options.metroPort,
    })
    for (const mapping of mappings)
      runAdb(adbPath, [
        "-s",
        selected.serial,
        "reverse",
        mapping.device,
        mapping.host,
      ])
    const installed = parseReverseList(
      runAdb(adbPath, ["-s", selected.serial, "reverse", "--list"])
    )
    const missing = mappings.filter(
      (mapping) => !installed.has(`${mapping.device} ${mapping.host}`)
    )
    if (missing.length)
      throw new Error(
        `adb did not keep reverse mappings: ${missing.map((m) => `${m.device}->${m.host}`).join(", ")}.`
      )

    const metroUrl = `http://127.0.0.1:${options.metroPort}/status`
    const liveUrl = `http://127.0.0.1:${apiHostPort}/live`
    const [metro, live] = await Promise.all([probe(metroUrl), probe(liveUrl)])
    const failures = []
    if (
      metro.error ||
      metro.status !== 200 ||
      !metro.body?.includes("packager-status:running")
    )
      failures.push(
        `Metro is not running on ${options.metroPort}. Start it with: bun run dev:mobile`
      )
    if (live.error || live.status !== 200)
      failures.push(
        `API liveness failed on 127.0.0.1:${apiHostPort}. Start it with: bun run dev:api`
      )

    // Opt-in only: the tRPC context resolves the request host, which can query the database.
    if (options.requireQa && failures.length === 0) {
      const input = encodeURIComponent(
        JSON.stringify({ json: { clientKind: "mobile", contractVersion: 1 } })
      )
      const state = classifyQaCapability(
        await probe(
          `http://127.0.0.1:${apiHostPort}/api/trpc/qaAccelerator.capability?input=${input}`
        )
      )
      if (state !== "ready")
        failures.push(
          {
            api_unreachable:
              "The API could not be reached for the QA capability check.",
            stale_api:
              "The API has no qaAccelerator.capability route; restart it from current source.",
            client_upgrade_required:
              "This development client's QA contract is outdated; rebuild the dev client.",
            qa_not_configured:
              "QA access is not configured on this API (QA_ACCELERATOR_SECRET, EMAIL_QA_DOMAIN_ROUTES, APP_ENV).",
            api_incompatible:
              "The API answered without the expected QA capability contract.",
          }[state]
        )
    }

    const summary = mappings.map((m) => `${m.device}->${m.host}`).join(", ")
    if (failures.length) {
      console.error("Android development connection is not ready.")
      console.error(`Device: ${selected.serial}`)
      console.error(`Reverse mappings: ${summary}`)
      for (const failure of failures) console.error(`- ${failure}`)
      process.exitCode = 1
      return
    }

    const devClientUrl = buildDevClientUrl({ metroPort: options.metroPort })
    if (options.launch)
      for (const command of buildLaunchCommands({
        devClientUrl,
        packageName: options.packageName,
      }))
        runAdb(adbPath, ["-s", selected.serial, ...command])

    console.log("Android development connection is ready.")
    console.log(`Device: ${selected.serial}`)
    console.log(`Reverse mappings: ${summary}`)
    console.log(`Metro: ${metroUrl}`)
    console.log(`API liveness (no SQL): ${liveUrl}`)
    console.log(
      options.requireQa
        ? "QA capability: ready"
        : "QA capability: not checked (add --require-qa)"
    )
    console.log(
      options.launch
        ? `Opened ${options.packageName} at ${devClientUrl}`
        : `Dev-client URL (not opened): ${devClientUrl}`
    )
  } catch (error) {
    console.error("Android development connection failed.")
    console.error(`- ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) await main()
