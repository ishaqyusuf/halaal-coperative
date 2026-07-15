"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { memo } from "react"
import { useLoanParams } from "@/hooks/use-loan-params"
import type { LoanPortfolioRow } from "./portfolio-table"
import type { LoanRequestRow } from "./requests-table"

export const LoanPortfolioActionsMenu = memo(
  ({
    canReview,
    loan,
  }: {
    canReview: boolean
    loan: LoanPortfolioRow
  }) => {
    const { setParams } = useLoanParams()
    const canDisburse = canReview && loan.status === "approved"

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="h-8 w-8 p-0" variant="ghost" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open loan actions</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            disabled={!canDisburse}
            onClick={() =>
              setParams({
                guarantorApprovalId: null,
                guarantorReviewStatus: null,
                loanId: loan.id,
                loanRequestId: null,
                loanReviewStatus: null,
                loanSheetType: "disburse",
              })
            }
          >
            Disburse loan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

LoanPortfolioActionsMenu.displayName = "LoanPortfolioActionsMenu"

export const LoanRequestActionsMenu = memo(
  ({
    canReview,
    request,
  }: {
    canReview: boolean
    request: LoanRequestRow
  }) => {
    const { setParams } = useLoanParams()
    const pendingGuarantor = request.guarantorApprovals.find(
      (approval) => approval.status === "pending"
    )

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="h-8 w-8 p-0" variant="ghost" />}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Open loan request actions</span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            disabled={!canReview || request.status === "approved"}
            onClick={() =>
              setParams({
                guarantorApprovalId: null,
                guarantorReviewStatus: null,
                loanId: null,
                loanRequestId: request.id,
                loanReviewStatus: "approved",
                loanSheetType: "review",
              })
            }
          >
            Approve request
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canReview || request.status === "rejected"}
            onClick={() =>
              setParams({
                guarantorApprovalId: null,
                guarantorReviewStatus: null,
                loanId: null,
                loanRequestId: request.id,
                loanReviewStatus: "rejected",
                loanSheetType: "review",
              })
            }
          >
            Reject request
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canReview || request.status !== "submitted"}
            onClick={() =>
              setParams({
                guarantorApprovalId: null,
                guarantorReviewStatus: null,
                loanId: null,
                loanRequestId: request.id,
                loanReviewStatus: "under_review",
                loanSheetType: "review",
              })
            }
          >
            Mark under review
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canReview || !pendingGuarantor}
            onClick={() => {
              if (!pendingGuarantor) return

              setParams({
                guarantorApprovalId: pendingGuarantor.id,
                guarantorReviewStatus: "approved",
                loanId: null,
                loanRequestId: null,
                loanReviewStatus: null,
                loanSheetType: "guarantor",
              })
            }}
          >
            Approve guarantor
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!canReview || !pendingGuarantor}
            onClick={() => {
              if (!pendingGuarantor) return

              setParams({
                guarantorApprovalId: pendingGuarantor.id,
                guarantorReviewStatus: "rejected",
                loanId: null,
                loanRequestId: null,
                loanReviewStatus: null,
                loanSheetType: "guarantor",
              })
            }}
          >
            Reject guarantor
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
)

LoanRequestActionsMenu.displayName = "LoanRequestActionsMenu"
