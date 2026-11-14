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
import { getMemberStatusChangeCopy } from "@/lib/members/member-status-words"

type MemberSheetType = "create" | "import" | "status" | null

function getMemberSheetCopy(
  sheetType: MemberSheetType,
  selectedStatus: string | null
) {
  if (sheetType === "status") {
    const copy = getMemberStatusChangeCopy(selectedStatus)

    return { description: copy.body, title: copy.title }
  }

  return { description: undefined, title: "New member" }
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
  const { memberSheetType, selectedMemberStatus } = useMemberParams()
  const activeSheetType = sheetType ?? memberSheetType
  const copy = getMemberSheetCopy(activeSheetType, selectedMemberStatus)
  const resolvedTitle = title ?? copy.title
  const resolvedDescription = description ?? copy.description

  if (presentation === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle>{resolvedTitle}</DialogTitle>
        {resolvedDescription ? (
          <DialogDescription>{resolvedDescription}</DialogDescription>
        ) : null}
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle>{resolvedTitle}</SheetTitle>
      {resolvedDescription ? (
        <SheetDescription>{resolvedDescription}</SheetDescription>
      ) : null}
    </SheetHeader>
  )
}
