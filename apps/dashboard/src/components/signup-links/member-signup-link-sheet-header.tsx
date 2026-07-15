"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function MemberSignupLinkSheetHeader({
  title,
}: {
  title: string
}) {
  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Manage member signup access and staff-issued signup links from a focused
        workflow.
      </SheetDescription>
    </SheetHeader>
  )
}
