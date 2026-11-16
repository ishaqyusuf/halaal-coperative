"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { PlusIcon } from "lucide-react"
import { useLoanParams } from "@/hooks/use-loan-params"

export function OpenLoanRequestSheet({
  className,
  disabled,
  label = "Ask for a loan",
}: {
  className?: string
  disabled?: boolean
  label?: string
}) {
  const { open } = useLoanParams()

  return (
    <Button
      size="touch"
      className={cn("text-base", className)}
      disabled={disabled}
      onClick={() => void open({ loanSheetType: "request" })}
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      {label}
    </Button>
  )
}
