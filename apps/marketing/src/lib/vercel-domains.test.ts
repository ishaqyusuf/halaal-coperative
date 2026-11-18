import { describe, expect, it } from "bun:test"
import { getVercelProvisioningConfig } from "./vercel-domains"

describe("Vercel provisioning config", () => {
  it("uses the legacy marketing token only for the branch-pinned Preview setup", () => {
    const preview = getVercelProvisioningConfig({
      HALAAL_VEST_VERCEL_API_TOKEN: "legacy-token",
      HALAAL_VEST_VERCEL_TEAM_ID: "team_legacy",
      VERCEL_DOMAIN_GIT_BRANCH: "preview",
      VERCEL_PROJECT_ID: "prj_dashboard",
    })
    expect(preview).toMatchObject({
      gitBranch: "preview",
      isConfigured: true,
      projectIdOrName: "prj_dashboard",
      teamId: "team_legacy",
      token: "legacy-token",
    })
  })

  it("keeps Production skipped when only legacy names exist", () => {
    const production = getVercelProvisioningConfig({
      HALAAL_VEST_VERCEL_API_TOKEN: "legacy-token",
      HALAAL_VEST_VERCEL_PROJECT_ID: "prj_unknown",
    })
    expect(production.isConfigured).toBe(false)
    expect(production.token).toBeNull()
  })

  it("prefers the standard names when set", () => {
    expect(
      getVercelProvisioningConfig({
        HALAAL_VEST_VERCEL_API_TOKEN: "legacy-token",
        VERCEL_API_TOKEN: "standard-token",
        VERCEL_DOMAIN_GIT_BRANCH: "preview",
        VERCEL_PROJECT_ID: "prj_dashboard",
      }).token
    ).toBe("standard-token")
  })
})
