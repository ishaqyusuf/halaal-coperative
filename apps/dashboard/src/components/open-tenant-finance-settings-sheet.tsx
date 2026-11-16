"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"

const defaultLabels = {
  businessProfitPolicy: "Change",
  financingCycle: "Loan requests",
  financingPolicy: "Change rules",
  normalProduct: "Change",
  quickProduct: "Change",
  startDate: "Change start date",
} as const

/** Opens one Finance setup overlay through `tenantFinanceSettingsSheetType`. */
export function OpenTenantFinanceSettingsSheet({
  disabled,
  label,
  type,
  variant = "outline",
}: {
  disabled?: boolean
  label?: string
  type: keyof typeof defaultLabels
  variant?: "default" | "outline"
}) {
  const { setParams } = useTenantFinanceSettingsParams()

  return (
    <Button
      size="touch"
      className="text-base"
      disabled={disabled}
      onClick={() => setParams({ tenantFinanceSettingsSheetType: type })}
      type="button"
      variant={variant}
    >
      {label ?? defaultLabels[type]}
    </Button>
  )
}
