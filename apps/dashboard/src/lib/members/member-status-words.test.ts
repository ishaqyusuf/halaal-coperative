import { describe, expect, test } from "bun:test"
import {
  getMemberState,
  getMemberStatusChangeCopy,
} from "./member-status-words"

const bf = { mode: "brought_forward" as const }

describe("getMemberState", () => {
  test("a non-active status wins over missing setup", () => {
    expect(
      getMemberState("suspended", { issues: ["kyc_unverified"], migration: bf })
    ).toEqual({ label: "Suspended", tone: "danger" })
    expect(getMemberState("pending", null).label).toBe("Pending")
    expect(getMemberState("exited", null).label).toBe("Left")
  })

  test("an active member shows the first missing step, KYC first", () => {
    expect(
      getMemberState("active", {
        issues: ["kyc_unverified", "migration_incomplete"],
        migration: bf,
      }).label
    ).toBe("Needs KYC")
    expect(
      getMemberState("active", {
        issues: ["migration_incomplete"],
        migration: bf,
      }).label
    ).toBe("Needs opening balance")
    expect(
      getMemberState("active", {
        issues: ["migration_incomplete"],
        migration: { mode: "historical_backfill" },
      }).label
    ).toBe("Needs past records")
  })

  test("an active member with nothing missing is ready", () => {
    expect(getMemberState("active", { issues: [], migration: bf })).toEqual({
      label: "Ready",
      tone: "good",
    })
  })

  test("status change copy names the action", () => {
    expect(getMemberStatusChangeCopy("suspended").action).toBe("Suspend")
    expect(getMemberStatusChangeCopy("active").title).toBe(
      "Make this member active?"
    )
  })
})
