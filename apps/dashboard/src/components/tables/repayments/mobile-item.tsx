"use client"

import { Button } from "@halaalvest/ui/components/button"
import { formatCurrency } from "@halaalvest/utils"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import {
  describeFollowUp,
  formatRepaymentDate,
  getOutstandingAmount,
  InstallmentStatusWord,
  RepaymentStatusWord,
} from "./formatters"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

function CardButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="flex w-full items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={onClick}
      type="button"
    >
      <span className="grid min-w-0 flex-1 gap-2">{children}</span>
      <ChevronRight
        aria-hidden
        className="mt-1 size-5 shrink-0 text-muted-foreground"
      />
    </button>
  )
}

export function RepaymentScheduleMobileItem({
  canPostRepayment,
  item,
}: {
  canPostRepayment: boolean
  item: RepaymentScheduleRow
}) {
  const { open } = useRepaymentParams()
  const owed = getOutstandingAmount(item)
  const followUp = describeFollowUp(item)

  return (
    <div className="grid gap-3 py-4">
      <CardButton
        label={`Open ${item.loan.member.fullName}'s payment due ${formatRepaymentDate(item.dueAt)}`}
        onClick={() =>
          void open({
            repaymentScheduleItemId: item.id,
            repaymentSheetType: "scheduleDetails",
          })
        }
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-lg font-semibold text-foreground">
            {item.loan.member.fullName}
          </span>
          <InstallmentStatusWord item={item} />
        </span>
        <span className="text-base text-foreground tabular-nums">
          {formatCurrency(owed)} due {formatRepaymentDate(item.dueAt)}
        </span>
        {followUp ? (
          <span className="text-base text-muted-foreground">{followUp}</span>
        ) : null}
      </CardButton>
      {canPostRepayment && owed > 0 ? (
        <Button
          size="touch"
          className="w-full text-base"
          onClick={() =>
            void open({ loanId: item.loan.id, repaymentSheetType: "post" })
          }
          type="button"
          variant="outline"
        >
          Record payment
        </Button>
      ) : null}
    </div>
  )
}

export function RepaymentHistoryMobileItem({
  item,
}: {
  item: RepaymentHistoryRow
}) {
  const { open } = useRepaymentParams()

  return (
    <div className="py-4">
      <CardButton
        label={`Open ${item.member.fullName}'s payment of ${formatCurrency(Number(item.amount))}`}
        onClick={() =>
          void open({
            repaymentId: item.id,
            repaymentSheetType: "repaymentDetails",
          })
        }
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-lg font-semibold text-foreground">
            {item.member.fullName}
          </span>
          <RepaymentStatusWord item={item} />
        </span>
        <span className="text-base text-foreground tabular-nums">
          {formatCurrency(Number(item.amount))} on{" "}
          {formatRepaymentDate(item.paidAt)}
        </span>
        {item.reference ? (
          <span className="truncate text-base text-muted-foreground">
            Ref {item.reference}
          </span>
        ) : null}
      </CardButton>
    </div>
  )
}
