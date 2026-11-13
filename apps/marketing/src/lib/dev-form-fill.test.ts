import { describe, expect, test } from "bun:test"
import { getDevFormDefaults } from "./dev-form-fill"

const nameEmail = /^[a-z]+(\.[a-z]+)*@ishaq\.qa\.test$/

function emailMatchesName(email: string, fullName: string) {
  const local = email.split("@")[0]!.replaceAll(".", "")
  const parts = fullName.toLowerCase().split(" ")
  return new RegExp(
    `^(${parts.join("|")}|${parts.map((p) => p[0]).join("|")})+$`
  ).test(local)
}

describe("marketing QA quick fill", () => {
  test("early access uses a name-based contact email on the QA domain", async () => {
    const values = await getDevFormDefaults("earlyAccess", {
      emailDomain: "ishaq.qa.test",
    })

    expect(values.primaryContactEmail).toMatch(nameEmail)
    expect(
      emailMatchesName(
        values.primaryContactEmail,
        values.primaryContactFullName
      )
    ).toBe(true)
    expect(values.phone).toMatch(/^\+234\d{10}$/)
    expect(values.setupNeeds.length).toBeGreaterThanOrEqual(2)
  })

  test("signup gives a valid slug, code prefix and name-based admin email", async () => {
    const values = await getDevFormDefaults("signup", {
      emailDomain: "ishaq.qa.test",
    })

    expect(values.workspaceSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    expect(values.workspaceSlug.length).toBeLessThanOrEqual(63)
    expect(values.cooperativeCodePrefix).toMatch(/^[A-Z]{3,5}$/)
    expect(values.primaryContactEmail).toMatch(nameEmail)
    expect(
      emailMatchesName(
        values.primaryContactEmail,
        values.primaryContactFullName
      )
    ).toBe(true)
  })

  test("never repeats a cooperative, contact or email across fills", async () => {
    const seen = new Set<string>()
    for (let index = 0; index < 50; index += 1) {
      const values = await getDevFormDefaults("signup", {
        emailDomain: "ishaq.qa.test",
      })
      for (const value of [
        values.cooperativeName,
        values.primaryContactEmail,
        values.primaryContactFullName,
        values.primaryContactMemberNumber,
      ]) {
        expect(seen.has(value)).toBe(false)
        seen.add(value)
      }
    }
  })

  test("onboarding fills a valid office profile and leaves secrets empty", async () => {
    const values = await getDevFormDefaults("onboarding", {
      emailDomain: "ishaq.qa.test",
    })

    expect(values.officeAddress.length).toBeGreaterThanOrEqual(10)
    expect(values.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(values.country).toBe("Nigeria")
    expect(values.token).toBe("")
    expect(values).not.toHaveProperty("password")
  })

  test("delete-account request uses a name-based email", async () => {
    const values = await getDevFormDefaults("deletionRequest", {
      emailDomain: "ishaq.qa.test",
    })

    expect(values.email).toMatch(nameEmail)
    expect(values.workspaceSlug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  test("onboarding address, city, state and country agree (QA F18)", async () => {
    for (let index = 0; index < 50; index += 1) {
      const values = await getDevFormDefaults("onboarding", {
        emailDomain: "ishaq.qa.test",
      })
      expect(values.country).toBe("Nigeria")
      expect(values.officeAddress).toContain(
        `${values.city}, ${values.state} State`
      )
    }
  })

  test("onboarding location follows the verified cooperative's town", async () => {
    const values = await getDevFormDefaults("onboarding", {
      cooperativeName: "Kano Barakah Traders Cooperative Society",
      emailDomain: "ishaq.qa.test",
    })
    expect(values.state).toBe("Kano")
    expect(values.officeAddress).toContain("Kano State")
  })
})
