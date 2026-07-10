import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import type { UserCredentialRecord } from "@halaalvest/db"

const passwordResetTokenSchema = z.object({
  email: z.email(),
  expiresAt: z.string().datetime(),
  passwordState: z.string().min(1),
  tenantId: z.string().min(1),
  userId: z.string().min(1),
})

export type PasswordResetTokenPayload = z.infer<typeof passwordResetTokenSchema>

function getPasswordResetSecret() {
  const configuredSecret = process.env.AUTH_SECRET?.trim()

  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-password-reset-secret"
  }

  throw new Error(
    "AUTH_SECRET must be configured in production."
  )
}

function sign(body: string) {
  return createHmac("sha256", getPasswordResetSecret())
    .update(body)
    .digest("base64url")
}

function getPasswordState(passwordHash: string | null | undefined) {
  return createHash("sha256")
    .update(passwordHash?.trim() || "password-unset")
    .digest("base64url")
}

export function createPasswordResetToken(user: UserCredentialRecord) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString()
  const payload = {
    email: user.email,
    expiresAt,
    passwordState: getPasswordState(user.passwordHash),
    tenantId: user.tenantId,
    userId: user.id,
  } satisfies PasswordResetTokenPayload
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")

  return {
    expiresAt,
    token: `${body}.${sign(body)}`,
  }
}

export function verifyPasswordResetToken(token: string) {
  const [body, signature] = token.split(".")

  if (!body || !signature) {
    throw new Error("The password reset link is malformed.")
  }

  const expectedSignature = Buffer.from(sign(body))
  const receivedSignature = Buffer.from(signature)

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new Error("The password reset link is invalid.")
  }

  const parsed = passwordResetTokenSchema.safeParse(
    JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  )

  if (!parsed.success) {
    throw new Error("The password reset link could not be read.")
  }

  if (new Date(parsed.data.expiresAt).getTime() <= Date.now()) {
    throw new Error("The password reset link has expired.")
  }

  return parsed.data
}

export function isPasswordResetTokenCurrent(
  token: PasswordResetTokenPayload,
  user: UserCredentialRecord
) {
  return (
    token.userId === user.id &&
    token.tenantId === user.tenantId &&
    token.email === user.email &&
    token.passwordState === getPasswordState(user.passwordHash)
  )
}
