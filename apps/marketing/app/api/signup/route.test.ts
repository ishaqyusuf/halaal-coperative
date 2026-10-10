import { expect, test } from "bun:test"
import { POST } from "./route"

test("launch signup stops before onboarding when platform documents are drafts", async () => {
  const previousStage = process.env.MARKETING_STAGE
  process.env.MARKETING_STAGE = "launch"
  try {
    const response = await POST(
      new Request("https://halaalvest.com/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooperativeCodePrefix: "AMN",
          cooperativeName: "Amanah Staff Cooperative",
          primaryContactEmail: "admin@example.test",
          primaryContactFullName: "Amina Bello",
          primaryContactMemberNumber: "0001",
          workspaceSlug: "amanah-staff",
        }),
      })
    )
    expect(response.status).toBe(412)
    expect((await response.json()).error.code).toBe("PRECONDITION_FAILED")
  } finally {
    if (previousStage === undefined) delete process.env.MARKETING_STAGE
    else process.env.MARKETING_STAGE = previousStage
  }
})

test("production signup rejects an untrusted email-link origin before availability lookup", async () => {
  const names = [
    "NODE_ENV",
    "MARKETING_STAGE",
    "APP_ENV",
    "VERCEL_ENV",
    "MARKETING_APP_URL",
    "NEXT_PUBLIC_MARKETING_APP_URL",
    "PLATFORM_ROOT_DOMAIN",
  ] as const
  const previous = Object.fromEntries(
    names.map((name) => [name, process.env[name]])
  )
  const env = process.env as Record<string, string | undefined>
  env.NODE_ENV = "production"
  process.env.MARKETING_STAGE = "prelaunch"
  delete process.env.APP_ENV
  process.env.VERCEL_ENV = "preview"
  process.env.MARKETING_APP_URL = "https://halaalvest.com"
  delete process.env.NEXT_PUBLIC_MARKETING_APP_URL
  delete process.env.PLATFORM_ROOT_DOMAIN
  try {
    const response = await POST(
      new Request("https://preview.halaalvest.com/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cooperativeCodePrefix: "AMN",
          cooperativeName: "Amanah Staff Cooperative",
          primaryContactEmail: "admin@example.test",
          primaryContactFullName: "Amina Bello",
          primaryContactMemberNumber: "0001",
          workspaceSlug: "amanah-staff",
        }),
      })
    )
    expect(response.status).toBe(500)
    expect((await response.json()).error.code).toBe("PROVIDER_UNAVAILABLE")
  } finally {
    for (const name of names) {
      const value = previous[name]
      if (value === undefined) delete process.env[name]
      else env[name] = value
    }
  }
})
