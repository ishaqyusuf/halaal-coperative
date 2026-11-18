import { describe, expect, test } from "bun:test"
import { cooperativeSizeRanges } from "@halaalvest/domain"
import {
  cooperativeCountryCode,
  createCompletedOnboardingPath,
  createSignupVerificationPayload,
  createWorkspaceSlugSuggestion,
  getOnboardingDefaultsFromVerification,
  onboardingFormSchema,
  signupIntentSchema,
  signupVerificationPayloadSchema,
} from "./signup-flow"

const validOnboardingInput = {
  city: "Lagos Island",
  confirmPassword: "password123",
  cooperativeCodePrefix: "AMN",
  country: "Nigeria",
  cooperativeName: "Amanah Staff Cooperative",
  currentSize: "25",
  officeAddress: "12 Marina Road, Lagos Island, Lagos",
  password: "password123",
  primaryContactEmail: "admin@example.test",
  primaryContactFullName: "Amina Bello",
  primaryContactMemberNumber: "0001",
  state: "Lagos",
  startDate: "2025-01-01",
  token: "signed-token",
}

describe("createCompletedOnboardingPath", () => {
  test("removes the bearer token and marks the onboarding history entry completed", () => {
    expect(
      createCompletedOnboardingPath(
        "https://halaalvest.localhost/onboarding?token=signed-token"
      )
    ).toBe("/onboarding?status=completed")
  })
})

describe("createWorkspaceSlugSuggestion", () => {
  test("joins a two-word cooperative name with a hyphen", () => {
    expect(createWorkspaceSlugSuggestion("Amanah Unity")).toBe("amanah-unity")
  })

  test("uses only the first two words of a longer cooperative name", () => {
    expect(
      createWorkspaceSlugSuggestion("Amanah Unity Multipurpose Cooperative")
    ).toBe("amanah-unity")
  })

  test("normalizes punctuation before selecting the first two words", () => {
    expect(createWorkspaceSlugSuggestion("Amanah & Unity Cooperative")).toBe(
      "amanah-unity"
    )
  })
})

describe("onboardingFormSchema", () => {
  test("accepts valid cooperative location fields", () => {
    const result = onboardingFormSchema.safeParse(validOnboardingInput)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.city).toBe("Lagos Island")
      expect(result.data.country).toBe("Nigeria")
      expect(result.data.state).toBe("Lagos")
    }
  })

  test("accepts configured cooperative size range values", () => {
    for (const range of cooperativeSizeRanges) {
      const result = onboardingFormSchema.safeParse({
        ...validOnboardingInput,
        currentSize: String(range.value),
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.currentSize).toBe(range.value)
      }
    }
  })

  test("rejects invalid cooperative size values", () => {
    for (const currentSize of ["", "large", "120", "9999"]) {
      const result = onboardingFormSchema.safeParse({
        ...validOnboardingInput,
        currentSize,
      })

      expect(result.success).toBe(false)
    }
  })

  test("requires cooperative city, state, and country", () => {
    for (const field of ["city", "state", "country"] as const) {
      const result = onboardingFormSchema.safeParse({
        ...validOnboardingInput,
        [field]: "",
      })

      expect(result.success).toBe(false)
    }
  })

  test("rejects unsupported cooperative country values", () => {
    const result = onboardingFormSchema.safeParse({
      ...validOnboardingInput,
      country: "Atlantis",
    })

    expect(result.success).toBe(false)
  })
})

const validSignupInput = {
  acceptedTerms: true,
  cooperativeCodePrefix: "usc",
  cooperativeName: "Unity Staff Cooperative",
  country: "Nigeria",
  primaryContactEmail: "Admin@Example.test",
  primaryContactFullName: "Amina Bello",
  primaryContactMemberNumber: "0001",
  primaryContactPhone: "0803 123 4567",
  primaryContactPhoneCountry: "NG",
  workspaceSlug: "unity-staff",
}

const acknowledgement = {
  confirmed: true as const,
  documents: [
    { contentHash: "a".repeat(64), documentType: "terms" as const, documentVersion: "1" },
    { contentHash: "b".repeat(64), documentType: "privacy" as const, documentVersion: "1" },
  ],
}

describe("signupIntentSchema", () => {
  test("accepts country, an optional phone and the accepted terms", () => {
    expect(signupIntentSchema.safeParse(validSignupInput).success).toBe(true)
    const withoutPhone = signupIntentSchema.parse({
      ...validSignupInput,
      primaryContactPhone: undefined,
      primaryContactPhoneCountry: undefined,
    })
    expect(withoutPhone.primaryContactPhone).toBe("")
  })

  test("requires the terms and a supported country", () => {
    for (const input of [
      { ...validSignupInput, acceptedTerms: false },
      { ...validSignupInput, country: "" },
      { ...validSignupInput, country: "Atlantis" },
    ]) {
      expect(signupIntentSchema.safeParse(input).success).toBe(false)
    }
  })

  test("checks the phone against its own country", () => {
    const result = signupIntentSchema.safeParse({
      ...validSignupInput,
      primaryContactPhone: "+447400123456",
      primaryContactPhoneCountry: "NG",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(["primaryContactPhone"])
    // A phone in another country than the cooperative is fine.
    expect(
      signupIntentSchema.safeParse({
        ...validSignupInput,
        primaryContactPhone: "+447400123456",
        primaryContactPhoneCountry: "GB",
      }).success
    ).toBe(true)
  })
})

describe("createSignupVerificationPayload", () => {
  test("carries the country, the E.164 phone and the accepted documents", () => {
    const payload = createSignupVerificationPayload(
      signupIntentSchema.parse(validSignupInput),
      acknowledgement
    )
    expect(payload.country).toBe("Nigeria")
    expect(payload.primaryContactPhone).toBe("+2348031234567")
    expect(payload.primaryContactEmail).toBe("admin@example.test")
    expect(payload.legalAcknowledgement).toEqual(acknowledgement)
    expect(signupVerificationPayloadSchema.parse(payload)).toEqual(payload)
    expect(getOnboardingDefaultsFromVerification(payload).country).toBe(
      "Nigeria"
    )
  })

  test("still reads links issued before country and phone were asked", () => {
    const payload = createSignupVerificationPayload(
      signupIntentSchema.parse({
        ...validSignupInput,
        country: "Ghana",
        primaryContactPhone: "",
      })
    )
    expect(payload.primaryContactPhone).toBeUndefined()
    const parsed = signupVerificationPayloadSchema.parse({
      ...payload,
      country: undefined,
    })
    expect(getOnboardingDefaultsFromVerification(parsed).country).toBe(
      "Nigeria"
    )
  })

  test("maps supported countries to ISO codes", () => {
    expect(cooperativeCountryCode("Nigeria")).toBe("NG")
    expect(cooperativeCountryCode("United Kingdom")).toBe("GB")
    expect(cooperativeCountryCode("Atlantis")).toBeNull()
  })
})
