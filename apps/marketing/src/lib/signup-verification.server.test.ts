import { describe, expect, test } from "bun:test"
import { AppError } from "@halaalvest/errors"
import type { SignupVerificationPayload } from "./signup-flow"
import { resolveSignupVerification } from "./signup-verification.server"

const verification: SignupVerificationPayload = {
  cooperativeName: "Amanah Staff Cooperative",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  issuedAt: new Date().toISOString(),
  memberNumberPrefix: "MEM-",
  primaryContactEmail: "admin@example.test",
  primaryContactFullName: "Amina Bello",
  primaryContactMemberNumber: "0001",
  workspaceSlug: "amanah-staff",
}

function createDependencies(input?: {
  cooperativeNameAvailable?: boolean
  workspaceSlugAvailable?: boolean
}) {
  return {
    checkAvailability: async () => ({
      cooperativeName: {
        available: input?.cooperativeNameAvailable ?? true,
        normalized: verification.cooperativeName,
      },
      workspaceSlug: {
        available: input?.workspaceSlugAvailable ?? true,
        hostname: `${verification.workspaceSlug}.halaalvest.localhost`,
        normalized: verification.workspaceSlug,
      },
    }),
    verifyToken: () => verification,
  }
}

describe("resolveSignupVerification", () => {
  test("rethrows reportable token configuration failures", async () => {
    const failure = new AppError({
      code: "PROVIDER_UNAVAILABLE",
      publicMessage: "Signup verification is temporarily unavailable.",
    })

    await expect(
      resolveSignupVerification("signed-token", {
        ...createDependencies(),
        verifyToken: () => {
          throw failure
        },
      })
    ).rejects.toBe(failure)
  })

  test("accepts an unexpired link while its workspace identity is available", async () => {
    const result = await resolveSignupVerification(
      "signed-token",
      createDependencies()
    )

    expect(result).toEqual({
      status: "valid",
      value: verification,
    })
  })

  test("treats a link as expired after its cooperative workspace exists", async () => {
    const result = await resolveSignupVerification(
      "signed-token",
      createDependencies({
        cooperativeNameAvailable: false,
        workspaceSlugAvailable: false,
      })
    )

    expect(result).toEqual({
      errorMessage: "The verification link has expired.",
      status: "invalid",
    })
  })

  test("treats a link as expired when its reserved workspace slug is taken", async () => {
    const result = await resolveSignupVerification(
      "signed-token",
      createDependencies({ workspaceSlugAvailable: false })
    )

    expect(result).toEqual({
      errorMessage: "The verification link has expired.",
      status: "invalid",
    })
  })
})
