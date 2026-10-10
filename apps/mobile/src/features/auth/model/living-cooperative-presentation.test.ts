import { describe, expect, test } from "bun:test"

import { getLivingCooperativePresentation } from "./living-cooperative-presentation"

describe("getLivingCooperativePresentation", () => {
  test("keeps the initial member gateway concise", () => {
    expect(
      getLivingCooperativePresentation({
        hasVerifiedProfile: false,
        isSubmitting: false,
        largeTextLayout: false,
      })
    ).toEqual({
      accessibilityLabel: "Welcome back to HalaalVest.",
      actionLabel: "Sign in",
      accent: null,
      formTitle: "Sign in",
      lead: "Welcome back.",
    })
  })

  test("communicates cooperative lookup while submitting", () => {
    expect(
      getLivingCooperativePresentation({
        hasVerifiedProfile: false,
        isSubmitting: true,
        largeTextLayout: false,
      }).actionLabel
    ).toBe("Finding cooperative")
  })

  test("turns the confirmed cooperative into the gateway identity", () => {
    expect(
      getLivingCooperativePresentation({
        hasVerifiedProfile: true,
        isSubmitting: true,
        largeTextLayout: false,
        tenantName: "Amanah Cooperative",
      })
    ).toEqual({
      accessibilityLabel:
        "Welcome back to Amanah Cooperative. Cooperative confirmed.",
      actionLabel: "Opening cooperative",
      accent: "Amanah.",
      formTitle: "",
      lead: "Welcome back to",
    })
  })

  test("keeps the complete tenant name when it is not a cooperative suffix", () => {
    expect(
      getLivingCooperativePresentation({
        hasVerifiedProfile: true,
        isSubmitting: true,
        largeTextLayout: false,
        tenantName: "North Star Members Society",
      }).accent
    ).toBe("North Star Members Society.")
  })

  test("reflows to one stable form title at large text", () => {
    expect(
      getLivingCooperativePresentation({
        hasVerifiedProfile: true,
        isSubmitting: true,
        largeTextLayout: true,
        tenantName: "Amanah Cooperative",
      })
    ).toMatchObject({ accent: null, formTitle: "Sign in", lead: "" })
  })
})
