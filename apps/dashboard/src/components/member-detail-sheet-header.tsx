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
import { useMemberDetailParams } from "@/hooks/use-member-detail-params"

const sheetCopy = {
  commitment: {
    description:
      "Save a dated monthly commitment update for this member without leaving the detail workspace.",
    title: "New commitment version",
  },
  document: {
    description:
      "Attach a supporting KYC or compliance document to this member profile.",
    title: "Attach supporting document",
  },
  "document-review": {
    description:
      "Update the review status and notes for this supporting document.",
    title: "Review supporting document",
  },
  kyc: {
    description:
      "Update the member's KYC status, identity fields, and review notes.",
    title: "Update KYC details",
  },
  "portal-access": {
    description:
      "Send a portal access email so this member can set a password and sign in.",
    title: "Send portal access",
  },
} as const

export function MemberDetailSheetHeader({
  presentation,
}: {
  presentation: "dialog" | "sheet"
}) {
  const { memberDetailSheetType } = useMemberDetailParams()
  const copy = memberDetailSheetType
    ? sheetCopy[memberDetailSheetType]
    : {
        description: "Choose a member action to continue.",
        title: "Member action",
      }

  if (presentation === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle>{copy.title}</SheetTitle>
      <SheetDescription>{copy.description}</SheetDescription>
    </SheetHeader>
  )
}
