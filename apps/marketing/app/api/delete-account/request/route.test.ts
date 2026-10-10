import { describe, expect, test } from "bun:test"
import { POST } from "./route"

const environmentKeys = [
  "NODE_ENV",
  "APP_ENV",
  "VERCEL_ENV",
  "EMAIL_DELIVERY_MODE",
  "EMAIL_QA_DOMAIN_ROUTES",
  "RESEND_API_KEY",
  "EMAIL_FROM_ADDRESS",
  "MARKETING_APP_URL",
  "HALAALVEST_DATABASE_URL",
  "PRIVACY_REQUEST_CHALLENGE_SECRET",
] as const

describe("external deletion request API", () => {
  test("rejects direct Preview POSTs when the request form is unavailable", async () => {
    const original = Object.fromEntries(
      environmentKeys.map((key) => [key, process.env[key]])
    )
    try {
      Reflect.set(process.env, "NODE_ENV", "production")
      process.env.APP_ENV = "preview"
      process.env.VERCEL_ENV = "preview"
      process.env.EMAIL_DELIVERY_MODE = "console"
      delete process.env.EMAIL_QA_DOMAIN_ROUTES
      process.env.RESEND_API_KEY = "test-key"
      process.env.EMAIL_FROM_ADDRESS = "qa@halaalvest.com"
      Reflect.set(
        process.env,
        "MARKETING_APP_URL",
        "https://preview.halaalvest.com"
      )
      delete process.env.HALAALVEST_DATABASE_URL
      Reflect.set(
        process.env,
        "PRIVACY_REQUEST_CHALLENGE_SECRET",
        "x".repeat(32)
      )

      const response = await POST(
        new Request(
          "https://preview.halaalvest.com/api/delete-account/request",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "not JSON",
          }
        )
      )
      const result = (await response.json()) as { error: { code: string } }
      expect(result.error.code).toBe("PROVIDER_UNAVAILABLE")
    } finally {
      for (const key of environmentKeys) {
        const value = original[key]
        if (value === undefined) delete process.env[key]
        else Reflect.set(process.env, key, value)
      }
    }
  })
})
