"use client"

import type { TenantServiceKey } from "@halaalvest/db"
import { SheetHeader, SheetTitle } from "@halaalvest/ui/components/sheet"
import { getOperationProfileService } from "@/lib/settings/operation-profile-settings"

export function OperationProfileSettingsSheetHeader({
  serviceKey,
}: {
  serviceKey: TenantServiceKey
}) {
  return (
    <SheetHeader>
      <SheetTitle>{getOperationProfileService(serviceKey).label}</SheetTitle>
    </SheetHeader>
  )
}
