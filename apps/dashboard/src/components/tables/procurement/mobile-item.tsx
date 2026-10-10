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
import { CheckCircle2, Eye, MoreHorizontal, PackageCheck } from "lucide-react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useProcurementParams } from "@/hooks/use-procurement-params"
import {
  formatProcurementDate,
  getProcurementScheduleCounts,
  type ProcurementRequest,
  ProcurementStatusBadge,
} from "./columns"

export function ProcurementMobileItem({
  canReview,
  request,
}: {
  canReview: boolean
  request: ProcurementRequest
}) {
  const { setParams } = useProcurementParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const canOpenReview =
    canReview && ["submitted", "under_review"].includes(request.status)
  const canRecordPurchase = canReview && request.status === "approved"
  const schedule = getProcurementScheduleCounts(request)

  function openWorkflow(type: "details" | "purchase" | "review") {
    setActionsOpen(false)
    void setParams({
      procurementRequestId: request.id,
      procurementSheetType: type,
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {request.itemName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {request.member.fullName} · {request.member.memberNumber}
              {request.vendorName ? ` · ${request.vendorName}` : ""}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open actions for ${request.itemName}`}
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
          <ProcurementStatusBadge status={request.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Requested</dt>
            <dd className="text-right">
              {formatCurrency(request.requestedCost)} ·{" "}
              {request.requestedRepaymentMonths} mo
            </dd>
            <dt className="text-muted-foreground">Approved</dt>
            <dd className="text-right">
              {request.approvedCost
                ? `${formatCurrency(request.approvedCost)} · ${request.approvedRepaymentMonths ?? 0} mo`
                : "Awaiting review"}
            </dd>
            <dt className="text-muted-foreground">Repayment</dt>
            <dd className="text-right">
              {request.repaymentScheduleItems.length
                ? `${formatCurrency(schedule.outstanding)} outstanding · ${schedule.overdue} overdue`
                : "Schedule not started"}
            </dd>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="text-right">
              {formatProcurementDate(request.requestedAt)}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description={`Choose the next step for ${request.itemName}.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Procurement actions"
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
        {canRecordPurchase ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => openWorkflow("purchase")}
            type="button"
            variant="ghost"
          >
            <PackageCheck data-icon="inline-start" />
            Record purchase
          </Button>
        ) : null}
      </MobileActionsDrawer>
    </>
  )
}
