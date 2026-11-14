import type { CooperativeRole } from "@halaalvest/auth/roles"
import { canAccessDashboardPath } from "@/lib/navigation/lib"

type AttentionSource = {
  count: number
  href: string
  key: string
  label: string
  severity: "critical" | "neutral" | "warning"
}

export type OverviewAttentionItem = {
  count: number
  href: string
  key: string
  label: string
  urgent: boolean
}

// Plain words for each queue: [one, many].
const attentionWords: Record<string, [string, string]> = {
  "disbursement-holds": [
    "approved loan to pay out",
    "approved loans to pay out",
  ],
  "failed-imports": ["import that failed", "imports that failed"],
  "financing-approvals": ["loan request to review", "loan requests to review"],
  "financing-cycle-warnings": ["lending warning", "lending warnings"],
  "food-purchase-accounting": [
    "food purchase account to check",
    "food purchase accounts to check",
  ],
  "food-purchase-applications": [
    "food purchase request to review",
    "food purchase requests to review",
  ],
  "kyc-documents": ["member to verify", "members to verify"],
  "membership-approvals": ["person waiting to join", "people waiting to join"],
  "opening-balances": ["opening balance to check", "opening balances to check"],
  "overdue-follow-ups": ["late repayment", "late repayments"],
  "payment-receipts": ["payment receipt to check", "payment receipts to check"],
  "procurement-requests": ["item request to review", "item requests to review"],
  "profit-review": [
    "profit or dividend to review",
    "profits or dividends to review",
  ],
  "project-financing-requests": [
    "business funding request",
    "business funding requests",
  ],
  "share-applications": ["share request to review", "share requests to review"],
  "support-cases": ["open help request", "open help requests"],
}

// The setup banner already covers setup warnings.
const hiddenKeys = new Set(["setup-warnings"])

export function getAttentionLabel(
  key: string,
  count: number,
  fallback: string
) {
  const words = attentionWords[key]

  if (!words) return fallback

  return count === 1 ? words[0] : words[1]
}

/**
 * Turns the overview action queue into what one person can act on: only open
 * work, only pages their role can open, the most urgent first.
 */
export function getOverviewAttentionItems(
  items: AttentionSource[],
  role: CooperativeRole | null
): OverviewAttentionItem[] {
  return items
    .filter((item) => item.count > 0 && !hiddenKeys.has(item.key))
    .filter((item) => {
      const pathname = item.href.split("?")[0] ?? item.href

      return canAccessDashboardPath(pathname, role)
    })
    .map((item) => ({
      count: item.count,
      href: item.href,
      key: item.key,
      label: getAttentionLabel(item.key, item.count, item.label),
      urgent: item.severity === "critical",
    }))
    .sort((first, second) => Number(second.urgent) - Number(first.urgent))
}
