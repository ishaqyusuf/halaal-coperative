import { describe, expect, test } from "bun:test"
import { cooperativeMobileAccessTerms } from "./cooperative-mobile-access"
import { platformBillingPrices } from "./platform-billing"
import {
  policyPublications,
  publicPolicies,
  publicPolicyRevision,
} from "./public-policies"

const naira = (amount: number) => `₦${amount.toLocaleString("en-US")}`

function billingPolicyText() {
  const policy = publicPolicies["billing-policy"]
  return [
    policy.introduction,
    ...policy.sections.map((section) => `${section.title}\n${section.body}`),
  ].join("\n")
}

describe("public billing policy", () => {
  test("describes every line of the monthly bill", () => {
    expect(
      publicPolicies["billing-policy"].sections.map((section) => section.title)
    ).toEqual([
      "Seat fee",
      "Website assistant",
      "Mobile access",
      "The monthly bill",
      "Questions about a charge",
      "Review before launch",
    ])
  })

  // Policy text is versioned, so amounts are written out rather than
  // interpolated. A price change fails here until the text and revision are
  // reviewed together.
  test("states the amounts the platform bill charges", () => {
    const text = billingPolicyText()
    expect(platformBillingPrices).toMatchObject({
      currencyCode: "NGN",
      seatFee: 35,
      assistantFreeMessages: 500,
      assistantMessagePrice: 15,
    })
    expect(cooperativeMobileAccessTerms).toMatchObject({
      amount: 1000,
      currencyCode: "NGN",
      termMonths: 12,
    })
    expect(text).toContain(
      `${naira(platformBillingPrices.seatFee)} per seat for that month`
    )
    expect(text).toContain(
      `share ${platformBillingPrices.assistantFreeMessages} website assistant messages each month at no charge`
    )
    expect(text).toContain(
      `Each message above ${platformBillingPrices.assistantFreeMessages} then costs ${naira(platformBillingPrices.assistantMessagePrice)}, up to that cap`
    )
    expect(text).toContain(
      `${naira(cooperativeMobileAccessTerms.amount)} for ${cooperativeMobileAccessTerms.termMonths} months`
    )
    expect(text).toContain("Paystack")
    expect(text).toContain("bank transfer")
  })

  test("stays a draft until owner and legal approval", () => {
    expect(policyPublications["billing-policy"]).toEqual({
      status: "draft",
      version: publicPolicyRevision,
    })
  })
})
