import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  type CandidateDeps,
  candidateStatus,
  defaultSmokeConfig,
  freshReceipt,
  parseCandidateArgs,
  requiredSmokeChecks,
  runCandidate,
  smokeReceiptProblems,
  validCandidateReceipt,
} from "./qa-candidate"
import { validateSmokeConfig } from "./qa-smoke"
import { forms, memberRequests, pages } from "./qa-web-smoke.mjs"

const SHA = "a".repeat(40)
const NOW = Date.parse("2026-11-15T12:00:00.000Z")
const repo = resolve(import.meta.dir, "..")

function passedSmoke(overrides: Record<string, unknown> = {}) {
  return {
    id: "smoke-1",
    sha: SHA,
    changedPaths: 0,
    target: "https://halaalvest-dash.localhost",
    status: "passed",
    checks: requiredSmokeChecks.map((name) => ({ name, status: "pass" })),
    ...overrides,
  }
}

function fakeDeps(state: {
  dirty?: string
  quick?: number
  smokeCode?: number
  smoke?: unknown
  existing?: unknown
}) {
  const files = new Map<string, unknown>()
  const log: string[] = []
  const commands: string[] = []
  if (state.existing)
    files.set(
      resolve(repo, ".scratch/qa-candidate", `candidate-${SHA}.json`),
      state.existing
    )
  const deps: CandidateDeps = {
    git: (args) =>
      args[0] === "rev-parse"
        ? SHA
        : args[0] === "status"
          ? (state.dirty ?? "")
          : "",
    run: (command) => {
      commands.push(command.slice(1, 2).join(" "))
      return command[1] === "scripts/test-quick.ts"
        ? (state.quick ?? 0)
        : (state.smokeCode ?? 0)
    },
    now: () => NOW,
    log: (line) => log.push(line),
    readJson: (file) => {
      if (file === "smoke-receipt") return state.smoke
      if (!files.has(file)) throw new Error("missing")
      return files.get(file)
    },
    writeJson: (file, value) => files.set(file, value),
    latestSmokeReceipt: () => (state.smoke ? "smoke-receipt" : null),
  }
  return { commands, deps, files, log }
}

// The default config path is gitignored; tests point at the committed example.
const options = {
  ...parseCandidateArgs([]),
  smokeConfig: "scripts/fixtures/qa-smoke.candidate.example.json",
}

describe("qa:candidate", () => {
  test("parses commands and arguments", () => {
    expect(parseCandidateArgs([])).toEqual({
      command: "candidate",
      help: false,
      smokeConfig: defaultSmokeConfig,
    })
    expect(parseCandidateArgs(["status"]).command).toBe("status")
    expect(parseCandidateArgs(["--smoke-config", "x.json"]).smokeConfig).toBe(
      "x.json"
    )
    expect(() => parseCandidateArgs(["--target", "preview"])).toThrow(
      "Unknown argument"
    )
  })

  test("the committed candidate example covers the member-ready cooperative", () => {
    const example = JSON.parse(
      readFileSync(
        resolve(repo, "scripts/fixtures/qa-smoke.candidate.example.json"),
        "utf8"
      )
    )
    expect(validateSmokeConfig(example)).toMatchObject({
      readyMemberProfileLabel: "Standard Member Ready Member",
      readyStaffProfileLabel: "Standard Member Ready Finance Officer",
    })
  })

  test("requires every smoke journey the driver defines", () => {
    const driverChecks = [
      "qa sign-in",
      ...pages.map(({ name }) => `${name} page`),
      ...forms.map(({ name }) => `${name} quick fill`),
      "getting-started gate",
      "ready member sign-in",
      ...memberRequests.map(({ name }) => name),
      "member receipt form",
      "ready staff sign-in",
      "charge record payment dialog",
    ]
    expect<string[]>([...requiredSmokeChecks]).toEqual(driverChecks)
  })

  test("a smoke receipt qualifies only for this clean commit with every journey passed", () => {
    expect(smokeReceiptProblems(passedSmoke(), SHA)).toEqual([])
    expect(
      smokeReceiptProblems(passedSmoke({ sha: "b".repeat(40) }), SHA)
    ).toContain("smoke ran on another commit")
    expect(
      smokeReceiptProblems(passedSmoke({ changedPaths: 3 }), SHA)
    ).toContain("smoke ran with 3 uncommitted path(s)")
    const narrow = passedSmoke({
      checks: [{ name: "qa sign-in", status: "pass" }],
    })
    expect(smokeReceiptProblems(narrow, SHA).join()).toContain(
      "member procurement request"
    )
    expect(smokeReceiptProblems(null, SHA)).toEqual(["no smoke receipt"])
  })

  test("receipts expire after 24 hours", () => {
    const receipt = {
      version: 1,
      sha: SHA,
      status: "passed",
      clean: true,
      completedAt: new Date(NOW - 60_000).toISOString(),
      quick: "passed",
      smoke: { id: "smoke-1", checks: 15 },
    }
    expect(validCandidateReceipt(receipt, SHA, NOW)).toBe(true)
    expect(validCandidateReceipt(receipt, "b".repeat(40), NOW)).toBe(false)
    expect(freshReceipt(new Date(NOW - 25 * 3600_000).toISOString(), NOW)).toBe(
      false
    )
  })

  test("refuses a dirty checkout before running anything", () => {
    const { commands, deps } = fakeDeps({ dirty: " M apps/dashboard/x.ts" })
    expect(() => runCandidate(options, repo, deps)).toThrow(
      "1 uncommitted path(s)"
    )
    expect(commands).toEqual([])
  })

  test("runs quick suites then smoke and records a bound receipt", () => {
    const { commands, deps, files } = fakeDeps({ smoke: passedSmoke() })
    expect(runCandidate(options, repo, deps)).toBe(0)
    expect(commands).toEqual(["scripts/test-quick.ts", "scripts/qa-smoke.ts"])
    const receipt = [...files.values()][0]
    expect(validCandidateReceipt(receipt, SHA, NOW)).toBe(true)
    expect(candidateStatus(repo, { ...deps, readJson: () => receipt })).toBe(0)
  })

  test("stops on failed quick suites and on a smoke that misses journeys", () => {
    expect(() =>
      runCandidate(options, repo, fakeDeps({ quick: 1 }).deps)
    ).toThrow("test:quick failed")
    const narrow = fakeDeps({
      smoke: passedSmoke({ checks: [], status: "failed" }),
      smokeCode: 1,
    })
    expect(() => runCandidate(options, repo, narrow.deps)).toThrow(
      "smoke did not pass"
    )
    expect(narrow.files.size).toBe(0)
  })

  test("reuses a fresh passed receipt and reports status without running", () => {
    const existing = {
      version: 1,
      sha: SHA,
      status: "passed",
      clean: true,
      completedAt: new Date(NOW - 60_000).toISOString(),
      quick: "passed",
      smoke: { id: "smoke-1", checks: 15 },
    }
    const reused = fakeDeps({ existing })
    expect(runCandidate(options, repo, reused.deps)).toBe(0)
    expect(reused.commands).toEqual([])
    expect(candidateStatus(repo, fakeDeps({}).deps)).toBe(1)
  })
})
