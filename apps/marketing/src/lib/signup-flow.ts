import { z } from "zod"
import {
  defaultCooperativeCountry,
  isCooperativeCountry,
  parseCooperativeSizeRangeValue,
} from "@halaalvest/domain"
import { isReservedTenantSubdomainLabel } from "@halaalvest/utils"

export function normalizeWorkspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function createWorkspaceSlugSuggestion(value: string) {
  return normalizeWorkspaceSlug(
    value
      .replace(/\bco[-\s]?operative\b/gi, " ")
      .replace(/\bcoop\b/gi, " "),
  )
}

export function isReservedWorkspaceSlug(value: string) {
  return isReservedTenantSubdomainLabel(value)
}

const workspaceSlugSchema = z
  .string()
  .trim()
  .min(2, "Choose a workspace subdomain.")
  .max(63, "Keep the workspace subdomain under 63 characters.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.")
  .refine((value) => !isReservedWorkspaceSlug(value), "That workspace subdomain is reserved.")

const memberNumberPrefixSchema = z
  .string()
  .trim()
  .max(12, "Keep the member number prefix short.")
  .regex(/^[a-zA-Z0-9-]*$/, "Use letters, numbers, and hyphens only.")
  .transform((value) => normalizeMemberNumberPrefix(value) ?? "")

const memberNumberSchema = z
  .string()
  .trim()
  .min(1, "Enter the primary contact cooperative number.")
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

export const signupIntentSchema = z.object({
  cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
  memberNumberPrefix: memberNumberPrefixSchema.optional().default(""),
  primaryContactEmail: z.email("Enter a valid email address."),
  primaryContactFullName: z.string().trim().min(2, "Enter the primary contact name."),
  primaryContactMemberNumber: memberNumberSchema,
  workspaceSlug: workspaceSlugSchema,
})

export const signupVerificationPayloadSchema = z.object({
  cooperativeName: z.string().trim().min(2),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  memberNumberPrefix: memberNumberPrefixSchema.optional().default(""),
  primaryContactEmail: z.email(),
  primaryContactFullName: z.string().trim().min(2),
  primaryContactMemberNumber: memberNumberSchema,
  workspaceSlug: workspaceSlugSchema,
})

export const onboardingFormSchema = z.object({
  city: requiredProfileTextField("Enter the cooperative city."),
  confirmPassword: z.string().min(8, "Confirm your password."),
  country: requiredProfileTextField("Select the cooperative country.").refine(
    isCooperativeCountry,
    "Select a valid cooperative country.",
  ),
  cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
  currentSize: cooperativeSizeRangeField,
  memberNumberPrefix: memberNumberPrefixSchema.optional().default(""),
  officeAddress: z.string().trim().min(10, "Enter the cooperative office address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  primaryContactEmail: z.email("Enter a valid email address."),
  primaryContactFullName: z.string().trim().min(2, "Enter the primary contact name."),
  primaryContactMemberNumber: memberNumberSchema,
  state: requiredProfileTextField("Enter the cooperative state."),
  startDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the cooperative start date."),
  token: z.string().min(1, "A verification token is required."),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
})

export type SignupIntentInput = z.infer<typeof signupIntentSchema>
export type SignupVerificationPayload = z.infer<typeof signupVerificationPayloadSchema>
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

export function composeMemberNumber(prefix: string | null | undefined, suffix: string) {
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

export function createSignupVerificationPayload(input: SignupIntentInput): SignupVerificationPayload {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60 * 24)
  const memberNumberPrefix = normalizeMemberNumberPrefix(input.memberNumberPrefix) ?? ""

  return {
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    cooperativeName: input.cooperativeName.trim(),
    memberNumberPrefix,
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactFullName: input.primaryContactFullName.trim(),
    primaryContactMemberNumber: getMemberNumberSuffix(
      memberNumberPrefix,
      input.primaryContactMemberNumber
    ),
    workspaceSlug: normalizeWorkspaceSlug(input.workspaceSlug),
  }
}

export function getOnboardingDefaultsFromVerification(payload: SignupVerificationPayload) {
  return {
    city: "",
    cooperativeName: payload.cooperativeName,
    currentSize: "",
    confirmPassword: "",
    country: defaultCooperativeCountry,
    memberNumberPrefix: payload.memberNumberPrefix,
    officeAddress: "",
    password: "",
    primaryContactEmail: payload.primaryContactEmail,
    primaryContactFullName: payload.primaryContactFullName,
    primaryContactMemberNumber: getMemberNumberSuffix(
      payload.memberNumberPrefix,
      payload.primaryContactMemberNumber
    ),
    state: "",
    startDate: "",
    token: "",
  }
}
