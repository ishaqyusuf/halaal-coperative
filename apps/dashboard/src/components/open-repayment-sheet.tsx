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

export function OpenRepaymentPostSheet({ disabled }: { disabled?: boolean }) {
  const { setParams } = useRepaymentParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          repaymentScheduleItemId: null,
          repaymentSheetType: "post",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Post repayment
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
