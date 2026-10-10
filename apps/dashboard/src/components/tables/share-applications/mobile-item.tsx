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
import { CheckCircle2, Eye, MoreHorizontal } from "lucide-react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import {
  type ShareApplication,
  ShareApplicationStatusBadge,
  formatShareApplicationDate,
} from "./columns"

export function ShareApplicationMobileItem({
  application,
  canReview,
}: {
  application: ShareApplication
  canReview: boolean
}) {
  const { setParams } = useShareApplicationParams()
  const [actionsOpen, setActionsOpen] = useState(false)

  function openWorkflow(type: "details" | "review") {
    setActionsOpen(false)
    void setParams({
      shareApplicationId: application.id,
      shareApplicationSheetType: type,
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {application.memberName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {application.memberNumber} · {application.requestedUnits} units
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open actions for ${application.memberName}`}
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
          <ShareApplicationStatusBadge status={application.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Value</dt>
            <dd className="text-right font-medium text-foreground">
              {formatCurrency(application.shareValueSnapshot)}
            </dd>
            <dt className="text-muted-foreground">Requested</dt>
            <dd className="text-right">
              {formatShareApplicationDate(application.createdAt)}
            </dd>
            <dt className="text-muted-foreground">Note</dt>
            <dd className="line-clamp-2 text-right">
              {application.notes ?? "No note"}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description={`Choose the next step for ${application.memberName}'s share request.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Share request actions"
      >
        {!canReview ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => openWorkflow("details")}
            type="button"
            variant="ghost"
          >
            <Eye data-icon="inline-start" />
            View details
          </Button>
        ) : null}
        {canReview && application.status === "pending" ? (
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
      </MobileActionsDrawer>
    </>
  )
}
