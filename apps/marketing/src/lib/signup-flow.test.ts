import { describe, expect, test } from "bun:test"
import { cooperativeSizeRanges } from "@halaalvest/domain"
import {
  createWorkspaceSlugSuggestion,
  onboardingFormSchema,
} from "./signup-flow"

const validOnboardingInput = {
  city: "Lagos Island",
  confirmPassword: "password123",
  country: "Nigeria",
  cooperativeName: "Amanah Staff Cooperative",
  currentSize: "25",
  memberNumberPrefix: "MEM-",
  officeAddress: "12 Marina Road, Lagos Island, Lagos",
  password: "password123",
  primaryContactEmail: "admin@example.test",
  primaryContactFullName: "Amina Bello",
  primaryContactMemberNumber: "0001",
  state: "Lagos",
  startDate: "2025-01-01",
  token: "signed-token",
}

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
