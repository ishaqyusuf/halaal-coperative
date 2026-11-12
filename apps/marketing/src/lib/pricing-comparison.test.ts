import { describe, expect, test } from "bun:test"
import {
  pricingFeePrinciples,
  publicPriceList,
} from "../components/marketing/pricing-data"

const pricingSurfaces = [
  "../components/marketing/pricing-data.ts",
  "../components/marketing/pricing-section.tsx",
  "../components/marketing/pricing-comparison.tsx",
  "../components/marketing/experiences/passbook-v3.tsx",
  "../components/marketing/experiences/ramp-v2.tsx",
]

describe("public pricing", () => {
  test("publishes the free web workspace and cooperative-managed mobile access", () => {
    expect(publicPriceList.map(({ item, price }) => [item, price])).toEqual([
      ["Web workspace", "Free"],
      ["Mobile app access", "Through your cooperative"],
      ["Share of savings, financing, repayments or profits", "None"],
    ])
    expect(pricingFeePrinciples[0]).toContain("No percentage of member savings")
  })

  test("no longer publishes the historical tenant plan bands", async () => {
    for (const path of pricingSurfaces) {
      const source = await Bun.file(new URL(path, import.meta.url)).text()

      expect(source).not.toContain("SUBSCRIPTION_PLAN_DEFINITIONS")
      expect(source).not.toMatch(/\b(Free Beta|Starter|Growth)\b/)
      expect(source).not.toContain("active-member")
      expect(source).not.toMatch(/NGN \d|₦\d+k/)
    }
  })
})
