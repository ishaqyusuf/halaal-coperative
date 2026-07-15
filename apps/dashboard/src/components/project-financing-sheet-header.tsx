import type { ProjectFinancingRequestRow } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type ProjectFinancingSheetType =
  | "create"
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
  if (type === "review") {
    return {
      description: request
        ? `Review ${request.member.fullName}'s project financing request.`
        : "Review this project financing request.",
      title: "Review project financing",
    }
  }

  if (type === "disbursement") {
    return {
      description: request
        ? `Record disbursement evidence for ${request.businessName}.`
        : "Record disbursement evidence for this project financing request.",
      title: "Record disbursement",
    }
  }

  if (type === "self-service") {
    return {
      description:
        "Submit your business funding request for cooperative review.",
      title: "Request business funding",
    }
  }

  return {
    description:
      "Capture the member business, requested amount, and preferred financing structure.",
    title: "New project financing request",
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
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
    </SheetHeader>
  )
}
