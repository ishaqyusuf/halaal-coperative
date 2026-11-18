import type { Prisma, PrismaClient } from "../../generated/prisma/client"
import { getMemberStatementSummary, type MemberStatementSummary } from "./members"

/**
 * Closing an account works like closing a bank account (owner, 18 Nov 2026):
 * the cooperative settles the member's money first, and only then does
 * Halaalvest close the login. This is the money check the platform operator
 * sees before closing a login, and the server-side block on closing it.
 *
 * A member record counts as settled when every line below is zero, or when
 * the cooperative has already marked the member `exited` (the existing member
 * status change, which sets `exitedAt`).
 */
export type ClosingMoneyLineKind =
  | "savings"
  | "special_savings"
  | "shares"
  | "loans_owed"
  | "loans_approved_not_paid_out"
  | "purchases_owed"
  | "guarantees"

export type ClosingMoneyLine = {
  kind: ClosingMoneyLineKind
  label: string
  /** Naira amount; null for the guarantee count line. */
  amount: number | null
  /** Number of active guarantees; null for money lines. */
  count: number | null
  /** True when this line must be settled before the login can close. */
  outstanding: boolean
}

export type MemberClosingPosition = {
  memberId: string
  tenantId: string
  tenantName: string
  memberNumber: string
  status: string
  exitedAt: Date | null
  /** The cooperative has marked this member exited. */
  exited: boolean
  lines: ClosingMoneyLine[]
  /** Nothing outstanding, or the member has exited. */
  settled: boolean
}

export type AccountClosingPosition = {
  members: MemberClosingPosition[]
  canCloseLogin: boolean
  /** Plain words naming what is still outstanding; null when settled. */
  outstandingSummary: string | null
}

/** Loan statuses where a guarantor is still on the hook. */
const guaranteedLoanStatuses = [
  "approved",
  "disbursed",
  "active",
  "defaulted",
] as const
/** Loan request statuses that can still become (or are) a running loan. */
const guaranteedRequestStatuses = [
  "submitted",
  "under_review",
  "approved",
] as const

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
})

export function formatClosingMoney(value: number) {
  return moneyFormatter.format(value)
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

type ClosingSummary = Pick<
  MemberStatementSummary,
  | "totalSavingsSnapshot"
  | "specialSavingsBalance"
  | "shareCapitalBalance"
  | "totalOutstandingPrincipal"
  | "approvedNotPaidOutAmount"
  | "procurementOutstanding"
  | "foodPurchaseOutstanding"
>

/** The money lines for one member record, from their statement summary. */
export function closingMoneyLines(
  summary: ClosingSummary | null,
  activeGuarantees: number
): ClosingMoneyLine[] {
  const money = (
    kind: ClosingMoneyLineKind,
    label: string,
    value: number | undefined
  ): ClosingMoneyLine => {
    const amount = round(Number(value ?? 0))
    // Any non-zero balance needs the cooperative: money held is paid out,
    // money owed is collected, and a negative balance needs correcting.
    return { kind, label, amount, count: null, outstanding: amount !== 0 }
  }
  return [
    money("savings", "Savings", summary?.totalSavingsSnapshot),
    money("special_savings", "Special savings", summary?.specialSavingsBalance),
    money("shares", "Shares", summary?.shareCapitalBalance),
    money("loans_owed", "Loans still owed", summary?.totalOutstandingPrincipal),
    money(
      "loans_approved_not_paid_out",
      "Loans approved, not yet paid out",
      summary?.approvedNotPaidOutAmount
    ),
    money(
      "purchases_owed",
      "Procurement and foodstuff still owed",
      round(
        Number(summary?.procurementOutstanding ?? 0) +
          Number(summary?.foodPurchaseOutstanding ?? 0)
      )
    ),
    {
      kind: "guarantees",
      label: "Guarantees on someone else's loan",
      amount: null,
      count: activeGuarantees,
      outstanding: activeGuarantees > 0,
    },
  ]
}

function describeLine(line: ClosingMoneyLine) {
  if (line.kind === "guarantees")
    return `${line.count} active guarantee${line.count === 1 ? "" : "s"} on someone else's loan`
  return `${line.label.toLowerCase()} ${formatClosingMoney(line.amount ?? 0)}`
}

/** Builds the account-level answer from each member record's position. */
export function summarizeClosingPosition(
  members: MemberClosingPosition[]
): AccountClosingPosition {
  const open = members.filter((member) => !member.settled)
  return {
    members,
    canCloseLogin: open.length === 0,
    outstandingSummary: open.length
      ? open
          .map(
            (member) =>
              `${member.tenantName} (member ${member.memberNumber}): ${member.lines
                .filter((line) => line.outstanding)
                .map(describeLine)
                .join(", ")}`
          )
          .join("; ")
      : null,
  }
}

type ClosingReader = PrismaClient | Prisma.TransactionClient

/**
 * The money position of every member record linked to this login. Reuses
 * the shared statement summary (one SQL statement per member record) and
 * counts active guarantees. Works inside a transaction so the close-login
 * block reads the same snapshot it writes against.
 */
export async function readAccountClosingPosition(
  db: ClosingReader,
  userId: string
): Promise<AccountClosingPosition> {
  const members = await db.member.findMany({
    where: { userId },
    select: {
      id: true,
      tenantId: true,
      memberNumber: true,
      status: true,
      exitedAt: true,
      tenant: { select: { name: true } },
    },
    orderBy: [{ tenantId: "asc" }, { id: "asc" }],
  })
  const positions: MemberClosingPosition[] = []
  for (const member of members) {
    // Sequential: inside an interactive transaction both reads share one
    // connection anyway.
    const summary = await getMemberStatementSummary(
      member.tenantId,
      member.id,
      db as unknown as PrismaClient
    )
    const activeGuarantees = await db.loanGuarantorApproval.count({
        where: {
          tenantId: member.tenantId,
          guarantorMemberId: member.id,
          status: "approved",
          loanRequest: {
            status: { in: [...guaranteedRequestStatuses] },
            OR: [
              { loan: { is: null } },
              { loan: { is: { status: { in: [...guaranteedLoanStatuses] } } } },
            ],
          },
        },
      })
    const lines = closingMoneyLines(summary, activeGuarantees)
    const exited = member.status === "exited"
    positions.push({
      memberId: member.id,
      tenantId: member.tenantId,
      tenantName: member.tenant.name,
      memberNumber: member.memberNumber,
      status: member.status,
      exitedAt: member.exitedAt,
      exited,
      lines,
      settled: exited || lines.every((line) => !line.outstanding),
    })
  }
  return summarizeClosingPosition(positions)
}
