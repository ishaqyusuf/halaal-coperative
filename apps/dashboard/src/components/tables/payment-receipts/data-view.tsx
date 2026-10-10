"use client"

import { ResponsiveDataView } from "@/components/tables/core/responsive-data-view"
import type { TableSettings } from "@/utils/table-settings"
import { PaymentReceiptsDataTable } from "./data-table"
import { PaymentReceiptsMobileList } from "./mobile-list"
import { PaymentReceiptsSkeleton } from "./skeleton"

export function PaymentReceiptsDataView({
  initialSettings,
  mode = "staff",
}: {
  initialSettings?: Partial<TableSettings>
  mode?: "member" | "staff"
}) {
  return (
    <ResponsiveDataView
      desktop={
        <PaymentReceiptsDataTable
          initialSettings={initialSettings}
          mode={mode}
        />
      }
      fallback={<PaymentReceiptsSkeleton initialSettings={initialSettings} />}
      mobile={<PaymentReceiptsMobileList mode={mode} />}
    />
  )
}
