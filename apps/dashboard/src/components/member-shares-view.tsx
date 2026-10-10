"use client"

import { formatCurrency } from "@halaalvest/utils"
import type {
  MemberUnitSharePosition,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { OpenMemberShareApplicationSheet } from "@/components/open-share-application-sheet"
import { ShareApplicationHeader } from "@/components/share-application-header"
import { ShareApplicationMobileToolbar } from "@/components/share-application-mobile-toolbar"
import { MemberShareApplicationSheet } from "@/components/sheets/member-share-application-sheet"
import { ShareApplicationsDataView } from "@/components/tables/share-applications/data-view"
import type { TableSettings } from "@/utils/table-settings"

export function MemberSharesView({
  policy,
  position,
  requestBlockedReason,
  shareApplicationInitialSettings,
}: {
  policy: TenantSharePolicySettings
  position: MemberUnitSharePosition
  requestBlockedReason: string | null
  shareApplicationInitialSettings?: Partial<TableSettings>
}) {
  const remainingOptionalUnits = Math.max(
    0,
    position.maximumUnits - position.totalPendingUnits
  )

  return (
    <div>
      <MemberShareApplicationSheet
        policy={policy}
        remainingOptionalUnits={remainingOptionalUnits}
        requestBlockedReason={requestBlockedReason}
      />
      {requestBlockedReason ? (
        <div
          className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:px-5 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
          role="alert"
        >
          {requestBlockedReason}
        </div>
      ) : null}
      <section className="hidden border-y border-border md:grid md:grid-cols-4 md:divide-x md:divide-border">
        <SummaryTile
          detail={formatCurrency(
            position.compulsoryUnits * position.unitAmount
          )}
          label="Compulsory"
          value={`${position.compulsoryUnits} units`}
        />
        <SummaryTile
          detail={formatCurrency(
            position.approvedOptionalUnits * position.unitAmount
          )}
          label="Approved optional"
          value={`${position.approvedOptionalUnits} units`}
        />
        <SummaryTile
          detail={formatCurrency(
            position.pendingOptionalUnits * position.unitAmount
          )}
          label="Pending optional"
          value={`${position.pendingOptionalUnits} units`}
        />
        <SummaryTile
          detail={`${position.totalPendingUnits}/${position.maximumUnits} units reserved`}
          label="Available"
          value={`${remainingOptionalUnits} units`}
        />
      </section>

      <section className="overflow-hidden border-b border-border md:border-y md:border-t-0">
        <ShareApplicationHeader
          action={
            <OpenMemberShareApplicationSheet
              disabled={
                remainingOptionalUnits === 0 || Boolean(requestBlockedReason)
              }
            />
          }
        />
        <div className="px-4 py-3 md:hidden">
          <ShareApplicationMobileToolbar
            canCreate
            createDisabled={
              remainingOptionalUnits === 0 || Boolean(requestBlockedReason)
            }
            createSheetType="member-create"
          />
        </div>
        <ShareApplicationsDataView
          initialSettings={shareApplicationInitialSettings}
        />
      </section>
    </div>
  )
}

function SummaryTile({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}
