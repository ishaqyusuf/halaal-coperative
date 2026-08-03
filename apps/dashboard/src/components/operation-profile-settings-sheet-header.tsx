"use client"

import type { TenantServiceKey } from "@halaalvest/db"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { getOperationProfileService } from "@/lib/settings/operation-profile-settings"

export function OperationProfileSettingsSheetHeader({
  serviceKey,
}: {
  serviceKey: TenantServiceKey
}) {
  const service = getOperationProfileService(serviceKey)

  return (
    <SheetHeader>
      <SheetTitle>Edit {service.label} access</SheetTitle>
      <SheetDescription>
        Change this service only. Other operation profile settings stay as they
        are.
      </SheetDescription>
    </SheetHeader>
  )
}
