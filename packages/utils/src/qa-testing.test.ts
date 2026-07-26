import { describe, expect, test } from "bun:test"
import {
  buildQaEmail,
  normalizeCooperativeQaSlug,
  resolveQaQuickFillContext,
} from "./qa-testing"

describe("resolveQaQuickFillContext", () => {
  test("uses the logged-in configured QA domain", () => {
    expect(
      resolveQaQuickFillContext({
        authenticatedEmail: "admin@ishaq.qa.test",
        configuredDomains: ["mubarak.qa.test", "ishaq.qa.test"],
        isDevelopment: false,
      }),
    ).toEqual({
      emailDomain: "ishaq.qa.test",
      enabled: true,
      qaDomains: ["mubarak.qa.test", "ishaq.qa.test"],
    })
  })

  test("uses the first configured domain for local development", () => {
    expect(
      resolveQaQuickFillContext({
        authenticatedEmail: "admin@amanah.local",
        configuredDomains: ["ishaq.qa.test", "mubarak.qa.test"],
        isDevelopment: true,
      }),
    ).toEqual({
      emailDomain: "ishaq.qa.test",
      enabled: true,
      qaDomains: ["ishaq.qa.test", "mubarak.qa.test"],
    })
  })

  test("falls back to example.test only in local development", () => {
    expect(
      resolveQaQuickFillContext({
        authenticatedEmail: null,
        configuredDomains: [],
        isDevelopment: true,
      }),
    ).toEqual({
      emailDomain: "example.test",
      enabled: true,
      qaDomains: ["example.test"],
    })

    expect(
      resolveQaQuickFillContext({
        authenticatedEmail: "admin@amanah.local",
        configuredDomains: [],
        isDevelopment: false,
      }).enabled,
    ).toBe(false)
  })
})

describe("cooperative QA identities", () => {
  test("builds a matching subdomain and first-admin email", () => {
    const slug = normalizeCooperativeQaSlug("Example Cooperative")

    expect(slug).toBe("example-cooperative")
    expect(buildQaEmail(slug, "ishaq.qa.test")).toBe(
      "example-cooperative@ishaq.qa.test",
    )
  })

  test("keeps the email local part within the DNS label limit", () => {
    const slug = normalizeCooperativeQaSlug(
      "A Very Long Cooperative Name ".repeat(8),
    )

    expect(slug.length).toBeLessThanOrEqual(63)
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })
})
