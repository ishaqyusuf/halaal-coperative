import { expect, test } from "bun:test"
import {
  mobileLegalLinks,
  publicLegalLinkPath,
} from "../apps/mobile/src/components/app/legal-link-targets"
import { requiredPublicPages } from "./public-pages-preflight"

test("native external links cover exactly the six public preflight pages", () => {
  const paths = mobileLegalLinks
    .filter(([slug]) => slug !== "legal-agreements")
    .map(([slug]) => publicLegalLinkPath(slug))
  expect(new Set(paths)).toEqual(
    new Set(requiredPublicPages.map((page) => `/${page}`))
  )
  expect(paths).toHaveLength(requiredPublicPages.length)
  expect(publicLegalLinkPath("legal-agreements")).toBe("/terms")
})
