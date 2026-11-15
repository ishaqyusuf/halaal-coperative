#!/usr/bin/env bun

import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { resolve } from "node:path"

// Release-candidate gate, modelled on EwaTrade's `qa:candidate`: one
// committed, clean HEAD gets every quick source suite and a full local
// browser smoke (including the member-ready QA cooperative), and the result
// is a receipt bound to that commit. `status` checks the receipt without
// running anything, so a release step can require it.

export const root = resolve(import.meta.dir, "..")
export const receiptDirectory = ".scratch/qa-candidate"
export const smokeDirectory = ".scratch/qa-smoke"
export const defaultSmokeConfig = ".scratch/qa-smoke/candidate.json"
export const MAX_AGE_MS = 24 * 60 * 60 * 1000

// The smoke run must cover these journeys, so a narrow config cannot pass
// the gate. Names match scripts/qa-web-smoke.mjs.
export const requiredSmokeChecks = [
  "qa sign-in",
  "members page",
  "contributions page",
  "charges page",
  "member create quick fill",
  "contribution plan quick fill",
  "charge definition quick fill",
  "getting-started gate",
  "ready member sign-in",
  "member procurement request",
  "member project financing request",
  "member foodstuff request",
  "member receipt form",
  "ready staff sign-in",
  "charge record payment dialog",
] as const

export const usage = `Usage: bun run qa:candidate [--smoke-config ${defaultSmokeConfig}]
       bun run qa:candidate status
Release-candidate gate for the committed HEAD. Refuses a dirty checkout (other
work would be tested, not the candidate). Runs every test:quick suite, then
qa:smoke against the local dashboard with a config that covers the main admin
and the member-ready QA cooperative, and writes
${receiptDirectory}/candidate-<sha>.json. A passed receipt is reused for 24 hours.
"status" only reads that receipt: exit 0 when HEAD has a fresh passed one.
The local dashboard must serve this same commit (no uncommitted edits).`

export type CandidateOptions = {
  command: "candidate" | "status"
  smokeConfig: string
  help: boolean
}

export function parseCandidateArgs(args: string[]): CandidateOptions {
  const options: CandidateOptions = {
    command: "candidate",
    smokeConfig: defaultSmokeConfig,
    help: false,
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "status" && index === 0) options.command = "status"
    else if (arg === "--help" || arg === "-h") options.help = true
    else if (arg === "--smoke-config") {
      const value = args[++index]
      if (!value || value.startsWith("-"))
        throw new Error("--smoke-config needs a path")
      options.smokeConfig = value
    } else throw new Error(`Unknown argument: ${arg}`)
  }
  return options
}

export type SmokeCheck = { name: string; status: "pass" | "fail" }
export type SmokeReceipt = {
  id: string
  sha: string
  changedPaths: number
  target: string
  status: "passed" | "failed"
  checks: SmokeCheck[]
}
export type CandidateReceipt = {
  version: 1
  sha: string
  status: "passed"
  clean: true
  completedAt: string
  quick: "passed"
  smoke: { id: string; checks: number }
}

export function freshReceipt(time: string, now = Date.now()) {
  const age = now - Date.parse(time)
  return Number.isFinite(age) && age >= -60_000 && age <= MAX_AGE_MS
}

/** Why a smoke receipt cannot qualify this candidate ([] when it can). */
export function smokeReceiptProblems(raw: unknown, sha: string) {
  const receipt = raw as Partial<SmokeReceipt> | null
  const problems: string[] = []
  if (!receipt || typeof receipt !== "object") return ["no smoke receipt"]
  if (receipt.sha !== sha) problems.push("smoke ran on another commit")
  if (receipt.changedPaths !== 0)
    problems.push(
      `smoke ran with ${receipt.changedPaths ?? "unknown"} uncommitted path(s)`
    )
  if (receipt.status !== "passed") problems.push("smoke did not pass")
  const passed = new Set(
    (receipt.checks ?? [])
      .filter((check) => check.status === "pass")
      .map((check) => check.name)
  )
  const missing = requiredSmokeChecks.filter((name) => !passed.has(name))
  if (missing.length) problems.push(`smoke did not pass: ${missing.join(", ")}`)
  return problems
}

export function validCandidateReceipt(
  raw: unknown,
  sha: string,
  now = Date.now()
) {
  const receipt = raw as Partial<CandidateReceipt> | null
  return Boolean(
    receipt &&
    receipt.version === 1 &&
    receipt.sha === sha &&
    receipt.status === "passed" &&
    receipt.clean === true &&
    receipt.quick === "passed" &&
    typeof receipt.completedAt === "string" &&
    freshReceipt(receipt.completedAt, now)
  )
}

export type CandidateDeps = {
  git: (args: string[]) => string
  run: (command: string[]) => number
  now: () => number
  log: (line: string) => void
  readJson: (file: string) => unknown
  writeJson: (file: string, value: unknown) => void
  latestSmokeReceipt: (since: number) => string | null
}

function candidateFile(repo: string, sha: string) {
  return resolve(repo, receiptDirectory, `candidate-${sha}.json`)
}

function readOrNull(deps: CandidateDeps, file: string) {
  try {
    return deps.readJson(file)
  } catch {
    return null
  }
}

export function candidateStatus(repo: string, deps: CandidateDeps) {
  const sha = deps.git(["rev-parse", "HEAD"])
  const receipt = readOrNull(deps, candidateFile(repo, sha))
  if (validCandidateReceipt(receipt, sha, deps.now())) {
    deps.log(`Candidate ${sha.slice(0, 9)} passed the gate.`)
    return 0
  }
  deps.log(
    `No fresh passed candidate receipt for ${sha.slice(0, 9)}. Run bun run qa:candidate on a clean checkout.`
  )
  return 1
}

export function runCandidate(
  options: CandidateOptions,
  repo: string,
  deps: CandidateDeps
) {
  const sha = deps.git(["rev-parse", "HEAD"])
  const dirty = deps.git(["status", "--porcelain"]).split("\n").filter(Boolean)
  if (dirty.length)
    throw new Error(
      `Candidate checks need a clean checkout at ${sha.slice(0, 9)}; ${dirty.length} uncommitted path(s) would be tested instead of the candidate. Commit the change, or run from a clean checkout of this commit.`
    )
  const file = candidateFile(repo, sha)
  if (validCandidateReceipt(readOrNull(deps, file), sha, deps.now())) {
    deps.log(`Reusing the passed candidate receipt for ${sha.slice(0, 9)}.`)
    return 0
  }
  if (!existsSync(resolve(repo, options.smokeConfig)))
    throw new Error(
      `Missing ${options.smokeConfig}. Copy scripts/fixtures/qa-smoke.candidate.example.json there; it must name the member-ready QA cooperative's member and finance officer.`
    )

  deps.log(`▸ test:quick, every suite (${sha.slice(0, 9)})`)
  if (deps.run(["bun", "scripts/test-quick.ts", "--files", "package.json"]))
    throw new Error("test:quick failed; the candidate did not pass.")

  deps.log("▸ qa:smoke against the local dashboard")
  const smokeStarted = deps.now()
  const smokeCode = deps.run([
    "bun",
    "scripts/qa-smoke.ts",
    "--config",
    options.smokeConfig,
  ])
  const smokeFile = deps.latestSmokeReceipt(smokeStarted)
  const smoke = smokeFile ? readOrNull(deps, smokeFile) : null
  const problems = smokeReceiptProblems(smoke, sha)
  if (smokeCode !== 0 && !problems.length) problems.push("qa:smoke failed")
  if (problems.length)
    throw new Error(`The candidate did not pass: ${problems.join("; ")}.`)

  if (
    deps.git(["rev-parse", "HEAD"]) !== sha ||
    deps.git(["status", "--porcelain"]).trim()
  )
    throw new Error(
      "The checkout changed during verification; the result is not recorded."
    )
  const passedSmoke = smoke as SmokeReceipt
  deps.writeJson(file, {
    version: 1,
    sha,
    status: "passed",
    clean: true,
    completedAt: new Date(deps.now()).toISOString(),
    quick: "passed",
    smoke: { id: passedSmoke.id, checks: passedSmoke.checks.length },
  } satisfies CandidateReceipt)
  deps.log(`Candidate ${sha.slice(0, 9)} passed. Receipt: ${file}`)
  return 0
}

export function localDeps(repo = root): CandidateDeps {
  return {
    git: (args) => {
      const result = spawnSync("git", args, {
        cwd: repo,
        encoding: "utf8",
        timeout: 10_000,
      })
      if (result.status !== 0)
        throw new Error(`git ${args[0]} failed in ${repo}.`)
      return result.stdout.trim()
    },
    run: (command) =>
      spawnSync(command[0]!, command.slice(1), {
        cwd: repo,
        env: process.env,
        stdio: "inherit",
        timeout: 15 * 60_000,
      }).status ?? 1,
    now: () => Date.now(),
    log: (line) => console.log(line),
    readJson: (file) => JSON.parse(readFileSync(file, "utf8")),
    writeJson: (file, value) => {
      mkdirSync(resolve(file, ".."), { recursive: true })
      writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
        mode: 0o600,
      })
    },
    latestSmokeReceipt: (since) => {
      const directory = resolve(repo, smokeDirectory)
      if (!existsSync(directory)) return null
      const newest = readdirSync(directory)
        .filter((name) => /^receipt-.*\.json$/.test(name))
        .map((name) => resolve(directory, name))
        .map((path) => ({ path, mtime: statSync(path).mtimeMs }))
        .filter(({ mtime }) => mtime >= since)
        .sort((a, b) => b.mtime - a.mtime)[0]
      return newest?.path ?? null
    },
  }
}

if (import.meta.main) {
  try {
    const options = parseCandidateArgs(process.argv.slice(2))
    if (options.help) console.log(usage)
    else
      process.exitCode =
        options.command === "status"
          ? candidateStatus(root, localDeps())
          : runCandidate(options, root, localDeps())
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "qa:candidate failed."
    )
    process.exitCode = 1
  }
}
