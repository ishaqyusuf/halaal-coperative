import { describe, expect, test } from "bun:test"

describe("member opening position actions", () => {
  test("routes opening-position actions through the shared presentation owner", async () => {
    const source = await Bun.file(
      new URL(
        "../../components/members/member-backfill-page-view.tsx",
        import.meta.url
      )
    ).text()

    // Each action opens its `memberBackfill` registry mode for one row.
    for (const mode of ["review", "apply", "reverse", "cancel"]) {
      expect(source).toContain(`mode="${mode}"\n            targetId={row.id}`)
    }
    expect(source).toContain('triggerLabel="Reset / reverse"')
    expect(source).toContain("AppliedOpeningPositionSuccess")
    expect(source).toContain("Opening balance added")
    expect(source).toContain("{canCaptureOpeningPosition ? (")
    expect(source).not.toContain("MemberBackfillActionModal")
    expect(source).not.toContain("@/components/modals/")
  })

  test("lands on the clean brought-forward success route after apply", async () => {
    const source = await Bun.file(
      new URL("../dashboard-actions.ts", import.meta.url)
    ).text()

    expect(source).toContain(
      "`/members/${encodeURIComponent(memberId)}/backfill?step=brought-forward`"
    )
  })
})
