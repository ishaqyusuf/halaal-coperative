import type { ProcurementRequestRow } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type ProcurementSheetType = "create" | "purchase" | "review" | "self-service"

function getHeaderCopy(
  type: ProcurementSheetType,
  request?: ProcurementRequestRow
) {
  if (type === "review") {
    return {
      description:
        "Review the requested cost, repayment months, and approval charges before saving a decision.",
      title: request ? `Review ${request.itemName}` : "Review procurement",
    }
  }

  if (type === "purchase") {
    return {
      description:
        "Record purchase evidence and first repayment due date before activating the repayment schedule.",
      title: request
        ? `Record purchase for ${request.itemName}`
        : "Record procurement purchase",
    }
  }

  if (type === "self-service") {
    return {
      description:
        "Request an item purchase from the cooperative and choose your preferred repayment months.",
      title: "Request item purchase",
    }
  }

  return {
    description:
      "Capture the item, expected cost, repayment months, and submission charges before finance review.",
    title: "New procurement request",
  }
}

export function ProcurementRequestSheetHeader({
  request,
  type,
}: {
  request?: ProcurementRequestRow
  type: ProcurementSheetType
}) {
  const copy = getHeaderCopy(type, request)

  return (
    <SheetHeader>
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
    </SheetHeader>
  )
}
