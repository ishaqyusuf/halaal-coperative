import { describe, expect, mock, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import {
  monthlyBillTerms,
  pricingFeePrinciples,
  publicPriceList,
} from "../pricing-data"
import {
  describeStatementMonth,
  formatStatementAmount,
  interpolateStatementBalances,
  sampleFinancing,
  statementMonthKeys,
  statementMonths,
} from "./one-place-v4-statement-data"
import type { OnePlaceSignupMode } from "./one-place-v4"

mock.module("next/font/google", () => {
  const font = (name: string) => () => ({
    className: name,
    style: { fontFamily: name },
    variable: `${name}-variable`,
  })

  return {
    Inter: font("inter"),
    Inter_Tight: font("inter-tight"),
  }
})

const { OnePlaceV4Landing } = await import("./one-place-v4")

const directSignupHref = "http://halaalvest.localhost:1440/signup"

function renderLanding(signupMode: OnePlaceSignupMode) {
  return renderToStaticMarkup(
    createElement(
      NotificationsProvider,
      null,
      createElement(OnePlaceV4Landing, {
        isLaunchReady: false,
        quickFill: { emailDomain: "", enabled: false, qaDomains: [] },
        signupHref:
          signupMode === "direct" ? directSignupHref : "#early-access",
        signupMode,
      })
    )
  )
}

function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("'", "&#x27;")
}

describe("One Place marketing experience", () => {
  test("leads with the one-place promise and the sample statement", () => {
    const html = renderLanding("direct")

    expect(html).toContain("Run your cooperative in one place")
    expect(html).toContain('id="op4-statement-title">Amina Suleiman</h2>')
    expect(html).toContain("Sample member home screen for Amina Suleiman")
    expect(html).toContain("Guarantors Maryam Lawal and Musa Bello approved")
    expect(html).toContain("reversed on 21 October by Ali Danjuma")
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain("437,000.00")
    expect(html).toContain("450,000.00")
    expect(html).toContain("Repayment 3 of 18")
    expect(html).toContain('aria-checked="true"')
  })

  test("sends every direct-mode call to action to the sign-up href", () => {
    const html = renderLanding("direct")
    const ctaCount = html.split(`href="${directSignupHref}"`).length - 1

    // Header button, mobile menu, hero, after the steps and the final box.
    expect(ctaCount).toBe(5)
    expect(html).toContain("Create your workspace")
    expect(html).not.toContain('id="early-access"')
    expect(html).not.toContain('href="#"')
  })

  test("shows the early-access request form while early access is on", () => {
    const html = renderLanding("early-access")

    expect(html).toContain('id="early-access"')
    expect(html).toContain('href="#early-access"')
    expect(html).toContain("Request access")
    expect(html).toContain("Request a cooperative workspace")
    expect(html).toContain("Private launch for cooperative teams")
    expect(html).not.toContain("Create your workspace")
  })

  test("renders pricing from the shared price list", () => {
    const html = renderLanding("direct")
    const pricing = html.slice(html.indexOf('id="pricing"'))

    for (const price of publicPriceList) {
      expect(pricing).toContain(escapeHtml(price.item))
      expect(pricing).toContain(escapeHtml(price.detail))
      expect(pricing).toContain(escapeHtml(price.price))
    }

    for (const line of [
      ...monthlyBillTerms,
      ...pricingFeePrinciples.slice(1),
    ]) {
      expect(pricing).toContain(escapeHtml(line))
    }

    expect(pricing).toContain('href="/billing-policy"')
  })

  test("keeps every legal, policy and support link in the footer", () => {
    const html = renderLanding("direct")
    const footer = html.slice(html.indexOf("<footer"))

    for (const href of [
      "/privacy",
      "/terms",
      "/billing-policy",
      "/cooperative-disclosures",
      "/delete-account",
      "/support",
      "/contact",
      "/pricing",
    ]) {
      expect(footer).toContain(`href="${href}"`)
    }
  })
})

describe("One Place sample statement", () => {
  test("reconciles every month with the one before it", () => {
    for (const [index, key] of statementMonthKeys.entries()) {
      const month = statementMonths[key]

      expect(month.savingsBalance).toBe(
        month.broughtForward + month.contribution
      )
      expect(month.financingLeft).toBe(
        sampleFinancing.totalPayable -
          sampleFinancing.monthlyRepayment * month.repaymentNumber
      )

      if (index > 0) {
        const previous = statementMonths[statementMonthKeys[index - 1]!]

        expect(month.broughtForward).toBe(previous.savingsBalance)
        expect(month.financingLeft).toBe(
          previous.financingLeft - sampleFinancing.monthlyRepayment
        )
      }
    }
  })

  test("switching months moves the balances to that month", () => {
    const october = statementMonths.oct
    const august = statementMonths.aug

    expect(formatStatementAmount(august.savingsBalance)).toBe("387,000.00")
    expect(formatStatementAmount(august.financingLeft)).toBe("510,000.00")
    expect(describeStatementMonth(statementMonths.sep)).toBe(
      "Statement to 30 Sep: savings ₦412,000.00, financing left to repay ₦480,000.00."
    )

    const from = {
      financingLeft: october.financingLeft,
      savingsBalance: october.savingsBalance,
    }
    const to = {
      financingLeft: august.financingLeft,
      savingsBalance: august.savingsBalance,
    }

    expect(interpolateStatementBalances(from, to, 0)).toEqual(from)
    expect(interpolateStatementBalances(from, to, 1)).toEqual(to)

    const midway = interpolateStatementBalances(from, to, 0.3)

    expect(midway.savingsBalance).toBeLessThan(from.savingsBalance)
    expect(midway.savingsBalance).toBeGreaterThan(to.savingsBalance)
    expect(midway.financingLeft).toBeGreaterThan(from.financingLeft)
    expect(midway.financingLeft).toBeLessThan(to.financingLeft)
  })
})
