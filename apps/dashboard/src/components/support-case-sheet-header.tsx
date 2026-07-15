import type { SupportCaseRow } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

type SupportCaseSheetType =
  | "adjustment-review"
  | "create"
  | "member-create"
  | "member-reply"
  | "reply"
  | "update"

function getHeaderCopy({
  supportCase,
  type,
}: {
  supportCase?: SupportCaseRow
  type: SupportCaseSheetType
}) {
  if (type === "update") {
    return {
      description:
        "Update ownership, priority, status, resolution notes, and finance impact.",
      title: supportCase ? `Update ${supportCase.subject}` : "Update support case",
    }
  }

  if (type === "adjustment-review") {
    return {
      description:
        "Approve or reject the finance adjustment requested for this case.",
      title: "Review finance adjustment",
    }
  }

  if (type === "reply" || type === "member-reply") {
    return {
      description:
        type === "reply"
          ? "Add an internal or member-facing update to this support case."
          : "Send an update or additional detail to the cooperative team.",
      title: "Add support reply",
    }
  }

  if (type === "member-create") {
    return {
      description:
        "Send your question, correction, or finance-related issue to the cooperative team.",
      title: "Open support case",
    }
  }

  return {
    description:
      "Capture the member issue, routing, and any finance impact in one place.",
    title: "Open support case",
  }
}

export function SupportCaseSheetHeader({
  supportCase,
  type,
}: {
  supportCase?: SupportCaseRow
  type: SupportCaseSheetType
}) {
  const copy = getHeaderCopy({ supportCase, type })

  return (
    <SheetHeader>
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
    </SheetHeader>
  )
}
