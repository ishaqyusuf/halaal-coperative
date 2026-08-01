import { describe, expect, test } from "bun:test"

const dashboardSourceRoot = new URL("../", import.meta.url).pathname

describe("dashboard Quick fill coverage", () => {
  test("keeps the universal data-entry form enhancer mounted", async () => {
    const provider = await Bun.file(
      new URL("../components/qa-quick-fill-provider.tsx", import.meta.url),
    ).text()

    expect(provider).toContain("<UniversalQaQuickFill")
  })

  test("limits explicit exemptions to identity, submit-only, and search forms", async () => {
    const approvedExemptions = new Set([
      "app/(public)/login/login-form.tsx",
      "components/members/members-mobile-toolbar.tsx",
      "components/members/members-search-filter.tsx",
      "components/public-auth-forms.tsx",
    ])
    const filesWithExemptions = new Set<string>()
    const glob = new Bun.Glob("**/*.tsx")

    for await (const file of glob.scan({ cwd: dashboardSourceRoot })) {
      const source = await Bun.file(`${dashboardSourceRoot}/${file}`).text()
      if (source.includes("data-quick-fill-exempt")) {
        filesWithExemptions.add(file)
      }
    }

    expect(filesWithExemptions).toEqual(approvedExemptions)
  })
})
