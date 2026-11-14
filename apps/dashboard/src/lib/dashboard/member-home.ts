import type { MemberHomeInProgress } from "@halaalvest/db"

export type MemberHomeWaitingItem = {
  count: number
  href: string
  key: keyof MemberHomeInProgress
  label: string
  /** The member has to do something, not just wait. */
  needsYou: boolean
}

// [one, many] in plain words, where each goes, and whether it waits on you.
const waitingItems: Array<{
  href: string
  key: keyof MemberHomeInProgress
  needsYou: boolean
  words: [string, string]
}> = [
  {
    href: "/payment-receipts",
    key: "receiptsToFix",
    needsYou: true,
    words: ["payment receipt to correct", "payment receipts to correct"],
  },
  {
    href: "/support",
    key: "helpRepliesNeeded",
    needsYou: true,
    words: [
      "help request waiting for your reply",
      "help requests waiting for your reply",
    ],
  },
  {
    href: "/guarantor-approvals",
    key: "guarantorRequests",
    needsYou: true,
    words: ["request to be a guarantor", "requests to be a guarantor"],
  },
  {
    href: "/payment-receipts",
    key: "receiptsBeingChecked",
    needsYou: false,
    words: ["payment receipt being checked", "payment receipts being checked"],
  },
  {
    href: "/loans",
    key: "loanRequests",
    needsYou: false,
    words: ["loan request being reviewed", "loan requests being reviewed"],
  },
  {
    href: "/project-financing",
    key: "projectFinancingRequests",
    needsYou: false,
    words: [
      "business funding request being reviewed",
      "business funding requests being reviewed",
    ],
  },
  {
    href: "/procurement",
    key: "procurementRequests",
    needsYou: false,
    words: ["item request being reviewed", "item requests being reviewed"],
  },
  {
    href: "/food-purchase",
    key: "foodPurchaseRequests",
    needsYou: false,
    words: [
      "food purchase request being reviewed",
      "food purchase requests being reviewed",
    ],
  },
  {
    href: "/shares",
    key: "shareRequests",
    needsYou: false,
    words: ["share request being reviewed", "share requests being reviewed"],
  },
  {
    href: "/support",
    key: "openHelpRequests",
    needsYou: false,
    words: ["open help request", "open help requests"],
  },
]

/** What is waiting for or on the member, things they must do first. */
export function getMemberWaitingItems(
  inProgress: MemberHomeInProgress
): MemberHomeWaitingItem[] {
  return waitingItems
    .filter((item) => inProgress[item.key] > 0)
    .map((item) => {
      const count = inProgress[item.key]

      return {
        count,
        href: item.href,
        key: item.key,
        label: count === 1 ? item.words[0] : item.words[1],
        needsYou: item.needsYou,
      }
    })
}

const memberStatusWords: Record<string, string> = {
  active: "Active",
  exited: "Left the cooperative",
  inactive: "Inactive",
  pending: "Waiting for approval",
  suspended: "Suspended",
}

export function getMemberStatusWord(status: string, isReady: boolean) {
  if (status === "active" && !isReady) return "Waiting for checks"

  return memberStatusWords[status] ?? status.replace(/_/g, " ")
}
