export type UpdateScreenAction =
  | "checking"
  | "downloading"
  | "restarting"
  | null
export type UpdateScreenError = "check" | "download" | "restart" | null
export type UpdateQaState =
  | "available"
  | "check-error"
  | "checking"
  | "current"
  | "disabled"
  | "download-error"
  | "downloading"
  | "pending"
  | "restart-error"
  | "rollback"

export type UpdatePrimaryAction = {
  disabled: boolean
  kind: "check" | "download" | "restart"
  label: string
}

type UpdateScreenStateInput = {
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
}

function isActionActive(
  input: UpdateScreenStateInput,
  action: Exclude<UpdateScreenAction, null>
) {
  if (input.action === action) return true
  if (action === "checking") return input.isChecking
  if (action === "downloading") return input.isDownloading
  return input.isRestarting
}

export function getUpdateScreenStatus(input: UpdateScreenStateInput) {
  if (!input.updatesEnabled) return "Updates unavailable"
  if (isActionActive(input, "restarting")) return "Restarting app"
  if (isActionActive(input, "downloading")) return "Downloading update"
  if (isActionActive(input, "checking")) return "Checking for updates"
  if (input.error === "restart") return "Restart paused"
  if (input.error === "download") return "Download paused"
  if (input.error === "check") return "Unable to check"
  if (input.isRollbackAvailable) return "Safe build available"
  if (input.isUpdatePending) return "Update ready"
  if (input.isUpdateAvailable) return "Update available"
  if (input.hasCheckedSuccessfully) return "You're up to date"
  return "Ready to check"
}

export function getUpdatePrimaryAction(
  input: UpdateScreenStateInput
): UpdatePrimaryAction | null {
  if (!input.updatesEnabled) return null

  if (isActionActive(input, "restarting")) {
    return { disabled: true, kind: "restart", label: "Restarting app" }
  }
  if (isActionActive(input, "downloading")) {
    return { disabled: true, kind: "download", label: "Downloading update" }
  }
  if (isActionActive(input, "checking")) {
    return { disabled: true, kind: "check", label: "Checking for update" }
  }
  if (input.isUpdatePending) {
    return { disabled: false, kind: "restart", label: "Restart and apply" }
  }
  if (input.isRollbackAvailable) {
    return { disabled: false, kind: "download", label: "Restore safe build" }
  }
  if (input.isUpdateAvailable) {
    return { disabled: false, kind: "download", label: "Download update" }
  }

  return {
    disabled: false,
    kind: "check",
    label:
      input.error === "check" || input.hasCheckedSuccessfully
        ? "Check again"
        : "Check for update",
  }
}
