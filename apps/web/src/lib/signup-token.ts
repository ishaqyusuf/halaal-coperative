import { createHmac, timingSafeEqual } from "node:crypto"
import { signupVerificationPayloadSchema, type SignupVerificationPayload } from "./signup-flow"

function getSignupTokenSecret() {
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
  return createHmac("sha256", getSignupTokenSecret()).update(body).digest("base64url")
}

export function createSignedSignupToken(payload: SignupVerificationPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(body)

  return `${body}.${signature}`
}

export function verifySignedSignupToken(token: string) {
  const [body, signature] = token.split(".")

  if (!body || !signature) {
    throw new Error("The verification link is malformed.")
  }

  const expectedSignature = sign(body)
  const receivedSignature = Buffer.from(signature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  if (
    receivedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(receivedSignature, expectedSignatureBuffer)
  ) {
    throw new Error("The verification link is invalid.")
  }

  const parsed = signupVerificationPayloadSchema.safeParse(
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
