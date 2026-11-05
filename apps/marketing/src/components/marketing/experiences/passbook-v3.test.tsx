import { describe, expect, mock, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import type { MarketingSignupMode } from "../marketing-experience-contract"

mock.module("next/font/google", () => {
  const font = (name: string) => () => ({
    className: name,
    style: { fontFamily: name },
    variable: `${name}-variable`,
  })

  return {
    IBM_Plex_Mono: font("ibm-plex-mono"),
    Schibsted_Grotesk: font("schibsted-grotesk"),
  }
})

const { PassbookV3Landing } = await import("./passbook-v3")

function renderLanding(signupMode: MarketingSignupMode) {
  return renderToStaticMarkup(
    createElement(
      NotificationsProvider,
      null,
      createElement(PassbookV3Landing, {
        isLaunchReady: true,
        quickFill: { emailDomain: "", enabled: false, qaDomains: [] },
        signupHref: "#early-access",
        signupMode,
        workspaceUrlSuffix: ".halaalvest.com",
      })
    )
  )
}

describe("Passbook marketing experience", () => {
  test("offers direct sign-up before pricing without a guided-setup request", () => {
    const html = renderLanding("direct")

    expect(html).toContain('id="signup"')
    expect(html).toContain("Create your cooperative workspace.")
    expect(html).toContain("Send verification email")
    expect(html).toContain(".halaalvest.com")
    expect(html).not.toContain('id="early-access"')
    expect(html.toLowerCase()).not.toContain("guided setup")
    expect(html.indexOf('id="signup"')).toBeLessThan(
      html.indexOf('id="pricing"')
    )
  })

  test("falls back to the approval request while early access is enabled", () => {
    const html = renderLanding("early-access")

    expect(html).toContain('id="early-access"')
    expect(html).toContain('href="#early-access"')
    expect(html).not.toContain('id="signup"')
    expect(html).not.toContain("Send verification email")
  })

  test("shows a sample statement with interest at zero and the app prices", () => {
    const html = renderLanding("direct")

    expect(html).toContain("Sample statement.")
    expect(html).toContain("Interest charged: 0.00.")
    expect(html).toContain("US$1.99 / year")
    expect(html).toContain("or US$0.99 for six months")
  })
})
