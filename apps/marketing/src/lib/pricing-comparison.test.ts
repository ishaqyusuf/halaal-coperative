import { describe, expect, test } from "bun:test"
import { SUBSCRIPTION_PLAN_DEFINITIONS } from "@halaalvest/domain/subscriptions"
import {
  freeBetaMonthlyPriceLabel,
  pricingPlans,
  standardMonthlyPriceLabel,
} from "../components/marketing/pricing-data"

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

  test("renders the catalog's public price bands in both homepage designs", async () => {
    expect(pricingPlans.map((plan) => plan.price)).toEqual([
      "NGN 0",
      "NGN 12.5k–18.75k",
      "NGN 50k–75k",
      "NGN 150k–225k",
      "Custom",
    ])
    expect(SUBSCRIPTION_PLAN_DEFINITIONS.standard.monthlyPrice).toMatchObject({
      currencyCode: "NGN",
      minimum: 50000,
      maximum: 75000,
    })
    expect(standardMonthlyPriceLabel).toBe(pricingPlans[2]?.price)
    expect(freeBetaMonthlyPriceLabel).toBe(pricingPlans[0]?.price)
    const rampSource = await Bun.file(
      new URL(
        "../components/marketing/experiences/ramp-v2.tsx",
        import.meta.url
      )
    ).text()
    expect(rampSource).toContain("standardMonthlyPriceLabel.replace")
    expect(rampSource).not.toContain('price="₦50k–75k"')
  })
})
