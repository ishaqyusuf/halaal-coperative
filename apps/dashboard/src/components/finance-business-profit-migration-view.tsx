import {
  type BusinessProfitMigrationWorksheetData,
  BusinessProfitMigrationWorksheet,
} from "@/components/business-profit-migration-worksheet"
import { FinanceSettingsFrame } from "@/components/finance-settings/finance-settings-frame"

export function FinanceBusinessProfitMigrationView({
  isLocked,
  worksheet,
}: {
  isLocked: boolean
  worksheet: BusinessProfitMigrationWorksheetData
}) {
  return (
    <FinanceSettingsFrame className="max-w-[1180px]">
      <BusinessProfitMigrationWorksheet
        isLocked={isLocked}
        worksheet={worksheet}
      />
    </FinanceSettingsFrame>
  )
}
