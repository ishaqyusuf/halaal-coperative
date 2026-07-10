"use client"

import { useEffect, useState, type ComponentProps } from "react"
import type {
  MemberShareApplicationRow,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { Separator } from "@halaalvest/ui/components/separator"
import { formatCurrency } from "@halaalvest/utils"
import { DashboardSurfaceCard } from "@/components/dashboard/section"
import { TrendPill } from "@/components/dashboard/trend-badge"
import {
  SharePolicyForm,
  ShareStructureVersionForm,
} from "@/components/forms/tenant-finance-forms"
import { ShareApplicationsPanel } from "@/components/share-applications-panel"
import { ShareHeader } from "@/components/share-header"
import { DataTable as ShareHistoryDataTable } from "@/components/tables/shares/data-table"
import type { Share } from "@/components/tables/shares/columns"

type ShareConfigurationMode = TenantSharePolicySettings["configurationMode"]
type ShareStructureVersions = ComponentProps<
  typeof ShareStructureVersionForm
>["initialVersions"]
type MemberOption = {
  id: string
  label: string
}

function useSelectedShareMode(policy: TenantSharePolicySettings) {
  const [selectedMode, setSelectedMode] = useState<ShareConfigurationMode>(
    policy.configurationMode
  )

  useEffect(() => {
    setSelectedMode(policy.configurationMode)
  }, [policy.configurationMode])

  return {
    hasUnsavedModeChange: selectedMode !== policy.configurationMode,
    selectedMode,
    setSelectedMode,
  }
}

function shareModeLabel(mode: ShareConfigurationMode) {
  return mode === "monthly_history"
    ? "monthly share history"
    : "unit-based shareholding"
}

function UnsavedShareModelNotice({
  savedMode,
  selectedMode,
}: {
  savedMode: ShareConfigurationMode
  selectedMode: ShareConfigurationMode
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p className="font-medium">Save the active share model first</p>
      <p className="mt-1">
        The saved model is still {shareModeLabel(savedMode)}. Save{" "}
        {shareModeLabel(selectedMode)} before using its setup workflow.
      </p>
    </div>
  )
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

export function GettingStartedShareModelPanel({
  profitPolicyHref,
  sharePolicy,
  shareStructureVersions,
  tenantStartDate,
}: {
  profitPolicyHref: string
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: ShareStructureVersions
  tenantStartDate?: string | null
}) {
  const { hasUnsavedModeChange, selectedMode, setSelectedMode } =
    useSelectedShareMode(sharePolicy)
  const selectedMonthlyHistory = selectedMode === "monthly_history"

  return (
    <>
      <div>
        <p className="text-sm font-medium text-foreground">
          Active share model
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Choose one share model for this cooperative. The unselected model is
          inactive during setup.
        </p>
        <div className="mt-4">
          <SharePolicyForm
            defaultPolicy={sharePolicy}
            preserveDraftKey="getting-started:share-policy"
            redirectTo={selectedMonthlyHistory ? undefined : profitPolicyHref}
            showSubmitButton={selectedMonthlyHistory}
            onConfigurationModeChange={setSelectedMode}
          />
        </div>
      </div>

      {hasUnsavedModeChange ? (
        <UnsavedShareModelNotice
          savedMode={sharePolicy.configurationMode}
          selectedMode={selectedMode}
        />
      ) : selectedMonthlyHistory ? (
        <>
          <Separator />
          <ShareStructureVersionForm
            allowEmptyHistory
            financeStartDate={tenantStartDate}
            initialVersions={shareStructureVersions}
            preserveDraftKey="getting-started:shares"
            redirectTo={profitPolicyHref}
            showSubmitButton={false}
          />
        </>
      ) : (
        <ActiveUnitShareNotice />
      )}
    </>
  )
}

export function ShareSettingsModelWorkspace({
  applications,
  financeStartDate,
  isLocked,
  memberOptions,
  rows,
  sharePolicy,
}: {
  applications: MemberShareApplicationRow[]
  financeStartDate?: string | null
  isLocked: boolean
  memberOptions: MemberOption[]
  rows: Share[]
  sharePolicy: TenantSharePolicySettings
}) {
  const { hasUnsavedModeChange, selectedMode, setSelectedMode } =
    useSelectedShareMode(sharePolicy)

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-4">
          <p className="text-sm font-medium text-foreground">
            Active share model
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Select either dated monthly share history or unit-based
            shareholding. The two models are not used side by side.
          </p>
        </div>
        <SharePolicyForm
          defaultPolicy={sharePolicy}
          onConfigurationModeChange={setSelectedMode}
        />
      </div>

      {hasUnsavedModeChange ? (
        <UnsavedShareModelNotice
          savedMode={sharePolicy.configurationMode}
          selectedMode={selectedMode}
        />
      ) : selectedMode === "monthly_history" ? (
        <>
          <ShareHeader financeStartDate={financeStartDate} isLocked={isLocked} />
          <ShareHistoryDataTable
            financeStartDate={financeStartDate}
            hasSourceRows={rows.length > 0}
            isLocked={isLocked}
            rows={rows}
          />
        </>
      ) : (
        <ShareApplicationsPanel
          applications={applications}
          memberOptions={memberOptions}
          policy={sharePolicy}
        />
      )}
    </>
  )
}

export function FinanceShareModelWorkspace({
  currentShareAmount,
  historicalSetupLocked,
  rows,
  sharePolicy,
  tenantStartDate,
}: {
  currentShareAmount?: {
    amount: number
    valueType: "fixed_amount" | "percentage"
  } | null
  historicalSetupLocked: boolean
  rows: Share[]
  sharePolicy: TenantSharePolicySettings
  tenantStartDate?: string | null
}) {
  const { hasUnsavedModeChange, selectedMode, setSelectedMode } =
    useSelectedShareMode(sharePolicy)

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
        <SharePolicyForm
          defaultPolicy={sharePolicy}
          onConfigurationModeChange={setSelectedMode}
        />
      </DashboardSurfaceCard>

      {hasUnsavedModeChange ? (
        <div className="mt-5">
          <UnsavedShareModelNotice
            savedMode={sharePolicy.configurationMode}
            selectedMode={selectedMode}
          />
        </div>
      ) : selectedMode === "monthly_history" ? (
        <>
          {historicalSetupLocked ? (
            <div className="mt-5">
              <HistoricalSetupLockedNotice label="Share capital plan is locked" />
            </div>
          ) : null}
          <div className="mt-1">
            <ShareHistoryDataTable
              financeStartDate={tenantStartDate}
              isLocked={historicalSetupLocked}
              rows={rows}
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
    </>
  )
}
