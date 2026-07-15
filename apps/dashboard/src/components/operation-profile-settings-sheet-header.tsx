"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function OperationProfileSettingsSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Edit operation profile</SheetTitle>
      <SheetDescription>
        Choose which services are offered and how members can access them.
      </SheetDescription>
    </SheetHeader>
  )
}
