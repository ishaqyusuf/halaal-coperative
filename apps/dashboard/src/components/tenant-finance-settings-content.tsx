"use client"

import type {
  TenantBusinessProfitPolicySettings,
  TenantFinancingSettingsWorkspace,
} from "@halaalvest/db"
import { LoanProductForm } from "@/components/finance-settings/loan-product-form"
import { LoanRulesForm } from "@/components/finance-settings/loan-rules-form"
import { getLoanMonthLabel } from "@/components/finance-settings/loan-month-label"
import { LoanWindowForm } from "@/components/finance-settings/loan-window-form"
import { ProfitRulesForm } from "@/components/finance-settings/profit-rules-form"
import { FinanceStartDateForm } from "@/components/forms/tenant-finance-forms"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"

export type FinancingSettingsView = {
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

function NotAvailable() {
  return (
    <p className="text-base text-muted-foreground">
      This setting isn’t available here. Close and try again from its page.
    </p>
  )
}

export function TenantFinanceSettingsContent({
  businessPolicy,
  canChangePastProfit = false,
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

  if (type === "startDate") {
    return (
      <FinanceStartDateForm
        defaultStartDate={tenantStartDate}
        onSuccess={() => setParams(null)}
      />
    )
  }

  if (type === "businessProfitPolicy") {
    return businessPolicy ? (
      <ProfitRulesForm
        canChangePastProfit={canChangePastProfit}
        key={devMode ? "dev" : "form"}
        policy={businessPolicy}
      />
    ) : (
      <NotAvailable />
    )
  }

  if (!financingSettings) return <NotAvailable />

  if (type === "financingPolicy") {
    return (
      <LoanRulesForm
        policy={financingSettings.policy}
        preview={financingSettings.currentCyclePreview}
      />
    )
  }

  if (type === "financingCycle") {
    return (
      <LoanWindowForm
        monthLabel={getLoanMonthLabel(
          financingSettings.currentCyclePreview.periodStart
        )}
        preview={financingSettings.currentCyclePreview}
      />
    )
  }

  if (type === "quickProduct" || type === "normalProduct") {
    return (
      <LoanProductForm
        product={
          type === "quickProduct"
            ? financingSettings.products.quick
            : financingSettings.products.normal
        }
      />
    )
  }

  return <NotAvailable />
}
