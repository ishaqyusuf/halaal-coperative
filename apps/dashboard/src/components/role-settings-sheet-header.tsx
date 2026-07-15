"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"

export function RoleSettingsSheetHeader() {
  return (
    <SheetHeader>
      <SheetTitle>Assign workspace role</SheetTitle>
      <SheetDescription>
        Create or update staff/member login records and attach cooperative
        roles.
      </SheetDescription>
    </SheetHeader>
  )
}
