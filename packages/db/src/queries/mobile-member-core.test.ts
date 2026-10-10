import { describe, expect, test } from "bun:test"
import {
  buildMobileMemberCommitments,
  buildMobileMemberCoreHome,
  type MobileMemberCoreHome,
} from "./mobile-member-core"
import type { MemberStatementSummary } from "./members"

const summary: MemberStatementSummary = {
  activeCommitmentAmount: 50_000,
  activeCommitmentStartsAt: new Date("2026-01-01T00:00:00.000Z"),
  activeLoanCount: 1,
  contributionsCount: 8,
  deductionSourceName: null,
  dividendAllocationCount: 1,
  email: "member@example.test",
  exitedAt: null,
  fullName: "Amina Member",
  joinedAt: new Date("2025-01-01T00:00:00.000Z"),
  lastContributionAt: new Date("2026-08-01T00:00:00.000Z"),
  lastDividendAllocatedAt: new Date("2026-07-01T00:00:00.000Z"),
  lastRepaymentAt: new Date("2026-08-01T00:00:00.000Z"),
  memberId: "member-1",
  memberNumber: "MEM-001",
  memberType: "individual",
  status: "active",
  totalCommittedContributions: 350_000,
  totalContributions: 400_000,
  totalDividendAllocations: 25_000,
  totalEstimatedMonthlyServicing: 20_000,
  totalExtraSavingsContributions: 50_000,
  totalLoanExtraSavingsAmount: 0,
  totalLoanPrincipal: 200_000,
  totalOutstandingPrincipal: 120_000,
  totalRepaymentsPosted: 80_000,
  totalSavingsSnapshot: 400_000,
}

function metric(home: MobileMemberCoreHome, key: string) {
  return home.stats.find((item) => item.key === key)
}

describe("mobile member core home", () => {
  test("keeps cooperative balances semantically distinct", () => {
    const home = buildMobileMemberCoreHome({
      foodPurchaseRecords: 0,
      generatedAt: new Date("2026-08-11T00:00:00.000Z"),
      member: {
        fullName: "Amina Member",
        id: "member-1",
        kycStatus: "verified",
        memberNumber: "MEM-001",
        status: "active",
      },
      operationProfile: null,
      procurementRecords: 0,
      receiptRecords: 0,
      shareCapital: 75_000,
      summary,
      supportRecords: 0,
    })

    expect(metric(home, "commitment")?.value).toBe(50_000)
    expect(metric(home, "savings")?.value).toBe(400_000)
    expect(metric(home, "special-savings")?.value).toBe(50_000)
    expect(metric(home, "financing")?.value).toBe(120_000)
    expect(metric(home, "share-capital")?.value).toBe(75_000)
    expect(new Set(home.stats.map((item) => item.key)).size).toBe(
      home.stats.length
    )
  })

  test("preserves existing records in navigation when a service is hidden", () => {
    const home = buildMobileMemberCoreHome({
      foodPurchaseRecords: 1,
      member: {
        fullName: "Amina Member",
        id: "member-1",
        kycStatus: "pending",
        memberNumber: "MEM-001",
        status: "active",
      },
      operationProfile: {
        services: {
          food_purchase: { shouldShowInMemberNav: false },
          payment_receipts: { shouldShowInMemberNav: false },
          procurement: { shouldShowInMemberNav: false },
          support_cases: { shouldShowInMemberNav: false },
        },
      },
      procurementRecords: 0,
      receiptRecords: 1,
      shareCapital: 0,
      summary,
      supportRecords: 0,
    })

    expect(home.services.map((service) => service.key)).toContain("receipts")
    expect(home.services.map((service) => service.key)).toContain(
      "foodPurchase"
    )
    expect(home.services.map((service) => service.key)).not.toContain(
      "procurement"
    )
    expect(home.readiness.status).toBe("needs_attention")
  })

  test("returns a bounded member-scoped empty state without a linked profile", () => {
    const home = buildMobileMemberCoreHome({
      foodPurchaseRecords: 0,
      member: null,
      operationProfile: null,
      procurementRecords: 0,
      receiptRecords: 0,
      shareCapital: 0,
      summary: null,
      supportRecords: 0,
    })

    expect(home.member).toBeNull()
    expect(home.readiness.status).toBe("missing_profile")
    expect(home.actionItems.map((item) => item.key)).toEqual([
      "member-profile",
    ])
  })
})

describe("mobile member commitments", () => {
  test("keeps commitment savings and voluntary savings explainable", () => {
    const commitments = buildMobileMemberCommitments({
      activePlan: {
        amount: 50_000,
        id: "plan-1",
        interval: "monthly",
        isActive: true,
        name: "Monthly commitment",
        startsAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      contributions: [
        {
          amount: 65_000,
          channel: "payroll",
          extraSavingsAmount: 15_000,
          id: "contribution-1",
          periodLabel: "August 2026",
          postedAt: new Date("2026-08-01T00:00:00.000Z"),
          reference: "PAY-1",
          status: "posted",
        },
      ],
      generatedAt: new Date("2026-08-11T00:00:00.000Z"),
      summary: {
        contributionsCount: 8,
        totalExtraSavingsContributions: 45_000,
        totalSavingsSnapshot: 445_000,
      },
    })

    expect(commitments.key).toBe("commitments")
    expect(commitments.generatedAt).toBe("2026-08-11T00:00:00.000Z")
    expect(commitments.stats.map((item) => item.key)).toEqual([
      "active-commitment",
      "savings",
      "special-savings",
      "contributions",
    ])
    expect(
      commitments.stats.find((item) => item.key === "special-savings")?.value
    ).toBe(45_000)
    expect(commitments.rows[1]).toMatchObject({
      key: "contribution-contribution-1",
      label: "August 2026",
      value: 65_000,
    })
    expect(commitments.rows[1]?.detail).toContain("Special savings 15000")
  })
})
