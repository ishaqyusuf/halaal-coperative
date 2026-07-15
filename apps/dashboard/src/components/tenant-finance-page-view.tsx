import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import type {
  TenantFinancingSettingsWorkspace,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardPageShell,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import { financeMenuItems } from "@/components/finance-menu"
import { InitialMigrationPreview } from "@/components/initial-migration-preview"
import { OpenTenantFinanceSettingsSheet } from "@/components/open-tenant-finance-settings-sheet"
import { FinanceShareModelWorkspace } from "@/components/share-model-workspace"
import { SecondaryMenu } from "@/components/secondary-menu"
import { TenantFinanceSettingsSheet } from "@/components/sheets/tenant-finance-settings-sheet"

type ShareVersionRow = {
  id: string
  effectiveFrom: string
  amount: number
  basis: "after_charge_deductions"
  notes?: string | null
  valueType: "fixed_amount" | "percentage"
}

type MemberActivityEventRow = {
  effectiveMonth: string
  id: string
  notes?: string | null
  reason?: string | null
  status: "active" | "inactive"
}

type ProfitMigrationOptionRow = {
  allocatableProfitAmount: number
  availableAmount: number
  businessName: string
  editableAvailableAmount: number
  expenseAmount: number
  id: string
  memberAllocatedAmount: number
  memberMigrationAdjustmentAmount: number
  memberPublishedAllocationAmount: number
  profitAmount: number
  profitDate: string
  seasonLabel?: string | null
  seasonPeriodEnd?: string | null
  totalDisbursedAmount: number
}

type ChargeVersionRow = {
  id: string
  effectiveFrom: string
  amount: number
  chargeValueType: "fixed_amount" | "percentage"
  notes?: string | null
  status: "current" | "historical" | "scheduled"
}

type ChargeDefinitionRow = {
  id: string
  chargeFrequency:
    | "recurring_monthly"
    | "per_contribution"
    | "one_time"
    | "manual"
  chargeValueType: "fixed_amount" | "percentage"
  code: string
  name: string
  kind: string
  isActive: boolean
  versions: ChargeVersionRow[]
}

type ShareBusinessRow = {
  id: string
  capitalAmount: number
  endDate: string | null
  linkedDividendPeriod?: {
    id: string
    name: string
    status: string
  } | null
  name: string
  notes?: string | null
  profitEntries: Array<{
    id: string
    allocatedProfitAmount: number
    allocationCount: number
    allocatableProfitAmount: number
    expenseAmount: number
    hasPublishedAllocations: boolean
    linkedDividendPeriod?: {
      id: string
      name: string
      status: string
    } | null
    notes?: string | null
    profitAmount: number
    profitDate: string
    reason?: string | null
    sourceType: string
    status: string
  }>
  profitAmount: number
  startDate: string
  status: string
}

type DividendPeriodRow = {
  id: string
  name: string
  periodStart: string
  periodEnd: string
  status: string
  totalProfitAmount: number
}

type LegacyLoanDraftRow = {
  closedAt: string | null
  guarantorOneMemberId?: string | null
  guarantorTwoMemberId?: string | null
  id: string
  loanLabel: string
  memberId: string
  memberName: string
  memberNumber: string
  openedAt: string
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
}

type MemberOption = {
  id: string
  label: string
}

type MemberAmountLogRow = {
  amount: number
  effectiveFrom: string
  id: string
  notes?: string | null
}

type MigrationMemberReviewRow = {
  appliedBackfillBatches: number
  appliedBackfillMonths: number
  backfillDraftBatches: number
  fullName: string
  id: string
  joinedAt: string
  legacyLoanDrafts: number
  memberNumber: string
  profitAdjustments: number
  rowAdjustments: number
  status: "profile_only" | "configured" | "backfill_draft" | "backfill_applied"
}

type FinancingSettingsRow = {
  currentCyclePreview: Omit<
    TenantFinancingSettingsWorkspace["currentCyclePreview"],
    "periodEnd" | "periodStart"
  > & {
    periodEnd: string | null
    periodStart: string | null
  }
  policy: TenantFinancingSettingsWorkspace["policy"]
  products: TenantFinancingSettingsWorkspace["products"]
}

export type TenantFinanceSection =
  | "business"
  | "charges"
  | "loan"
  | "migration"
  | "migration-member"
  | "overview"
  | "shares"

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

export function TenantFinancePageView({
  chargeDefinitions,
  dividendPeriods,
  financingSettings,
  generatedLedgerRows,
  initialMigrationSnapshot,
  legacyLoanDrafts,
  memberActivityEvents,
  memberAmountLogs,
  memberOptions,
  memberNumberPrefix,
  migrationMemberReview,
  profitMigrationOptions,
  quickFillEnabled,
  selectedMigrationMemberId,
  selectedMigrationMemberLabel,
  section = "overview",
  shareBusinesses,
  sharePolicy,
  shareStructureVersions,
  tenantStartDate,
}: {
  chargeDefinitions: ChargeDefinitionRow[]
  dividendPeriods: DividendPeriodRow[]
  financingSettings: FinancingSettingsRow
  generatedLedgerRows?: MemberLedgerBackfillRow[]
  initialMigrationSnapshot?: InitialMigrationSnapshot
  legacyLoanDrafts: LegacyLoanDraftRow[]
  memberActivityEvents?: MemberActivityEventRow[]
  memberAmountLogs?: MemberAmountLogRow[]
  memberOptions: MemberOption[]
  memberNumberPrefix?: string | null
  migrationMemberReview: MigrationMemberReviewRow[]
  profitMigrationOptions?: ProfitMigrationOptionRow[]
  quickFillEnabled: boolean
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  section?: TenantFinanceSection
  shareBusinesses: ShareBusinessRow[]
  sharePolicy: TenantSharePolicySettings
  shareStructureVersions: ShareVersionRow[]
  tenantStartDate: string | null
}) {
  void dividendPeriods

  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)
  const currentShareAmount =
    shareStructureVersions.length > 0
      ? shareStructureVersions[shareStructureVersions.length - 1]
      : null
  const usesMonthlyShareHistory =
    sharePolicy.configurationMode === "monthly_history"
  const totalBusinessProfit = shareBusinesses.reduce(
    (sum, business) => sum + business.profitAmount,
    0
  )
  const hasAppliedMemberBackfill = migrationMemberReview.some(
    (member) =>
      member.status === "backfill_applied" ||
      member.appliedBackfillBatches > 0 ||
      member.appliedBackfillMonths > 0
  )
  const migrationToolsClosed =
    Boolean(initialMigrationSnapshot) &&
    !initialMigrationSnapshot?.canUseMigrationTools
  const historicalSetupLocked = migrationToolsClosed || hasAppliedMemberBackfill
  const historicalSetupLockReason = migrationToolsClosed
    ? "Migration has been finalized, so historical charge schedules, share capital rules, optional business profit pools, and historical charge imports are read-only."
    : hasAppliedMemberBackfill
      ? "Member ledger backfill has started, so dated charge schedules, share capital rules, optional business profit pools, and historical charge imports are locked."
      : "Complete dated charges, share capital rules, and historical charge imports before applying member ledger backfill. Business profit history can be added when it exists."
  const showOverview = section === "overview"
  const showShares = section === "shares"
  const showLoan = section === "loan"
  const showMigration = section === "migration"
  const showMigrationMember = section === "migration-member"
  const financingPreview = financingSettings.currentCyclePreview
  const currentCycleStatus = financingPreview.existingCycle?.status ?? "draft"
  const collectionCoveragePercent = `${Math.round(
    financingPreview.collectionCoverage * 100
  )}%`
  const collectionGap = Math.max(
    0,
    financingPreview.projectedCommitmentAmount -
      financingPreview.receivedContributionAmount
  )

  return (
    <DashboardPageShell>
      <div className="max-w-[800px]">
        <SecondaryMenu items={financeMenuItems} />

        <main className="mt-8 min-w-0 space-y-6">
          {showOverview ? (
            <section className="scroll-mt-24" id="finance-overview">
              <div className="grid gap-4 xl:grid-cols-3">
                <DashboardStatCard
                  label="Cooperative start"
                  value={tenantStartDate ?? "Not set"}
                  detail="The earliest date used when generating finance backfill."
                />
                <DashboardStatCard
                  label="Active share model"
                  value={
                    usesMonthlyShareHistory
                      ? "Monthly history"
                      : "Unit shareholding"
                  }
                  detail={
                    usesMonthlyShareHistory
                      ? `${shareStructureVersions.length} dated share rule${shareStructureVersions.length === 1 ? "" : "s"}`
                      : `${sharePolicy.compulsoryShareUnits}-${sharePolicy.maximumShareUnits} units at ${formatCurrency(sharePolicy.unitAmount)} each`
                  }
                  tone="positive"
                />
                <DashboardStatCard
                  label="Charge definitions"
                  value={chargeDefinitions.length.toString()}
                  detail="Reusable member charge rules configured for the cooperative."
                />
                <DashboardStatCard
                  label="Active charges"
                  value={activeCharges.length.toString()}
                  detail="Currently active monthly or one-off charge structures."
                />
                <DashboardStatCard
                  label="Registered businesses"
                  value={shareBusinesses.length.toString()}
                  detail="Historical business ventures used to build future dividend accuracy."
                  tone="positive"
                />
                <DashboardStatCard
                  label="Tracked business profit"
                  value={formatCurrency(totalBusinessProfit)}
                  detail="Total profit captured across all registered business periods."
                />
              </div>

              {initialMigrationSnapshot ? (
                <DashboardSurfaceCard
                  className={`mt-4 ${
                    historicalSetupLocked
                      ? "border-amber-200 bg-amber-50/80"
                      : "bg-background/70"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          historicalSetupLocked
                            ? "text-amber-950"
                            : "text-foreground"
                        }`}
                      >
                        Historical setup lock
                      </p>
                      <p
                        className={`mt-1 text-sm ${
                          historicalSetupLocked
                            ? "text-amber-900"
                            : "text-muted-foreground"
                        }`}
                      >
                        {historicalSetupLockReason}
                      </p>
                    </div>
                    <TrendPill
                      tone={historicalSetupLocked ? "warning" : "neutral"}
                    >
                      {historicalSetupLocked
                        ? "Setup locked"
                        : "Setup editable"}
                    </TrendPill>
                  </div>
                </DashboardSurfaceCard>
              ) : null}
            </section>
          ) : null}

          {showLoan ? (
            <section className="scroll-mt-24" id="live-financing-settings">
              <DashboardSectionCard>
                <DashboardSectionHeader
                  eyebrow="Financing policy"
                  title="Monthly financing settings"
                  description="Configure projected commitment capacity, quick and normal allocation, member caps, and current cycle controls."
                  actions={
                    <TrendPill
                      tone={
                        currentCycleStatus === "open"
                          ? "positive"
                          : currentCycleStatus === "paused"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {currentCycleStatus.replaceAll("_", " ")}
                    </TrendPill>
                  }
                />

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  <DashboardStatCard
                    label="Projected commitments"
                    value={formatCurrency(
                      financingPreview.projectedCommitmentAmount
                    )}
                    detail={`Cycle ${financingPreview.periodStart ?? "current"} to ${financingPreview.periodEnd ?? "month end"}`}
                  />
                  <DashboardStatCard
                    label="Actual collections"
                    value={formatCurrency(
                      financingPreview.receivedContributionAmount
                    )}
                    detail={`${collectionCoveragePercent} of projected commitments received`}
                    tone={
                      financingPreview.receivedContributionAmount >=
                      financingPreview.projectedCommitmentAmount
                        ? "positive"
                        : "warning"
                    }
                  />
                  <DashboardStatCard
                    label="Reserve buffer"
                    value={formatCurrency(financingPreview.reserveBufferAmount)}
                    detail="Deducted before quick and normal allocation."
                  />
                  <DashboardStatCard
                    label="Quick budget"
                    value={formatCurrency(financingPreview.quick.budgetAmount)}
                    detail={`${financingPreview.quickAllocationPercentage}% allocation with ${formatCurrency(financingPreview.quick.remainingAmount)} remaining`}
                    tone="positive"
                  />
                  <DashboardStatCard
                    label="Normal budget"
                    value={formatCurrency(financingPreview.normal.budgetAmount)}
                    detail={`${financingPreview.normalAllocationPercentage}% allocation with ${formatCurrency(financingPreview.normal.remainingAmount)} remaining`}
                    tone="positive"
                  />
                  <DashboardStatCard
                    label="Collection gap"
                    value={formatCurrency(collectionGap)}
                    detail="Shown separately from projected capacity."
                    tone={collectionGap > 0 ? "warning" : "positive"}
                  />
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <DashboardSurfaceCard>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Policy controls
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Allocation, terms, reserve, approval, and final
                          deployable-funds safeguard.
                        </p>
                      </div>
                      <TrendPill tone="neutral">
                        {financingSettings.policy.financingCapacityBasis.replaceAll(
                          "_",
                          " "
                        )}
                      </TrendPill>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Quick allocation
                          </p>
                          <p className="font-medium text-foreground">
                            {financingPreview.quickAllocationPercentage}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Normal allocation
                          </p>
                          <p className="font-medium text-foreground">
                            {financingPreview.normalAllocationPercentage}%
                          </p>
                        </div>
                      </div>
                      <OpenTenantFinanceSettingsSheet type="financingPolicy" />
                    </div>
                  </DashboardSurfaceCard>

                  <DashboardSurfaceCard>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Cycle controls
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Opening a cycle snapshots this month&apos;s projected
                          capacity and allocation.
                        </p>
                      </div>
                      <TrendPill
                        tone={
                          currentCycleStatus === "open"
                            ? "positive"
                            : currentCycleStatus === "paused"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {financingPreview.existingCycle
                          ? currentCycleStatus
                          : "not opened"}
                      </TrendPill>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Current period
                        </p>
                        <p className="font-medium text-foreground">
                          {financingPreview.periodStart ?? "current"} to{" "}
                          {financingPreview.periodEnd ?? "month end"}
                        </p>
                      </div>
                      <OpenTenantFinanceSettingsSheet type="financingCycle" />
                    </div>
                    {financingPreview.receivedContributionAmount <
                    financingPreview.totalCapacityAmount ? (
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        <p className="font-medium">
                          Actual collections are below projected capacity
                        </p>
                        <p className="mt-1">
                          Disbursement still needs the deployable-funds check
                          even when the monthly cycle is open.
                        </p>
                      </div>
                    ) : null}
                  </DashboardSurfaceCard>

                  <DashboardSurfaceCard>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Quick product
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Short-term financing settings for the quick
                          allocation.
                        </p>
                      </div>
                      <TrendPill
                        tone={
                          financingSettings.products.quick.isActive
                            ? "positive"
                            : "warning"
                        }
                      >
                        {financingSettings.products.quick.isActive
                          ? "active"
                          : "inactive"}
                      </TrendPill>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Max tenure
                          </p>
                          <p className="font-medium text-foreground">
                            {financingSettings.products.quick.termMonths}{" "}
                            months
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Savings multiple
                          </p>
                          <p className="font-medium text-foreground">
                            {financingSettings.products.quick.maxSavingsMultiple}
                            x
                          </p>
                        </div>
                      </div>
                      <OpenTenantFinanceSettingsSheet type="quickProduct" />
                    </div>
                  </DashboardSurfaceCard>

                  <DashboardSurfaceCard>
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Normal product
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Standard financing settings for the normal
                          allocation.
                        </p>
                      </div>
                      <TrendPill
                        tone={
                          financingSettings.products.normal.isActive
                            ? "positive"
                            : "warning"
                        }
                      >
                        {financingSettings.products.normal.isActive
                          ? "active"
                          : "inactive"}
                      </TrendPill>
                    </div>
                    <div className="grid gap-3 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Max tenure
                          </p>
                          <p className="font-medium text-foreground">
                            {financingSettings.products.normal.termMonths}{" "}
                            months
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Savings multiple
                          </p>
                          <p className="font-medium text-foreground">
                            {financingSettings.products.normal.maxSavingsMultiple}
                            x
                          </p>
                        </div>
                      </div>
                      <OpenTenantFinanceSettingsSheet type="normalProduct" />
                    </div>
                  </DashboardSurfaceCard>
                </div>
              </DashboardSectionCard>
            </section>
          ) : null}

          {showLoan || showMigration || showMigrationMember ? (
            <section className="scroll-mt-24" id="migration-workbench">
              {showLoan ? (
                <div className="mb-4 border-t border-border pt-6">
                  <p className="text-sm font-semibold text-foreground">
                    Historical loan migration
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Legacy loan setup remains separate from live financing
                    policy and monthly cycle controls.
                  </p>
                </div>
              ) : null}
              <InitialMigrationPreview
                generatedLedgerRows={generatedLedgerRows}
                legacyLoanDrafts={legacyLoanDrafts}
                memberActivityEvents={memberActivityEvents}
                memberAmountLogs={memberAmountLogs}
                memberOptions={memberOptions}
                memberNumberPrefix={memberNumberPrefix}
                migrationSnapshot={initialMigrationSnapshot}
                migrationMemberReview={migrationMemberReview}
                profitMigrationOptions={profitMigrationOptions}
                quickFillEnabled={quickFillEnabled}
                selectedMigrationMemberId={selectedMigrationMemberId}
                selectedMigrationMemberLabel={selectedMigrationMemberLabel}
                section={
                  showLoan
                    ? "loans"
                    : showMigrationMember
                      ? "member-preview"
                      : "overview"
                }
                tenantStartDate={tenantStartDate}
              />
            </section>
          ) : null}

          {showOverview ? (
            <section className="scroll-mt-24" id="start-date">
              <DashboardSectionCard>
                <DashboardSectionHeader
                  eyebrow="Start date"
                  title="Cooperative start date"
                  description="Use the cooperative start date as the finance history anchor for share and backfill generation."
                  actions={<TrendPill tone="neutral">Finance anchor</TrendPill>}
                />
                <div className="mt-5 space-y-4">
                  <DashboardSurfaceCard>
                    <p className="text-sm text-muted-foreground">
                      Current value
                    </p>
                    <p className="mt-2 text-xl font-semibold text-foreground">
                      {tenantStartDate ?? "No date set yet"}
                    </p>
                  </DashboardSurfaceCard>
                  <DashboardSurfaceCard>
                    {historicalSetupLocked ? (
                      <HistoricalSetupLockedNotice label="Start date is locked" />
                    ) : (
                      <div className="grid gap-3">
                        <p className="text-sm text-muted-foreground">
                          Update the finance history anchor from a focused
                          settings sheet.
                        </p>
                        <div>
                          <OpenTenantFinanceSettingsSheet
                            type="startDate"
                            variant="default"
                          />
                        </div>
                      </div>
                    )}
                  </DashboardSurfaceCard>
                  <DashboardSurfaceCard>
                    <p className="text-sm text-muted-foreground">
                      Finance rule
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      Share defaults, charge versions, and member backfill
                      generation should not begin before the cooperative start
                      date unless a migration override is introduced later.
                    </p>
                  </DashboardSurfaceCard>
                </div>
              </DashboardSectionCard>
            </section>
          ) : null}

          {showShares ? (
            <section className="scroll-mt-24" id="shares">
              <DashboardSectionCard>
                <DashboardSectionHeader
                  eyebrow="Shares"
                  title="Share model"
                  description={
                    "Choose the cooperative's active share model. Only the " +
                    "selected model is used for member share setup."
                  }
                  actions={
                    <TrendPill
                      tone={
                        usesMonthlyShareHistory && historicalSetupLocked
                          ? "warning"
                          : "positive"
                      }
                    >
                      {usesMonthlyShareHistory
                        ? historicalSetupLocked
                          ? "History locked"
                          : "Monthly history"
                        : "Unit shareholding"}
                    </TrendPill>
                  }
                />
                <FinanceShareModelWorkspace
                  currentShareAmount={currentShareAmount}
                  historicalSetupLocked={historicalSetupLocked}
                  rows={shareStructureVersions.map((version, index) => ({
                    ...version,
                    isCurrent: index === shareStructureVersions.length - 1,
                  }))}
                  sharePolicy={sharePolicy}
                  tenantStartDate={tenantStartDate}
                />
              </DashboardSectionCard>
            </section>
          ) : null}

          <TenantFinanceSettingsSheet
            financingSettings={financingSettings}
            tenantStartDate={tenantStartDate}
          />
        </main>
      </div>
    </DashboardPageShell>
  )
}
