import { describe, expect, mock, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { cooperativeMobileAccessTerms } from "@halaalvest/domain/cooperative-mobile-access"
import { platformBillingPrices } from "@halaalvest/domain/platform-billing"
import {
  financingLeft,
  heroMembers,
  payrollDeduction,
  sampleMonthlyBill,
  savingsBalance,
} from "./homepage-data"

mock.module("next/font/google", () => {
  const font = (name: string) => () => ({
    className: name,
    style: { fontFamily: name },
    variable: `${name}-variable`,
  })
  return {
    Public_Sans: font("public-sans"),
    Schibsted_Grotesk: font("schibsted-grotesk"),
  }
})

async function renderHomepage(signupHref = "/signup") {
  const { Homepage } = await import("./homepage")
  return renderToStaticMarkup(createElement(Homepage, { signupHref }))
}

const naira = (amount: number) => `₦${amount.toLocaleString("en-US")}`

describe("homepage", () => {
  test("leads with the owner headline and sign-up, never a request form", async () => {
    const html = await renderHomepage("/signup")

    expect(html).toContain("Start running your cooperative here")
    expect(html).toContain('href="/signup"')
    expect(html).toContain("Create your workspace")
    expect(html).toContain('href="/login"')
    expect(html).not.toContain("#early-access")
    expect(html).not.toContain("Request access")
    expect(html).not.toContain("Request a cooperative workspace")
  })

  test("uses the sign-up link it is given", async () => {
    const html = await renderHomepage("https://example.test/signup")
    expect(html).toContain('href="https://example.test/signup"')
  })

  test("prices come from the platform billing constants", async () => {
    const html = await renderHomepage()

    expect(html).toContain(naira(platformBillingPrices.seatFee))
    expect(html).toContain(naira(platformBillingPrices.assistantMessagePrice))
    expect(html).toContain(naira(cooperativeMobileAccessTerms.amount))
    expect(html).toContain("Website AI assistant")
    expect(html).toContain("Share of member funds")
    expect(html).toContain("never a percentage")
    expect(html).not.toMatch(/free on the web/i)
  })

  test("shows the AI assistant band, officer jobs, members band and sample note", async () => {
    const html = await renderHomepage()

    for (const text of [
      "Ask the AI.",
      "A treasurer asks",
      "Officers do the month&#x27;s work once",
      "Every member can check their own account",
      "Be a guarantor for FN-0201",
      "Run next month&#x27;s books on Halaalvest",
      "every name and figure on this page are samples",
    ]) {
      expect(html).toContain(text)
    }
  })
})

describe("homepage sample statements", () => {
  test("each payroll line reconciles with the member's statement", () => {
    for (const member of heroMembers) {
      if (member.held) {
        expect(savingsBalance(member)).toBe(member.broughtForward)
        continue
      }
      expect(savingsBalance(member)).toBe(member.broughtForward + member.contribution)
      expect(payrollDeduction(member)).toBe(
        member.contribution + (member.financing?.repayment ?? 0)
      )
    }
  })

  test("Amina's figures match the rest of the page", () => {
    const amina = heroMembers.find((member) => member.key === "amina")!
    expect(savingsBalance(amina)).toBe(437_000)
    expect(financingLeft(amina.financing!)).toBe(450_000)
    expect(payrollDeduction(amina)).toBe(55_000)
  })
})

describe("homepage sample bill", () => {
  test("prices seats, assistant overage and mobile access with the billing rules", () => {
    const bill = sampleMonthlyBill({ assistantMessagesUsed: 620, mobileApprovals: 6, seats: 431 })

    expect(bill.seatAmount).toBe(431 * platformBillingPrices.seatFee)
    expect(bill.extraMessages).toBe(620 - platformBillingPrices.assistantFreeMessages)
    expect(bill.assistantAmount).toBe(bill.extraMessages * platformBillingPrices.assistantMessagePrice)
    expect(bill.mobileAmount).toBe(6 * cooperativeMobileAccessTerms.amount)
    expect(bill.total).toBe(bill.seatAmount + bill.assistantAmount + bill.mobileAmount)
  })

  test("messages inside the allowance cost nothing, and bad input counts as zero", () => {
    const bill = sampleMonthlyBill({ assistantMessagesUsed: 420, mobileApprovals: -3, seats: Number.NaN })
    expect(bill.assistantAmount).toBe(0)
    expect(bill.mobileAmount).toBe(0)
    expect(bill.seats).toBe(0)
    expect(bill.total).toBe(0)
  })
})
