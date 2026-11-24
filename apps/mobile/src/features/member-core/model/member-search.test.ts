import { describe, expect, test } from "bun:test"
import {
  buildMemberSearchDestinations,
  filterMemberSearchDestinations,
} from "./member-search"

const services = [
  { href: "/(member)/(tabs)/commitments", icon: "BadgeCheck", key: "commitments", label: "Plans" },
  { href: "/receipts", icon: "ReceiptText", key: "receipts", label: "Transactions" },
  { href: "/support", icon: "Headphones", key: "support", label: "Support" },
  { href: undefined, icon: "Sparkles", key: "future", label: "Future" },
] as const

describe("member search destinations", () => {
  test("lists the hub screens, then the enabled services once", () => {
    const list = buildMemberSearchDestinations([...services])
    expect(list.map((item) => item.key)).toEqual([
      "plans",
      "finance",
      "shares",
      "statement",
      "account",
      "receipts",
      "support",
    ])
  })

  test("filters by label or description, ignoring case and spaces", () => {
    const list = buildMemberSearchDestinations([...services])
    expect(filterMemberSearchDestinations(list, "  FIN ").map((item) => item.key)).toEqual([
      "finance",
    ])
    expect(filterMemberSearchDestinations(list, "payment").map((item) => item.key)).toEqual([
      "receipts",
    ])
    expect(filterMemberSearchDestinations(list, "")).toHaveLength(list.length)
    expect(filterMemberSearchDestinations(list, "zzz")).toEqual([])
  })
})
