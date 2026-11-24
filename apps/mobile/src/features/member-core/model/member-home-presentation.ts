import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import type { MobileReadCacheState } from "@/lib/read-cache"
import type { Href } from "expo-router"
import type { MobileMemberHome } from "./member-core-types"

export type MemberHomeStat = {
  detail: string
  /**
   * With nothing held yet, the row says so and offers the way in instead of
   * a zero (T31: Plans and Shares stay discoverable without tabs).
   */
  empty: { action: string; detail: string } | null
  /** The pushed screen the row opens (Plans, Finance, Shares). */
  href?: Href
  key: string
  label: string
  value: string
}

export type MemberHomeAttentionRow = {
  detail: string
  href?: Href
  icon: string
  key: string
  label: string
  severity: MobileMemberHome["actionItems"][number]["severity"]
}

export type MemberHomeServiceTile = {
  href?: Href
  icon: string
  key: string
  label: string
}

export type MemberHomeReadiness = {
  detail: string
  label: string
  percentage: number
  status: MobileMemberHome["readiness"]["status"]
}

export type MemberHomePresentation = {
  /** Financing still owed, for the Ask line's context question (T31). */
  askFinancingOutstanding: number
  attention: MemberHomeAttentionRow[]
  /**
   * Record payment is open to this member (the receipt submission gate the
   * T30 payments flow uses). Older servers don't send it: hidden.
   */
  canRecordPayment: boolean
  readiness: MemberHomeReadiness | null
  services: MemberHomeServiceTile[]
  stats: MemberHomeStat[]
  unreadBadge: string | null
}

/** Service tiles open the member's screens; unknown keys are not links. */
const serviceHrefs: Record<string, Href> = {
  commitments: "/(member)/(tabs)/commitments",
  financing: "/(member)/(tabs)/financing",
  foodPurchase: "/food-purchase",
  guarantors: "/guarantor-approvals",
  notifications: "/notifications",
  procurement: "/procurement",
  projectFinancing: "/project-financing",
  receipts: "/receipts",
  savings: "/(member)/(tabs)/commitments",
  shares: "/(member)/(tabs)/shares",
  statements: "/statement",
  support: "/support",
  updates: "/updates",
}

/** Short tile labels (one line under a 52pt tile). */
const serviceLabels: Record<string, string> = {
  commitments: "Plans",
  foodPurchase: "Foodstuff",
  guarantors: "Guarantors",
  projectFinancing: "Projects",
}

const attentionTargets: Record<string, { href: Href; icon: string }> = {
  commitment: { href: "/(member)/(tabs)/commitments", icon: "BadgeCheck" },
  financing: { href: "/(member)/(tabs)/financing", icon: "HandCoins" },
  // KYC and membership status live on the member's More hub.
  "kyc-readiness": { href: "/(member)/(tabs)/more", icon: "ShieldCheck" },
  "member-profile": { href: "/support", icon: "UserRound" },
}

/** Position rows open their pushed screen (no tabs for members, T31). */
const statHrefs: Record<string, Href> = {
  commitment: "/(member)/(tabs)/commitments",
  financing: "/(member)/(tabs)/financing",
  savings: "/(member)/(tabs)/commitments",
  "share-capital": "/(member)/(tabs)/shares",
  "special-savings": "/(member)/(tabs)/commitments",
}

/** Rows that always show on home, and what they say when nothing is held. */
const alwaysShownStats: Record<
  "commitment" | "share-capital",
  { action: string; detail: string; label: string }
> = {
  commitment: {
    action: "Set up",
    detail: "No plan yet · start one from Plans",
    label: "Commitment",
  },
  "share-capital": {
    action: "Buy shares",
    detail: "No shares yet · see how to buy",
    label: "Share capital",
  },
}

/**
 * Home's position metrics with Plans and Shares guaranteed: a server that
 * omits one (no linked profile) still gets the row, as an empty state.
 */
function withAlwaysShownStats(stats: MobileMemberHome["stats"]) {
  const list = [...stats]
  if (!list.some((metric) => metric.key === "commitment")) {
    list.unshift({ detail: "", format: "currency", key: "commitment", label: "Commitment", value: 0 })
  }
  if (!list.some((metric) => metric.key === "share-capital")) {
    list.push({ detail: "", format: "currency", key: "share-capital", label: "Share capital", value: 0 })
  }
  return list
}

const readinessLabels: Record<MemberHomeReadiness["status"], string> = {
  missing_profile: "Not linked",
  needs_attention: "Needs review",
  ready: "Ready",
}

/** The bell badge text: nothing at zero, "9+" past nine. */
export function formatUnreadBadge(unread: number | null | undefined) {
  const count = Math.max(0, Math.trunc(unread ?? 0))
  if (count === 0) return null
  return count > 9 ? "9+" : String(count)
}

export function buildMemberHomePresentation(
  home: MobileMemberHome | null,
  currencyCode: string
): MemberHomePresentation {
  if (!home) {
    return {
      askFinancingOutstanding: 0,
      attention: [],
      canRecordPayment: false,
      readiness: null,
      services: [],
      stats: [],
      unreadBadge: null,
    }
  }

  const financing = home.stats.find((metric) => metric.key === "financing")
  return {
    askFinancingOutstanding:
      financing && Number.isFinite(financing.value) ? Math.max(0, financing.value) : 0,
    attention: home.actionItems.map((item) => ({
      detail: item.detail,
      href: attentionTargets[item.key]?.href,
      icon: attentionTargets[item.key]?.icon ?? "CircleAlert",
      key: item.key,
      label: item.label,
      severity: item.severity,
    })),
    canRecordPayment: home.actions?.canRecordPayment === true,
    readiness: {
      detail: home.readiness.detail,
      label: readinessLabels[home.readiness.status],
      percentage: Math.min(100, Math.max(0, home.readiness.percentage)),
      status: home.readiness.status,
    },
    services: home.services.map((service) => ({
      href: serviceHrefs[service.key],
      icon: service.icon,
      key: service.key,
      label: serviceLabels[service.key] ?? service.label,
    })),
    stats: withAlwaysShownStats(home.stats).map((metric) => {
      const always = alwaysShownStats[metric.key as keyof typeof alwaysShownStats]
      const empty =
        always && !(Number.isFinite(metric.value) && metric.value > 0)
          ? { action: always.action, detail: always.detail }
          : null
      return {
        detail: metric.detail,
        empty,
        href: statHrefs[metric.key],
        key: metric.key,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      }
    }),
    // Older servers (before T04) do not send the count.
    unreadBadge: formatUnreadBadge(home.notifications?.unread),
  }
}

export type MemberHomeBanner =
  | { kind: "offline"; cachedAt: string | null }
  | { kind: "stale"; cachedAt: string }
  | { kind: "error" }

export type MemberHomeView = {
  banner: MemberHomeBanner | null
  /** What fills the body: the layout skeleton, the error state or the content. */
  body: "content" | "error" | "skeleton"
}

/**
 * One rule for every state of member home. Data always wins over a spinner:
 * a failed refresh keeps the last content and shows a banner instead.
 */
export function resolveMemberHomeView(input: {
  cache: MobileReadCacheState | null | undefined
  hasData: boolean
  isError: boolean
  isOffline: boolean
  isPending: boolean
}): MemberHomeView {
  if (!input.hasData) {
    if (input.isPending) return { banner: null, body: "skeleton" }
    return {
      banner: input.isOffline ? { cachedAt: null, kind: "offline" } : null,
      body: "error",
    }
  }

  const cachedAt =
    input.cache?.status === "stale" ? input.cache.cachedAt : null
  if (input.isOffline) {
    return { banner: { cachedAt, kind: "offline" }, body: "content" }
  }
  if (cachedAt) return { banner: { cachedAt, kind: "stale" }, body: "content" }
  if (input.isError) return { banner: { kind: "error" }, body: "content" }
  return { banner: null, body: "content" }
}
