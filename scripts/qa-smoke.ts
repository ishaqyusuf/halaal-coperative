#!/usr/bin/env bun

import { spawnSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  localOrigins,
  portlessCertificateAuthority,
  staticProbePath,
} from "./lib/local-dev-targets"

export type SmokeConfig = {
  qaDomain: string
  profileLabel: string
  cooperative?: string
  // Optional QA admin of a cooperative still in One Path setup.
  setupProfileLabel?: string
  setupCooperative?: string
  // Optional QA member and staff of the member-ready harness cooperative
  // (scenario standard-ready): member requests, receipts and Record payment.
  readyMemberProfileLabel?: string
  readyStaffProfileLabel?: string
  readyCooperative?: string
  origin: string
}
export type SmokeCheck = {
  name: string
  status: "pass" | "fail"
  ms: number
  detail: string
}
export type SmokeResult = {
  checks: SmokeCheck[]
  blocked: string[]
  consoleErrors: number
}

export const root = resolve(import.meta.dir, "..")
export const defaultConfigFile = ".scratch/qa-smoke/config.json"
export const usage = `Usage: bun run qa:smoke [--config ${defaultConfigFile}] [--headed]
       bun run qa:smoke install-browser
Drives the local dashboard (${localOrigins.dashboard}) in headless Chromium:
QA sign-in through /auth/qa, the members, contributions and charges pages, and
Quick Fill on the member, contribution-plan and charge forms, and the
/getting-started gate (plus the One Path rail when setupProfileLabel is set).
With readyMemberProfileLabel / readyStaffProfileLabel (the member-ready QA
cooperative), also member procurement, project financing and foodstuff
requests up to the confirm, the member receipt form and the charge Record
payment dialog.
Uses existing seeded QA data only. Writes are blocked; nothing is submitted.
Copy scripts/fixtures/qa-smoke.example.json to the config path first.`

export function parseSmokeArgs(args: string[]) {
  const options = { configFile: defaultConfigFile, headed: false, help: false }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--config") {
      const value = args[++index]
      if (!value || value.startsWith("-"))
        throw new Error("--config needs a path")
      options.configFile = value
    } else if (arg === "--headed") options.headed = true
    else if (arg === "--help" || arg === "-h") options.help = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

export function validateSmokeConfig(raw: unknown): SmokeConfig {
  const value = raw as Partial<SmokeConfig> | null
  if (
    !value ||
    typeof value.qaDomain !== "string" ||
    !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(value.qaDomain)
  )
    throw new Error(
      "Configure qaDomain: an existing QA Domain such as ishaq.qa.test."
    )
  if (typeof value.profileLabel !== "string" || !value.profileLabel.trim())
    throw new Error(
      "Configure profileLabel: the QA profile name shown on /login."
    )
  for (const key of [
    "cooperative",
    "setupProfileLabel",
    "setupCooperative",
    "readyMemberProfileLabel",
    "readyStaffProfileLabel",
    "readyCooperative",
  ] as const)
    if (value[key] !== undefined && typeof value[key] !== "string")
      throw new Error(`${key} must be a string when set.`)
  const origin = value.origin ?? localOrigins.dashboard
  if (origin !== localOrigins.dashboard)
    throw new Error(
      `qa:smoke targets the local dashboard only (${localOrigins.dashboard}).`
    )
  return {
    qaDomain: value.qaDomain,
    profileLabel: value.profileLabel.trim(),
    ...(value.cooperative ? { cooperative: value.cooperative } : {}),
    ...(value.setupProfileLabel?.trim()
      ? { setupProfileLabel: value.setupProfileLabel.trim() }
      : {}),
    ...(value.setupCooperative
      ? { setupCooperative: value.setupCooperative }
      : {}),
    ...(value.readyMemberProfileLabel?.trim()
      ? { readyMemberProfileLabel: value.readyMemberProfileLabel.trim() }
      : {}),
    ...(value.readyStaffProfileLabel?.trim()
      ? { readyStaffProfileLabel: value.readyStaffProfileLabel.trim() }
      : {}),
    ...(value.readyCooperative
      ? { readyCooperative: value.readyCooperative }
      : {}),
    origin,
  }
}

export function summarizeSmoke(result: SmokeResult) {
  const failed = result.checks.filter((check) => check.status === "fail")
  // A blocked tRPC write means a journey tried to mutate data; that fails the run.
  const blockedWrites = result.blocked.filter((entry) =>
    entry.includes("/api/trpc")
  )
  return {
    passed:
      failed.length === 0 &&
      blockedWrites.length === 0 &&
      result.checks.length > 0,
    failed: failed.map((check) => check.name),
    blockedWrites,
  }
}

function git(args: string[]) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    timeout: 10000,
  })
  return result.status === 0 ? result.stdout.trim() : ""
}

async function preflight() {
  const ca = portlessCertificateAuthority()
  try {
    const response = await fetch(
      `${localOrigins.dashboard}${staticProbePath}`,
      {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        ...(ca ? { tls: { ca } } : {}),
      } as RequestInit
    )
    return response.status === 200
  } catch {
    return false
  }
}

// Browsers live in this checkout's gitignored scratch cache (as in EwaTrade),
// so Playwright upgrades never fight other projects over a shared cache.
export function browserEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return {
    ...env,
    PLAYWRIGHT_BROWSERS_PATH:
      env.PLAYWRIGHT_BROWSERS_PATH ||
      resolve(root, ".scratch/qa-smoke/playwright"),
  }
}

function installBrowser() {
  const result = spawnSync(
    "node",
    [resolve(root, "node_modules/playwright/cli.js"), "install", "chromium"],
    { cwd: root, env: browserEnvironment(), stdio: "inherit", timeout: 600000 }
  )
  return result.status === 0 ? 0 : 1
}

export async function runSmoke(options: ReturnType<typeof parseSmokeArgs>) {
  const configPath = resolve(root, options.configFile)
  if (!existsSync(configPath))
    throw new Error(
      `Missing ${options.configFile}. Copy scripts/fixtures/qa-smoke.example.json there and set your QA Domain and profile.`
    )
  const config = validateSmokeConfig(
    JSON.parse(readFileSync(configPath, "utf8"))
  )
  if (!(await preflight()))
    throw new Error(
      `${localOrigins.dashboard} is not serving. Start it with bun run dev:dashboard, then bun run qa:doctor --services dashboard --require-qa.`
    )
  const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`
  const directory = resolve(root, ".scratch/qa-smoke")
  const artifacts = resolve(directory, "artifacts", id)
  mkdirSync(artifacts, { recursive: true })
  const started = Date.now()
  // Stream the driver's step progress live and keep its stderr for diagnosis.
  const driver = Bun.spawn(
    [
      "node",
      resolve(root, "scripts/qa-web-smoke.mjs"),
      configPath,
      artifacts,
      ...(options.headed ? ["--headed"] : []),
    ],
    {
      cwd: root,
      env: browserEnvironment(),
      stdin: "ignore",
      stdout: "pipe",
      stderr: "pipe",
    }
  )
  const timeout = setTimeout(() => driver.kill(), 300000)
  let stderr = ""
  const decoder = new TextDecoder()
  const streamed = (async () => {
    const reader = driver.stderr.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      stderr += text
      process.stderr.write(text)
    }
  })()
  const stdout = await new Response(driver.stdout).text()
  await streamed
  const status = await driver.exited
  clearTimeout(timeout)
  const line = stdout
    .split("\n")
    .reverse()
    .find((entry) => entry.startsWith("{"))
  if (status !== 0 || !line)
    throw new Error(
      /Executable doesn't exist|browserType\.launch/.test(stderr)
        ? "Chromium is not installed for Playwright. Run bun run qa:smoke:install-browser."
        : /ERR_CERT/.test(stderr)
          ? "Chromium does not trust the Portless CA. Run portless trust."
          : driver.signalCode
            ? "The smoke driver timed out after 5 minutes; see the step progress above."
            : "The smoke driver failed before reporting; see the output above."
    )
  const result = JSON.parse(line) as SmokeResult
  const summary = summarizeSmoke(result)
  const receipt = {
    id,
    sha: git(["rev-parse", "HEAD"]),
    changedPaths: git(["status", "--porcelain"]).split("\n").filter(Boolean)
      .length,
    target: config.origin,
    qaDomain: config.qaDomain,
    profileLabel: config.profileLabel,
    status: summary.passed ? "passed" : "failed",
    seconds: Math.round((Date.now() - started) / 100) / 10,
    ...result,
    artifacts,
  }
  const receiptFile = resolve(directory, `receipt-${id}.json`)
  writeFileSync(receiptFile, `${JSON.stringify(receipt, null, 2)}\n`, {
    mode: 0o600,
  })
  for (const check of result.checks)
    console.log(
      `${check.status.toUpperCase()} ${check.name} (${(check.ms / 1000).toFixed(1)}s): ${check.detail}`
    )
  if (result.blocked.length)
    console.log(
      `Blocked ${result.blocked.length} non-read request(s): ${[...new Set(result.blocked)].join(", ")}`
    )
  console.log(
    `Console errors: ${result.consoleErrors}. Receipt: ${receiptFile}`
  )
  if (summary.blockedWrites.length)
    console.error(
      "A journey attempted a tRPC write; treat this as a smoke failure."
    )
  return summary.passed ? 0 : 1
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2)
    if (args[0] === "install-browser" && args.length === 1)
      process.exitCode = installBrowser()
    else {
      const options = parseSmokeArgs(args)
      if (options.help) console.log(usage)
      else process.exitCode = await runSmoke(options)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "qa:smoke failed.")
    process.exitCode = 1
  }
}
