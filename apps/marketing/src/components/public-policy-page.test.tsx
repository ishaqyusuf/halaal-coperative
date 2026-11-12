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
  test("does not expose a snapshot hash for the draft terms", () => {
    const html = renderToStaticMarkup(
      createElement(PublicPolicyPage, { policy: "terms" })
    )

    expect(html).toContain("Draft for review")
    expect(html).not.toContain("data-policy-approval-hash")
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
