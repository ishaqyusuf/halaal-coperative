import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

const memberSignupLinkTokenSchema = z.object({
  linkId: z.string().uuid(),
  tenantId: z.string().uuid(),
  tokenVersion: z.number().int().positive(),
})

export type MemberSignupLinkTokenPayload = z.infer<typeof memberSignupLinkTokenSchema>

function getTokenSecret() {
  const configuredSecret = process.env.HALAAL_VEST_SIGNUP_TOKEN_SECRET?.trim()

  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV !== "production") {
    return "halaal-vest-dev-signup-secret"
  }

  throw new Error("HALAAL_VEST_SIGNUP_TOKEN_SECRET must be configured in production.")
}

function sign(body: string) {
  return createHmac("sha256", getTokenSecret()).update(body).digest("base64url")
}

export function createMemberSignupLinkToken(payload: MemberSignupLinkTokenPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${body}.${sign(body)}`
}

export function verifyMemberSignupLinkToken(token: string) {
  const [body, signature] = token.split(".")

  if (!body || !signature) {
    throw new Error("The signup link is malformed.")
  }

  const expectedSignature = Buffer.from(sign(body))
  const receivedSignature = Buffer.from(signature)

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    throw new Error("The signup link is invalid.")
  }

  const parsed = memberSignupLinkTokenSchema.safeParse(
    JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
  )

  if (!parsed.success) {
    throw new Error("The signup link could not be read.")
  }

  return parsed.data
}
