import { describe, expect, test } from "bun:test"
import type { TenantTrustProfile } from "@halaalvest/db"
import { readFileSync } from "node:fs"
import { buildTrustReadinessItems } from "./load-trust-readiness-page"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

const empty: TenantTrustProfile = {
  backupRetentionNote: null,
  dataProcessingUrl: null,
  incidentContactEmail: null,
  incidentContactName: null,
  legalTermsUrl: null,
  privacyPolicyUrl: null,
  recoveryPointObjective: null,
  recoveryTimeObjective: null,
  reviewedAt: null,
  reviewedByUserId: null,
}

describe("trust readiness (thread 15)", () => {
  test("loads the trust profile only after the admin check", () => {
    const loader = read("./load-trust-readiness-page.ts")

    expect(loader).toContain("workspaceAdminRoles")
    expect(
      loader.indexOf("canViewTrustReadiness && context.tenant")
    ).toBeLessThan(loader.indexOf("getTenantTrustProfile(context.tenant.id)"))
  })

  test("an empty profile has only the always-true download row done", () => {
    const items = buildTrustReadinessItems(empty)

    expect(items).toHaveLength(6)
    expect(items.filter((item) => item.done).map((item) => item.key)).toEqual([
      "downloads",
    ])
  })

  test("rows tick only from what the cooperative saved", () => {
    const items = buildTrustReadinessItems({
      ...empty,
      backupRetentionNote: "Daily copies kept for 30 days.",
      incidentContactEmail: "help@example.org",
      incidentContactName: "Office",
      legalTermsUrl: "https://example.org/terms",
    })
    const done = Object.fromEntries(items.map((item) => [item.key, item.done]))

    expect(done).toEqual({
      backups: true,
      contact: true,
      data: false,
      downloads: true,
      privacy: false,
      terms: true,
    })
  })

  test("the page has one action, no stat cards and no own heading", () => {
    const view = read("../../components/trust-settings-view.tsx")

    expect(view).toContain("action={<OpenTrustSettingsSheet />}")
    expect(view).toContain("data-trust-readiness-item")
    expect(view).not.toContain("WorkspacePageShell")
    expect(view).not.toContain("DashboardStatCard")
  })
})
