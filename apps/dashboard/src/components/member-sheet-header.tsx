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
import { useMemberParams } from "@/hooks/use-member-params"

type MemberSheetType = "create" | "details" | "edit" | "import" | "status" | null

function getMemberSheetTitle(sheetType: MemberSheetType) {
  if (sheetType === "status") {
    return "Update member status"
  }

  if (sheetType === "edit") {
    return "Edit member"
  }

  if (sheetType === "details") {
    return "Member details"
  }

  return "Create member"
}

function getMemberSheetDescription(sheetType: MemberSheetType) {
  if (sheetType === "status") {
    return "Confirm the member account status change before saving it."
  }

  if (sheetType === "details") {
    return "Review the member profile and related cooperative records."
  }

  return "Add the member profile, joined date, and starting commitment."
}

export function MemberSheetHeader({
  description,
  presentation = "sheet",
  sheetType,
  title,
}: {
  description?: string
  presentation?: "dialog" | "sheet"
  sheetType?: MemberSheetType
  title?: string
}) {
  const { memberSheetType } = useMemberParams()
  const activeSheetType = sheetType ?? memberSheetType

  const resolvedTitle = title ?? getMemberSheetTitle(activeSheetType)
  const resolvedDescription =
    description ?? getMemberSheetDescription(activeSheetType)

  if (presentation === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle>{resolvedTitle}</DialogTitle>
        <DialogDescription>{resolvedDescription}</DialogDescription>
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle>{resolvedTitle}</SheetTitle>
      <SheetDescription>{resolvedDescription}</SheetDescription>
    </SheetHeader>
  )
}
