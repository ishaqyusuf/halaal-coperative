"use client"

import type {
  MemberShareApplicationRow,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardSurfaceCard } from "@/components/dashboard/section"
import { TrendPill } from "@/components/dashboard/trend-badge"
import { OpenSharePolicySheet } from "@/components/open-share-sheet"
import { ShareApplicationsPanel } from "@/components/share-applications-panel"
import { ShareHeader } from "@/components/share-header"
import { ShareSheet } from "@/components/sheets/share-sheet"
import { DataTable as ShareHistoryDataTable } from "@/components/tables/shares/data-table"
import type { Share } from "@/components/tables/shares/columns"
import type { TableSettings } from "@/utils/table-settings"

type ShareConfigurationMode = TenantSharePolicySettings["configurationMode"]
type MemberOption = {
  id: string
  label: string
}

function shareModeLabel(mode: ShareConfigurationMode) {
  return mode === "monthly_history"
    ? "monthly share history"
    : "unit-based shareholding"
}

function ActiveUnitShareNotice() {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
      Unit-based shareholding is active. Monthly share history is not used for
      this cooperative.
    </div>
  )
}

function HistoricalSetupLockedNotice({
  label = "Historical setup is locked",
}: {
  label?: string
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">{label}</p>
      <p className="mt-1">
        Historical migration inputs are read-only. Use member correction
        workflows or an approved remediation path instead of changing migration
        inputs.
      </p>
    </div>
  )
}

export function ShareSettingsModelWorkspace({
  applications,
  financeStartDate,
  initialShareTableSettings,
  initialShareApplicationTableSettings,
  isLocked,
  memberOptions,
  remoteRows = true,
  rows,
  sharePolicy,
}: {
  applications: MemberShareApplicationRow[]
  financeStartDate?: string | null
  initialShareTableSettings?: Partial<TableSettings>
  initialShareApplicationTableSettings?: Partial<TableSettings>
  isLocked: boolean
  memberOptions: MemberOption[]
  remoteRows?: boolean
  rows: Share[]
  sharePolicy: TenantSharePolicySettings
}) {
  const selectedMode = sharePolicy.configurationMode

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Active share model
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {sharePolicy.configurationMode === "monthly_history"
                ? "Dated monthly share history is active."
                : "Unit-based shareholding is active."}
            </p>
          </div>
          <OpenSharePolicySheet />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <TrendPill>{shareModeLabel(sharePolicy.configurationMode)}</TrendPill>
          <TrendPill tone="neutral">
            Maximum {sharePolicy.maximumShareUnits} units
          </TrendPill>
        </div>
      </div>

      {selectedMode === "monthly_history" ? (
        <>
          <ShareHeader isLocked={isLocked} />
          <ShareHistoryDataTable
            financeStartDate={financeStartDate}
            hasSourceRows={rows.length > 0}
            initialSettings={initialShareTableSettings}
            isLocked={isLocked}
            remoteRows={remoteRows}
            renderSheet={false}
            sheetRows={rows}
            sharePolicy={sharePolicy}
          />
        </>
      ) : (
        <ShareApplicationsPanel
          applications={applications}
          initialSettings={initialShareApplicationTableSettings}
          memberOptions={memberOptions}
          policy={sharePolicy}
          remoteRows={remoteRows}
        />
      )}
      <ShareSheet
        financeStartDate={financeStartDate}
        isLocked={isLocked}
        rows={rows}
        sharePolicy={sharePolicy}
      />
    </>
  )
}

export function FinanceShareModelWorkspace({
  currentShareAmount,
  historicalSetupLocked,
  initialShareTableSettings,
  remoteRows = true,
  rows,
  sharePolicy,
  tenantStartDate,
}: {
  currentShareAmount?: {
    amount: number
    valueType: "fixed_amount" | "percentage"
  } | null
  historicalSetupLocked: boolean
  initialShareTableSettings?: Partial<TableSettings>
  remoteRows?: boolean
  rows: Share[]
  sharePolicy: TenantSharePolicySettings
  tenantStartDate?: string | null
}) {
  const selectedMode = sharePolicy.configurationMode

  return (
    <>
      <DashboardSurfaceCard className="mt-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Active share model
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              The cooperative uses only this model for share configuration.
              Switch modes only after confirming how member share balances
              should be migrated.
            </p>
          </div>
          <TrendPill tone="neutral">
            {selectedMode === "monthly_history"
              ? "Monthly history"
              : `${sharePolicy.compulsoryShareUnits}-${sharePolicy.maximumShareUnits} units`}
          </TrendPill>
        </div>
        <OpenSharePolicySheet />
      </DashboardSurfaceCard>

      {selectedMode === "monthly_history" ? (
        <>
          {historicalSetupLocked ? (
            <div className="mt-5">
              <HistoricalSetupLockedNotice label="Share capital plan is locked" />
            </div>
          ) : null}
          <div className="mt-1">
            <ShareHistoryDataTable
              financeStartDate={tenantStartDate}
              initialSettings={initialShareTableSettings}
              isLocked={historicalSetupLocked}
              remoteRows={remoteRows}
              renderSheet={false}
              sheetRows={rows}
              sharePolicy={sharePolicy}
            />
          </div>
          {currentShareAmount ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Current default monthly share:{" "}
              <span className="font-medium text-foreground">
                {currentShareAmount.valueType === "percentage"
                  ? `${currentShareAmount.amount}% after charges`
                  : formatCurrency(currentShareAmount.amount)}
              </span>
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-5">
          <ActiveUnitShareNotice />
        </div>
      )}
      <ShareSheet
        financeStartDate={tenantStartDate}
        isLocked={historicalSetupLocked}
        rows={rows}
        sharePolicy={sharePolicy}
      />
    </>
  )
}
