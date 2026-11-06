import { describe, expect, test } from "bun:test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import {
  getWorkflowPresentation,
  workflowPresentations,
} from "./workflow-presentations"

// Rules from .brain/decisions/ADR-20261105-dashboard-sheet-vs-modal.md.

const srcRoot = new URL("..", import.meta.url).pathname

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)

    if (statSync(path).isDirectory()) {
      return listSourceFiles(path)
    }

    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })
}

const sources = listSourceFiles(srcRoot)
  .map((path) => ({
    path: relative(srcRoot, path),
    source: readFileSync(path, "utf8"),
  }))
  .filter(({ path }) => path !== "lib/workflow-presentations.ts")

function readSource(path: string) {
  return sources.find((file) => file.path === path)?.source ?? ""
}

// Registry keys that no wrapper reads yet; drop each entry here as it is
// wired or deleted. WP12 wired the last `memberBackfill` keys.
const knownUnreferencedKeys = new Set<string>()

// Wrappers that still take inline presentation config or props instead of a
// registry key. WP12 moved the backfill and migration wrappers (X1-X20).
const knownInlinePresentationFiles = new Set<string>()

function referencedRegistryKeys() {
  const referenced = new Set<string>()
  const call =
    /getWorkflowPresentation\(\s*"([\w-]+)",\s*(?:"([\w-]+)"|([^)]+?))\s*\)/g

  for (const { source } of sources) {
    for (const match of source.matchAll(call)) {
      const [, workflow, literalMode] = match
      const modes = Object.keys(
        workflowPresentations[workflow as keyof typeof workflowPresentations]
      )

      if (literalMode) {
        referenced.add(`${workflow}.${literalMode}`)
        continue
      }

      // A dynamic mode comes from the caller or its URL params hook, so a key
      // counts as referenced when one of them names it as a string literal.
      const hookSources = [...source.matchAll(/"@\/hooks\/(use-[\w-]+)"/g)].map(
        ([, hook]) => readSource(`hooks/${hook}.ts`)
      )

      for (const mode of modes) {
        if (
          [source, ...hookSources].some((candidate) =>
            candidate.includes(`"${mode}"`)
          )
        ) {
          referenced.add(`${workflow}.${mode}`)
        }
      }
    }
  }

  return referenced
}

describe("workflow presentation registry", () => {
  test("assigns every workflow mode one supported presentation", () => {
    for (const modes of Object.values(workflowPresentations)) {
      for (const config of Object.values(modes)) {
        expect(["sheet", "dialog", "alert-dialog"]).toContain(
          config.presentation
        )
        expect(["compact", "form", "review", "wide"]).toContain(config.width)
      }
    }
  })

  test("keeps every alert dialog compact", () => {
    for (const [workflow, modes] of Object.entries(workflowPresentations)) {
      for (const [mode, config] of Object.entries(modes)) {
        if (config.presentation === "alert-dialog") {
          expect({ key: `${workflow}.${mode}`, width: config.width }).toEqual({
            key: `${workflow}.${mode}`,
            width: "compact",
          })
        }
      }
    }
  })

  test("routes consequential zero- and one-field confirms to alert dialogs", () => {
    const consequentialConfirms = [
      ["chargeOperation", "reverse"], // CO6
      ["chargeOperation", "toggle"], // CO7
      ["chargeOperation", "waive"], // CO5
      ["contribution", "postBatchRow"], // CT9
      ["guarantorApproval", "response"], // GA1
      ["loan", "disburse"], // L6
      ["loan", "guarantor"], // L5
      ["loan", "review"], // L4
      ["member", "status"], // M2
      ["memberBackfill", "apply"], // X11, X14, X18
      ["memberBackfill", "cancel"], // X9
      ["memberBackfill", "dividends"], // X12
      ["memberBackfill", "reverse"], // X7, X8
      ["monthlyRecord", "cancel"], // MR5
      ["monthlyRecord", "create"], // MR1
      ["monthlyRecord", "generate"], // MR4
      ["repayment", "refresh"], // RP5
    ] as const

    for (const [workflow, mode] of consequentialConfirms) {
      expect({
        key: `${workflow}.${mode}`,
        presentation: getWorkflowPresentation(workflow, mode).presentation,
      }).toEqual({ key: `${workflow}.${mode}`, presentation: "alert-dialog" })
    }
  })

  test("keeps long entry flows in sheets", () => {
    expect(getWorkflowPresentation("loan", "request").presentation).toBe(
      "sheet"
    )
    expect(
      getWorkflowPresentation("paymentReceipt", "create").presentation
    ).toBe("sheet")
    expect(getWorkflowPresentation("memberBackfill", "capture")).toEqual({
      presentation: "sheet",
      width: "wide",
    }) // X5
    expect(
      getWorkflowPresentation("memberBackfill", "baselineEdit").presentation
    ).toBe("sheet") // X4
  })

  test("centers short secondary actions in dialogs", () => {
    expect(
      getWorkflowPresentation("foodPurchase", "accounting-review").presentation
    ).toBe("dialog")
    expect(
      getWorkflowPresentation("chargeOperation", "settle").presentation
    ).toBe("dialog")
    // X6 and the ledger cell editors R1, R2.
    for (const mode of ["historicalEntry", "adjustment", "missedMonths"]) {
      expect(getWorkflowPresentation("memberBackfill", mode).presentation).toBe(
        "dialog"
      )
    }
  })

  test("fails on unknown modes instead of falling back to a sheet", () => {
    expect(() => getWorkflowPresentation("loan", "not-a-mode")).toThrow(
      'Unknown workflow presentation mode "not-a-mode" for "loan"'
    )
    expect(getWorkflowPresentation("loan", null).presentation).toBe("sheet")
  })

  test("references every registry key from a wrapper", () => {
    const referenced = referencedRegistryKeys()
    const unreferenced = Object.entries(workflowPresentations)
      .flatMap(([workflow, modes]) =>
        Object.keys(modes).map((mode) => `${workflow}.${mode}`)
      )
      .filter((key) => !referenced.has(key))

    expect(
      unreferenced.filter((key) => !knownUnreferencedKeys.has(key))
    ).toEqual([])
    // Once a known key is wired, remove it from the allowlist.
    expect(
      [...knownUnreferencedKeys].filter((key) => !unreferenced.includes(key))
    ).toEqual([])
  })

  test("passes registry keys, not inline presentation config or props", () => {
    const inlinePresentation =
      /config=\{\{|<WorkflowPresentation[^>]*\bwidth=|\bpresentation="(?:sheet|dialog|alert-dialog)"/
    const offenders = sources
      .filter(({ source }) => inlinePresentation.test(source))
      .map(({ path }) => path)

    expect(
      offenders.filter((path) => !knownInlinePresentationFiles.has(path))
    ).toEqual([])
    // Once a wrapper moves to a registry key, remove it from the allowlist.
    expect(
      [...knownInlinePresentationFiles].filter(
        (path) => !offenders.includes(path)
      )
    ).toEqual([])
  })
})
