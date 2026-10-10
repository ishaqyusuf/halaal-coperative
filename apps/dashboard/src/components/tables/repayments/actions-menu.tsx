"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Banknote, Eye, MessageSquarePlus, MoreHorizontal } from "lucide-react"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

export function RepaymentScheduleActionsMenu({
  canPostRepayment,
  item,
}: {
  canPostRepayment: boolean
  item: RepaymentScheduleRow
}) {
  const { setParams } = useRepaymentParams()
  const canFollowUp = item.status === "overdue"
  const canPost = canPostRepayment && item.outstandingAmount > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for installment ${item.installmentNumber}`}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() =>
            void setParams({
              loanId: null,
              repaymentId: null,
              repaymentScheduleItemId: item.id,
              repaymentSheetType: "scheduleDetails",
            })
          }
        >
          <Eye />
          View installment
        </DropdownMenuItem>
        {canPost ? (
          <DropdownMenuItem
            onClick={() =>
            void setParams({
              loanId: item.loan.id,
              repaymentId: null,
                repaymentScheduleItemId: null,
                repaymentSheetType: "post",
              })
            }
          >
            <Banknote />
            Post repayment
          </DropdownMenuItem>
        ) : null}
        {canPostRepayment && canFollowUp ? (
          <DropdownMenuItem
            onClick={() =>
            void setParams({
              loanId: null,
              repaymentId: null,
              repaymentScheduleItemId: item.id,
                repaymentSheetType: "followUp",
              })
            }
          >
            <MessageSquarePlus />
            Record follow-up
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RepaymentHistoryActionsMenu({
  item,
}: {
  item: RepaymentHistoryRow
}) {
  const { setParams } = useRepaymentParams()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open repayment evidence for ${item.member.fullName}`}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() =>
            void setParams({
              loanId: null,
              repaymentId: item.id,
              repaymentScheduleItemId: null,
              repaymentSheetType: "repaymentDetails",
            })
          }
        >
          <Eye />
          View repayment evidence
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
