import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const script = resolve(import.meta.dir, "eas-update.mjs")
const config = resolve(import.meta.dir, "../app.config.ts")

describe("eas:update arguments", () => {
  test("rejects a misspelled no-publish flag before changing source", () => {
    const before = readFileSync(config, "utf8")
    const result = spawnSync(
      "node",
      [script, "--dry-run", "--skip-publsh"],
      { encoding: "utf8" }
    )

    expect(result.status).toBe(1)
    expect(readFileSync(config, "utf8")).toBe(before)
  })

  test("accepts a dry-run version preview without publishing", () => {
    const before = readFileSync(config, "utf8")
    const result = spawnSync(
      "node",
      [
        script,
        "--dry-run",
        "--current",
        "2026.09.25",
        "--date",
        "2026-09-25",
      ],
      { encoding: "utf8" }
    )

    expect(result.status).toBe(0)
    expect(readFileSync(config, "utf8")).toBe(before)
  })
})
