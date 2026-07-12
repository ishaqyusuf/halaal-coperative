import { describe, expect, test } from "bun:test"
import { isInitialMigrationSetupPath } from "./setup-gate"

describe("initial migration setup gate", () => {
  test("allows operation profile settings during initial setup", () => {
    expect(isInitialMigrationSetupPath("/settings/operation-profile")).toBe(
      true
    )
  })

  test("does not treat unrelated settings pages as setup paths", () => {
    expect(isInitialMigrationSetupPath("/settings/roles")).toBe(false)
  })
})
