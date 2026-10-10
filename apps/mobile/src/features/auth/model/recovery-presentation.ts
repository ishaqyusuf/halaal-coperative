import { type RecoveryStep } from "@/features/auth/model/recovery-flow"

export type RecoveryPresentation = {
  actionLabel: string
  backLabel: string
  stepNumber: 1 | 2 | 3
  title: string
}

const RECOVERY_PRESENTATIONS: Record<RecoveryStep, RecoveryPresentation> = {
  request: {
    actionLabel: "Send recovery code",
    backLabel: "Back to sign in",
    stepNumber: 1,
    title: "Recover account",
  },
  code: {
    actionLabel: "Continue",
    backLabel: "Back to account details",
    stepNumber: 2,
    title: "Enter recovery code",
  },
  password: {
    actionLabel: "Reset and sign in",
    backLabel: "Back to recovery code",
    stepNumber: 3,
    title: "Set a new password",
  },
}

export function getRecoveryPresentation(step: RecoveryStep) {
  return RECOVERY_PRESENTATIONS[step]
}
