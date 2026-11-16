export const RECOVERY_CODE_LENGTH = 6
/** Seconds before "Resend code" unlocks; the server rate limit still applies. */
export const RECOVERY_RESEND_SECONDS = 45
export const PASSWORD_MIN_LENGTH = 8

export type RecoveryStep = "request" | "code" | "password" | "done"

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

/** A light client check; the server validates the address again. */
export function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** "0:45" style countdown label for the resend timer. */
export function formatResendCountdown(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`
}

/** The server's password rule (8–128 characters, a letter and a number). */
export function getPasswordRules(password: string) {
  return [
    {
      key: "length" as const,
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH && password.length <= 128,
    },
    {
      key: "mix" as const,
      label: "A letter and a number",
      met: /[A-Za-z]/.test(password) && /\d/.test(password),
    },
  ]
}

export function isAcceptablePassword(password: string) {
  return getPasswordRules(password).every((rule) => rule.met)
}

export type SignInFieldErrors = {
  cooperativeNumber?: string
  password?: string
}

/** Shown only after the member presses Sign in with a field left empty. */
export function getSignInFieldErrors(input: {
  cooperativeNumber: string
  password: string
}): SignInFieldErrors {
  return {
    ...(input.cooperativeNumber.trim()
      ? {}
      : { cooperativeNumber: "Enter your cooperative number" }),
    ...(input.password ? {} : { password: "Enter your password" }),
  }
}
