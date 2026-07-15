import { ChargeHeader } from "@/components/charge-header"
import { ScrollableContent } from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { SecondaryMenu } from "@/components/secondary-menu"
import { DataTable } from "@/components/tables/charges/data-table"
import type { Charge } from "@/components/tables/charges/columns"
import type { TableSettings } from "@/utils/table-settings"

export function FinanceChargeSettingsView({
  financeStartDate,
  initialChargeTableSettings,
  isLocked,
  quickFillEnabled,
  remoteRows,
  rows,
  tenantName,
}: {
  financeStartDate: string | null
  initialChargeTableSettings: Partial<TableSettings>
  isLocked: boolean
  quickFillEnabled: boolean
  remoteRows: boolean
  rows: Charge[]
  tenantName: string
}) {
  return (
    <ScrollableContent>
      <div className="flex max-w-[900px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Finance settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Charges
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage the dated charge definitions and amount history for{" "}
            {tenantName} before member ledger backfill starts.
          </p>
        </div>

        <ChargeHeader isLocked={isLocked} />
        <DataTable
          financeStartDate={financeStartDate}
          hasSourceRows={rows.length > 0}
          initialSettings={initialChargeTableSettings}
          isLocked={isLocked}
          quickFillEnabled={quickFillEnabled}
          remoteRows={remoteRows}
          sheetRows={rows}
        />
      </div>
    </ScrollableContent>
  )
}
