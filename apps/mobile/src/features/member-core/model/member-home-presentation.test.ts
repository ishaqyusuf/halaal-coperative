import { describe, expect, test } from "bun:test"
import {
  buildMemberHomePresentation,
  formatUnreadBadge,
  resolveMemberHomeView,
} from "./member-home-presentation"
import type { MobileMemberHome } from "./member-core-types"

const home = {
  actionItems: [
    {
      detail: "KYC is still pending or not started.",
      key: "kyc-readiness",
      label: "Profile readiness",
      severity: "warning",
    },
    { detail: "Unknown", key: "something-new", label: "New", severity: "neutral" },
  ],
  generatedAt: "2026-09-28T08:00:00.000Z",
  member: null,
  notifications: { unread: 12 },
  readiness: {
    detail: "Review needed",
    percentage: 72,
    status: "needs_attention",
  },
  services: [
    { icon: "BadgeCheck", key: "commitments", label: "Commitments", tone: "accent" },
    { icon: "HandCoins", key: "financing", label: "Financing", tone: "primary" },
    { icon: "Sparkles", key: "future", label: "Future", tone: "primary" },
  ],
  stats: [
    {
      detail: "Posted savings",
      format: "currency",
      key: "savings",
      label: "Savings total",
      value: 860000,
    },
  ],
} satisfies MobileMemberHome

describe("member home presentation", () => {
  test("unavailable member home never substitutes sample financial data", () => {
    expect(buildMemberHomePresentation(null, "NGN")).toEqual({
      askFinancingOutstanding: 0,
      attention: [],
      canRecordPayment: false,
      readiness: null,
      services: [],
      stats: [],
      unreadBadge: null,
    })
  })

  test("shows only the returned server facts, with links and short labels", () => {
    const view = buildMemberHomePresentation(home, "NGN")
    expect(view.readiness).toEqual({
      detail: "Review needed",
      label: "Needs review",
      percentage: 72,
      status: "needs_attention",
    })
    // Plans and Shares always show (T31), as empty states when absent.
    expect(view.stats.map((stat) => [stat.key, stat.href, stat.empty?.action ?? null])).toEqual([
      ["commitment", "/(member)/(tabs)/commitments", "Set up"],
      ["savings", "/(member)/(tabs)/commitments", null],
      ["share-capital", "/(member)/(tabs)/shares", "Buy shares"],
    ])
    expect(view.stats[1]).toMatchObject({
      detail: "Posted savings",
      label: "Savings total",
      value: "₦860K",
    })
    expect(view.services.map((tile) => [tile.key, tile.label, tile.href])).toEqual([
      ["commitments", "Plans", "/(member)/(tabs)/commitments"],
      ["financing", "Financing", "/(member)/(tabs)/financing"],
      ["future", "Future", undefined],
    ])
    expect(view.attention[0]).toMatchObject({
      href: "/(member)/(tabs)/more",
      icon: "ShieldCheck",
    })
    // An item the app does not know yet still shows, without a link.
    expect(view.attention[1]).toMatchObject({ href: undefined, icon: "CircleAlert" })
    expect(view.unreadBadge).toBe("9+")
  })

  test("held plans and shares show their amounts and open their screens", () => {
    const view = buildMemberHomePresentation(
      {
        ...home,
        actions: { canRecordPayment: true },
        stats: [
          { detail: "Active since 12 Jan 2026", format: "currency", key: "commitment", label: "Commitment", value: 25000 },
          { detail: "1 active record", format: "currency", key: "financing", label: "Financing exposure", value: 180000 },
          { detail: "Ledger balance", format: "currency", key: "share-capital", label: "Share capital", value: 50000 },
        ],
      },
      "NGN"
    )
    expect(view.stats.map((stat) => [stat.key, stat.empty])).toEqual([
      ["commitment", null],
      ["financing", null],
      ["share-capital", null],
    ])
    expect(view.stats[1]?.href).toBe("/(member)/(tabs)/financing")
    expect(view.askFinancingOutstanding).toBe(180000)
    expect(view.canRecordPayment).toBe(true)
  })

  test("a zero plan or share balance reads as an empty state", () => {
    const view = buildMemberHomePresentation(
      {
        ...home,
        stats: [
          { detail: "No active commitment available", format: "currency", key: "commitment", label: "Commitment", value: 0 },
          { detail: "No share capital posted", format: "currency", key: "share-capital", label: "Share capital", value: 0 },
        ],
      },
      "NGN"
    )
    expect(view.stats.map((stat) => stat.empty?.detail)).toEqual([
      "No plan yet · start one from Plans",
      "No shares yet · see how to buy",
    ])
    // Older servers don't send the payments gate: the pill stays hidden.
    expect(view.canRecordPayment).toBe(false)
  })

  test("a cached read from an older server has no badge", () => {
    const { notifications: _ignored, ...older } = home
    expect(buildMemberHomePresentation(older, "NGN").unreadBadge).toBeNull()
  })

  test("formats the unread badge", () => {
    expect(formatUnreadBadge(0)).toBeNull()
    expect(formatUnreadBadge(undefined)).toBeNull()
    expect(formatUnreadBadge(3)).toBe("3")
    expect(formatUnreadBadge(9)).toBe("9")
    expect(formatUnreadBadge(10)).toBe("9+")
  })
})

describe("member home view state", () => {
  const base = { cache: null, hasData: false, isError: false, isOffline: false, isPending: false }
  const stale = {
    ageMs: 60_000,
    cachedAt: "2026-11-16T09:42:00.000Z",
    scope: "s",
    status: "stale" as const,
  }

  test("first load shows the skeleton, never a spinner", () => {
    expect(resolveMemberHomeView({ ...base, isPending: true })).toEqual({
      banner: null,
      body: "skeleton",
    })
  })

  test("no data and a failure shows the error state (offline adds the banner)", () => {
    expect(resolveMemberHomeView({ ...base, isError: true }).body).toBe("error")
    expect(resolveMemberHomeView({ ...base, isError: true, isOffline: true })).toEqual({
      banner: { cachedAt: null, kind: "offline" },
      body: "error",
    })
  })

  test("data always wins: offline, stale cache and failed refresh keep content", () => {
    expect(resolveMemberHomeView({ ...base, cache: stale, hasData: true, isOffline: true })).toEqual({
      banner: { cachedAt: stale.cachedAt, kind: "offline" },
      body: "content",
    })
    expect(resolveMemberHomeView({ ...base, cache: stale, hasData: true })).toEqual({
      banner: { cachedAt: stale.cachedAt, kind: "stale" },
      body: "content",
    })
    expect(resolveMemberHomeView({ ...base, hasData: true, isError: true })).toEqual({
      banner: { kind: "error" },
      body: "content",
    })
    expect(resolveMemberHomeView({ ...base, hasData: true, isPending: true })).toEqual({
      banner: null,
      body: "content",
    })
  })
})
