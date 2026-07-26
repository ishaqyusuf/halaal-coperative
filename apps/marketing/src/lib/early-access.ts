import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"

const DAY_MS = 1000 * 60 * 60 * 24

export const earlyAccessLaunchTimelineOptions = [
  { label: "As soon as possible", value: "as_soon_as_possible" },
  { label: "Within 30 days", value: "within_30_days" },
  { label: "Within 1-3 months", value: "within_1_to_3_months" },
  { label: "Later or still exploring", value: "later_or_exploring" },
] as const

export const earlyAccessRecordSystemOptions = [
  { label: "Spreadsheets", value: "spreadsheets" },
  { label: "Paper or manual records", value: "paper_or_manual" },
  { label: "Existing cooperative software", value: "existing_software" },
  { label: "No existing records yet", value: "no_existing_records" },
  { label: "A mix of systems", value: "mixed_systems" },
] as const

export const earlyAccessSetupNeedOptions = [
  {
    description: "Bring forward existing members and balances.",
    label: "Member and balance migration",
    value: "member_and_balance_migration",
  },
  {
    description: "Set recurring commitments and payment allocation rules.",
    label: "Savings and contributions",
    value: "savings_and_contributions",
  },
  {
    description: "Configure compulsory and optional share ownership.",
    label: "Share management",
    value: "share_management",
  },
  {
    description: "Set eligibility, terms, approvals, and repayments.",
    label: "Interest-free financing",
    value: "interest_free_financing",
  },
  {
    description: "Manage member purchases and repayment schedules.",
    label: "Procurement and Foodstuff Purchase",
    value: "procurement_and_food_purchase",
  },
  {
    description: "Track investments, profit, and member allocations.",
    label: "Businesses and profit distribution",
    value: "businesses_and_profit_distribution",
  },
] as const

const cooperativeSizeOptions = ["25", "100", "250", "500", "1000", "1001"]
const launchTimelineOptions = earlyAccessLaunchTimelineOptions.map(
  (option) => option.value
)
const recordSystemOptions = earlyAccessRecordSystemOptions.map(
  (option) => option.value
)
const setupNeedOptions = new Set<string>(
  earlyAccessSetupNeedOptions.map((option) => option.value)
)

function requiredOption(options: readonly string[], message: string) {
  return z
    .string()
    .trim()
    .refine((value) => options.includes(value), message)
}

function formatOption(
  options: readonly { label: string; value: string }[],
  value: string
) {
  return options.find((option) => option.value === value)?.label ?? value
}

export const earlyAccessRequestSchema = z.object({
  cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
  currentSize: requiredOption(
    cooperativeSizeOptions,
    "Select the current cooperative size."
  ),
  launchTimeline: requiredOption(
    launchTimelineOptions,
    "Select when you want to start setup."
  ),
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
  recordSystem: requiredOption(
    recordSystemOptions,
    "Select how cooperative records are managed today."
  ),
  setupNeeds: z
    .array(z.string())
    .min(1, "Select at least one setup need.")
    .refine(
      (values) => values.every((value) => setupNeedOptions.has(value)),
      "Select valid setup needs."
    ),
})

export const earlyAccessRequestPayloadSchema = earlyAccessRequestSchema.extend({
  currentSize: z.string().optional().default(""),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  kind: z.literal("early_access_request"),
  launchTimeline: z.string().optional().default(""),
  recordSystem: z.string().optional().default(""),
  setupNeeds: z.array(z.string()).optional().default([]),
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

export function formatEarlyAccessLaunchTimeline(value: string) {
  return formatOption(earlyAccessLaunchTimelineOptions, value)
}

export function formatEarlyAccessRecordSystem(value: string) {
  return formatOption(earlyAccessRecordSystemOptions, value)
}

export function formatEarlyAccessSetupNeeds(values: string[]) {
  return values.map((value) => formatOption(earlyAccessSetupNeedOptions, value))
}

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
    currentSize: input.currentSize,
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    kind: "early_access_request",
    launchTimeline: input.launchTimeline,
    message: input.message?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactFullName: input.primaryContactFullName.trim(),
    recordSystem: input.recordSystem,
    setupNeeds: input.setupNeeds,
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
