"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import {
  Banknote,
  CheckCircle2,
  Eye,
  MoreHorizontal,
  UserRoundCheck,
  XCircle,
} from "lucide-react"
import { useState } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useLoanParams } from "@/hooks/use-loan-params"
import {
  canFinalizeLoanRequest,
  canMarkLoanRequestUnderReview,
} from "@/lib/loans/loan-action-guards"
import type { LoanPortfolioRow } from "./portfolio-table"
import type { LoanRequestRow } from "./requests-table"

function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline">{status.replace(/_/g, " ")}</Badge>
}

export function LoanRequestMobileItem({
  canReview,
  request,
}: {
  canReview: boolean
  request: LoanRequestRow
}) {
  const { setParams } = useLoanParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const pendingGuarantor = request.guarantorApprovals.find(
    (approval) => approval.status === "pending"
  )
  const openReview = (status: "approved" | "rejected" | "under_review") => {
    setActionsOpen(false)
    void setParams({
      guarantorApprovalId: null,
      guarantorReviewStatus: null,
      loanId: null,
      loanRequestId: request.id,
      loanReviewStatus: status,
      loanSheetType: "review",
    })
  }
  const openDetails = () => {
    setActionsOpen(false)
    void setParams({
      guarantorApprovalId: null,
      guarantorReviewStatus: null,
      loanId: null,
      loanRequestId: request.id,
      loanReviewStatus: null,
      loanSheetType: "request-details",
    })
  }
  const openGuarantor = (status: "approved" | "rejected") => {
    if (!pendingGuarantor) return
    setActionsOpen(false)
    void setParams({
      guarantorApprovalId: pendingGuarantor.id,
      guarantorReviewStatus: status,
      loanId: null,
      loanRequestId: null,
      loanReviewStatus: null,
      loanSheetType: "guarantor",
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {request.member.fullName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {request.loanProduct.name} · {request.requestedTermMonths} months
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open actions for ${request.member.fullName}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>
        <ItemContent className="min-w-0 basis-full">
          <StatusBadge status={request.status} />
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Requested</dt>
            <dd className="text-right">
              {formatCurrency(Number(request.requestedAmount))}
            </dd>
            <dt className="text-muted-foreground">Monthly service</dt>
            <dd className="text-right">
              {formatCurrency(Number(request.estimatedMonthlyServicing))}
            </dd>
            <dt className="text-muted-foreground">Guarantors</dt>
            <dd className="text-right">
              {request.guarantorApprovals.length
                ? `${request.guarantorApprovals.length} record${request.guarantorApprovals.length === 1 ? "" : "s"}`
                : "Not required"}
            </dd>
          </dl>
        </ItemContent>
      </Item>
      <MobileActionsDrawer
        description={`Review the request from ${request.member.fullName}.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Loan request actions"
      >
        <div className="space-y-2">
          <Button
            className="h-11 w-full justify-start"
            onClick={openDetails}
            type="button"
            variant="ghost"
          >
            <Eye data-icon="inline-start" />
            View details
          </Button>
          <Button
            className="h-11 w-full justify-start"
            disabled={!canReview || !canFinalizeLoanRequest(request.status)}
            onClick={() => openReview("approved")}
            type="button"
            variant="ghost"
          >
            <CheckCircle2 data-icon="inline-start" />
            Approve request
          </Button>
          <Button
            className="h-11 w-full justify-start"
            disabled={!canReview || !canFinalizeLoanRequest(request.status)}
            onClick={() => openReview("rejected")}
            type="button"
            variant="ghost"
          >
            <XCircle data-icon="inline-start" />
            Reject request
          </Button>
          <Button
            className="h-11 w-full justify-start"
            disabled={
              !canReview || !canMarkLoanRequestUnderReview(request.status)
            }
            onClick={() => openReview("under_review")}
            type="button"
            variant="ghost"
          >
            <UserRoundCheck data-icon="inline-start" />
            Mark under review
          </Button>
          {pendingGuarantor ? (
            <>
              <Button
                className="h-11 w-full justify-start"
                disabled={!canReview}
                onClick={() => openGuarantor("approved")}
                type="button"
                variant="ghost"
              >
                <UserRoundCheck data-icon="inline-start" />
                Approve guarantor
              </Button>
              <Button
                className="h-11 w-full justify-start"
                disabled={!canReview}
                onClick={() => openGuarantor("rejected")}
                type="button"
                variant="ghost"
              >
                <XCircle data-icon="inline-start" />
                Reject guarantor
              </Button>
            </>
          ) : null}
        </div>
      </MobileActionsDrawer>
    </>
  )
}

export function LoanPortfolioMobileItem({
  availablePool,
  canReview,
  loan,
}: {
  availablePool: number
  canReview: boolean
  loan: LoanPortfolioRow
}) {
  const { setParams } = useLoanParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const canDisburse = canReview && loan.status === "approved"
  const openDetails = () => {
    setActionsOpen(false)
    void setParams({
      guarantorApprovalId: null,
      guarantorReviewStatus: null,
      loanId: loan.id,
      loanRequestId: null,
      loanReviewStatus: null,
      loanSheetType: "loan-details",
    })
  }
  const disburse = () => {
    setActionsOpen(false)
    void setParams({
      guarantorApprovalId: null,
      guarantorReviewStatus: null,
      loanId: loan.id,
      loanRequestId: null,
      loanReviewStatus: null,
      loanSheetType: "disburse",
    })
  }
  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {loan.member.fullName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {loan.loanProduct.name} · {loan.termMonths} months
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open actions for ${loan.member.fullName}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>
        <ItemContent className="min-w-0 basis-full">
          <StatusBadge status={loan.status} />
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Principal</dt>
            <dd className="text-right">
              {formatCurrency(Number(loan.principalAmount))}
            </dd>
            <dt className="text-muted-foreground">Outstanding</dt>
            <dd className="text-right">
              {formatCurrency(Number(loan.outstandingPrincipal))}
            </dd>
            <dt className="text-muted-foreground">Monthly service</dt>
            <dd className="text-right">
              {formatCurrency(Number(loan.estimatedMonthlyServicing))}
            </dd>
            {loan.status === "approved" ? (
              <>
                <dt className="text-muted-foreground">Pool after release</dt>
                <dd className="text-right">
                  {formatCurrency(availablePool - Number(loan.principalAmount))}
                </dd>
              </>
            ) : null}
          </dl>
        </ItemContent>
      </Item>
      <MobileActionsDrawer
        description={`Choose an action for ${loan.member.fullName}'s loan.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Loan actions"
      >
        <div className="space-y-2">
          <Button
            className="h-11 w-full justify-start"
            onClick={openDetails}
            type="button"
            variant="ghost"
          >
            <Eye data-icon="inline-start" />
            View details
          </Button>
          {canReview ? (
            <Button
              className="h-11 w-full justify-start"
              disabled={!canDisburse}
              onClick={disburse}
              type="button"
              variant="ghost"
            >
              <Banknote data-icon="inline-start" />
              Disburse loan
            </Button>
          ) : null}
        </div>
      </MobileActionsDrawer>
    </>
  )
}
