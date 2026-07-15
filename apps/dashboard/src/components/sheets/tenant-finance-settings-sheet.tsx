"use client"

import { Suspense } from "react"
import type {
  TenantBusinessProfitPolicySettings,
  TenantFinancingSettingsWorkspace,
} from "@halaalvest/db"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { TenantFinanceSettingsContent } from "@/components/tenant-finance-settings-content"
import { TenantFinanceSettingsSheetHeader } from "@/components/tenant-finance-settings-sheet-header"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"

type FinancingSettingsView = {
  currentCyclePreview: Omit<
    TenantFinancingSettingsWorkspace["currentCyclePreview"],
    "periodEnd" | "periodStart"
  > & {
    periodEnd: string | null
    periodStart: string | null
  }
  policy: TenantFinancingSettingsWorkspace["policy"]
  products: TenantFinancingSettingsWorkspace["products"]
}

function isTenantFinanceSettingsSheetOpen(type: string | null) {
  return Boolean(
    type === "startDate" ||
    type === "financingPolicy" ||
      type === "financingCycle" ||
      type === "quickProduct" ||
      type === "normalProduct" ||
      type === "businessProfitPolicy"
  )
}

export function TenantFinanceSettingsSheet({
  businessPolicy,
  devMode,
  financingSettings,
  tenantStartDate,
}: {
  businessPolicy?: TenantBusinessProfitPolicySettings
  devMode?: boolean
  financingSettings?: FinancingSettingsView
  tenantStartDate: string | null
}) {
  const { setParams, tenantFinanceSettingsSheetType } =
    useTenantFinanceSettingsParams()
  const isOpen = isTenantFinanceSettingsSheetOpen(
    tenantFinanceSettingsSheetType
  )

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading finance settings...
              </div>
            }
          >
            <TenantFinanceSettingsSheetHeader />
            <TenantFinanceSettingsContent
              businessPolicy={businessPolicy}
              devMode={devMode}
              financingSettings={financingSettings}
              tenantStartDate={tenantStartDate}
            />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
