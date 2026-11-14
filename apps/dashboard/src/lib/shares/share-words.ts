import type { MemberShareApplicationStatus } from "@halaalvest/db"

// Plain words for the shares page (members and staff, often on phones).

export type ShareStatusTone = "good" | "muted" | "warning"

const statusWords: Record<
  MemberShareApplicationStatus,
  { label: string; tone: ShareStatusTone }
> = {
  approved: { label: "Approved", tone: "good" },
  cancelled: { label: "Cancelled", tone: "muted" },
  pending: { label: "Waiting", tone: "warning" },
  rejected: { label: "Not approved", tone: "muted" },
}

export function getShareRequestStatusWord(
  status: MemberShareApplicationStatus
) {
  return statusWords[status] ?? { label: status, tone: "muted" as const }
}

/** "1 share", "5 shares". */
export function formatShareCount(count: number) {
  return `${count.toLocaleString("en-NG")} ${count === 1 ? "share" : "shares"}`
}

/** Shares a member can still ask for, after approved and waiting ones. */
export function getRemainingShares(position: {
  maximumUnits: number
  totalPendingUnits: number
}) {
  return Math.max(0, position.maximumUnits - position.totalPendingUnits)
}
