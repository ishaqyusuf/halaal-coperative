import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import { AppError } from "@halaalvest/errors"

/*
 * Early access is retired (ADR-20261118). Only the signup approval token
 * remains: `/signup?approvalToken=` still pre-fills the form from approval
 * emails sent before direct sign-up opened.
 */

export const signupApprovalPayloadSchema = z.object({
  cooperativeName: z.string().trim().min(2),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  kind: z.literal("signup_approval"),
  primaryContactEmail: z.email(),
  primaryContactFullName: z.string().trim().min(2),
})

export type SignupApprovalPayload = z.infer<typeof signupApprovalPayloadSchema>

function getEarlyAccessTokenSecret() {
  const configuredSecret =
    process.env.EARLY_ACCESS_TOKEN_SECRET?.trim() ??
    process.env.SIGNUP_TOKEN_SECRET?.trim()

  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-early-access-secret"
  }

  throw new AppError({
    code: "PROVIDER_UNAVAILABLE",
    internalMessage:
      "EARLY_ACCESS_TOKEN_SECRET or SIGNUP_TOKEN_SECRET must be configured in production.",
    publicMessage: "Early access approval is temporarily unavailable.",
  })
}

function sign(body: string) {
  return createHmac("sha256", getEarlyAccessTokenSecret())
    .update(body)
    .digest("base64url")
}

function parseSignedToken(token: string) {
  const [body, signature] = token.split(".")

  if (!body || !signature) {
    throw new Error("The approval link is malformed.")
  }

  const expectedSignature = sign(body)
  const receivedSignature = Buffer.from(signature)
  const expectedSignatureBuffer = Buffer.from(expectedSignature)

  if (
    receivedSignature.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(receivedSignature, expectedSignatureBuffer)
  ) {
    throw new Error("The approval link is invalid.")
  }

  return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown
}

/** Signs a payload the way the retired approval route did (tests only). */
export function createSignedSignupApprovalToken(
  payload: SignupApprovalPayload
) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")

  return `${body}.${sign(body)}`
}

export function verifySignedSignupApprovalToken(token: string) {
  const parsed = signupApprovalPayloadSchema.safeParse(parseSignedToken(token))

  if (!parsed.success) {
    throw new Error("The signup approval link could not be read.")
  }

  if (new Date(parsed.data.expiresAt).getTime() <= Date.now()) {
    throw new Error("The approval link has expired.")
  }

  return parsed.data
}
