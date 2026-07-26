import { describe, expect, test } from "bun:test"
import { isInitialMigrationSetupPath } from "./setup-gate"

describe("initial migration setup gate", () => {
  test("allows operation profile settings during initial setup", () => {
    expect(isInitialMigrationSetupPath("/settings/operation-profile")).toBe(
      true
    )
  })

  test("allows member backfill workflow during initial setup", () => {
    expect(isInitialMigrationSetupPath("/members")).toBe(true)
    expect(isInitialMigrationSetupPath("/members/member-123")).toBe(true)
    expect(
      isInitialMigrationSetupPath("/members/member-123/backfill")
    ).toBe(true)
    expect(
      isInitialMigrationSetupPath("/members/member-123/backfill/review")
    ).toBe(true)
  })

  test("does not treat unrelated settings pages as setup paths", () => {
    expect(isInitialMigrationSetupPath("/settings/roles")).toBe(false)
  })

  test("does not allow unrelated member sub-workspaces during initial setup", () => {
    expect(
      isInitialMigrationSetupPath("/members/member-123/activity")
    ).toBe(false)
  })
})
