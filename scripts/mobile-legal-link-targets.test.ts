import { expect, test } from "bun:test"
import {
  mobileLegalLinks,
  publicLegalLinkPath,
} from "../apps/mobile/src/components/app/legal-link-targets"
import { requiredPublicPages } from "./public-pages-preflight"

// The native app has no purchase flow (ADR-20261112): cooperatives pay
// HalaalVest, and members never buy anything in the app. Apple and Google do
// not allow an app to point users to an outside page with prices or payment
// in that case, so the software billing policy stays public on the website
// but is deliberately left out of the app's legal links.
const webOnlyPublicPages = ["billing-policy"] as const

test("native external links cover every public page except the billing policy", () => {
  const paths = mobileLegalLinks
    .filter(([slug]) => slug !== "legal-agreements")
    .map(([slug]) => publicLegalLinkPath(slug))
  const expected = requiredPublicPages
    .filter((page) => !(webOnlyPublicPages as readonly string[]).includes(page))
    .map((page) => `/${page}`)
  expect(new Set(paths)).toEqual(new Set(expected))
  expect(paths).toHaveLength(expected.length)
  expect(publicLegalLinkPath("legal-agreements")).toBe("/terms")
})

test("the native app never links to the billing policy", () => {
  const slugs: readonly string[] = mobileLegalLinks.map(([slug]) => slug)
  for (const page of webOnlyPublicPages) expect(slugs).not.toContain(page)
})
