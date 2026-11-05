import { describe, expect, test } from "bun:test"
import {
  mobileAppAccessPrices,
  pricingFeePrinciples,
  publicPriceList,
} from "../components/marketing/pricing-data"

const pricingSurfaces = [
  "../components/marketing/pricing-data.ts",
  "../components/marketing/pricing-section.tsx",
  "../components/marketing/pricing-comparison.tsx",
  "../components/marketing/experiences/ramp-v2.tsx",
]

describe("public pricing", () => {
  test("publishes the free web workspace and per-user app access prices", () => {
    expect(publicPriceList.map(({ item, price }) => [item, price])).toEqual([
      ["Web workspace", "Free"],
      ["Mobile app access", "US$1.99 / year"],
      ["Share of savings, financing, repayments or profits", "None"],
    ])
    expect(mobileAppAccessPrices).toEqual({
      oneYear: "US$1.99",
      sixMonths: "US$0.99",
    })
    expect(publicPriceList[1]?.note).toBe("or US$0.99 for six months")
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
