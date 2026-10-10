"use client"

import { Button } from "@halaalvest/ui/components/button"
import { MessageSquarePlusIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import { useRepaymentParams } from "@/hooks/use-repayment-params"

export function OpenRepaymentRefreshSheet() {
  const { setParams } = useRepaymentParams()

  return (
    <Button
      onClick={() =>
        setParams({
          loanId: null,
          repaymentId: null,
          repaymentScheduleItemId: null,
          repaymentSheetType: "refresh",
        })
      }
      type="button"
      variant="outline"
    >
      <RefreshCwIcon data-icon="inline-start" />
      Refresh collections status
    </Button>
  )
}

export function OpenRepaymentPostSheet({
  disabled,
  iconOnly = false,
  loanId,
}: {
  disabled?: boolean
  iconOnly?: boolean
  loanId?: string
}) {
  const { setParams } = useRepaymentParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          loanId: loanId ?? null,
          repaymentId: null,
          repaymentScheduleItemId: null,
          repaymentSheetType: "post",
        })
      }
      type="button"
      {...(iconOnly
        ? {
            "aria-label": "Post repayment",
            className: "size-11",
            size: "icon-lg" as const,
          }
        : {})}
    >
      <PlusIcon data-icon="inline-start" />
      {iconOnly ? null : "Post repayment"}
    </Button>
  )
}

export function OpenCollectionFollowUpSheet({
  repaymentScheduleItemId,
}: {
  repaymentScheduleItemId: string
}) {
  const { setParams } = useRepaymentParams()

  return (
    <Button
      onClick={() =>
        setParams({
          loanId: null,
          repaymentId: null,
          repaymentScheduleItemId,
          repaymentSheetType: "followUp",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <MessageSquarePlusIcon data-icon="inline-start" />
      Follow up
    </Button>
  )
}

export function OpenRepaymentScheduleDetailsSheet({
  repaymentScheduleItemId,
}: {
  repaymentScheduleItemId: string
}) {
  const { setParams } = useRepaymentParams()

  return (
    <Button
      onClick={() =>
        setParams({
          loanId: null,
          repaymentId: null,
          repaymentScheduleItemId,
          repaymentSheetType: "scheduleDetails",
        })
      }
      type="button"
      variant="ghost"
    >
      View installment
    </Button>
  )
}

export function OpenRepaymentDetailsSheet({
  repaymentId,
}: {
  repaymentId: string
}) {
  const { setParams } = useRepaymentParams()

  return (
    <Button
      onClick={() =>
        setParams({
          loanId: null,
          repaymentId,
          repaymentScheduleItemId: null,
          repaymentSheetType: "repaymentDetails",
        })
      }
      type="button"
      variant="ghost"
    >
      View repayment
    </Button>
  )
}
