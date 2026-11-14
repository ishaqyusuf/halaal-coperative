"use client"

import type { TenantBusinessProfitPolicySettings } from "@halaalvest/db"
import {
  type FinancingSettingsView,
  TenantFinanceSettingsContent,
} from "@/components/tenant-finance-settings-content"
import {
  TenantFinanceSettingsSheetHeader,
  tenantFinanceOverlayCopy,
} from "@/components/tenant-finance-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

/**
 * Finance setup overlays, opened by `tenantFinanceSettingsSheetType`:
 * loan rules, loan types and profit sharing are sheets; the start date and
 * this month's loan requests are short dialogs.
 */
export function TenantFinanceSettingsSheet({
  businessPolicy,
  canChangePastProfit,
  devMode,
  financingSettings,
  tenantStartDate,
}: {
  businessPolicy?: TenantBusinessProfitPolicySettings
  canChangePastProfit?: boolean
  devMode?: boolean
  financingSettings?: FinancingSettingsView
  tenantStartDate: string | null
}) {
  const { setParams, tenantFinanceSettingsSheetType: type } =
    useTenantFinanceSettingsParams()
  const presentation = getWorkflowPresentation("tenantFinance", type)
  const copy = type ? tenantFinanceOverlayCopy[type] : null
  const isSheet = presentation.presentation === "sheet"

  return (
    <WorkflowPresentation
      config={presentation}
      mobileFullScreen={isSheet}
      open={Boolean(copy)}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
    >
      {copy ? (
        <div className={isSheet ? "grid gap-5 px-6 pb-8" : "grid gap-5"}>
          <TenantFinanceSettingsSheetHeader />
          <TenantFinanceSettingsContent
            businessPolicy={businessPolicy}
            canChangePastProfit={canChangePastProfit}
            devMode={devMode}
            financingSettings={financingSettings}
            tenantStartDate={tenantStartDate}
          />
        </div>
      ) : null}
    </WorkflowPresentation>
  )
}
