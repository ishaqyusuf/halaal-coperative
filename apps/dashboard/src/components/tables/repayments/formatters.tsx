import { Badge } from "@halaalvest/ui/components/badge"
import { formatCurrency } from "@halaalvest/utils"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

export function formatRepaymentDate(value: Date | string | null | undefined) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

export function getOutstandingAmount(item: RepaymentScheduleRow) {
  return Math.max(Number(item.outstandingAmount), 0)
}

function statusClassName(status: string) {
  if (status === "paid" || status === "posted" || status === "resolved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "overdue" || status === "reversed") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  if (status === "partially_paid" || status === "due") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-slate-200 bg-slate-50 text-slate-700"
}

export function RepaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`${statusClassName(status)} capitalize`} variant="outline">
      {status.replaceAll("_", " ")}
    </Badge>
  )
}

export function ScheduleAmount({ item }: { item: RepaymentScheduleRow }) {
  return (
    <div>
      <p className="font-medium">{formatCurrency(Number(item.totalDue))}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatCurrency(getOutstandingAmount(item))} outstanding
      </p>
    </div>
  )
}

export function HistoryAmount({ item }: { item: RepaymentHistoryRow }) {
  return <span className="font-medium">{formatCurrency(Number(item.amount))}</span>
}
