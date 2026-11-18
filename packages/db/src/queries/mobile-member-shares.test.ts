import { describe, expect, test } from "bun:test"
import {
  buildMobileMemberShareSection,
  toMobileMemberSharePosition,
} from "./mobile-member-shares"

describe("mobile member shares", () => {
  test("keeps unit ownership applications ledger evidence and published profit distinct", () => {
    const section = buildMobileMemberShareSection({
      applications: [
        {
          createdAt: new Date("2026-08-08T00:00:00.000Z"),
          id: "application-1",
          requestedUnits: 2,
          shareValueSnapshot: 50_000,
          status: "pending",
        },
      ],
      generatedAt: new Date("2026-08-11T00:00:00.000Z"),
      ledgerEntries: [
        {
          amount: 25_000,
          effectiveDate: new Date("2026-07-01T00:00:00.000Z"),
          id: "ledger-1",
          notes: "Optional share purchase",
          sourceType: "member_purchase",
        },
      ],
      publishedDividendAllocations: [
        {
          allocationAmount: 12_500,
          id: "dividend-1",
          periodEnd: new Date("2026-06-30T00:00:00.000Z"),
          periodName: "2026 first half",
          publishedAt: new Date("2026-07-15T00:00:00.000Z"),
        },
      ],
      shareBalance: 250_000,
      unitPosition: {
        approvedOptionalUnits: 4,
        compulsoryUnits: 5,
        maximumUnits: 20,
        pendingOptionalUnits: 2,
        totalApprovedUnits: 9,
        totalApprovedValue: 225_000,
        totalPendingUnits: 11,
        totalPendingValue: 275_000,
        unitAmount: 25_000,
      },
    })

    expect(section.key).toBe("shares")
    expect(section.generatedAt).toBe("2026-08-11T00:00:00.000Z")
    expect(section.stats.map((item) => item.key)).toEqual([
      "share-capital",
      "pending-shares",
      "dividends",
    ])
    expect(section.rows.map((item) => item.key)).toEqual([
      "approved-share-units",
      "pending-share-units",
      "share-application-application-1",
      "share-ledger-ledger-1",
      "dividend-dividend-1",
    ])
    expect(section.stats[2]?.value).toBe(12_500)
  })

  test("says whether each shared season was paid, with the date and how", () => {
    const section = buildMobileMemberShareSection({
      applications: [],
      generatedAt: new Date("2026-11-16T00:00:00.000Z"),
      ledgerEntries: [],
      publishedDividendAllocations: [
        {
          allocationAmount: 20_455,
          id: "dividend-paid",
          payout: { destination: "savings", paidAt: "2026-11-16" },
          periodEnd: new Date("2026-12-31T00:00:00.000Z"),
          periodName: "2026 second half",
          publishedAt: new Date("2026-11-14T00:00:00.000Z"),
        },
        {
          allocationAmount: 12_500,
          id: "dividend-owed",
          payout: null,
          periodEnd: new Date("2026-06-30T00:00:00.000Z"),
          periodName: "2026 first half",
          publishedAt: new Date("2026-07-15T00:00:00.000Z"),
        },
      ],
      shareBalance: 0,
      unitPosition: null,
    })
    const rows = section.rows.filter((row) => row.key.startsWith("dividend-"))

    expect(rows.map((row) => [row.status, row.detail])).toEqual([
      ["Paid", "Period ended Dec 31, 2026 - Paid Nov 16, 2026 to savings"],
      ["Not paid yet", "Period ended Jun 30, 2026 - Shared Jul 15, 2026"],
    ])
  })

  test("derives remaining optional capacity from approved plus pending units", () => {
    const position = toMobileMemberSharePosition({
      approvedOptionalUnits: 4,
      compulsoryUnits: 5,
      maximumUnits: 20,
      pendingOptionalUnits: 2,
      totalApprovedUnits: 9,
      totalApprovedValue: 225_000,
      totalPendingUnits: 11,
      totalPendingValue: 275_000,
      unitAmount: 25_000,
    })

    expect(position.remainingOptionalUnits).toBe(9)
  })
})
