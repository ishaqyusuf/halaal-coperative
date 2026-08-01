import { describe, expect, test } from "bun:test"

describe("public pricing comparison", () => {
  test("keeps every capacity band and the feature matrix available", async () => {
    const source = await Bun.file(
      new URL("../components/marketing/pricing-data.ts", import.meta.url)
    ).text()

    for (const plan of [
      "Free Beta",
      "Starter",
      "Standard",
      "Growth",
      "Enterprise",
    ]) {
      expect(source).toContain(`name: "${plan}"`)
    }

    expect(source).toContain("pricingFeatureMatrix")
    expect(source).toContain("No percentage of member savings")
  })
})
