"use client"

import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"

const sheetTitles = {
  businessProfitPolicy: "Business profit policy",
  financingCycle: "Monthly financing cycle",
  financingPolicy: "Financing policy",
  normalProduct: "Normal financing product",
  quickProduct: "Quick financing product",
  startDate: "Cooperative finance start date",
} as const

export function TenantFinanceSettingsSheetHeader() {
  const { tenantFinanceSettingsSheetType } = useTenantFinanceSettingsParams()
  const title = tenantFinanceSettingsSheetType
    ? sheetTitles[tenantFinanceSettingsSheetType]
    : "Finance settings"

  return (
    <SheetHeader>
      <SheetTitle>{title}</SheetTitle>
      <SheetDescription>
        Update finance configuration from a focused settings sheet while the
        page remains a review workspace.
      </SheetDescription>
    </SheetHeader>
  )
}
