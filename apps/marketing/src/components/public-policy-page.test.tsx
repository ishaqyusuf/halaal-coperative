import { afterEach, describe, expect, test } from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { publicPolicyApprovalHash } from "@halaalvest/db"
import {
  policyPublications,
  publicPolicies,
} from "@halaalvest/domain/public-policies"
import { PublicPolicyPage } from "./public-policy-page"

const originalTermsPublication = policyPublications.terms

afterEach(() => {
  policyPublications.terms = originalTermsPublication
})

describe("public policy page approval marker", () => {
  test("does not expose a snapshot hash for a draft policy", () => {
    const html = renderToStaticMarkup(
      createElement(PublicPolicyPage, { policy: "billing-policy" })
    )

    expect(html).toContain("Draft for review")
    expect(html).not.toContain("data-policy-approval-hash")
  })

  test("the published terms show their effective date and approval hash", () => {
    const html = renderToStaticMarkup(
      createElement(PublicPolicyPage, { policy: "terms" })
    )

    expect(html).toContain("Effective 2026-11-16T08:11:00.000Z")
    expect(html).toContain(
      'data-policy-approval-hash="fd10deedaf03e9f8e69cf68f163522a33bdbeddbc4d1bc326468555ee0c8e448"'
    )
  })

  test("renders the exact approved snapshot hash only when effective", () => {
    const approval = {
      version: "test-1",
      approvedAt: "2026-09-23T00:00:00Z",
      effectiveAt: "2026-09-24T00:00:00Z",
      approvalReference: "local-render-test",
    }
    const hash = publicPolicyApprovalHash(
      "terms",
      approval,
      publicPolicies.terms
    )
    policyPublications.terms = {
      status: "published",
      ...approval,
      approvedSnapshotHash: hash,
    }

    const html = renderToStaticMarkup(
      createElement(PublicPolicyPage, { policy: "terms" })
    )

    expect(html).toContain(`data-policy-approval-hash="${hash}"`)
    expect(html).toContain(`Effective ${approval.effectiveAt}`)
  })
})
