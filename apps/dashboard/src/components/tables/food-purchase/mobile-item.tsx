"use client"

import { formatCurrency } from "@halaalvest/utils"
import { RequestListItem } from "@/components/requests/request-list-item"
import { useFoodPurchaseParams } from "@/hooks/use-food-purchase-params"
import {
  formatMonths,
  formatMonthYear,
} from "@/lib/requests/request-status-words"
import {
  type FoodPurchaseApplication,
  FoodPurchaseStatusBadge,
  getFoodPurchaseAmount,
  getFoodPurchaseOutstandingAmount,
} from "./columns"

export function FoodPurchaseMobileItem({
  application,
  canReviewApplications,
}: {
  application: FoodPurchaseApplication
  canReviewApplications: boolean
}) {
  const { setParams } = useFoodPurchaseParams()
  const { amount, months } = getFoodPurchaseAmount(application)
  const owed = getFoodPurchaseOutstandingAmount(application)
  const month = formatMonthYear(application.cycle.periodMonth)

  return (
    <RequestListItem
      amount={`${formatCurrency(amount)} · ${formatMonths(months)}`}
      badge={<FoodPurchaseStatusBadge application={application} />}
      meta={owed ? `${formatCurrency(owed)} still owed` : null}
      onOpen={() =>
        void setParams({
          foodPurchaseApplicationId: application.id,
          foodPurchaseCycleId: null,
          foodPurchaseSheetType: "details",
        })
      }
      subtitle={canReviewApplications ? month : null}
      title={canReviewApplications ? application.member.fullName : month}
    />
  )
}
