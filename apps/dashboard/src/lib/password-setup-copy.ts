/**
 * The confirm-password page serves two flows from the same signed token:
 * a reset the user asked for, and the first-time portal invite staff send.
 * `purpose` only changes the copy; the token alone authorises the change.
 */
export type PasswordSetupPurpose = "invite" | "reset"

export function parsePasswordSetupPurpose(
  value: unknown
): PasswordSetupPurpose {
  return value === "invite" ? "invite" : "reset"
}

type PasswordSetupCopy = {
  badge: string
  description: string
  errors: Record<string, string>
  eyebrow: string
  heading: string
  passwordLabel: string
  passwordPlaceholder: string
  confirmPlaceholder: string
  /** The `reset` value the login page reads to show its success notice. */
  loginNotice: "complete" | "invited"
  title: string
}

const sharedErrors = {
  "password-mismatch": "Passwords do not match.",
  "password-too-short": "Password must be at least 8 characters.",
}

const copyByPurpose: Record<PasswordSetupPurpose, PasswordSetupCopy> = {
  invite: {
    badge: "Portal invite",
    confirmPlaceholder: "Confirm your password",
    description:
      "Use at least 8 characters. After saving, sign in with your email and this password.",
    errors: {
      ...sharedErrors,
      "invalid-token":
        "This invite link is invalid, has expired or has already been used. Ask your cooperative to send a new one.",
      "missing-token": "Open the portal invite link from your email.",
    },
    eyebrow: "Welcome to your member portal",
    heading: "Set your password",
    loginNotice: "invited",
    passwordLabel: "Password",
    passwordPlaceholder: "Choose a password",
    title: "Set up your portal access",
  },
  reset: {
    badge: "Password reset",
    confirmPlaceholder: "Confirm your new password",
    description:
      "Use at least 8 characters. After saving, sign in with your email and new password.",
    errors: {
      ...sharedErrors,
      "invalid-token":
        "This password reset link is invalid or has already been used.",
      "missing-token": "Open the password reset link from your email.",
    },
    eyebrow: "Password reset",
    heading: "Save new password",
    loginNotice: "complete",
    passwordLabel: "New password",
    passwordPlaceholder: "Enter a new password",
    title: "Choose your password",
  },
}

export function getPasswordSetupCopy(purpose: PasswordSetupPurpose) {
  return copyByPurpose[purpose]
}

export function getPasswordSetupError(
  purpose: PasswordSetupPurpose,
  error: string
) {
  const { errors } = copyByPurpose[purpose]

  return errors[error] ?? errors["invalid-token"]
}
