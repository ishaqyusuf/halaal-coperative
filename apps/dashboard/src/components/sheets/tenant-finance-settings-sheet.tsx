"use client"

import { Suspense } from "react"
import type {
  TenantBusinessProfitPolicySettings,
  TenantFinancingSettingsWorkspace,
} from "@halaalvest/db"
import { TenantFinanceSettingsContent } from "@/components/tenant-finance-settings-content"
import { TenantFinanceSettingsSheetHeader } from "@/components/tenant-finance-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

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
  const presentation = getWorkflowPresentation(
    "tenantFinance",
    tenantFinanceSettingsSheetType
  )

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={presentation}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
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
    </WorkflowPresentation>
  )
}
