import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("member backfill Midday conformance", () => {
  test("owns metadata, URL state, loading, and retryable error isolation", () => {
    const route = read(
      "../../app/(app)/(sidebar)/members/[memberId]/backfill/page.tsx"
    )
    const loading = read(
      "../../app/(app)/(sidebar)/members/[memberId]/backfill/loading.tsx"
    )
    const error = read(
      "../../app/(app)/(sidebar)/members/[memberId]/backfill/error.tsx"
    )
    const states = read(
      "../../components/members/member-backfill-page-states.tsx"
    )
    const params = read("../../hooks/use-member-backfill-params.ts")

    expect(route).toContain('title: "Member migration | Halaalvest"')
    expect(route).toContain("loadMemberBackfillParams")
    expect(route).toContain("resolveMemberBackfillStep")
    expect(route).toContain("requestedStep !== activeStep")
    expect(route).toContain("memberBackfillStepHref(memberId, activeStep)")
    expect(route).toContain("encodeURIComponent(sheetType)")
    expect(params).toContain("parseAsStringEnum([...memberBackfillStepKeys])")
    expect(params).toContain("memberBackfillSheetType")
    expect(loading).toContain("<MemberBackfillSkeleton")
    expect(states).toContain('role="status"')
    expect(states).toContain('aria-label="Loading member migration"')
    expect(error).toContain("dashboard.member_backfill_error_boundary")
    expect(error).toContain("reset")
    expect(error).toContain("Back to member registry")
  })

  test("loads historical-only data and draft generation only for historical mode", () => {
    const loader = read("./load-member-backfill-workflow.ts")
    const historicalBranch = loader.slice(
      loader.indexOf('if (migrationSetup.mode === "historical_backfill")')
    )

    expect(historicalBranch).toContain("listMemberAmountLogs")
    expect(historicalBranch).toContain("listMemberActivityEvents")
    expect(historicalBranch).toContain("listLegacyLoanMigrationDrafts")
    expect(historicalBranch).toContain("listMigrationProfitAdjustmentOptions")
    expect(historicalBranch).toContain("buildBackfillDraftInputForMember")
    expect(loader).not.toContain("getTenantInitialMigrationState")
  })

  test("uses shared workflow presentations and full mobile touch targets", () => {
    const view = read("../../components/members/member-backfill-page-view.tsx")
    const presentation = read(
      "../../components/sheets/member-backfill-action-sheet.tsx"
    )

    expect(view).toContain("<MemberBackfillActionSheet")
    expect(view).not.toContain("MemberBackfillActionModal")
    expect(view).not.toContain("@/components/modals/")
    expect(view).toContain("max-md:[&_a]:min-h-11")
    expect(view).toContain("max-md:[&_button]:min-h-11")
    expect(view).toContain("max-md:[&_input]:min-h-11")
    expect(view).toContain('aria-label="Current migration step"')
    expect(view).toContain('label: "Action required"')
    expect(view).toContain('label: "In progress"')
    expect(view).toContain('label: "Completed"')
    expect(view).toContain('["pending_review", "approved", "applied"]')
    expect(view).not.toContain(
      '["pending_review", "approved", "applied", "reversed"]'
    )
    expect(view).not.toContain("<main>")
    expect(presentation).toContain("<WorkflowPresentation")
    expect(presentation).toContain("useMemberBackfillParams")
  })
})
