import { type RecoveryStep } from "@/features/auth/model/recovery-flow"

export type RecoveryPresentation = {
  actionLabel: string
  backLabel: string
  busyLabel: string
  stepNumber: 1 | 2 | 3
  title: string
}

const RECOVERY_PRESENTATIONS: Record<
  Exclude<RecoveryStep, "done">,
  RecoveryPresentation
> = {
  request: {
    actionLabel: "Send code",
    backLabel: "Back to sign in",
    busyLabel: "Sending code",
    stepNumber: 1,
    title: "Recover account",
  },
  code: {
    actionLabel: "Continue",
    backLabel: "Back to account details",
    busyLabel: "Continue",
    stepNumber: 2,
    title: "Enter recovery code",
  },
  password: {
    actionLabel: "Update password",
    backLabel: "Back to recovery code",
    busyLabel: "Updating password",
    stepNumber: 3,
    title: "Set a new password",
  },
}

export function getRecoveryPresentation(step: Exclude<RecoveryStep, "done">) {
  return RECOVERY_PRESENTATIONS[step]
}
