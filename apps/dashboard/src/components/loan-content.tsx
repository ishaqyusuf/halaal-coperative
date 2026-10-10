"use client"

import { useRouter } from "next/navigation"
import { formatCurrency } from "@halaalvest/utils"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import {
  LoanDisbursementForm,
  LoanGuarantorReviewForm,
  LoanRequestForm,
  LoanReviewForm,
} from "@/components/forms/finance-forms"
import { useLoanParams } from "@/hooks/use-loan-params"
import { useTRPC } from "@/trpc/client"

export type LoanProductOption = { id: string; label: string }
export type LoanMemberOption = { id: string; label: string }
export type LoanRequestChargeOption = {
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  collectionMode: string
  id: string
  name: string
}

function useCompleteLoanWorkflow() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const { loanId, loanRequestId, setParams } = useLoanParams()

  return async () => {
    const invalidations = [
      queryClient.invalidateQueries(trpc.loans.requests.infiniteQueryFilter()),
      queryClient.invalidateQueries(trpc.loans.portfolio.infiniteQueryFilter()),
    ]

    if (loanRequestId) {
      invalidations.push(
        queryClient.invalidateQueries(
          trpc.loans.request.queryFilter({ loanRequestId })
        )
      )
    }

    if (loanId) {
      invalidations.push(
        queryClient.invalidateQueries(trpc.loans.loan.queryFilter({ loanId }))
      )
    }

    await Promise.all(invalidations)
    await setParams(null)
    router.refresh()
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-border py-3 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[16rem] text-right font-medium text-foreground">
        {value}
      </dd>
    </div>
  )
}

function LoanRequestDetails({ loanRequestId }: { loanRequestId: string }) {
  const trpc = useTRPC()
  const { data: request } = useSuspenseQuery(
    trpc.loans.request.queryOptions({ loanRequestId })
  )

  if (!request) {
    return (
      <p className="border-y border-border py-6 text-sm text-muted-foreground">
        This loan request could not be found.
      </p>
    )
  }

  return (
    <dl className="border-t border-border">
      <DetailRow label="Member" value={request.member.fullName} />
      <DetailRow label="Product" value={request.loanProduct.name} />
      <DetailRow
        label="Requested amount"
        value={formatCurrency(Number(request.requestedAmount))}
      />
      <DetailRow label="Term" value={`${request.requestedTermMonths} months`} />
      <DetailRow label="Status" value={request.status.replace(/_/g, " ")} />
      <DetailRow
        label="Monthly servicing"
        value={formatCurrency(Number(request.estimatedMonthlyServicing))}
      />
      <DetailRow
        label="Extra monthly savings"
        value={formatCurrency(Number(request.extraMonthlySavingsAmount))}
      />
      <DetailRow
        label="Guarantors"
        value={`${request.guarantorApprovals.length}`}
      />
      {request.purpose ? (
        <DetailRow label="Purpose" value={request.purpose} />
      ) : null}
    </dl>
  )
}

function LoanDetails({ loanId }: { loanId: string }) {
  const trpc = useTRPC()
  const { data: loan } = useSuspenseQuery(
    trpc.loans.loan.queryOptions({ loanId })
  )

  if (!loan) {
    return (
      <p className="border-y border-border py-6 text-sm text-muted-foreground">
        This loan could not be found.
      </p>
    )
  }

  return (
    <dl className="border-t border-border">
      <DetailRow label="Member" value={loan.member.fullName} />
      <DetailRow label="Product" value={loan.loanProduct.name} />
      <DetailRow
        label="Principal"
        value={formatCurrency(Number(loan.principalAmount))}
      />
      <DetailRow
        label="Outstanding"
        value={formatCurrency(Number(loan.outstandingPrincipal))}
      />
      <DetailRow label="Term" value={`${loan.termMonths} months`} />
      <DetailRow label="Status" value={loan.status.replace(/_/g, " ")} />
      <DetailRow
        label="Monthly servicing"
        value={formatCurrency(Number(loan.estimatedMonthlyServicing))}
      />
      <DetailRow
        label="Repayment schedule"
        value={`${loan.repaymentScheduleItems.length} installment${loan.repaymentScheduleItems.length === 1 ? "" : "s"}`}
      />
    </dl>
  )
}

export function LoanContent({
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
  const completeLoanWorkflow = useCompleteLoanWorkflow()
  const {
    guarantorApprovalId,
    guarantorReviewStatus,
    loanId,
    loanRequestId,
    loanReviewStatus,
    loanSheetType,
  } = useLoanParams()

  if (loanSheetType === "request-details") {
    return loanRequestId ? (
      <LoanRequestDetails loanRequestId={loanRequestId} />
    ) : (
      <p className="text-sm text-muted-foreground">
        Select a loan request to view its details.
      </p>
    )
  }

  if (loanSheetType === "loan-details") {
    return loanId ? (
      <LoanDetails loanId={loanId} />
    ) : (
      <p className="text-sm text-muted-foreground">
        Select a loan to view its details.
      </p>
    )
  }

  if (loanSheetType === "request") {
    return (
      <div>
        <LoanRequestForm
          devMode={devMode}
          disabledReason={disabledReason}
          fixedMember={fixedMember}
          loanProducts={loanProducts}
          loanRequestCharges={loanRequestCharges}
          members={members}
          onSuccess={completeLoanWorkflow}
        />
      </div>
    )
  }

  if (loanSheetType === "review") {
    if (!loanRequestId || !loanReviewStatus) {
      return (
        <div className="text-sm text-muted-foreground">
          Select a loan request before reviewing.
        </div>
      )
    }

    return (
      <div>
        <LoanReviewForm
          defaultValues={{
            loanRequestId,
            notes: "",
            status: loanReviewStatus,
          }}
          label={
            loanReviewStatus === "under_review"
              ? "Mark under review"
              : loanReviewStatus === "approved"
                ? "Approve"
                : "Reject"
          }
          variant={loanReviewStatus === "approved" ? "default" : "outline"}
          onSuccess={completeLoanWorkflow}
        />
      </div>
    )
  }

  if (loanSheetType === "guarantor") {
    if (!guarantorApprovalId || !guarantorReviewStatus) {
      return (
        <div className="text-sm text-muted-foreground">
          Select a guarantor approval before reviewing.
        </div>
      )
    }

    return (
      <div>
        <LoanGuarantorReviewForm
          defaultValues={{
            guarantorApprovalId,
            notes: "",
            status: guarantorReviewStatus,
          }}
          label={`Guarantor ${guarantorReviewStatus}`}
          variant={guarantorReviewStatus === "approved" ? "default" : "outline"}
          onSuccess={completeLoanWorkflow}
        />
      </div>
    )
  }

  if (loanSheetType === "disburse") {
    if (!loanId) {
      return (
        <div className="text-sm text-muted-foreground">
          Select an approved loan before disbursement.
        </div>
      )
    }

    return (
      <div>
        <LoanDisbursementForm
          loanId={loanId}
          onSuccess={completeLoanWorkflow}
        />
      </div>
    )
  }

  return (
    <div className="text-sm text-muted-foreground">
      Select a loan action to continue.
    </div>
  )
}
