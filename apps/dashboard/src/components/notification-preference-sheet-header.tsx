"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function NotificationPreferenceSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Notification preference</SheetTitle>
      <SheetDescription>
        Confirm this email preference change for the cooperative.
      </SheetDescription>
    </SheetHeader>
  )
}
