"use client"

import { formatCurrency } from "@halaalvest/utils"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { LoanStatusWord } from "@/components/loans/loan-status-word"
import { useLoanParams } from "@/hooks/use-loan-params"
import {
  getGuarantorSummary,
  getLoanRequestWord,
  getLoanWord,
} from "@/lib/loans/loan-words"
import type { LoanPortfolioRow } from "./portfolio-table"
import type { LoanRequestRow } from "./requests-table"

/** A phone row: one big button that opens the details sheet. */
function LoanCardButton({
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
      className="flex w-full items-start gap-3 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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

export function LoanRequestMobileItem({ request }: { request: LoanRequestRow }) {
  const { open } = useLoanParams()
  const guarantors = getGuarantorSummary(request.guarantorApprovals)

  return (
    <LoanCardButton
      label={`Open ${request.member.fullName}'s request`}
      onClick={() =>
        void open({
          loanRequestId: request.id,
          loanSheetType: "request-details",
        })
      }
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 text-lg font-semibold text-foreground">
          {request.member.fullName}
        </span>
        <LoanStatusWord word={getLoanRequestWord(request.status)} />
      </span>
      <span className="text-base text-foreground tabular-nums">
        {formatCurrency(Number(request.requestedAmount))} over{" "}
        {request.requestedTermMonths} months
      </span>
      <span className="text-base text-muted-foreground">
        {request.loanProduct.name} · {guarantors.label}
      </span>
    </LoanCardButton>
  )
}

export function LoanPortfolioMobileItem({ loan }: { loan: LoanPortfolioRow }) {
  const { open } = useLoanParams()

  return (
    <LoanCardButton
      label={`Open ${loan.member.fullName}'s loan`}
      onClick={() => void open({ loanId: loan.id, loanSheetType: "loan-details" })}
    >
      <span className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 text-lg font-semibold text-foreground">
          {loan.member.fullName}
        </span>
        <LoanStatusWord word={getLoanWord(loan.status)} />
      </span>
      <span className="text-base text-foreground tabular-nums">
        Owes {formatCurrency(Number(loan.outstandingPrincipal))}
        <span className="text-muted-foreground">
          {" "}
          of {formatCurrency(Number(loan.principalAmount))}
        </span>
      </span>
      <span className="text-base text-muted-foreground">
        {loan.loanProduct.name} ·{" "}
        {formatCurrency(Number(loan.estimatedMonthlyServicing))} a month
      </span>
    </LoanCardButton>
  )
}
