import { z } from "zod"
import {
  cooperativeCountryCodes,
  defaultCooperativeCountry,
  isCooperativeCountry,
  parseCooperativeSizeRangeValue,
} from "@halaalvest/domain"
import {
  cooperativeMemberNumberPrefix,
  isReservedTenantSubdomainLabel,
  normalizeCooperativeCodePrefix,
} from "@halaalvest/utils"
import { normalizeInternationalPhone } from "./international-phone"

export function normalizeWorkspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function createWorkspaceSlugSuggestion(value: string) {
  return normalizeWorkspaceSlug(value)
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .join("-")
    .slice(0, 63)
    .replace(/-+$/g, "")
}

export function isReservedWorkspaceSlug(value: string) {
  return isReservedTenantSubdomainLabel(value)
}

export function createCompletedOnboardingPath(value: string) {
  const completedUrl = new URL(value)
  completedUrl.searchParams.delete("token")
  completedUrl.searchParams.set("status", "completed")

  return `${completedUrl.pathname}${completedUrl.search}${completedUrl.hash}`
}

const workspaceSlugSchema = z
  .string()
  .trim()
  .min(2, "Choose a workspace subdomain.")
  .max(63, "Keep the workspace subdomain under 63 characters.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers, and hyphens only."
  )
  .refine(
    (value) => !isReservedWorkspaceSlug(value),
    "That workspace subdomain is reserved."
  )

const cooperativeCodePrefixSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z]{3,5}$/, "Use a unique prefix of 3 to 5 letters.")
  .transform(normalizeCooperativeCodePrefix)

const memberNumberSchema = z
  .string()
  .trim()
  .min(1, "Enter your member number, for example 0001.")
  .transform((value) => value.toUpperCase())

const cooperativeSizeRangeField = z
  .union([z.number(), z.string()])
  .transform((value, context) => {
    const currentSize = parseCooperativeSizeRangeValue(value)

    if (currentSize === null) {
      context.addIssue({
        code: "custom",
        message: "Select the current cooperative size.",
      })

      return z.NEVER
    }

    return currentSize
  })

const requiredProfileTextField = (message: string) =>
  z.string().trim().min(1, message)

const cooperativeCountrySchema = z
  .string()
  .trim()
  .min(1, "Select your cooperative's country.")
  .refine(isCooperativeCountry, "Select your cooperative's country.")

/** E.164 owner phone; "" when it was left out. */
const e164PhoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/)

const legalAcknowledgementSchema = z
  .object({
    confirmed: z.literal(true),
    documents: z
      .array(
        z
          .object({
            documentType: z.enum(["terms", "privacy"]),
            documentVersion: z.string().min(1).max(80),
            contentHash: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict()
      )
      .length(2),
  })
  .strict()

export const signupIntentSchema = z
  .object({
    acceptedTerms: z.boolean().refine((value) => value, {
      message: "Accept the platform terms to continue.",
    }),
    cooperativeCodePrefix: cooperativeCodePrefixSchema,
    cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
    country: cooperativeCountrySchema,
    primaryContactEmail: z.email("Enter a valid email address."),
    primaryContactFullName: z
      .string()
      .trim()
      .min(2, "Enter the primary contact name."),
    primaryContactMemberNumber: memberNumberSchema,
    // Optional. The phone keeps its own country, which can differ from the
    // cooperative's; the value is E.164 once valid.
    primaryContactPhone: z.string().trim().default(""),
    primaryContactPhoneCountry: z.string().trim().default(""),
    workspaceSlug: workspaceSlugSchema,
  })
  .superRefine((values, context) => {
    if (!values.primaryContactPhone) return
    if (
      !normalizeInternationalPhone(
        values.primaryContactPhone,
        values.primaryContactPhoneCountry
      )
    )
      context.addIssue({
        code: "custom",
        message: "Enter a valid phone number for the selected country.",
        path: ["primaryContactPhone"],
      })
  })

export const signupVerificationPayloadSchema = z.object({
  cooperativeCodePrefix: cooperativeCodePrefixSchema,
  cooperativeName: z.string().trim().min(2),
  // Optional: links issued before country and phone were asked still work.
  country: cooperativeCountrySchema.optional(),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  legalAcknowledgement: legalAcknowledgementSchema.optional(),
  primaryContactEmail: z.email(),
  primaryContactFullName: z.string().trim().min(2),
  primaryContactMemberNumber: memberNumberSchema,
  primaryContactPhone: e164PhoneSchema.optional(),
  workspaceSlug: workspaceSlugSchema,
})

export const onboardingFormSchema = z
  .object({
    legalAcknowledgement: legalAcknowledgementSchema.optional(),
    city: requiredProfileTextField("Enter the cooperative city."),
    confirmPassword: z.string().min(8, "Confirm your password."),
    country: requiredProfileTextField("Select the cooperative country.").refine(
      isCooperativeCountry,
      "Select a valid cooperative country."
    ),
    cooperativeCodePrefix: cooperativeCodePrefixSchema,
    cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
    currentSize: cooperativeSizeRangeField,
    officeAddress: z
      .string()
      .trim()
      .min(10, "Enter the cooperative office address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    primaryContactEmail: z.email("Enter a valid email address."),
    primaryContactFullName: z
      .string()
      .trim()
      .min(2, "Enter the primary contact name."),
    primaryContactMemberNumber: memberNumberSchema,
    state: requiredProfileTextField("Enter the cooperative state."),
    startDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the cooperative start date."),
    token: z.string().min(1, "A verification token is required."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type SignupIntentInput = z.input<typeof signupIntentSchema>
export type SignupIntentValues = z.output<typeof signupIntentSchema>
export type SignupLegalAcknowledgement = z.infer<
  typeof legalAcknowledgementSchema
>
export type SignupVerificationPayload = z.infer<
  typeof signupVerificationPayloadSchema
>
export type OnboardingFormInput = Omit<
  z.infer<typeof onboardingFormSchema>,
  "currentSize"
> & {
  currentSize: number | string
}

export function normalizeMemberNumberPrefix(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length > 0 ? trimmed.toUpperCase() : null
}

export function composeMemberNumber(
  prefix: string | null | undefined,
  suffix: string
) {
  const normalizedPrefix = normalizeMemberNumberPrefix(prefix)
  const normalizedSuffix = suffix.trim().toUpperCase()

  if (!normalizedPrefix) {
    return normalizedSuffix
  }

  return normalizedSuffix.startsWith(normalizedPrefix)
    ? normalizedSuffix
    : `${normalizedPrefix}${normalizedSuffix}`
}

export function getMemberNumberSuffix(
  prefix: string | null | undefined,
  memberNumber: string
) {
  const normalizedPrefix = normalizeMemberNumberPrefix(prefix)
  const normalizedMemberNumber = memberNumber.trim().toUpperCase()

  if (!normalizedPrefix) {
    return normalizedMemberNumber
  }

  return normalizedMemberNumber.startsWith(normalizedPrefix)
    ? normalizedMemberNumber.slice(normalizedPrefix.length)
    : normalizedMemberNumber
}

/** ISO code for a supported cooperative country ("Nigeria" → "NG"). */
export function cooperativeCountryCode(country: string | null | undefined) {
  return isCooperativeCountry(country) ? cooperativeCountryCodes[country] : null
}

export function createSignupVerificationPayload(
  input: SignupIntentValues,
  legalAcknowledgement?: SignupLegalAcknowledgement
): SignupVerificationPayload {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60 * 24)
  const cooperativeCodePrefix = normalizeCooperativeCodePrefix(
    input.cooperativeCodePrefix
  )
  const memberNumberPrefix = cooperativeMemberNumberPrefix(
    cooperativeCodePrefix
  )

  const primaryContactPhone = input.primaryContactPhone
    ? (normalizeInternationalPhone(
        input.primaryContactPhone,
        input.primaryContactPhoneCountry
      ) ?? undefined)
    : undefined

  return {
    cooperativeCodePrefix,
    country: input.country as SignupVerificationPayload["country"],
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    cooperativeName: input.cooperativeName.trim(),
    legalAcknowledgement,
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactFullName: input.primaryContactFullName.trim(),
    primaryContactMemberNumber: getMemberNumberSuffix(
      memberNumberPrefix,
      input.primaryContactMemberNumber
    ),
    primaryContactPhone,
    workspaceSlug: normalizeWorkspaceSlug(input.workspaceSlug),
  }
}

export function getOnboardingDefaultsFromVerification(
  payload: SignupVerificationPayload
) {
  return {
    city: "",
    cooperativeCodePrefix: payload.cooperativeCodePrefix,
    cooperativeName: payload.cooperativeName,
    currentSize: "",
    confirmPassword: "",
    country: payload.country ?? defaultCooperativeCountry,
    officeAddress: "",
    password: "",
    primaryContactEmail: payload.primaryContactEmail,
    primaryContactFullName: payload.primaryContactFullName,
    primaryContactMemberNumber: getMemberNumberSuffix(
      cooperativeMemberNumberPrefix(payload.cooperativeCodePrefix),
      payload.primaryContactMemberNumber
    ),
    state: "",
    startDate: "",
    token: "",
  }
}
