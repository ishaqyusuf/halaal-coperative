"use client"

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

export const tenantFinanceOverlayCopy = {
  businessProfitPolicy: {
    description: "How often profit is shared, and how much goes to members.",
    title: "Profit sharing",
  },
  financingCycle: {
    description: "Members can ask for loans only while requests are open.",
    title: "Loan requests this month",
  },
  financingPolicy: {
    description: "How much is lent each month, and who can borrow.",
    title: "Loan rules",
  },
  normalProduct: {
    description: "Longer loans for bigger needs.",
    title: "Normal loan",
  },
  quickProduct: {
    description: "Short loans for urgent needs.",
    title: "Quick loan",
  },
  startDate: {
    description: "The first day of your cooperative's records.",
    title: "Start date",
  },
} as const

/** Title and one line for a Finance setup overlay, as a sheet or a dialog. */
export function TenantFinanceSettingsSheetHeader() {
  const { tenantFinanceSettingsSheetType: type } =
    useTenantFinanceSettingsParams()
  const copy = type ? tenantFinanceOverlayCopy[type] : null

  if (!copy) return null

  if (getWorkflowPresentation("tenantFinance", type).presentation === "sheet") {
    return (
      <SheetHeader className="px-0">
        <SheetTitle className="text-xl">{copy.title}</SheetTitle>
        <SheetDescription className="text-base">
          {copy.description}
        </SheetDescription>
      </SheetHeader>
    )
  }

  return (
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold">{copy.title}</DialogTitle>
      <DialogDescription className="text-base">
        {copy.description}
      </DialogDescription>
    </DialogHeader>
  )
}
