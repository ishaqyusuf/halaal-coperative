import { describe, expect, test } from "bun:test"
import {
  applyAdminOverviewQaState,
  presentAdminOverviewForQa,
} from "./admin-member-lifecycle-qa"
import type { MobileAdminOverview } from "./admin-member-lifecycle-types"
import {
  buildAdminOverviewPresentation,
  formatActivityTime,
  formatRatioPercent,
  portfolioRiskTone,
  resolveAdminOverviewView,
} from "./admin-overview-presentation"

const NOW = new Date(2026, 10, 16, 10, 42)

function buildOverview(
  overrides: Partial<MobileAdminOverview> = {}
): MobileAdminOverview {
  return {
    actionQueue: [
      { count: 2, detail: "Needs urgent review", key: "disbursement-holds", label: "Disbursement holds", severity: "critical" },
      { count: 5, detail: "Needs urgent review", key: "overdue-follow-ups", label: "Overdue follow-ups", severity: "critical" },
      { count: 3, detail: "Open", key: "membership-approvals", label: "Membership approvals", severity: "warning" },
      { count: 1, detail: "Needs urgent review", key: "failed-imports", label: "Failed imports", severity: "critical" },
      { count: 0, detail: "Open", key: "support-cases", label: "Support cases", severity: "warning" },
    ],
    complianceWatch: [
      { count: 3, key: "kyc-incomplete", label: "Members with incomplete KYC" },
      { count: 0, key: "profit-review", label: "Profit or dividend items pending review" },
    ],
    generatedAt: NOW.toISOString(),
    recentActivity: [
      {
        amount: 25_000,
        detail: "Aisha Bello paid 25,000",
        id: "contribution-1",
        kind: "contribution",
        label: "Contribution posted",
        memberName: "Aisha Bello",
        occurredAt: new Date(2026, 10, 16, 9, 40).toISOString(),
        status: null,
      },
      {
        amount: null,
        detail: "Hauwa Ibrahim · submitted",
        id: "loan-request-1",
        kind: "loan_request",
        label: "Financing request updated",
        memberName: "Hauwa Ibrahim",
        occurredAt: new Date(2026, 10, 15, 16, 20).toISOString(),
        status: "submitted",
      },
      // A row from a server older than T05: only the sentence.
      {
        detail: "Grace Okafor repaid 15,000",
        id: "repayment-1",
        label: "Repayment posted",
        occurredAt: new Date(2026, 10, 14, 13, 30).toISOString(),
      },
    ],
    stats: [
      { detail: "After reserves", format: "currency", key: "deployable-funds", label: "Deployable funds", value: 4_820_000 },
      { detail: "November 2026", format: "percent", key: "collection-coverage", label: "Collections", value: 0.72 },
      { detail: "₦180,000 overdue", format: "percent", key: "portfolio-risk", label: "Portfolio risk", value: 0.042 },
    ],
    warnings: [],
    ...overrides,
  }
}

describe("admin overview presentation (02 Queue first)", () => {
  test("splits urgent rows from the rest, totals open decisions and drops empty rows", () => {
    const result = buildAdminOverviewPresentation(buildOverview(), "NGN", NOW)

    expect(result.urgent.map((row) => row.key)).toEqual([
      "disbursement-holds",
      "overdue-follow-ups",
      "failed-imports",
    ])
    expect(result.open.map((row) => row.key)).toEqual(["membership-approvals"])
    expect(result.decisions).toEqual({ total: 11, urgent: 8 })
    expect(result.urgentTotal).toBe(8)
    expect(result.openTotal).toBe(3)
  })

  test("opens each row on its mobile screen; web-only rows have no destination", () => {
    const result = buildAdminOverviewPresentation(buildOverview(), "NGN", NOW)
    const row = (key: string) =>
      [...result.urgent, ...result.open].find((item) => item.key === key)

    expect(row("disbursement-holds")).toMatchObject({
      destination: "Financing operations",
      href: "/financing-operations",
      severityLabel: "Urgent",
      severityTone: "danger",
    })
    expect(row("overdue-follow-ups")?.href).toBe("/repayment-operations")
    expect(row("membership-approvals")).toMatchObject({
      destination: "Members",
      severityLabel: "Review",
    })
    expect(row("failed-imports")).toMatchObject({ destination: null, href: null })
  })

  test("formats the hero figures: exact money, percents and the risk tone", () => {
    const result = buildAdminOverviewPresentation(buildOverview(), "NGN", NOW)

    expect(result.deployable?.value).toBe("₦4,820,000")
    expect(result.collections).toMatchObject({ ratio: 0.72, value: "72%" })
    expect(result.risk).toMatchObject({ tone: "warm", value: "4.2%" })
    expect(formatRatioPercent(1)).toBe("100%")
    expect(portfolioRiskTone(0)).toBe("ok")
    expect(portfolioRiskTone(0.05)).toBe("warm")
    expect(portfolioRiskTone(0.93)).toBe("danger")
  })

  test("compliance rows link only while they have a count", () => {
    const result = buildAdminOverviewPresentation(buildOverview(), "NGN", NOW)

    expect(result.compliance[0]).toMatchObject({ count: 3, href: "/(admin)/(tabs)/members" })
    expect(result.compliance[1]).toMatchObject({ count: 0, href: null })
  })

  test("activity rows carry member, time and amount, and fall back for older servers", () => {
    const [paid, request, legacy] = buildAdminOverviewPresentation(
      buildOverview(),
      "NGN",
      NOW
    ).activity

    expect(paid).toMatchObject({
      amount: "₦25,000",
      amountTone: "in",
      memberName: "Aisha Bello",
      meta: "Aisha Bello · 1h ago",
      status: null,
    })
    expect(request).toMatchObject({ amount: null, meta: "Hauwa Ibrahim · Yesterday", status: "Submitted" })
    expect(legacy).toMatchObject({
      amount: null,
      memberName: null,
      meta: "Grace Okafor repaid 15,000 · 14 Nov",
    })
  })

  test("relative activity times", () => {
    expect(formatActivityTime(new Date(2026, 10, 16, 10, 42, 20).toISOString(), NOW)).toBe("Just now")
    expect(formatActivityTime(new Date(2026, 10, 16, 10, 30).toISOString(), NOW)).toBe("12m ago")
    expect(formatActivityTime(new Date(2025, 11, 30).toISOString(), NOW)).toBe("30 Dec 2025")
  })
})

describe("admin overview states", () => {
  const base = {
    cache: null,
    canUse: true,
    hasData: true,
    isError: false,
    isOffline: false,
    isPending: false,
  }

  test("data wins over a spinner and failed refreshes become banners", () => {
    expect(resolveAdminOverviewView({ ...base, hasData: false, isPending: true }).body).toBe("skeleton")
    expect(resolveAdminOverviewView({ ...base, hasData: false, isError: true })).toEqual({
      banner: null,
      body: "error",
    })
    expect(resolveAdminOverviewView({ ...base, isError: true })).toEqual({
      banner: { kind: "error" },
      body: "content",
    })
    expect(resolveAdminOverviewView({ ...base, isOffline: true }).banner?.kind).toBe("offline")
    expect(
      resolveAdminOverviewView({
        ...base,
        cache: { ageMs: 1, cachedAt: "2026-11-16T09:00:00.000Z", scope: "qa", status: "stale" },
      }).banner
    ).toEqual({ cachedAt: "2026-11-16T09:00:00.000Z", kind: "stale" })
    expect(resolveAdminOverviewView({ ...base, canUse: false }).body).toBe("denied")
  })

  test("QA states reshape the live read in development", () => {
    const overview = buildOverview()
    const live = { isError: false, isOffline: false, isPending: false, overview }

    expect(applyAdminOverviewQaState("loading", live)).toMatchObject({ isPending: true, overview: null })
    expect(applyAdminOverviewQaState("refresh-error", live)).toMatchObject({ isError: true, overview })
    const fresh = presentAdminOverviewForQa(overview, "new")
    expect(fresh.actionQueue.map((item) => item.key)).toEqual(["setup-warnings"])
    expect(fresh.stats.every((stat) => stat.value === 0)).toBe(true)
    expect(fresh.warnings).toHaveLength(1)
  })
})
