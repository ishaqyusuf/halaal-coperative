import type { ProcurementRequestRow } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type ProcurementSheetType =
  | "create"
  | "details"
  | "purchase"
  | "review"
  | "self-service"

function getHeaderCopy(
  type: ProcurementSheetType,
  request?: ProcurementRequestRow
) {
  if (type === "details" || type === "review") {
    return { description: null, title: request?.itemName ?? "Request" }
  }

  if (type === "purchase") {
    return {
      description: request?.itemName ?? null,
      title: "Record purchase",
    }
  }

  if (type === "self-service") {
    return {
      description: "The cooperative buys it. You pay back monthly.",
      title: "Ask for an item",
    }
  }

  return {
    description: "The cooperative buys it. The member pays back monthly.",
    title: "New item request",
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
      <SheetTitle className="text-2xl">{copy.title}</SheetTitle>
      {copy.description ? (
        <SheetDescription className="text-base">
          {copy.description}
        </SheetDescription>
      ) : null}
    </SheetHeader>
  )
}
