import type {
  FoodPurchaseApplicationRow,
  FoodPurchaseCycleRow,
} from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type FoodPurchaseSheetType =
  | "accounting"
  | "accounting-review"
  | "application"
  | "release"
  | "review"
  | "self-service"

function formatMonth(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  })
}

function getHeaderCopy({
  application,
  cycle,
  type,
}: {
  application?: FoodPurchaseApplicationRow
  cycle?: FoodPurchaseCycleRow
  type: FoodPurchaseSheetType
}) {
  if (type === "application") {
    return {
      description:
        "Submit a Foodstuff Purchase request for a member against an open cycle.",
      title: "Record member application",
    }
  }

  if (type === "self-service") {
    return {
      description:
        "Submit your Foodstuff Purchase request against an open cooperative cycle.",
      title: "Apply for Foodstuff Purchase",
    }
  }

  if (type === "accounting") {
    return {
      description: cycle
        ? `Enter sales, cost, and expense details for ${formatMonth(
            cycle.periodMonth
          )}.`
        : "Enter sales, cost, and expense details for this cycle.",
      title: "Record cycle accounting",
    }
  }

  if (type === "accounting-review") {
    return {
      description: cycle
        ? `Approve or request corrections for ${formatMonth(
            cycle.periodMonth
          )} accounting.`
        : "Approve or request corrections for this cycle accounting.",
      title: "Review cycle accounting",
    }
  }

  if (type === "review") {
    return {
      description: application
        ? `Review ${application.member.fullName}'s Foodstuff Purchase request.`
        : "Review this Foodstuff Purchase request.",
      title: "Review application",
    }
  }

  return {
    description:
      "Record the monthly amount released for Foodstuff Purchase before members apply.",
    title: "Record monthly fund release",
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
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
    </SheetHeader>
  )
}
