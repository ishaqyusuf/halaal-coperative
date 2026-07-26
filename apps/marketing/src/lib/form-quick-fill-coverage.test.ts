import { describe, expect, test } from "bun:test"

describe("marketing Quick fill coverage", () => {
  test("registers Quick fill on every marketing data-entry form", async () => {
    const formFiles = [
      "../components/marketing/early-access-form.tsx",
      "../components/signup/onboarding-form.tsx",
      "../components/signup/signup-form.tsx",
    ]

    for (const file of formFiles) {
      const source = await Bun.file(new URL(file, import.meta.url)).text()

      expect(source).toContain("Quick fill")
    }
  })
})
