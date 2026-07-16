import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

const DAY_MS = 1000 * 60 * 60 * 24

export const earlyAccessRequestSchema = z.object({
  cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
  message: z
    .string()
    .trim()
    .max(1_000, "Keep the note under 1,000 characters.")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(40, "Keep the phone number short.")
    .optional()
    .or(z.literal("")),
  primaryContactEmail: z.email("Enter a valid email address."),
  primaryContactFullName: z
    .string()
    .trim()
    .min(2, "Enter the primary contact name."),
})

export const earlyAccessRequestPayloadSchema = earlyAccessRequestSchema.extend({
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  kind: z.literal("early_access_request"),
})

export const signupApprovalPayloadSchema = z.object({
  cooperativeName: z.string().trim().min(2),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  kind: z.literal("signup_approval"),
  primaryContactEmail: z.email(),
  primaryContactFullName: z.string().trim().min(2),
})

export type EarlyAccessRequestInput = z.infer<typeof earlyAccessRequestSchema>
export type EarlyAccessRequestPayload = z.infer<
  typeof earlyAccessRequestPayloadSchema
>
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

  throw new Error(
    "EARLY_ACCESS_TOKEN_SECRET or SIGNUP_TOKEN_SECRET must be configured in production."
  )
}

function sign(body: string) {
  return createHmac("sha256", getEarlyAccessTokenSecret())
    .update(body)
    .digest("base64url")
}

function createSignedToken(payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = sign(body)

  return `${body}.${signature}`
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

function assertNotExpired(expiresAt: string) {
  if (new Date(expiresAt).getTime() <= Date.now()) {
    throw new Error("The approval link has expired.")
  }
}

export function createEarlyAccessRequestPayload(
  input: EarlyAccessRequestInput
): EarlyAccessRequestPayload {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + DAY_MS * 30)

  return {
    cooperativeName: input.cooperativeName.trim(),
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    kind: "early_access_request",
    message: input.message?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactFullName: input.primaryContactFullName.trim(),
  }
}

export function createSignupApprovalPayload(
  input: Pick<
    EarlyAccessRequestPayload,
    "cooperativeName" | "primaryContactEmail" | "primaryContactFullName"
  >
): SignupApprovalPayload {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + DAY_MS * 7)

  return {
    cooperativeName: input.cooperativeName.trim(),
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    kind: "signup_approval",
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactFullName: input.primaryContactFullName.trim(),
  }
}

export function createSignedEarlyAccessRequestToken(
  payload: EarlyAccessRequestPayload
) {
  return createSignedToken(payload)
}

export function createSignedSignupApprovalToken(
  payload: SignupApprovalPayload
) {
  return createSignedToken(payload)
}

export function verifySignedEarlyAccessRequestToken(token: string) {
  const parsed = earlyAccessRequestPayloadSchema.safeParse(
    parseSignedToken(token)
  )

  if (!parsed.success) {
    throw new Error("The approval link could not be read.")
  }

  assertNotExpired(parsed.data.expiresAt)

  return parsed.data
}

export function verifySignedSignupApprovalToken(token: string) {
  const parsed = signupApprovalPayloadSchema.safeParse(parseSignedToken(token))

  if (!parsed.success) {
    throw new Error("The signup approval link could not be read.")
  }

  assertNotExpired(parsed.data.expiresAt)

  return parsed.data
}
