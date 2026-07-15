"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function ProfileSettingsSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Edit cooperative profile</SheetTitle>
      <SheetDescription>
        Update identity, office location, size range, and member number prefix.
      </SheetDescription>
    </SheetHeader>
  )
}
