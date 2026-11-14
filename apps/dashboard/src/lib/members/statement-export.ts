import type { getMemberStatementView } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { formatDayMonthYear } from "@/utils/format"
import { buildMemberBalanceTextLines } from "./member-balances"
import {
  buildMemberStatementLines,
  statementMoveLabels,
} from "./member-statement-lines"
import { getMemberStatusLabel } from "./member-status-words"

export type MemberStatementView = NonNullable<
  Awaited<ReturnType<typeof getMemberStatementView>>
>

/**
 * Plain-text statement download: the same balances and "money in and out"
 * lines as the statement page, newest first.
 */
export function buildMemberStatementText(
  detail: MemberStatementView,
  cooperativeName: string,
  today = new Date()
) {
  const { member } = detail
  const postings = buildMemberStatementLines(detail.ledgerTransactions)

  return [
    `${cooperativeName}`,
    `Statement for ${member.fullName}`,
    ``,
    `Member no.: ${member.memberNumber}`,
    `Workplace: ${member.deductionSource?.name ?? "None"}`,
    `Joined: ${formatDayMonthYear(member.joinedAt)}`,
    `Status: ${getMemberStatusLabel(member.status)}`,
    `Statement date: ${formatDayMonthYear(today)}`,
    ``,
    ...buildMemberBalanceTextLines(detail.summary),
    ``,
    `Money in and out (newest first)`,
    ...(postings.length
      ? postings.flatMap((line) =>
          line.moves.map(
            (move) =>
              `${formatDayMonthYear(line.date)} | ${line.description} | ${
                statementMoveLabels[move.kind]
              } ${formatCurrency(move.amount)}`
          )
        )
      : ["Nothing has been posted yet."]),
    ...(detail.pendingCharges.length
      ? [
          ``,
          `Fees still to pay`,
          ...detail.pendingCharges.map(
            (charge) =>
              `${formatDayMonthYear(charge.assessedAt)} | ${
                charge.chargeDefinition.name
              } | ${formatCurrency(Number(charge.amount))}`
          ),
        ]
      : []),
    ...(detail.dividendAllocations.length
      ? [
          ``,
          `Profit shared`,
          ...detail.dividendAllocations.map(
            (allocation) =>
              `${formatDayMonthYear(allocation.dividendPeriod.publishedAt) ?? "Not dated"} | ${
                allocation.dividendPeriod.name
              } | ${formatCurrency(Number(allocation.allocationAmount))}`
          ),
        ]
      : []),
  ].join("\n")
}

export function createMemberStatementTextResponse(
  detail: MemberStatementView,
  cooperativeName: string
) {
  return new Response(buildMemberStatementText(detail, cooperativeName), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${detail.member.memberNumber}-statement.txt"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
