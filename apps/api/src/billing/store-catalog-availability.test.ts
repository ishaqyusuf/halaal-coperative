import { describe, expect, test } from "bun:test"
import { publicPolicyApprovalHash } from "@halaalvest/db"
import {
  publicPolicies,
  type PolicyPublication,
} from "@halaalvest/domain/public-policies"
import {
  canOfferStoreProducts,
  canRestoreStorePurchases,
} from "./store-catalog-availability"

const now = new Date("2026-09-25T12:00:00.000Z")

function approvedPublications() {
  return Object.fromEntries(
    Object.entries(publicPolicies).map(([type, policy]) => {
      const publication = {
        status: "published" as const,
        version: "1.0",
        approvedAt: "2026-09-24T12:00:00.000Z",
        effectiveAt: "2026-09-25T00:00:00.000Z",
        approvalReference: "owner-and-legal-review",
      }
      return [
        type,
        {
          ...publication,
          approvedSnapshotHash: publicPolicyApprovalHash(
            type as keyof typeof publicPolicies,
            publication,
            policy
          ),
        },
      ]
    })
  ) as Record<keyof typeof publicPolicies, PolicyPublication>
}

describe("new mobile store offers", () => {
  test("stay closed for live tenants while policies are drafts or sales are disabled", () => {
    expect(
      canOfferStoreProducts({
        environment: "production",
        productionSalesEnabled: true,
        sandboxTenantEligible: false,
        now,
      })
    ).toBe(false)
    expect(
      canOfferStoreProducts({
        environment: "production",
        productionSalesEnabled: false,
        sandboxTenantEligible: false,
        publications: approvedPublications(),
        now,
      })
    ).toBe(false)
  })

  test("require every exact approved and effective policy snapshot", () => {
    const publications = approvedPublications()
    expect(
      canOfferStoreProducts({
        environment: "production",
        productionSalesEnabled: true,
        sandboxTenantEligible: false,
        publications,
        now,
      })
    ).toBe(true)
    publications["billing-policy"] = {
      ...publications["billing-policy"],
      approvedSnapshotHash: "0".repeat(64),
    } as PolicyPublication
    expect(
      canOfferStoreProducts({
        environment: "production",
        productionSalesEnabled: true,
        sandboxTenantEligible: false,
        publications,
        now,
      })
    ).toBe(false)
  })

  test("allow sandbox offers only after tenant eligibility is established", () => {
    expect(
      canOfferStoreProducts({
        environment: "sandbox",
        productionSalesEnabled: false,
        sandboxTenantEligible: true,
      })
    ).toBe(true)
    expect(
      canOfferStoreProducts({
        environment: "sandbox",
        productionSalesEnabled: false,
        sandboxTenantEligible: false,
      })
    ).toBe(false)
  })
})

describe("existing mobile store purchase recovery", () => {
  test("remains available in production while new offers are gated", () => {
    expect(
      canOfferStoreProducts({
        environment: "production",
        productionSalesEnabled: false,
        sandboxTenantEligible: false,
      })
    ).toBe(false)
    expect(
      canRestoreStorePurchases({
        environment: "production",
        sandboxTenantEligible: false,
      })
    ).toBe(true)
  })

  test("does not expose a sandbox account binding to a non-QA tenant", () => {
    expect(
      canRestoreStorePurchases({
        environment: "sandbox",
        sandboxTenantEligible: false,
      })
    ).toBe(false)
    expect(
      canRestoreStorePurchases({
        environment: "sandbox",
        sandboxTenantEligible: true,
      })
    ).toBe(true)
    expect(
      canRestoreStorePurchases({
        environment: undefined,
        sandboxTenantEligible: true,
      })
    ).toBe(false)
  })
})
