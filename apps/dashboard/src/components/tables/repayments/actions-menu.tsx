"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

export function RepaymentScheduleActionsMenu({
  canPostRepayment,
  item,
}: {
  canPostRepayment: boolean
  item: RepaymentScheduleRow
}) {
  const { open } = useRepaymentParams()
  const canPost = canPostRepayment && item.outstandingAmount > 0

  return (
    <div className="flex items-center gap-1">
      {canPost ? (
        <Button
          className="h-10 px-3 text-base"
          onClick={() =>
            void open({ loanId: item.loan.id, repaymentSheetType: "post" })
          }
          type="button"
          variant="outline"
        >
          Record payment
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`More for ${item.loan.member.fullName}`}
              className="size-10"
              size="icon"
              type="button"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            className="min-h-11 text-base"
            onClick={() =>
              void open({
                repaymentScheduleItemId: item.id,
                repaymentSheetType: "scheduleDetails",
              })
            }
          >
            Open
          </DropdownMenuItem>
          {canPostRepayment && item.isLate ? (
            <DropdownMenuItem
              className="min-h-11 text-base"
              onClick={() =>
                void open({
                  repaymentScheduleItemId: item.id,
                  repaymentSheetType: "followUp",
                })
              }
            >
              Add a follow-up note
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export function RepaymentHistoryActionsMenu({
  item,
}: {
  item: RepaymentHistoryRow
}) {
  const { open } = useRepaymentParams()

  return (
    <Button
      className="h-10 px-3 text-base"
      onClick={() =>
        void open({ repaymentId: item.id, repaymentSheetType: "repaymentDetails" })
      }
      type="button"
      variant="outline"
    >
      Open
    </Button>
  )
}
