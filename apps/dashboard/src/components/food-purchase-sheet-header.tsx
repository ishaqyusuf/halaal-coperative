import type {
  FoodPurchaseApplicationRow,
  FoodPurchaseCycleRow,
} from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import type { FoodPurchaseSheetType } from "@/hooks/use-food-purchase-params"
import { formatMonthYear } from "@/lib/requests/request-status-words"

function getHeaderCopy({
  application,
  cycle,
  type,
}: {
  application?: FoodPurchaseApplicationRow
  cycle?: FoodPurchaseCycleRow
  type: FoodPurchaseSheetType
}) {
  const month = cycle ? formatMonthYear(cycle.periodMonth) : null

  switch (type) {
    case "application":
      return { description: null, title: "New foodstuff request" }
    case "self-service":
      return {
        description: "The cooperative buys food in bulk. You pay back monthly.",
        title: "Ask for foodstuff",
      }
    case "accounting":
      return { description: month, title: "Month-end figures" }
    case "accounting-review":
      return { description: month, title: "Check month-end figures" }
    case "details":
    case "review":
      return {
        description: application
          ? formatMonthYear(application.cycle.periodMonth)
          : null,
        title: application?.member.fullName ?? "Foodstuff request",
      }
    default:
      return {
        description: "Record the money given to the committee to buy food.",
        title: "Open a month",
      }
  }
}

export function FoodPurchaseSheetHeader({
  application,
  cycle,
  type,
}: {
  application?: FoodPurchaseApplicationRow
  cycle?: FoodPurchaseCycleRow
  type: FoodPurchaseSheetType
}) {
  const copy = getHeaderCopy({ application, cycle, type })

  return (
    <SheetHeader>
      <SheetTitle className="text-2xl">{copy.title}</SheetTitle>
      {copy.description ? (
        <SheetDescription className="text-base">
          {copy.description}
        </SheetDescription>
      ) : null}
    </SheetHeader>
  )
}
