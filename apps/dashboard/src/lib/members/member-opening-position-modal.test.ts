import { describe, expect, test } from "bun:test"

describe("member opening position actions", () => {
  test("presents review and apply as modals while reverse remains a sheet", async () => {
    const source = await Bun.file(
      new URL(
        "../../components/members/member-backfill-page-view.tsx",
        import.meta.url,
      ),
    ).text()

    expect(source).toContain(
      "modalId={`opening-balance-review:${row.id}`}",
    )
    expect(source).toContain(
      "modalId={`opening-balance-apply:${row.id}`}",
    )
    expect(source).toContain(
      "sheetId={`opening-balance-reverse:${row.id}`}",
    )
    expect(source).toContain('triggerLabel="Reset / reverse"')
    expect(source).toContain("AppliedOpeningPositionSuccess")
    expect(source).toContain("Brought-forward details")
    expect(source).toContain(
      "modalId={`opening-balance-cancel:${row.id}`}",
    )
    expect(source).toContain("{canCaptureOpeningPosition ? (")
    expect(source).not.toContain(
      "sheetId={`opening-balance-review:${row.id}`}",
    )
    expect(source).not.toContain(
      "sheetId={`opening-balance-apply:${row.id}`}",
    )
  })

  test("lands on the clean brought-forward success route after apply", async () => {
    const source = await Bun.file(
      new URL("../dashboard-actions.ts", import.meta.url),
    ).text()

    expect(source).toContain(
      "`/members/${encodeURIComponent(memberId)}/backfill?step=brought-forward`",
    )
  })
})
