import { describe, expect, test } from "bun:test"
import {
  getUpdatePrimaryAction,
  getUpdateScreenStatus,
  type UpdateScreenAction,
  type UpdateScreenError,
} from "./update-screen-state"

function state(
  overrides: Partial<{
    action: UpdateScreenAction
    error: UpdateScreenError
    hasCheckedSuccessfully: boolean
    isChecking: boolean
    isDownloading: boolean
    isRestarting: boolean
    isRollbackAvailable: boolean
    isUpdateAvailable: boolean
    isUpdatePending: boolean
    updatesEnabled: boolean
  }> = {}
) {
  return {
    action: null,
    error: null,
    hasCheckedSuccessfully: false,
    isChecking: false,
    isDownloading: false,
    isRestarting: false,
    isRollbackAvailable: false,
    isUpdateAvailable: false,
    isUpdatePending: false,
    updatesEnabled: true,
    ...overrides,
  }
}

describe("App Updates screen state", () => {
  test("does not claim the app is current before a successful check", () => {
    expect(getUpdateScreenStatus(state())).toBe("Ready to check")
    expect(getUpdatePrimaryAction(state())).toEqual({
      disabled: false,
      kind: "check",
      label: "Check for update",
    })
  })

  test("keeps a failed check distinct from an up-to-date result", () => {
    const input = state({ error: "check", hasCheckedSuccessfully: true })

    expect(getUpdateScreenStatus(input)).toBe("Unable to check")
    expect(getUpdatePrimaryAction(input)?.label).toBe("Check again")
  })

  test("exposes exactly the next valid available-update action", () => {
    const available = state({
      hasCheckedSuccessfully: true,
      isUpdateAvailable: true,
    })
    const pending = state({
      hasCheckedSuccessfully: true,
      isUpdateAvailable: true,
      isUpdatePending: true,
    })

    expect(getUpdateScreenStatus(available)).toBe("Update available")
    expect(getUpdatePrimaryAction(available)).toEqual({
      disabled: false,
      kind: "download",
      label: "Download update",
    })
    expect(getUpdateScreenStatus(pending)).toBe("Update ready")
    expect(getUpdatePrimaryAction(pending)).toEqual({
      disabled: false,
      kind: "restart",
      label: "Restart and apply",
    })
  })

  test("active work wins over stale errors and disables its action", () => {
    const input = state({
      action: "downloading",
      error: "check",
      isUpdateAvailable: true,
    })

    expect(getUpdateScreenStatus(input)).toBe("Downloading update")
    expect(getUpdatePrimaryAction(input)).toEqual({
      disabled: true,
      kind: "download",
      label: "Downloading update",
    })
  })

  test("uses safe embedded-build language for rollback", () => {
    const input = state({ isRollbackAvailable: true })

    expect(getUpdateScreenStatus(input)).toBe("Safe build available")
    expect(getUpdatePrimaryAction(input)).toEqual({
      disabled: false,
      kind: "download",
      label: "Restore safe build",
    })
  })

  test("renders no unavailable update action", () => {
    const input = state({ updatesEnabled: false })

    expect(getUpdateScreenStatus(input)).toBe("Updates unavailable")
    expect(getUpdatePrimaryAction(input)).toBeNull()
  })
})
