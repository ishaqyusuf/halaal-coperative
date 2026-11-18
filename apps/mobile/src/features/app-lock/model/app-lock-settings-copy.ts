import type {
  AppLockRelockAfterMs,
  AppLockVerificationResult,
} from "@/features/app-lock/model/app-lock-types"

export type PinFlow =
  | "biometrics-verify"
  | "change-confirm"
  | "change-create"
  | "change-verify"
  | "disable-verify"
  | "setup-confirm"
  | "setup-create"

export const RELOCK_OPTIONS: readonly {
  compactLabel: string
  description: string
  value: AppLockRelockAfterMs
}[] = [
  {
    compactLabel: "Immediately",
    description: "Require the PIN whenever HalaalVest leaves the foreground.",
    value: 0,
  },
  {
    compactLabel: "1 minute",
    description: "Allow a short return from another app.",
    value: 60_000,
  },
  {
    compactLabel: "5 minutes",
    description: "Useful when switching between trusted work apps.",
    value: 300_000,
  },
]

/** Title, body and the sheet's header step for each PIN step. */
export function getPinFlowCopy(flow: PinFlow) {
  switch (flow) {
    case "setup-create":
      return {
        body: "Choose six digits that are different from your phone unlock code.",
        step: "Step 1 of 2",
        title: "Create your app PIN",
      }
    case "setup-confirm":
      return {
        body: "Enter the same six digits again to confirm them.",
        step: "Step 2 of 2",
        title: "Confirm your app PIN",
      }
    case "change-verify":
      return {
        body: "Enter your current PIN before creating a new one.",
        step: "Security check",
        title: "Verify your current PIN",
      }
    case "change-create":
      return {
        body: "Choose a new six-digit PIN for this phone.",
        step: "Step 1 of 2",
        title: "Create a new PIN",
      }
    case "change-confirm":
      return {
        body: "Enter the new PIN again to confirm it.",
        step: "Step 2 of 2",
        title: "Confirm your new PIN",
      }
    case "disable-verify":
      return {
        body: "Confirm your current PIN before removing local protection.",
        step: "Security check",
        title: "Verify your PIN",
      }
    case "biometrics-verify":
      return {
        body: "Confirm your current PIN before changing biometric unlock.",
        step: "Security check",
        title: "Verify your PIN",
      }
  }
}

export function getVerificationMessage(result: AppLockVerificationResult) {
  if (result.ok) return null
  if (result.reason === "locked") {
    return "Too many attempts. Wait briefly before trying again."
  }
  if (result.reason === "storage_error") {
    return "Local protection could not be verified. Sign out securely from the lock screen to recover."
  }
  return "That PIN did not match."
}
