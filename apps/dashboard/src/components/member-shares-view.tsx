"use client"

import { formatCurrency } from "@halaalvest/utils"
import type {
  MemberShareApplicationRow,
  MemberUnitSharePosition,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { OpenMemberShareApplicationSheet } from "@/components/open-share-application-sheet"
import { ShareApplicationHeader } from "@/components/share-application-header"
import { MemberShareApplicationSheet } from "@/components/sheets/member-share-application-sheet"
import { ShareApplicationsDataTable } from "@/components/tables/share-applications/data-table"
import type { TableSettings } from "@/utils/table-settings"

type MemberSummary = {
  fullName: string
  id: string
  memberNumber: string
}

export function MemberSharesView({
  applications,
  member,
  policy,
  position,
  shareApplicationInitialSettings,
}: {
  applications: MemberShareApplicationRow[]
  member: MemberSummary
  policy: TenantSharePolicySettings
  position: MemberUnitSharePosition
  shareApplicationInitialSettings?: Partial<TableSettings>
}) {
  const remainingOptionalUnits = Math.max(
    0,
    position.maximumUnits - position.totalPendingUnits
  )

  return (
    <div className="space-y-6">
      <MemberShareApplicationSheet
        policy={policy}
        remainingOptionalUnits={remainingOptionalUnits}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile
          detail={formatCurrency(position.compulsoryUnits * position.unitAmount)}
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

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Request optional shares
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {member.fullName} ({member.memberNumber})
            </p>
          </div>
          <div className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
            {formatCurrency(policy.unitAmount)} per share
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <OpenMemberShareApplicationSheet
            disabled={remainingOptionalUnits === 0}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <ShareApplicationHeader
          description="Track optional share requests and finance review status."
          title="My share requests"
        />
        <ShareApplicationsDataTable
          applications={applications}
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
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}
