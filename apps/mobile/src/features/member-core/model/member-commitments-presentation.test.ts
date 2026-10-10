import { describe, expect, test } from "bun:test"
import type { MobileMemberSection } from "./member-core-types"
import { buildMemberCommitmentsPresentation } from "./member-commitments-presentation"

function section(
  stats: MobileMemberSection["stats"]
): MobileMemberSection {
  return {
    emptyState: "No records.",
    generatedAt: "2026-09-01T00:00:00.000Z",
    key: "commitments",
    rows: [],
    stats,
    subtitle: "",
    title: "Commitments",
  }
}

describe("member commitments presentation", () => {
  test("keeps each cooperative savings bucket distinct", () => {
    const presentation = buildMemberCommitmentsPresentation(
      section([
        {
          detail: "12 posted entries",
          format: "currency",
          key: "savings",
          label: "Savings",
          value: 860_000,
        },
        {
          detail: "Posted contribution entries",
          format: "count",
          key: "contributions",
          label: "Contributions",
          value: 12,
        },
        {
          detail: "Active since January 2026",
          format: "currency",
          key: "active-commitment",
          label: "Active commitment",
          value: 60_000,
        },
        {
          detail: "Voluntary savings posted",
          format: "currency",
          key: "special-savings",
          label: "Special savings",
          value: 145_000,
        },
      ]),
      "NGN"
    )

    expect(presentation).toEqual({
      activePlan: {
        detail: "Started January 2026",
        label: "Monthly commitment",
        status: "Active",
        value: "₦60,000",
      },
      contributionSummary: "12 posted contributions",
      postedSavings: { label: "Posted savings", value: "₦860,000" },
      specialSavings: {
        detail: "Voluntary savings",
        label: "Special savings",
        value: "₦145,000",
      },
    })
  })

  test("uses concise empty-state copy without presenting zero as an active plan", () => {
    const presentation = buildMemberCommitmentsPresentation(
      section([
        {
          detail: "No active commitment available",
          format: "currency",
          key: "active-commitment",
          label: "Active commitment",
          value: 0,
        },
        {
          detail: "No posted contribution entries",
          format: "currency",
          key: "savings",
          label: "Savings",
          value: 0,
        },
        {
          detail: "No special savings posted",
          format: "currency",
          key: "special-savings",
          label: "Special savings",
          value: 0,
        },
        {
          detail: "Posted contribution entries",
          format: "count",
          key: "contributions",
          label: "Contributions",
          value: 0,
        },
      ]),
      "NGN"
    )

    expect(presentation.activePlan).toEqual({
      detail: null,
      label: "No active plan",
      status: null,
      value: null,
    })
    expect(presentation.contributionSummary).toBeNull()
    expect(presentation.postedSavings.value).toBe("₦0")
    expect(presentation.specialSavings).toEqual({
      detail: null,
      label: "Special savings",
      value: "₦0",
    })
  })
})
