import { z } from "zod"

export function normalizeWorkspaceSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function positiveIntegerField(message: string) {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return value
    }

    if (typeof value === "number") {
      return value
    }

    const normalized = Number(value)

    return Number.isFinite(normalized) ? normalized : value
  }, z.number().int().positive(message))
}

export const signupIntentSchema = z.object({
  cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
  primaryContactEmail: z.email("Enter a valid email address."),
  primaryContactFullName: z.string().trim().min(2, "Enter the primary contact name."),
})

export const signupVerificationPayloadSchema = z.object({
  cooperativeName: z.string().trim().min(2),
  expiresAt: z.string().datetime(),
  issuedAt: z.string().datetime(),
  primaryContactEmail: z.email(),
  primaryContactFullName: z.string().trim().min(2),
  workspaceSlug: z.string().trim().min(2).regex(/^[a-z0-9-]+$/),
})

export const onboardingFormSchema = z.object({
  cooperativeName: z.string().trim().min(2, "Enter the cooperative name."),
  currentSize: positiveIntegerField("Enter the current cooperative size."),
  officeAddress: z.string().trim().min(10, "Enter the cooperative office address."),
  primaryContactEmail: z.email("Enter a valid email address."),
  primaryContactFullName: z.string().trim().min(2, "Enter the primary contact name."),
  startDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the cooperative start date."),
  token: z.string().min(1, "A verification token is required."),
})

export type SignupIntentInput = z.infer<typeof signupIntentSchema>
export type SignupVerificationPayload = z.infer<typeof signupVerificationPayloadSchema>
export type OnboardingFormInput = z.infer<typeof onboardingFormSchema>

export function createSignupVerificationPayload(input: SignupIntentInput): SignupVerificationPayload {
  const issuedAt = new Date()
  const expiresAt = new Date(issuedAt.getTime() + 1000 * 60 * 60 * 24)

  return {
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    cooperativeName: input.cooperativeName.trim(),
    primaryContactEmail: input.primaryContactEmail.trim().toLowerCase(),
    primaryContactFullName: input.primaryContactFullName.trim(),
    workspaceSlug: normalizeWorkspaceSlug(input.cooperativeName),
  }
}

export function getOnboardingDefaultsFromVerification(payload: SignupVerificationPayload) {
  return {
    cooperativeName: payload.cooperativeName,
    currentSize: undefined,
    officeAddress: "",
    primaryContactEmail: payload.primaryContactEmail,
    primaryContactFullName: payload.primaryContactFullName,
    startDate: "",
    token: "",
  }
}
