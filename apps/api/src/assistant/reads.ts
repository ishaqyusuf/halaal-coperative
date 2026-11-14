import {
  type AssistantAnswer,
  type AssistantLink,
  assistantHelpItems,
  money,
} from "@halaalvest/assistant"
import { roleCan, type CooperativeRolePermission } from "@halaalvest/auth"
import {
  findAssistantMember,
  getMemberStatementSummary,
  readAssistantMemberFinancing,
  readAssistantMemberReceipts,
  readAssistantReceiptQueue,
  searchAssistantMembers,
} from "@halaalvest/db"
import type { AssistantPrincipal } from "./principal"

/**
 * Guarded capability reads. Each one rechecks the named permission against
 * the live membership role in the principal and scopes rows to its tenant
 * and (for members) the linked member. They reuse statement and receipt
 * sources; no balance is invented or summed across books.
 */

type Permission = CooperativeRolePermission["action"]

export type AssistantReadDependencies = {
  findMember: typeof findAssistantMember
  statement: typeof getMemberStatementSummary
  financing: typeof readAssistantMemberFinancing
  memberReceipts: typeof readAssistantMemberReceipts
  receiptQueue: typeof readAssistantReceiptQueue
  searchMembers: typeof searchAssistantMembers
  now: () => Date
}

export const defaultReadDependencies: AssistantReadDependencies = {
  findMember: findAssistantMember,
  statement: getMemberStatementSummary,
  financing: readAssistantMemberFinancing,
  memberReceipts: readAssistantMemberReceipts,
  receiptQueue: readAssistantReceiptQueue,
  searchMembers: searchAssistantMembers,
  now: () => new Date(),
}

export function denied(message = "You don't have access to that here."): AssistantAnswer {
  return { kind: "notice", tone: "denied", message, link: null }
}

export function unavailable(message: string, link: AssistantLink | null = null): AssistantAnswer {
  return { kind: "notice", tone: "unavailable", message, link }
}

function can(principal: AssistantPrincipal, permission: Permission) {
  return roleCan(principal.role, permission)
}

const receiptStatus = (status: string) =>
  status === "approved"
    ? "approved"
    : status === "rejected"
      ? "rejected"
      : status === "correction_requested"
        ? "correction"
        : "submitted"

const receiptLink = (id: string): AssistantLink => ({
  label: "Open receipt",
  href: `/payment-receipts?receiptId=${encodeURIComponent(id)}`,
})

const memberLink = (memberId: string): AssistantLink => ({
  label: "Open member",
  href: `/members/${encodeURIComponent(memberId)}`,
})

async function requireOwnMember(
  principal: AssistantPrincipal,
  deps: AssistantReadDependencies
) {
  if (principal.role !== "member") return null
  return deps.findMember({ tenantId: principal.tenantId, userId: principal.userId })
}

const requestStage = (status: string, guarantors: { status: string }[]) => {
  if (guarantors.some((g) => g.status === "pending")) return "Waiting for guarantor"
  if (status === "approved") return "Approved, not yet disbursed"
  if (status === "under_review") return "Under review"
  return "Submitted"
}

/** M01 — financing requests, active financing and next scheduled payment. */
export async function readFinancingStatus(
  principal: AssistantPrincipal,
  deps = defaultReadDependencies
): Promise<AssistantAnswer> {
  if (!can(principal, "view_own_member_profile")) return denied()
  const member = await requireOwnMember(principal, deps)
  if (!member)
    return unavailable("Your account is not linked to a member profile yet.")
  const { requests, loans } = await deps.financing({
    tenantId: principal.tenantId,
    memberId: member.id,
  })
  if (!requests.length && !loans.length)
    return {
      kind: "notice",
      tone: "empty",
      message: "You have no financing requests or active financing.",
      link: { label: "Open financing", href: "/loans" },
    }
  return {
    kind: "financing-status",
    asOf: deps.now().toISOString(),
    requests: requests.map((request) => ({
      id: request.id,
      reference: `FIN-${request.id.slice(0, 6).toUpperCase()}`,
      label: request.loanProduct?.name ?? "Financing request",
      amount: money(request.requestedAmount),
      stage: requestStage(request.status, request.guarantorApprovals),
    })),
    active: loans.map((loan) => {
      const next = loan.repaymentScheduleItems[0]
      const status =
        loan.status === "defaulted" || next?.status === "overdue"
          ? ("overdue" as const)
          : loan.status === "approved"
            ? ("approved" as const)
            : loan.status === "disbursed"
              ? ("disbursed" as const)
              : ("repaying" as const)
      return {
        id: loan.id,
        reference: `FIN-${loan.id.slice(0, 6).toUpperCase()}`,
        label: loan.loanProduct?.name ?? "Financing",
        principal: money(loan.principalAmount),
        remaining: money(loan.outstandingPrincipal),
        status,
        nextDue: next
          ? {
              date: next.dueAt.toISOString().slice(0, 10),
              amount: money(
                Math.max(0, Number(next.totalDue) - Number(next.amountPaid))
              ),
            }
          : null,
      }
    }),
    link: { label: "Open financing", href: "/loans" },
  }
}

/** M02 — savings, special savings, share capital and published profit, separately. */
export async function readInvestments(
  principal: AssistantPrincipal,
  deps = defaultReadDependencies
): Promise<AssistantAnswer> {
  if (!can(principal, "view_own_member_profile")) return denied()
  const member = await requireOwnMember(principal, deps)
  if (!member)
    return unavailable("Your account is not linked to a member profile yet.")
  const summary = await deps.statement(principal.tenantId, member.id)
  const link: AssistantLink = {
    label: "Open statement",
    href: `/members/${encodeURIComponent(member.id)}/statement`,
  }
  if (!summary) return unavailable("Your statement is not available right now.", link)
  return {
    kind: "investments",
    asOf: deps.now().toISOString(),
    regularSavings: money(summary.totalSavingsSnapshot),
    specialSavings: money(summary.specialSavingsBalance),
    shareCapital: money(summary.shareCapitalBalance),
    shareUnits: null,
    publishedProfit: money(summary.totalDividendAllocations),
    basis:
      "From your statement. Profit shows published allocations only. Pending receipts are not included.",
    link,
  }
}

/** M03 — the member's own receipts and their review status. */
export async function readOwnReceipts(
  principal: AssistantPrincipal,
  deps = defaultReadDependencies
): Promise<AssistantAnswer> {
  if (!can(principal, "submit_receipts")) return denied()
  const member = await requireOwnMember(principal, deps)
  if (!member)
    return unavailable("Your account is not linked to a member profile yet.")
  const rows = await deps.memberReceipts({
    tenantId: principal.tenantId,
    memberId: member.id,
    limit: 5,
  })
  if (!rows.length)
    return {
      kind: "notice",
      tone: "empty",
      message: "You have not submitted any receipts yet.",
      link: { label: "Open receipts", href: "/payment-receipts" },
    }
  return {
    kind: "receipts",
    asOf: deps.now().toISOString(),
    items: rows.map((row) => ({
      id: row.id,
      reference: row.paymentReference ?? `RCPT-${row.id.slice(0, 6).toUpperCase()}`,
      amount: money(row.totalAmount),
      submittedAt: row.submittedAt.toISOString(),
      status: receiptStatus(row.status),
      reason:
        row.status === "rejected" || row.status === "correction_requested"
          ? (row.reviewNotes ?? null)
          : null,
      link: receiptLink(row.id),
    })),
    nextCursor: null,
    link: { label: "All receipts", href: "/payment-receipts" },
  }
}

/** S01 — authorized member matches; the staff user chooses. */
export async function readMemberMatches(
  principal: AssistantPrincipal,
  query: string | null,
  deps = defaultReadDependencies
): Promise<AssistantAnswer> {
  if (principal.role === "member" || !can(principal, "manage_members"))
    return denied()
  if (!query)
    return {
      kind: "clarify",
      question: "Which member? Send a name or member number.",
      options: [],
    }
  const { items, truncated } = await deps.searchMembers({
    tenantId: principal.tenantId,
    query,
    limit: 5,
  })
  if (!items.length)
    return {
      kind: "notice",
      tone: "empty",
      message: `No member matches “${query}”.`,
      link: { label: "Open members", href: "/members" },
    }
  return {
    kind: "member-matches",
    query,
    items: items.map((item) => ({
      memberId: item.id,
      memberNumber: item.memberNumber,
      name: item.fullName,
      hint: item.deductionSource?.name ?? null,
      link: memberLink(item.id),
    })),
    truncated,
  }
}

/** S02 — one exact member's position and recent receipts. */
export async function readMemberHistory(
  principal: AssistantPrincipal,
  query: string | null,
  deps = defaultReadDependencies
): Promise<AssistantAnswer> {
  if (principal.role === "member" || !can(principal, "manage_members"))
    return denied()
  if (!query) return readMemberMatches(principal, null, deps)
  const { items } = await deps.searchMembers({
    tenantId: principal.tenantId,
    query,
    limit: 5,
  })
  // Only an exact member-number match or a single result is selected; otherwise the user chooses.
  const exact =
    items.find((item) => item.memberNumber.toUpperCase() === query.toUpperCase()) ??
    (items.length === 1 ? items[0] : null)
  if (!exact) return readMemberMatches(principal, query, deps)
  const [summary, receipts] = await Promise.all([
    deps.statement(principal.tenantId, exact.id),
    can(principal, "review_receipts")
      ? deps.memberReceipts({ tenantId: principal.tenantId, memberId: exact.id, limit: 3 })
      : Promise.resolve([]),
  ])
  const link: AssistantLink = {
    label: "Open statement",
    href: `/members/${encodeURIComponent(exact.id)}/statement`,
  }
  if (!summary) return unavailable("This member's statement is not available right now.", link)
  return {
    kind: "member-history",
    asOf: deps.now().toISOString(),
    member: { memberId: exact.id, memberNumber: exact.memberNumber, name: exact.fullName },
    regularSavings: money(summary.totalSavingsSnapshot),
    specialSavings: money(summary.specialSavingsBalance),
    shareCapital: money(summary.shareCapitalBalance),
    outstandingFinancing: money(summary.totalOutstandingPrincipal),
    recentReceipts: receipts.map((row) => ({
      id: row.id,
      reference: row.paymentReference ?? `RCPT-${row.id.slice(0, 6).toUpperCase()}`,
      amount: money(row.totalAmount),
      submittedAt: row.submittedAt.toISOString(),
      status: receiptStatus(row.status),
      reason: null,
      link: receiptLink(row.id),
    })),
    link,
  }
}

/** S03 — pending and correction receipt counts with the oldest items. */
export async function readReceiptQueue(
  principal: AssistantPrincipal,
  deps = defaultReadDependencies
): Promise<AssistantAnswer> {
  if (principal.role === "member" || !can(principal, "review_receipts"))
    return denied()
  const queue = await deps.receiptQueue({ tenantId: principal.tenantId, limit: 5 })
  if (!queue.pendingCount && !queue.correctionCount)
    return {
      kind: "notice",
      tone: "empty",
      message: "No receipts are waiting for review.",
      link: { label: "Open receipts", href: "/payment-receipts" },
    }
  return {
    kind: "receipt-queue",
    asOf: deps.now().toISOString(),
    pendingCount: queue.pendingCount,
    correctionCount: queue.correctionCount,
    items: queue.items.map((row) => ({
      id: row.id,
      reference: `RCPT-${row.id.slice(0, 6).toUpperCase()}`,
      memberName: row.member.fullName,
      memberNumber: row.member.memberNumber,
      amount: money(row.totalAmount),
      submittedAt: row.submittedAt.toISOString(),
      status: receiptStatus(row.status),
      link: { label: "Review", href: `/payment-receipts?receiptId=${encodeURIComponent(row.id)}` },
    })),
    nextCursor: null,
    link: { label: "Open receipt queue", href: "/payment-receipts" },
  }
}

export function readHelp(principal: AssistantPrincipal): AssistantAnswer {
  return {
    kind: "help",
    items: assistantHelpItems(principal.role, principal.channel, {
      messagingChannelEnabled: true,
    }),
  }
}
