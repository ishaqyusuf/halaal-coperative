"use client"

import { Button } from "@halaalvest/ui/components/button"
import { BanknoteIcon, CheckCircle2Icon, HandCoinsIcon, PlusIcon } from "lucide-react"
import { useLoanParams } from "@/hooks/use-loan-params"

export function OpenLoanRequestSheet({ disabled }: { disabled?: boolean }) {
  const { setParams } = useLoanParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          guarantorApprovalId: null,
          guarantorReviewStatus: null,
          loanId: null,
          loanRequestId: null,
          loanReviewStatus: null,
          loanSheetType: "request",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Request loan
    </Button>
  )
}

export function OpenLoanReviewSheet({
  loanRequestId,
  status,
  variant = "default",
}: {
  loanRequestId: string
  status: "approved" | "rejected" | "under_review"
  variant?: "default" | "outline"
}) {
  const { setParams } = useLoanParams()
  const label =
    status === "under_review"
      ? "Mark under review"
      : status === "approved"
        ? "Approve"
        : "Reject"

  return (
    <Button
      onClick={() =>
        setParams({
          guarantorApprovalId: null,
          guarantorReviewStatus: null,
          loanId: null,
          loanRequestId,
          loanReviewStatus: status,
          loanSheetType: "review",
        })
      }
      size="sm"
      type="button"
      variant={variant}
    >
      <CheckCircle2Icon data-icon="inline-start" />
      {label}
    </Button>
  )
}

export function OpenLoanGuarantorReviewSheet({
  guarantorApprovalId,
  status,
  variant = "default",
}: {
  guarantorApprovalId: string
  status: "approved" | "rejected"
  variant?: "default" | "outline"
}) {
  const { setParams } = useLoanParams()

  return (
    <Button
      onClick={() =>
        setParams({
          guarantorApprovalId,
          guarantorReviewStatus: status,
          loanId: null,
          loanRequestId: null,
          loanReviewStatus: null,
          loanSheetType: "guarantor",
        })
      }
      size="sm"
      type="button"
      variant={variant}
    >
      <HandCoinsIcon data-icon="inline-start" />
      Guarantor {status}
    </Button>
  )
}

export function OpenLoanDisbursementSheet({ loanId }: { loanId: string }) {
  const { setParams } = useLoanParams()

  return (
    <Button
      onClick={() =>
        setParams({
          guarantorApprovalId: null,
          guarantorReviewStatus: null,
          loanId,
          loanRequestId: null,
          loanReviewStatus: null,
          loanSheetType: "disburse",
        })
      }
      size="sm"
      type="button"
    >
      <BanknoteIcon data-icon="inline-start" />
      Disburse
    </Button>
  )
}
