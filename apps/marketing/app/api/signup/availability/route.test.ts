import { describe, expect, test } from "bun:test"
import { handleSignupAvailabilityRequest } from "./route"

describe("signup availability API error contract", () => {
  test("returns the shared safe envelope when availability lookup fails", async () => {
    const response = await handleSignupAvailabilityRequest(
      new Request(
        "https://halaalvest.test/api/signup/availability?cooperativeName=Test&workspaceSlug=test"
      ),
      async () => {
        throw Object.assign(
          new Error("Prisma lookup failed for private cooperative"),
          { code: "P2028" }
        )
      }
    )
    const body = (await response.json()) as {
      error: { code: string; message: string; referenceId: string }
    }

    expect(response.status).toBe(500)
    expect(body.error.code).toBe("DATABASE_TRANSACTION_TIMEOUT")
    expect(body.error.referenceId).toStartWith("ERR-")
    expect(JSON.stringify(body)).not.toContain("Prisma")
    expect(JSON.stringify(body)).not.toContain("private cooperative")
  })
})
