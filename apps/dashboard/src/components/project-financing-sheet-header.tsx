import type { ProjectFinancingRequestRow } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type ProjectFinancingSheetType =
  | "create"
  | "details"
  | "disbursement"
  | "review"
  | "self-service"

function getHeaderCopy({
  request,
  type,
}: {
  request?: ProjectFinancingRequestRow
  type: ProjectFinancingSheetType
}) {
  if (type === "details" || type === "review") {
    return { description: null, title: request?.businessName ?? "Request" }
  }

  if (type === "disbursement") {
    return {
      description: request?.businessName ?? null,
      title: "Record payout",
    }
  }

  if (type === "self-service") {
    return {
      description: "Ask the cooperative to fund your business.",
      title: "Ask for business funding",
    }
  }

  return {
    description: "Funding for a member's business.",
    title: "New funding request",
  }
}

export function ProjectFinancingSheetHeader({
  request,
  type,
}: {
  request?: ProjectFinancingRequestRow
  type: ProjectFinancingSheetType
}) {
  const copy = getHeaderCopy({ request, type })

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
