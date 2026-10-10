import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

describe("Android QA command completion contract", () => {
  for (const journey of ["member-core", "subscription", "role-switch", "share-profit"]) {
    test(`${journey} emits its receipt and fails the command when incomplete`, () => {
      const source = readFileSync(
        new URL(`../../scripts/run-production-qa-android-${journey}-proof.ts`, import.meta.url),
        "utf8"
      )
      expect(source).toContain(
        "console.log(JSON.stringify(result, null, 2))\nprocess.exitCode = result.complete ? 0 : 1"
      )
    })
  }
})
