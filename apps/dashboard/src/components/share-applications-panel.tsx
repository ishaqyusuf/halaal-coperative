"use client"

import { formatCurrency } from "@halaalvest/utils"
import type {
  MemberShareApplicationRow,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { OpenShareApplicationCreateSheet } from "@/components/open-share-application-sheet"
import { ShareApplicationHeader } from "@/components/share-application-header"
import type { ShareApplicationMemberOption } from "@/components/share-application-content"
import { ShareApplicationSheet } from "@/components/sheets/share-application-sheet"
import { ShareApplicationsDataTable } from "@/components/tables/share-applications/data-table"
import type { TableSettings } from "@/utils/table-settings"

export function ShareApplicationsPanel({
  applications,
  initialSettings,
  memberOptions,
  policy,
  remoteRows = true,
}: {
  applications: MemberShareApplicationRow[]
  initialSettings?: Partial<TableSettings>
  memberOptions: ShareApplicationMemberOption[]
  policy: TenantSharePolicySettings
  remoteRows?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <ShareApplicationSheet
        applications={applications}
        memberOptions={memberOptions}
        remoteRows={remoteRows}
      />
      <ShareApplicationHeader
        action={
          <OpenShareApplicationCreateSheet disabled={memberOptions.length === 0} />
        }
        description="Optional share requests are staged until finance approval posts them to share capital."
        title="Additional share applications"
      />
      <div className="flex items-center justify-end border-b border-border px-4 py-3">
        <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          {policy.compulsoryShareUnits}-{policy.maximumShareUnits} units at{" "}
          {formatCurrency(policy.unitAmount)}
        </div>
      </div>
      <ShareApplicationsDataTable
        applications={applications}
        canReview
        initialSettings={initialSettings}
        remoteRows={remoteRows}
      />
    </div>
  )
}
