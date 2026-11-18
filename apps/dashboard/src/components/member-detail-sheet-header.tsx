"use client"

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import {
  type MemberDetailSheetType,
  useMemberDetailParams,
} from "@/hooks/use-member-detail-params"

const sheetCopy: Record<
  MemberDetailSheetType,
  { description?: string; title: string }
> = {
  commitment: {
    description: "The new amount starts from the date you choose.",
    title: "Change monthly savings",
  },
  document: { title: "Add a document" },
  "document-review": { title: "Check document" },
  edit: { title: "Edit details" },
  kyc: { title: "Update KYC" },
  "portal-access": { title: "Send sign-in email" },
}

/** During setup a new amount starts the month the cooperative goes live. */
const setupCommitmentCopy = {
  description: "It starts the month your cooperative goes live.",
  title: "Set monthly savings",
}

export function MemberDetailSheetHeader({
  commitmentStartsAtGoLive = false,
  presentation,
}: {
  commitmentStartsAtGoLive?: boolean
  presentation: "dialog" | "sheet"
}) {
  const { memberDetailSheetType } = useMemberDetailParams()
  const copy =
    memberDetailSheetType === "commitment" && commitmentStartsAtGoLive
      ? setupCommitmentCopy
      : memberDetailSheetType
        ? sheetCopy[memberDetailSheetType]
        : { description: undefined, title: "Member" }

  if (presentation === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        {copy.description ? (
          <DialogDescription>{copy.description}</DialogDescription>
        ) : null}
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle>{copy.title}</SheetTitle>
      {copy.description ? (
        <SheetDescription>{copy.description}</SheetDescription>
      ) : null}
    </SheetHeader>
  )
}
