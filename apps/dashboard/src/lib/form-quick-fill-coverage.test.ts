import { describe, expect, test } from "bun:test"

const dashboardSourceRoot = new URL("../", import.meta.url).pathname

describe("dashboard Quick fill coverage", () => {
  test("keeps Quick Fill owned by typed forms instead of global DOM injection", async () => {
    const provider = await Bun.file(
      new URL("../components/qa-quick-fill-provider.tsx", import.meta.url)
    ).text()

    expect(provider).not.toContain("<UniversalQaQuickFill")
    expect(provider).not.toContain("MutationObserver")

    for (const file of [
      "../components/forms/member-forms.tsx",
      "../components/onboarding/member-signup-form.tsx",
    ]) {
      const source = await Bun.file(new URL(file, import.meta.url)).text()
      expect(source).toContain("applyDashboard")
    }
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

  test("every covered form uses the shared, QA-gated Quick Fill", async () => {
    // Recipe forms (see .brain/features/form-quick-fill-coverage.md).
    const coveredForms = [
      "components/business/business-forms.tsx",
      "components/charge-content.tsx",
      "components/charge-operation-content.tsx",
      "components/contribution-content.tsx",
      "components/food-purchase-content.tsx",
      "components/forms/finance-forms.tsx",
      "components/imports/import-file-content.tsx",
      "components/forms/member-forms.tsx",
      "components/domains/add-domain-dialog.tsx",
      "components/workspace-settings/profile-form.tsx",
      "components/workspace-settings/role-form.tsx",
      "components/workspace-settings/trust-form.tsx",
      "components/forms/tenant-finance-forms.tsx",
      "components/getting-started/profit-policy-fields.tsx",
      "components/initial-migration-quick-fills.tsx",
      "components/member-document-self-service-form.tsx",
      "components/members/member-backfill-activity-windows-form.tsx",
      "components/members/member-backfill-baseline-edit-content.tsx",
      "components/members/member-profit-season-adjustment-table.tsx",
      "components/migration/member-backfill-controls.tsx",
      "components/migration/member-migration-history-forms.tsx",
      "components/billing/bill-sheet.tsx",
      "components/billing/billing-view.tsx",
      "components/billing/remittance-dialog.tsx",
      "components/monthly-record-content.tsx",
      "components/one-path/setup-mode-step.tsx",
      "components/finance-settings/opening-cash-section.tsx",
      "components/members/opening-balance-quick-fill-button.tsx",
      "components/members/historical-share-purchase-quick-fill.tsx",
      "components/onboarding/member-signup-form.tsx",
      "components/onboarding/membership-approval-form.tsx",
      "components/operation-profile-settings-content.tsx",
      "components/operation-profile-setup-form.tsx",
      "components/payment-receipt-content.tsx",
      "components/procurement-request-content.tsx",
      "components/project-financing-content.tsx",
      "components/share-request-content.tsx",
      "components/share-content.tsx",
      "components/signup-links/member-signup-link-content.tsx",
      "components/support/support-case-view.tsx",
      "components/support/support-create-form.tsx",
      "components/finance-settings/loan-product-form.tsx",
      "components/finance-settings/loan-rules-form.tsx",
      "components/finance-settings/loan-window-form.tsx",
      "components/finance-settings/profit-rules-form.tsx",
      "components/monthly-records/workplaces-content.tsx",
      "components/payment-receipt-member-audience-form.tsx",
    ]

    for (const file of coveredForms) {
      const source = await Bun.file(`${dashboardSourceRoot}/${file}`).text()
      expect(
        /<Dashboard(Native|State)?QuickFill\b/.test(source),
        `${file} should render the shared Quick Fill`
      ).toBe(true)
    }

    const shared = await Bun.file(
      new URL("../components/dashboard-quick-fill.tsx", import.meta.url)
    ).text()
    expect(shared).toContain("visible={quickFill.enabled && enabled !== false}")
  })

  test("Quick Fill recipes never use digit-suffixed or example.com emails", async () => {
    const source = await Bun.file(
      new URL("./dev-form-fill.ts", import.meta.url)
    ).text()

    expect(source).not.toContain("@example.com")
    expect(source).not.toContain("createQaMemberFixture")
    expect(source).not.toMatch(/randomInt\(1000/)
  })
})
