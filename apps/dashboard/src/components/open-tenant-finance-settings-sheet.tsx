"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CalendarClockIcon,
  ChartPieIcon,
  GaugeIcon,
  PackageCheckIcon,
  PlayCircleIcon,
  Settings2Icon,
} from "lucide-react"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"

const sheetLabels = {
  businessProfitPolicy: {
    icon: ChartPieIcon,
    label: "Edit profit policy",
  },
  financingCycle: {
    icon: PlayCircleIcon,
    label: "Manage cycle",
  },
  financingPolicy: {
    icon: GaugeIcon,
    label: "Edit policy",
  },
  normalProduct: {
    icon: PackageCheckIcon,
    label: "Edit normal product",
  },
  quickProduct: {
    icon: PackageCheckIcon,
    label: "Edit quick product",
  },
  startDate: {
    icon: CalendarClockIcon,
    label: "Set start date",
  },
} as const

export function OpenTenantFinanceSettingsSheet({
  disabled,
  type,
  variant = "outline",
}: {
  disabled?: boolean
  type: keyof typeof sheetLabels
  variant?: "default" | "outline"
}) {
  const { setParams } = useTenantFinanceSettingsParams()
  const Icon = sheetLabels[type].icon ?? Settings2Icon

  return (
    <Button
      disabled={disabled}
      onClick={() => setParams({ tenantFinanceSettingsSheetType: type })}
      size="sm"
      type="button"
      variant={variant}
    >
      <Icon data-icon="inline-start" />
      {sheetLabels[type].label}
    </Button>
  )
}
