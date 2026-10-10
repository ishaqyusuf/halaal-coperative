"use client"

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
import { CheckCircle2, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import {
  formatFoodPurchaseDate,
  formatFoodPurchaseMonth,
  getFoodPurchaseOutstandingAmount,
  type FoodPurchaseApplication,
  FoodPurchaseStatusBadge,
} from "./columns"

export function FoodPurchaseMobileItem({
  application,
  canReviewApplications,
}: {
  application: FoodPurchaseApplication
  canReviewApplications: boolean
}) {
  const { setParams } = useFoodPurchaseParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const canReview =
    canReviewApplications &&
    application.cycle.status === "open" &&
    ["submitted", "under_review"].includes(application.status)

  function openReview() {
    setActionsOpen(false)
    void setParams({
      foodPurchaseApplicationId: application.id,
      foodPurchaseCycleId: null,
      foodPurchaseSheetType: "review",
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {application.member.fullName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {formatFoodPurchaseMonth(application.cycle.periodMonth)} ·{" "}
              {application.itemDescription ?? "Foodstuff Purchase request"}
            </ItemDescription>
          </ItemContent>
          {canReview ? (
            <ItemActions>
              <Button
                aria-label={`Open actions for ${application.member.fullName}`}
                className="size-11"
                onClick={() => setActionsOpen(true)}
                size="icon-lg"
                type="button"
                variant="ghost"
              >
                <MoreHorizontal />
              </Button>
            </ItemActions>
          ) : null}
        </ItemHeader>

        <ItemContent className="min-w-0 basis-full">
          <FoodPurchaseStatusBadge status={application.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Requested</dt>
            <dd className="text-right">
              {formatCurrency(application.requestedAmount)} ·{" "}
              {application.requestedPaybackMonths} mo
            </dd>
            <dt className="text-muted-foreground">Approved</dt>
            <dd className="text-right">
              {application.approvedAmount
                ? formatCurrency(application.approvedAmount)
                : "Awaiting review"}
            </dd>
            <dt className="text-muted-foreground">Payment</dt>
            <dd className="text-right">
              {formatCurrency(application.paidAmount)} paid ·{" "}
              {formatCurrency(getFoodPurchaseOutstandingAmount(application))}{" "}
              due
            </dd>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="text-right">
              {formatFoodPurchaseDate(application.requestedAt)}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description="Review this Foodstuff Purchase application."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Application actions"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={openReview}
          type="button"
          variant="ghost"
        >
          <CheckCircle2 data-icon="inline-start" />
          Review application
        </Button>
      </MobileActionsDrawer>
    </>
  )
}
