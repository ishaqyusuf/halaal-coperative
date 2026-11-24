import type { Href } from "expo-router"
import type { MemberHomeServiceTile } from "./member-home-presentation"

/**
 * Member search (T31): with no tab dock, the hero search finds the member's
 * screens and services. It lists what home already knows (the hub screens
 * plus the service tiles the cooperative turned on) and filters locally,
 * so it adds no read and works offline.
 */
export type MemberSearchDestination = {
  href: Href
  icon: string
  key: string
  label: string
  meta: string
}

const hubDestinations: MemberSearchDestination[] = [
  { href: "/(member)/(tabs)/commitments", icon: "BadgeCheck", key: "plans", label: "Plans", meta: "Commitment, savings and contributions" },
  { href: "/(member)/(tabs)/financing", icon: "HandCoins", key: "finance", label: "Finance", meta: "Financing, requests and next due" },
  { href: "/(member)/(tabs)/shares", icon: "PieChart", key: "shares", label: "Shares", meta: "Share capital and profit" },
  { href: "/statement", icon: "FileText", key: "statement", label: "Statement", meta: "Every posted entry" },
  { href: "/(member)/(tabs)/more", icon: "UserRound", key: "account", label: "Account", meta: "Profile, KYC, settings and sign out" },
]

/** Service keys the hub entries above already cover. */
const coveredServices = new Set(["commitments", "savings", "financing", "shares", "statements"])

const serviceMeta: Record<string, string> = {
  foodPurchase: "Foodstuff purchase",
  guarantors: "Requests to guarantee",
  notifications: "Messages from the cooperative",
  procurement: "Buy on credit",
  projectFinancing: "Project financing",
  receipts: "Add a payment, see your transactions",
  support: "Talk to the cooperative",
  updates: "News from the cooperative",
}

export function buildMemberSearchDestinations(services: readonly MemberHomeServiceTile[]) {
  const list = [...hubDestinations]
  for (const service of services) {
    if (!service.href || coveredServices.has(service.key)) continue
    list.push({
      href: service.href,
      icon: service.icon,
      key: service.key,
      label: service.label,
      meta: serviceMeta[service.key] ?? "Service",
    })
  }
  return list
}

/** Case-insensitive match on the label and its description. */
export function filterMemberSearchDestinations(
  list: readonly MemberSearchDestination[],
  query: string
) {
  const term = query.trim().toLowerCase()
  if (!term) return [...list]
  return list.filter((item) => `${item.label} ${item.meta}`.toLowerCase().includes(term))
}
