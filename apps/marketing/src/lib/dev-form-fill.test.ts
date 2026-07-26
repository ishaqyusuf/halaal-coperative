import { describe, expect, test } from "bun:test"
import { getDevFormDefaults } from "./dev-form-fill"

describe("marketing QA quick fill", () => {
  test("uses the cooperative slug for the first admin email", async () => {
    const values = await getDevFormDefaults("earlyAccess", {
      emailDomain: "ishaq.qa.test",
    })
    const expectedLocalPart = values.cooperativeName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63)
      .replace(/-+$/g, "")

    expect(values.primaryContactEmail).toBe(
      `${expectedLocalPart}@ishaq.qa.test`,
    )
  })

  test("keeps direct signup subdomain and admin email aligned", async () => {
    const values = await getDevFormDefaults("signup", {
      emailDomain: "ishaq.qa.test",
    })

    expect(values.primaryContactEmail).toBe(
      `${values.workspaceSlug}@ishaq.qa.test`,
    )
  })
})
