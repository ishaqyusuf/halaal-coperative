import { LoanStatusWord } from "@/components/loans/loan-status-word"
import { getInstallmentWord, getRepaymentWord } from "@/lib/loans/loan-words"
import { formatDayMonthYear } from "@/utils/format"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

export function formatRepaymentDate(value: Date | string | null | undefined) {
  return formatDayMonthYear(value) ?? "Not set"
}

export function getOutstandingAmount(item: RepaymentScheduleRow) {
  return Math.max(Number(item.outstandingAmount), 0)
}

export function InstallmentStatusWord({ item }: { item: RepaymentScheduleRow }) {
  return <LoanStatusWord word={getInstallmentWord(item.status, item.isLate)} />
}

export function RepaymentStatusWord({ item }: { item: RepaymentHistoryRow }) {
  return <LoanStatusWord word={getRepaymentWord(item.status)} />
}

const followUpWords: Record<string, string> = {
  promise_to_pay: "Promised to pay",
  reminded: "Reminded",
  settled: "Settled",
  unreachable: "Could not reach",
}

/** The latest follow-up in a few words, or null when nobody has called. */
export function describeFollowUp(item: RepaymentScheduleRow) {
  const followUp = item.latestCollectionFollowUp
  if (!followUp) return null
  const outcome = followUpWords[followUp.status] ?? "Followed up"
  const promised = followUp.promiseToPayAt
    ? formatDayMonthYear(followUp.promiseToPayAt)
    : null

  return promised && followUp.status === "promise_to_pay"
    ? `${outcome} by ${promised}`
    : outcome
}
