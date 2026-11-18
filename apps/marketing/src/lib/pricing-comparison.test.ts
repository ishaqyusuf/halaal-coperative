import { describe, expect, test } from "bun:test"
import { cooperativeMobileAccessTerms } from "@halaalvest/domain/cooperative-mobile-access"
import { platformBillingPrices } from "@halaalvest/domain/platform-billing"
import {
  monthlyBillTerms,
  pricingFeePrinciples,
  publicPriceList,
  publicPricingSummary,
} from "../components/marketing/pricing-data"

const pricingSurfaces = [
  "../components/marketing/pricing-data.ts",
  "../components/marketing/pricing-comparison.tsx",
  "../components/marketing/homepage/homepage.tsx",
  "../components/marketing/homepage/homepage-data.ts",
  "../components/marketing/homepage/homepage-bill.tsx",
  "../components/signup/signup-form.tsx",
]

describe("public pricing", () => {
  test("publishes the platform bill: seat fee, assistant allowance and mobile access", () => {
    expect(
      publicPriceList.map(({ item, note, price }) => [item, price, note])
    ).toEqual([
      ["Seat fee", "₦50", "per active member, each month"],
      ["Website assistant", "500 free", "then ₦15 a message, up to your cap"],
      ["Mobile app access", "₦1,000", "per member, for 12 months"],
      ["Share of savings, financing, repayments or profits", "None", undefined],
    ])
    expect(publicPricingSummary).toBe(
      "₦50 per active member a month, with 500 website assistant messages included. Mobile access is optional, at ₦1,000 per member for 12 months."
    )
    expect(monthlyBillTerms[0]).toContain("one bill a month")
    expect(pricingFeePrinciples[0]).toContain("No percentage of member savings")
  })

  test("public amounts are the amounts the dashboard bills", () => {
    // If billing prices change, this fails until the public copy (and the
    // expectations above) are updated with them.
    expect(platformBillingPrices).toMatchObject({
      assistantFreeMessages: 500,
      assistantMessagePrice: 15,
      currencyCode: "NGN",
      seatFee: 50,
    })
    expect(cooperativeMobileAccessTerms).toMatchObject({
      amount: 1000,
      currencyCode: "NGN",
      termMonths: 12,
    })
  })

  test("no longer says the web workspace is free", async () => {
    for (const path of pricingSurfaces) {
      const source = await Bun.file(new URL(path, import.meta.url)).text()

      expect(source).not.toMatch(
        /free on the web|workspace is free|at no cost/i
      )
      expect(source).not.toContain("Is Halaalvest really free")
    }
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
