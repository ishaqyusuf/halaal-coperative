import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { getDomainStatus } from "@/lib/domains/domain-words"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("domains page (triage 5.3)", () => {
  test("has no main-address control; isPrimary is display-only", () => {
    const view = read("../components/domains-view.tsx")
    const actions = read("../components/domains/domain-actions.tsx")
    const client = read("./dashboard-actions.ts")

    expect(view).not.toContain("MakeMainDomainButton")
    expect(view).not.toContain("isPrimary")
    expect(view).toContain('title="Halaalvest address"')
    expect(view).toContain('title="Your own addresses"')
    expect(actions).not.toContain("setTenantDomainPrimaryAction")
    expect(actions).not.toContain("Make main address")
    expect(client).not.toContain("setTenantDomainPrimaryAction")
  })

  test("a Ready address asks the admin to contact support (manual attach)", () => {
    const status = getDomainStatus({
      kind: "custom",
      verificationStatus: "verified",
      verificationTarget: "app.halaalvest.com",
    })

    expect(status.word).toBe("Ready")
    expect(status.detail).toContain("Contact support so we can finish connecting it.")
  })
})
