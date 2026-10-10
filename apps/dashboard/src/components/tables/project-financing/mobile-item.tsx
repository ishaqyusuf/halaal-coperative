"use client"

import { useState } from "react"
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
import { Banknote, CheckCircle2, Eye, MoreHorizontal } from "lucide-react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import {
  formatProjectFinancingDate,
  formatProjectFinancingStructure,
  type ProjectFinancingRequest,
  ProjectFinancingStatusBadge,
} from "./columns"

export function ProjectFinancingMobileItem({
  canReview,
  request,
}: {
  canReview: boolean
  request: ProjectFinancingRequest
}) {
  const { setParams } = useProjectFinancingParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const canOpenReview =
    canReview && ["submitted", "under_review"].includes(request.status)
  const canRecordDisbursement = canReview && request.status === "approved"
  const approvedAmount = request.approvedAmount ?? null
  const outstandingAmount = Math.max((approvedAmount ?? 0) - request.paidAmount, 0)
  const fundingStatus = request.disbursedAt
    ? `Disbursed ${formatProjectFinancingDate(request.disbursedAt)}`
    : request.status === "approved"
      ? "Awaiting disbursement"
      : request.status === "rejected" || request.status === "cancelled"
        ? "Not funded"
        : "Pending review"
  const repaymentStatus =
    request.approvedStructure === "repayable_facility" && approvedAmount
      ? `${formatCurrency(outstandingAmount)} outstanding`
      : request.approvedStructure
        ? "No repayment posting"
        : "Pending approval"

  function openWorkflow(type: "details" | "disbursement" | "review") {
    setActionsOpen(false)
    void setParams({
      projectFinancingRequestId: request.id,
      projectFinancingSheetType: type,
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {request.businessName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {request.member.fullName} · {request.member.memberNumber}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open actions for ${request.businessName}`}
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
          <ProjectFinancingStatusBadge status={request.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Requested</dt>
            <dd className="text-right">
              {formatCurrency(request.requestedAmount)}
              {request.requestedPaybackMonths
                ? ` · ${request.requestedPaybackMonths} mo`
                : ""}
            </dd>
            <dt className="text-muted-foreground">Structure</dt>
            <dd className="text-right capitalize">
              {formatProjectFinancingStructure(
                request.approvedStructure ?? request.proposedStructure
              )}
            </dd>
            <dt className="text-muted-foreground">Funding</dt>
            <dd className="text-right">{fundingStatus}</dd>
            <dt className="text-muted-foreground">Repayment</dt>
            <dd className="text-right">{repaymentStatus}</dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description={`Choose the next step for ${request.businessName}.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Project financing actions"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={() => openWorkflow("details")}
          type="button"
          variant="ghost"
        >
          <Eye data-icon="inline-start" />
          View details
        </Button>
        {canOpenReview ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => openWorkflow("review")}
            type="button"
            variant="ghost"
          >
            <CheckCircle2 data-icon="inline-start" />
            Review request
          </Button>
        ) : null}
        {canRecordDisbursement ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => openWorkflow("disbursement")}
            type="button"
            variant="ghost"
          >
            <Banknote data-icon="inline-start" />
            Record disbursement
          </Button>
        ) : null}
      </MobileActionsDrawer>
    </>
  )
}
