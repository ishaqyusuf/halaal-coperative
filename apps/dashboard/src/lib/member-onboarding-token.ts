import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

const memberOnboardingVerificationTokenSchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().datetime(),
  requestId: z.string().uuid(),
  tenantId: z.string().uuid(),
})

export type MemberOnboardingVerificationToken = z.infer<
  typeof memberOnboardingVerificationTokenSchema
>

function getVerificationSecret() {
  const configuredSecret = process.env.HALAAL_VEST_SIGNUP_TOKEN_SECRET?.trim()

  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-signup-secret"
  }

  throw new Error("HALAAL_VEST_SIGNUP_TOKEN_SECRET must be configured in production.")
}

function sign(body: string) {
  return createHmac("sha256", getVerificationSecret()).update(body).digest("base64url")
}

export function createMemberOnboardingVerificationToken(
  payload: MemberOnboardingVerificationToken,
) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${body}.${sign(body)}`
}

export function verifyMemberOnboardingVerificationToken(token: string) {
  const [body, signature] = token.split(".")

  if (!body || !signature) {
    throw new Error("The verification link is malformed.")
  }

  const expectedSignature = Buffer.from(sign(body))
  const receivedSignature = Buffer.from(signature)

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new Error("The verification link is invalid.")
  }

  const parsed = memberOnboardingVerificationTokenSchema.safeParse(
    JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
  )

  if (!parsed.success) {
    throw new Error("The verification link could not be read.")
  }

  if (new Date(parsed.data.expiresAt).getTime() <= Date.now()) {
    throw new Error("The verification link has expired.")
  }

  return parsed.data
}
