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
  description: string
  errors: Record<string, string>
  /** The `reset` value the login page reads to show its success notice. */
  loginNotice: "complete" | "invited"
  passwordLabel: string
  title: string
}

const sharedErrors = {
  "password-mismatch": "The two passwords are different. Type them again.",
  "password-too-short": "Use at least 8 characters.",
}

const copyByPurpose: Record<PasswordSetupPurpose, PasswordSetupCopy> = {
  invite: {
    description: "Use at least 8 characters.",
    errors: {
      ...sharedErrors,
      "invalid-token":
        "This invite link has expired or was already used. Ask your cooperative to send a new one.",
      "missing-token": "Open the invite link from your email.",
    },
    loginNotice: "invited",
    passwordLabel: "Password",
    title: "Set your password",
  },
  reset: {
    description: "Use at least 8 characters.",
    errors: {
      ...sharedErrors,
      "invalid-token":
        "This reset link has expired or was already used. Ask for a new one.",
      "missing-token": "Open the reset link from your email.",
    },
    loginNotice: "complete",
    passwordLabel: "New password",
    title: "Choose a new password",
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
