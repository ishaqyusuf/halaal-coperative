import { describe, expect, test } from "bun:test"
import {
  assertCompleteQaFormCoverage,
  createQaMemberFixture,
  normalizeQaAcceleratorEnvironment,
  normalizeQaDomain,
  resolveQaAcceleratorCapability,
  resolveQaExternalEffectPolicy,
  qaFormInventory,
} from "./qa-accelerator"

describe("QA accelerator policy", () => {
  test.each(["local", "development", "preview"] as const)(
    "is available in %s only with complete private configuration",
    (environment) => {
      expect(
        resolveQaAcceleratorCapability({
          clientKind: "web",
          contractVersion: 1,
          enabled: true,
          environment,
          hasCredentialSecret: true,
          permittedClientKinds: ["mobile", "web"],
        })
      ).toMatchObject({ available: true, environment, status: "available" })
    }
  )

  test("fails closed in production and for client-controlled mismatches", () => {
    for (const input of [
      {
        environment: "production" as const,
        enabled: true,
        hasCredentialSecret: true,
      },
      {
        environment: "preview" as const,
        enabled: false,
        hasCredentialSecret: true,
      },
      {
        environment: "local" as const,
        enabled: true,
        hasCredentialSecret: false,
      },
    ]) {
      expect(
        resolveQaAcceleratorCapability({
          clientKind: "mobile",
          contractVersion: 1,
          permittedClientKinds: ["mobile"],
          ...input,
        })
      ).toMatchObject({ available: false, status: "unavailable" })
    }
  })

  test("reports version skew without exposing configuration", () => {
    expect(
      resolveQaAcceleratorCapability({
        clientKind: "web",
        contractVersion: 2,
        enabled: true,
        environment: "preview",
        hasCredentialSecret: true,
        permittedClientKinds: ["web"],
      })
    ).toMatchObject({
      available: false,
      contractVersion: 1,
      status: "upgrade-required",
    })
  })

  test("normalizes environments and exact domains", () => {
    expect(normalizeQaAcceleratorEnvironment("DEV")).toBe("development")
    expect(normalizeQaAcceleratorEnvironment("prod")).toBe("production")
    expect(normalizeQaDomain(" @Safa.QA.Test. ")).toBe("safa.qa.test")
  })

  test("allows routed QA email but blocks unadapted irreversible effects", () => {
    expect(
      resolveQaExternalEffectPolicy({
        effect: "email",
        isQaTenant: true,
        isRoutedQaEmail: true,
      })
    ).toEqual({ allowed: true, reason: "routed-qa-email" })
    expect(
      resolveQaExternalEffectPolicy({
        effect: "financial-posting",
        isQaTenant: true,
      })
    ).toEqual({ allowed: false, reason: "qa-effect-blocked" })
  })

  test("enforces one typed declaration per inventoried form", () => {
    expect(() =>
      assertCompleteQaFormCoverage({
        coverage: [
          { formId: "member.create", kind: "recipe" },
          {
            formId: "auth.password",
            kind: "excluded",
            reason: "Secrets stay manual.",
          },
        ],
        formIds: ["member.create", "auth.password"],
      })
    ).not.toThrow()
    expect(() =>
      assertCompleteQaFormCoverage({
        coverage: [{ formId: "member.create", kind: "recipe" }],
        formIds: ["member.create", "finance.disburse"],
      })
    ).toThrow("finance.disburse")
  })

  test("creates deterministic member drafts bound to the exact QA Domain", () => {
    const context = {
      currencyCode: "NGN",
      invocation: 2,
      qaDomain: "safa.qa.test",
      seed: "release-42",
      timezone: "Africa/Lagos",
    }
    expect(createQaMemberFixture(context)).toEqual(
      createQaMemberFixture(context)
    )
    expect(createQaMemberFixture(context).email).toEndWith("@safa.qa.test")
    expect(createQaMemberFixture(context).fullName).toStartWith("QA Member")
  })

  test("keeps the published cross-platform form inventory complete", () => {
    assertCompleteQaFormCoverage({
      coverage: qaFormInventory,
      formIds: qaFormInventory.map((entry) => entry.formId),
    })
    expect(
      qaFormInventory.some(
        (entry) => entry.formId === "member.kyc" && entry.kind === "excluded"
      )
    ).toBe(true)
    expect(
      qaFormInventory.some(
        (entry) =>
          entry.formId === "financing.request" && entry.kind === "prerequisite"
      )
    ).toBe(true)
  })
})
