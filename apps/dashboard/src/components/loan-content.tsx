"use client"

import {
  LoanDisbursementForm,
  LoanGuarantorReviewForm,
  LoanRequestForm,
  LoanReviewForm,
} from "@/components/forms/finance-forms"
import { useLoanParams } from "@/hooks/use-loan-params"

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
  const {
    guarantorApprovalId,
    guarantorReviewStatus,
    loanId,
    loanRequestId,
    loanReviewStatus,
    loanSheetType,
  } = useLoanParams()

  if (loanSheetType === "request") {
    return (
      <div className="px-6">
        <LoanRequestForm
          devMode={devMode}
          disabledReason={disabledReason}
          fixedMember={fixedMember}
          loanProducts={loanProducts}
          loanRequestCharges={loanRequestCharges}
          members={members}
        />
      </div>
    )
  }

  if (loanSheetType === "review") {
    if (!loanRequestId || !loanReviewStatus) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select a loan request before reviewing.
        </div>
      )
    }

    return (
      <div className="px-6">
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
        />
      </div>
    )
  }

  if (loanSheetType === "guarantor") {
    if (!guarantorApprovalId || !guarantorReviewStatus) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select a guarantor approval before reviewing.
        </div>
      )
    }

    return (
      <div className="px-6">
        <LoanGuarantorReviewForm
          defaultValues={{
            guarantorApprovalId,
            notes: "",
            status: guarantorReviewStatus,
          }}
          label={`Guarantor ${guarantorReviewStatus}`}
          variant={guarantorReviewStatus === "approved" ? "default" : "outline"}
        />
      </div>
    )
  }

  if (loanSheetType === "disburse") {
    if (!loanId) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Select an approved loan before disbursement.
        </div>
      )
    }

    return (
      <div className="px-6">
        <LoanDisbursementForm loanId={loanId} />
      </div>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a loan action to continue.
    </div>
  )
}
