import { expect, test } from "bun:test"
import { aboutLegalLinks } from "../apps/mobile/src/features/about/model/about-content"
import { requiredPublicPages } from "./public-pages-preflight"

// Since 18 Nov 2026 the About HalaalVest screen is the app's one path to the
// platform documents on the public site (the old in-app legal links were
// removed). Apple requires the privacy policy to be reachable inside the app,
// so About must keep Terms and Privacy.
//
// The native app has no purchase flow (ADR-20261112): cooperatives pay
// HalaalVest, and members never buy anything in the app. Apple and Google do
// not allow an app to point users to an outside page with prices or payment
// in that case, so the software billing policy stays public on the website
// but is deliberately left out of the app.
const webOnlyPublicPages = ["billing-policy"] as const

const aboutPaths = aboutLegalLinks.map((link) => link.path)

test("About links only to published public pages", () => {
  const publicPaths = requiredPublicPages.map((page) => `/${page}`)
  for (const path of aboutPaths) expect(publicPaths).toContain(path)
})

test("About keeps the terms and privacy policy reachable in the app", () => {
  expect(aboutPaths).toContain("/terms")
  expect(aboutPaths).toContain("/privacy")
})

test("the native app never links to the billing policy", () => {
  for (const page of webOnlyPublicPages) {
    expect(aboutPaths).not.toContain(`/${page}`)
  }
})
