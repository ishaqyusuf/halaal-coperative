import type {
  MemberShareApplicationRow,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { ScrollableContent } from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { SecondaryMenu } from "@/components/secondary-menu"
import { ShareSettingsModelWorkspace } from "@/components/share-model-workspace"
import type { Share } from "@/components/tables/shares/columns"
import type { TableSettings } from "@/utils/table-settings"

type MemberOption = {
  id: string
  label: string
}

export function FinanceShareSettingsView({
  financeStartDate,
  initialShareApplicationTableSettings,
  initialShareTableSettings,
  isLocked,
  memberOptions,
  remoteRows,
  rows,
  shareApplications,
  sharePolicy,
  tenantName,
}: {
  financeStartDate: string | null
  initialShareApplicationTableSettings: Partial<TableSettings>
  initialShareTableSettings: Partial<TableSettings>
  isLocked: boolean
  memberOptions: MemberOption[]
  remoteRows: boolean
  rows: Share[]
  shareApplications: MemberShareApplicationRow[]
  sharePolicy: TenantSharePolicySettings
  tenantName: string
}) {
  return (
    <ScrollableContent>
      <div className="flex max-w-[800px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Finance settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Shares
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose the active share model for {tenantName}. Member share setup
            uses only the selected model.
          </p>
        </div>

        <ShareSettingsModelWorkspace
          applications={shareApplications}
          financeStartDate={financeStartDate}
          initialShareApplicationTableSettings={
            initialShareApplicationTableSettings
          }
          initialShareTableSettings={initialShareTableSettings}
          isLocked={isLocked}
          memberOptions={memberOptions}
          remoteRows={remoteRows}
          rows={rows}
          sharePolicy={sharePolicy}
        />
      </div>
    </ScrollableContent>
  )
}
