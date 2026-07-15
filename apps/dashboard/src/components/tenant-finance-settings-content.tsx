"use client"

import type {
  TenantBusinessProfitPolicySettings,
  TenantFinancingSettingsWorkspace,
} from "@halaalvest/db"
import {
  BusinessProfitPolicyForm,
  FinancingCycleControlForm,
  FinancingPolicyForm,
  FinanceStartDateForm,
  LoanProductSettingsForm,
} from "@/components/forms/tenant-finance-forms"
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

export function TenantFinanceSettingsContent({
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
  const { tenantFinanceSettingsSheetType } = useTenantFinanceSettingsParams()

  if (tenantFinanceSettingsSheetType === "businessProfitPolicy") {
    if (!businessPolicy) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Business profit policy is not available.
        </div>
      )
    }

    return (
      <div className="px-6">
        <BusinessProfitPolicyForm
          defaultPolicy={businessPolicy}
          devMode={devMode}
        />
      </div>
    )
  }

  if (tenantFinanceSettingsSheetType === "startDate") {
    return (
      <div className="px-6">
        <FinanceStartDateForm defaultStartDate={tenantStartDate} />
      </div>
    )
  }

  if (tenantFinanceSettingsSheetType === "financingPolicy") {
    if (!financingSettings) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Financing policy settings are not available.
        </div>
      )
    }

    return (
      <div className="px-6">
        <FinancingPolicyForm defaultPolicy={financingSettings.policy} />
      </div>
    )
  }

  if (tenantFinanceSettingsSheetType === "financingCycle") {
    if (!financingSettings) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Monthly financing cycle settings are not available.
        </div>
      )
    }

    return (
      <div className="px-6">
        <FinancingCycleControlForm
          currentCycle={financingSettings.currentCyclePreview.existingCycle}
        />
      </div>
    )
  }

  if (tenantFinanceSettingsSheetType === "quickProduct") {
    if (!financingSettings) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Quick financing product settings are not available.
        </div>
      )
    }

    return (
      <div className="px-6">
        <LoanProductSettingsForm product={financingSettings.products.quick} />
      </div>
    )
  }

  if (tenantFinanceSettingsSheetType === "normalProduct") {
    if (!financingSettings) {
      return (
        <div className="px-6 text-sm text-muted-foreground">
          Normal financing product settings are not available.
        </div>
      )
    }

    return (
      <div className="px-6">
        <LoanProductSettingsForm product={financingSettings.products.normal} />
      </div>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a finance setting to update.
    </div>
  )
}
