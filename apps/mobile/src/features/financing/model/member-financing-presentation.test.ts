import { describe, expect, test } from "bun:test"
import type { MobileMemberSection } from "@/features/member-core/public/member-core-types"
import { buildMemberFinancingPresentation } from "./member-financing-presentation"

function section(
  rows: MobileMemberSection["rows"],
  stats: MobileMemberSection["stats"]
): MobileMemberSection {
  return {
    emptyState: "No financing records.",
    generatedAt: "2026-09-01T00:00:00.000Z",
    key: "financing",
    rows,
    stats,
    subtitle: "",
    title: "Financing",
  }
}

describe("member financing presentation", () => {
  test("selects authoritative financing values by stable keys", () => {
    const presentation = buildMemberFinancingPresentation(
      section(
        [
          {
            detail: "8 month term - Next due 28 Oct 2026",
            format: "currency",
            key: "loan-loan-a",
            label: "Quick financing",
            status: "active",
            value: 320_000,
          },
        ],
        [
          {
            detail: "1 active financing record(s)",
            format: "currency",
            key: "outstanding-principal",
            label: "Outstanding",
            value: 320_000,
          },
          {
            detail: "Estimated monthly servicing",
            format: "currency",
            key: "monthly-servicing",
            label: "Monthly servicing",
            value: 40_000,
          },
        ]
      ),
      "NGN"
    )

    expect(presentation).toEqual({
      activeRows: [
        {
          detail: "8 month term - Next due 28 Oct 2026",
          format: "currency",
          key: "loan-loan-a",
          label: "Quick financing",
          status: "active",
          value: 320_000,
        },
      ],
      monthlyServicing: {
        detail: "Estimated monthly servicing",
        value: "₦40,000",
      },
      outstanding: {
        detail: "1 active financing record(s)",
        summaryDetail: "1 active financing record(s)",
        value: "₦320,000",
      },
    })
  })

  test("does not present zero financing as an active obligation", () => {
    const presentation = buildMemberFinancingPresentation(
      section(
        [],
        [
          {
            detail: "No active financing",
            format: "currency",
            key: "outstanding-principal",
            label: "Outstanding",
            value: 0,
          },
          {
            detail: "Estimated monthly servicing",
            format: "currency",
            key: "monthly-servicing",
            label: "Monthly servicing",
            value: 0,
          },
        ]
      ),
      "NGN"
    )

    expect(presentation.outstanding).toBeNull()
    expect(presentation.monthlyServicing).toBeNull()
    expect(presentation.activeRows).toEqual([])
  })
})
