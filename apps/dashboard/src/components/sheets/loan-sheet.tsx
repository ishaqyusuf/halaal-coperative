"use client"

import { Suspense } from "react"
import {
  LoanContent,
  type LoanMemberOption,
  type LoanProductOption,
  type LoanRequestChargeOption,
} from "@/components/loan-content"
import { LoanSheetHeader } from "@/components/loan-sheet-header"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useLoanParams } from "@/hooks/use-loan-params"

function isLoanSheetOpen(type: string | null) {
  return Boolean(
    type === "request" ||
      type === "review" ||
      type === "guarantor" ||
      type === "disburse"
  )
}

export function LoanSheet({
  devMode,
  disabledReason,
  fixedMember,
  loanProducts,
  loanRequestCharges,
  members,
}: {
  devMode: boolean
  disabledReason?: string | null
  fixedMember?: LoanMemberOption
  loanProducts: LoanProductOption[]
  loanRequestCharges?: LoanRequestChargeOption[]
  members: LoanMemberOption[]
}) {
  const { loanSheetType, setParams } = useLoanParams()
  const isOpen = isLoanSheetOpen(loanSheetType)
  const isWide = loanSheetType === "request"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent
        className={
          isWide ? "w-full overflow-y-auto sm:max-w-3xl" : "overflow-y-auto"
        }
      >
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading loan form...
              </div>
            }
          >
            <LoanSheetHeader />
            <LoanContent
              devMode={devMode}
              disabledReason={disabledReason}
              fixedMember={fixedMember}
              loanProducts={loanProducts}
              loanRequestCharges={loanRequestCharges}
              members={members}
            />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
