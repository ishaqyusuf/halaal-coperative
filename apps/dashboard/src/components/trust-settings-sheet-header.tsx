"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function TrustSettingsSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Edit pilot trust profile</SheetTitle>
      <SheetDescription>
        Update legal evidence, incident contact, backup note, and recovery
        objectives.
      </SheetDescription>
    </SheetHeader>
  )
}
