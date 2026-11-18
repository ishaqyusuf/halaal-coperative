import { describe, expect, test } from "bun:test"

describe("marketing Quick fill coverage", () => {
  test("registers the shared Quick fill on every marketing data-entry form", async () => {
    const formFiles = [
      "../components/external-deletion-request-form.tsx",
      "../components/signup/onboarding-form.tsx",
      "../components/signup/signup-form.tsx",
    ]

    for (const file of formFiles) {
      const source = await Bun.file(new URL(file, import.meta.url)).text()

      expect(source).toContain("<QaQuickFillButton")
      expect(source).toMatch(/visible=\{[^}]*quickFill/)
    }
  })

  test("keeps the destructive deletion confirmation manual", async () => {
    const source = await Bun.file(
      new URL(
        "../components/external-deletion-verification.tsx",
        import.meta.url
      )
    ).text()

    expect(source).not.toContain("QaQuickFillButton")
  })

  test("never uses faker's default English names", async () => {
    const source = await Bun.file(
      new URL("./dev-form-fill.ts", import.meta.url)
    ).text()

    expect(source).not.toContain("@faker-js/faker")
    expect(source).not.toContain("faker.person")
  })
})
