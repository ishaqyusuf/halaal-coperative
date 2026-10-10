export const RECOVERY_CODE_LENGTH = 6

export type RecoveryStep = "request" | "code" | "password"

export function normalizeRecoveryCode(value: string) {
  return value.replace(/\D/g, "").slice(0, RECOVERY_CODE_LENGTH)
}

export function maskRecoveryEmail(value: string) {
  const email = value.trim().toLowerCase()
  const separator = email.lastIndexOf("@")

  if (separator <= 0 || separator === email.length - 1) return "your email"

  const local = email.slice(0, separator)
  const domain = email.slice(separator + 1)
  const visiblePrefix = local.slice(0, Math.min(1, local.length))

  return `${visiblePrefix}••••@${domain}`
}

export function getInitialRecoveryStep(challengeId?: string): RecoveryStep {
  return challengeId?.trim() ? "code" : "request"
}
