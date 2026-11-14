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
import {
  canFinalizeLoanRequest,
  canMarkLoanRequestUnderReview,
} from "@/lib/loans/loan-action-guards"
import type { LoanPortfolioRow } from "./portfolio-table"
import type { LoanRequestRow } from "./requests-table"

function OpenButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      className="h-10 px-3 text-base"
      onClick={onClick}
      type="button"
      variant="outline"
    >
      {label}
    </Button>
  )
}

function MoreTrigger({ name }: { name: string }) {
  return (
    <DropdownMenuTrigger
      render={<Button className="size-10 p-0" variant="ghost" />}
    >
      <MoreHorizontal className="size-5" />
      <span className="sr-only">More for {name}</span>
    </DropdownMenuTrigger>
  )
}

export const LoanPortfolioActionsMenu = memo(
  ({ canReview, loan }: { canReview: boolean; loan: LoanPortfolioRow }) => {
    const { open } = useLoanParams()

    return (
      <div className="flex items-center gap-1">
        <OpenButton
          label="Open"
          onClick={() =>
            void open({ loanId: loan.id, loanSheetType: "loan-details" })
          }
        />
        {canReview && loan.status === "approved" ? (
          <DropdownMenu>
            <MoreTrigger name={loan.member.fullName} />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="min-h-11 text-base"
                onClick={() =>
                  void open({ loanId: loan.id, loanSheetType: "disburse" })
                }
              >
                Pay out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    )
  }
)

LoanPortfolioActionsMenu.displayName = "LoanPortfolioActionsMenu"

export const LoanRequestActionsMenu = memo(
  ({ canReview, request }: { canReview: boolean; request: LoanRequestRow }) => {
    const { open } = useLoanParams()
    const canAct = canReview && canFinalizeLoanRequest(request.status)
    const decide = (status: "approved" | "rejected" | "under_review") =>
      void open({
        loanRequestId: request.id,
        loanReviewStatus: status,
        loanSheetType: "review",
      })

    return (
      <div className="flex items-center gap-1">
        <OpenButton
          label={canAct ? "Review" : "Open"}
          onClick={() =>
            void open({
              loanRequestId: request.id,
              loanSheetType: "request-details",
            })
          }
        />
        {canAct ? (
          <DropdownMenu>
            <MoreTrigger name={request.member.fullName} />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                className="min-h-11 text-base"
                onClick={() => decide("approved")}
              >
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                className="min-h-11 text-base"
                onClick={() => decide("rejected")}
              >
                Decline
              </DropdownMenuItem>
              {canMarkLoanRequestUnderReview(request.status) ? (
                <DropdownMenuItem
                  className="min-h-11 text-base"
                  onClick={() => decide("under_review")}
                >
                  Mark as being checked
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    )
  }
)

LoanRequestActionsMenu.displayName = "LoanRequestActionsMenu"
