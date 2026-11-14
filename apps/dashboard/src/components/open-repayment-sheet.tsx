"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PlusIcon } from "lucide-react"
import { useRepaymentParams } from "@/hooks/use-repayment-params"

export function OpenRepaymentPostSheet({
  className,
  loanId,
}: {
  className?: string
  loanId?: string
}) {
  const { open } = useRepaymentParams()

  return (
    <Button
      className={cn("h-11 text-base", className)}
      onClick={() => void open({ loanId, repaymentSheetType: "post" })}
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Record a payment
    </Button>
  )
}
