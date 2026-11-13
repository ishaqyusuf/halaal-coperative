import { describe, expect, test } from "bun:test"
import { getInitialSetupMode } from "./setup-mode-selection"

describe("getInitialSetupMode", () => {
  test("preselects the recommended option before the admin has chosen", () => {
    expect(
      getInitialSetupMode({
        migrationSetup: { confirmedAt: null, mode: "historical_backfill" },
        recommended: "brought_forward",
      })
    ).toBe("brought_forward")
  })

  test("keeps the saved choice once the admin has confirmed it", () => {
    expect(
      getInitialSetupMode({
        migrationSetup: {
          confirmedAt: "2026-11-13T10:00:00.000Z",
          mode: "historical_backfill",
        },
        recommended: "brought_forward",
      })
    ).toBe("historical_backfill")
  })

  test("falls back to the stored default without a recommendation", () => {
    expect(
      getInitialSetupMode({
        migrationSetup: { confirmedAt: null, mode: "historical_backfill" },
        recommended: null,
      })
    ).toBe("historical_backfill")
  })
})
