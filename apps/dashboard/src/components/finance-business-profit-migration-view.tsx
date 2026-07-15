import {
  type BusinessProfitMigrationWorksheetData,
  BusinessProfitMigrationWorksheet,
} from "@/components/business-profit-migration-worksheet"
import { ScrollableContent } from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { SecondaryMenu } from "@/components/secondary-menu"

export function FinanceBusinessProfitMigrationView({
  isLocked,
  worksheet,
}: {
  isLocked: boolean
  worksheet: BusinessProfitMigrationWorksheetData
}) {
  return (
    <ScrollableContent>
      <div className="flex max-w-[1180px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />
        <BusinessProfitMigrationWorksheet
          isLocked={isLocked}
          worksheet={worksheet}
        />
      </div>
    </ScrollableContent>
  )
}
