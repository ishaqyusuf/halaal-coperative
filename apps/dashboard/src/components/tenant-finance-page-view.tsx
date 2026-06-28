import { Button } from "@halaalvest/ui/components/button"
import type { MemberLedgerBackfillRow } from "@halaalvest/backfill"
import type { InitialMigrationSnapshot } from "@halaalvest/domain"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
} from "@/components/tables/core"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardPageShell,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  ChargeDefinitionForm,
  ChargeDefinitionVersionForm,
  FinanceStartDateForm,
  GenerateShareProfitAllocationsButton,
  PublishShareProfitAllocationsButton,
  ShareBusinessForm,
  ShareBusinessProfitEntryForm,
} from "@/components/forms/tenant-finance-forms"
import { DataTable as ShareDataTable } from "@/components/tables/shares/data-table"
import { InitialMigrationPreview } from "@/components/initial-migration-preview"
import {
  createChargeDefinitionVersionAction,
  markBusinessProfitPoolsReviewedAction,
  updateShareBusinessAction,
  updateShareBusinessProfitEntryAction,
  updateChargeDefinitionVersionAction,
} from "@/lib/dashboard-actions"
import { SecondaryMenu } from "@/components/secondary-menu"

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
  generatedLedgerRows,
  initialMigrationSnapshot,
  legacyLoanDrafts,
  memberActivityEvents,
  memberAmountLogs,
  memberOptions,
  memberNumberPrefix,
  migrationMemberReview,
  profitMigrationOptions,
  selectedMigrationMemberId,
  selectedMigrationMemberLabel,
  section = "overview",
  shareBusinesses,
  shareStructureVersions,
  tenantName,
  tenantStartDate,
}: {
  chargeDefinitions: ChargeDefinitionRow[]
  dividendPeriods: DividendPeriodRow[]
  generatedLedgerRows?: MemberLedgerBackfillRow[]
  initialMigrationSnapshot?: InitialMigrationSnapshot
  legacyLoanDrafts: LegacyLoanDraftRow[]
  memberActivityEvents?: MemberActivityEventRow[]
  memberAmountLogs?: MemberAmountLogRow[]
  memberOptions: MemberOption[]
  memberNumberPrefix?: string | null
  migrationMemberReview: MigrationMemberReviewRow[]
  profitMigrationOptions?: ProfitMigrationOptionRow[]
  selectedMigrationMemberId?: string | null
  selectedMigrationMemberLabel?: string | null
  section?: TenantFinanceSection
  shareBusinesses: ShareBusinessRow[]
  shareStructureVersions: ShareVersionRow[]
  tenantName: string
  tenantStartDate: string | null
}) {
  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)
  const currentShareAmount =
    shareStructureVersions.length > 0
      ? shareStructureVersions[shareStructureVersions.length - 1]
      : null
  const totalBusinessProfit = shareBusinesses.reduce(
    (sum, business) => sum + business.profitAmount,
    0
  )
  const totalRecordedProfitEntries = shareBusinesses.reduce(
    (sum, business) =>
      sum +
      business.profitEntries.reduce(
        (entrySum, entry) => entrySum + entry.allocatableProfitAmount,
        0
      ),
    0
  )
  const totalBusinessCapital = shareBusinesses.reduce(
    (sum, business) => sum + business.capitalAmount,
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
    ? "Migration has been finalized, so historical charge schedules, share capital rules, business profit pools, and historical charge imports are read-only."
    : hasAppliedMemberBackfill
      ? "Member ledger backfill has started, so dated charge schedules, share capital rules, business profit pools, and historical charge imports are locked."
      : "Complete dated charges, share capital rules, business profit pools, and historical charge imports before applying any member ledger backfill."
  const businessProfitPoolsReviewed =
    initialMigrationSnapshot?.steps.find(
      (step) => step.key === "business_profit_pools"
    )?.complete ?? false
  const businessProfitReviewedWithoutPools =
    businessProfitPoolsReviewed && shareBusinesses.length === 0
  const chargeDefinitionOptions = chargeDefinitions.map((charge) => ({
    id: charge.id,
    kind: charge.kind,
    label: `${charge.name} (${charge.code})`,
  }))
  const dividendPeriodOptions = dividendPeriods.map((period) => ({
    id: period.id,
    label: `${period.name} · ${period.status}`,
  }))
  const shareBusinessOptions = shareBusinesses.map((business) => ({
    id: business.id,
    label: business.name,
  }))
  const financeMenuItems = [
    { path: "/settings/finance", label: "Overview" },
    { path: "/settings/finance/shares", label: "Shares" },
    { path: "/settings/finance/charges", label: "Charges" },
    { path: "/settings/finance/business", label: "Business" },
    { path: "/settings/finance/loan", label: "Loan" },
    { path: "/settings/finance/migration", label: "Migration" },
  ]
  const showOverview = section === "overview"
  const showShares = section === "shares"
  const showCharges = section === "charges"
  const showBusiness = section === "business"
  const showLoan = section === "loan"
  const showMigration = section === "migration"
  const showMigrationMember = section === "migration-member"

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
                  label="Share versions"
                  value={shareStructureVersions.length.toString()}
                  detail="Dated fixed or percentage-based share capital rules."
                  tone="positive"
                />
                <DashboardStatCard
                  label="Charge definitions"
                  value={chargeDefinitions.length.toString()}
                  detail="Reusable member charge rules configured for the tenant."
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

          {showLoan || showMigration || showMigrationMember ? (
            <section className="scroll-mt-24" id="migration-workbench">
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
                selectedMigrationMemberId={selectedMigrationMemberId}
                selectedMigrationMemberLabel={selectedMigrationMemberLabel}
                section={
                  showLoan
                    ? "loans"
                    : showMigrationMember
                      ? "member-preview"
                      : "overview"
                }
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
                      <FinanceStartDateForm
                        defaultStartDate={tenantStartDate}
                      />
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
                  title="Default share structure history"
                  description="Track every cooperative-wide monthly share amount change with an effective date."
                  actions={
                    <TrendPill
                      tone={historicalSetupLocked ? "warning" : "positive"}
                    >
                      {historicalSetupLocked
                        ? "History locked"
                        : "History enabled"}
                    </TrendPill>
                  }
                />
                {historicalSetupLocked ? (
                  <DashboardSurfaceCard className="mt-5">
                    <HistoricalSetupLockedNotice label="Share capital plan is locked" />
                  </DashboardSurfaceCard>
                ) : null}
                <div className="mt-1">
                  <ShareDataTable
                    financeStartDate={tenantStartDate}
                    isLocked={historicalSetupLocked}
                    rows={shareStructureVersions.map((version, index) => ({
                      ...version,
                      isCurrent: index === shareStructureVersions.length - 1,
                    }))}
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
              </DashboardSectionCard>
            </section>
          ) : null}

          {showCharges ? (
            <section className="scroll-mt-24" id="charges">
              <DashboardSectionCard>
                <DashboardSectionHeader
                  eyebrow="Charges"
                  title="Charge structure history"
                  description="Each charge definition keeps its identity, while dated versions hold the amount history used for backfill generation."
                  actions={
                    <TrendPill
                      tone={historicalSetupLocked ? "warning" : "positive"}
                    >
                      {historicalSetupLocked
                        ? "Resolution locked"
                        : "Monthly resolution ready"}
                    </TrendPill>
                  }
                />
                <DashboardSurfaceCard className="mt-5 border-amber-200 bg-amber-50 text-amber-950">
                  <p className="text-sm font-medium">Historical lock warning</p>
                  <p className="mt-1 text-sm">
                    Charge schedules are migration inputs. After member backfill
                    is applied and migration is finalized, past charge history
                    must move through correction workflows instead of silent
                    edits.
                  </p>
                </DashboardSurfaceCard>
                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <DashboardSurfaceCard>
                    <p className="text-sm font-medium text-foreground">
                      Create charge definition
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Use this for new recurring or one-off charges that the
                      backfill system must resolve by month.
                    </p>
                    <div className="mt-4">
                      {historicalSetupLocked ? (
                        <HistoricalSetupLockedNotice label="Charge creation is locked" />
                      ) : (
                        <ChargeDefinitionForm
                          financeStartDate={tenantStartDate}
                        />
                      )}
                    </div>
                  </DashboardSurfaceCard>

                  <DashboardSurfaceCard>
                    <p className="text-sm font-medium text-foreground">
                      Add charge amount update
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Every update history is part of the month-by-month charge
                      resolution used during backfill.
                    </p>
                    <div className="mt-4">
                      {historicalSetupLocked ? (
                        <HistoricalSetupLockedNotice label="Charge amount history is locked" />
                      ) : (
                        <ChargeDefinitionVersionForm
                          chargeDefinitions={chargeDefinitionOptions}
                          financeStartDate={tenantStartDate}
                        />
                      )}
                    </div>
                  </DashboardSurfaceCard>

                  {chargeDefinitions.map((charge) => (
                    <DashboardSurfaceCard key={charge.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {charge.name}
                          </p>
                          <p className="mt-1 text-xs tracking-[0.18em] text-muted-foreground uppercase">
                            {charge.code} ·{" "}
                            {charge.chargeFrequency.replaceAll("_", " ")}
                          </p>
                        </div>
                        <TrendPill
                          tone={charge.isActive ? "positive" : "warning"}
                        >
                          {charge.isActive ? "Active" : "Inactive"}
                        </TrendPill>
                      </div>

                      <DashboardDataTable className="mt-4">
                        <DashboardTable>
                          <DashboardTableHead>
                            <DashboardTableHeaderCell>
                              Effective date
                            </DashboardTableHeaderCell>
                            <DashboardTableHeaderCell align="right">
                              Amount
                            </DashboardTableHeaderCell>
                            <DashboardTableHeaderCell>
                              Value type
                            </DashboardTableHeaderCell>
                            <DashboardTableHeaderCell>
                              Notes
                            </DashboardTableHeaderCell>
                            <DashboardTableHeaderCell align="right">
                              Status
                            </DashboardTableHeaderCell>
                          </DashboardTableHead>
                          <DashboardTableBody>
                            {charge.versions.map((version) => (
                              <DashboardTableRow key={version.id}>
                                <DashboardTableCell>
                                  {historicalSetupLocked ? (
                                    version.effectiveFrom
                                  ) : (
                                    <details className="group">
                                      <summary className="cursor-pointer list-none text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                        {version.effectiveFrom}
                                      </summary>
                                      <form
                                        action={
                                          updateChargeDefinitionVersionAction
                                        }
                                        className="mt-3 grid min-w-[280px] gap-2 rounded-lg border border-border/70 bg-background p-3"
                                      >
                                        <input
                                          name="chargeDefinitionVersionId"
                                          type="hidden"
                                          value={version.id}
                                        />
                                        <input
                                          name="chargeValueType"
                                          type="hidden"
                                          value={version.chargeValueType}
                                        />
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Effective date
                                          <DatePickerInput
                                            defaultValue={version.effectiveFrom}
                                            min={tenantStartDate ?? undefined}
                                            name="effectiveFrom"
                                            placeholder="Select effective date"
                                            required
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Amount
                                          <CurrencyPrefixInput
                                            defaultValue={version.amount}
                                            min="0"
                                            name="amount"
                                            required
                                            step="0.01"
                                            type="number"
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Notes
                                          <input
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                            defaultValue={version.notes ?? ""}
                                            name="notes"
                                            placeholder="Reason or board reference"
                                            type="text"
                                          />
                                        </label>
                                        <Button
                                          size="sm"
                                          type="submit"
                                          variant="outline"
                                        >
                                          Update row
                                        </Button>
                                      </form>
                                    </details>
                                  )}
                                </DashboardTableCell>
                                <DashboardTableCell
                                  align="right"
                                  className="font-medium"
                                >
                                  {version.chargeValueType === "percentage"
                                    ? `${version.amount}%`
                                    : formatCurrency(version.amount)}
                                </DashboardTableCell>
                                <DashboardTableCell>
                                  {version.chargeValueType === "percentage"
                                    ? "Percentage"
                                    : "Fixed amount"}
                                </DashboardTableCell>
                                <DashboardTableCell>
                                  {version.notes ?? "No note"}
                                </DashboardTableCell>
                                <DashboardTableCell align="right">
                                  <TrendPill
                                    tone={
                                      version.status === "current"
                                        ? "positive"
                                        : version.status === "scheduled"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    {version.status === "current"
                                      ? "Current"
                                      : version.status === "scheduled"
                                        ? "Scheduled"
                                        : "Historical"}
                                  </TrendPill>
                                </DashboardTableCell>
                              </DashboardTableRow>
                            ))}
                            {historicalSetupLocked ? (
                              <DashboardTableRow>
                                <td
                                  className="px-4 py-4 text-sm text-muted-foreground"
                                  colSpan={5}
                                >
                                  Empty update row locked.{" "}
                                  {historicalSetupLockReason}
                                </td>
                              </DashboardTableRow>
                            ) : (
                              <DashboardTableRow>
                                <td
                                  className="px-4 py-4 text-sm text-foreground"
                                  colSpan={5}
                                >
                                  <form
                                    action={createChargeDefinitionVersionAction}
                                    className="grid gap-2 md:grid-cols-[minmax(140px,0.8fr)_minmax(120px,0.7fr)_minmax(160px,1fr)_auto]"
                                  >
                                    <input
                                      name="chargeDefinitionId"
                                      type="hidden"
                                      value={charge.id}
                                    />
                                    <input
                                      name="kind"
                                      type="hidden"
                                      value={charge.kind}
                                    />
                                    <input
                                      name="chargeValueType"
                                      type="hidden"
                                      value={charge.chargeValueType}
                                    />
                                    <DatePickerInput
                                      aria-label={`${charge.name} effective date`}
                                      className="min-w-36"
                                      min={tenantStartDate ?? undefined}
                                      name="effectiveFrom"
                                      placeholder="Effective date"
                                      required
                                    />
                                    <CurrencyPrefixInput
                                      aria-label={`${charge.name} amount`}
                                      min="0"
                                      name="amount"
                                      placeholder="0.00"
                                      required
                                      step="0.01"
                                      type="number"
                                    />
                                    <input
                                      aria-label={`${charge.name} notes`}
                                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                      name="notes"
                                      placeholder="Reason or board reference"
                                      type="text"
                                    />
                                    <Button
                                      size="sm"
                                      type="submit"
                                      variant="outline"
                                    >
                                      Save row
                                    </Button>
                                  </form>
                                </td>
                              </DashboardTableRow>
                            )}
                          </DashboardTableBody>
                        </DashboardTable>
                      </DashboardDataTable>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <TrendPill tone="neutral">
                          {charge.versions.length} versions
                        </TrendPill>
                        <TrendPill
                          tone={historicalSetupLocked ? "warning" : "neutral"}
                        >
                          {historicalSetupLocked
                            ? "Update row locked"
                            : "Empty row ready"}
                        </TrendPill>
                      </div>
                    </DashboardSurfaceCard>
                  ))}
                </div>
              </DashboardSectionCard>
            </section>
          ) : null}

          {showBusiness ? (
            <section className="scroll-mt-24" id="share-business">
              <DashboardSectionCard>
                <DashboardSectionHeader
                  eyebrow="Share business"
                  title="Historical business registry"
                  description="Register every past business period with capital, profit, and dates so future dividend generation can remain accurate."
                  actions={
                    <TrendPill
                      tone={
                        historicalSetupLocked &&
                        !businessProfitReviewedWithoutPools
                          ? "warning"
                          : "positive"
                      }
                    >
                      {businessProfitReviewedWithoutPools
                        ? "Reviewed as none"
                        : historicalSetupLocked
                          ? "Dividend inputs locked"
                          : "Dividend foundation"}
                    </TrendPill>
                  }
                />
                <section className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <DashboardSurfaceCard>
                    {businessProfitReviewedWithoutPools ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        <p className="font-medium">
                          Historical business profit reviewed
                        </p>
                        <p className="mt-1">
                          This cooperative has been reviewed as having no
                          historical business profit pools to migrate.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground">
                          Record business and profit period
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This registry becomes the canonical input for future
                          profit allocation and dividend pre-generation.
                        </p>
                        <div className="mt-4">
                          {historicalSetupLocked ? (
                            <HistoricalSetupLockedNotice label="Business registry is locked" />
                          ) : (
                            <ShareBusinessForm
                              dividendPeriods={dividendPeriodOptions}
                              financeStartDate={tenantStartDate}
                            />
                          )}
                        </div>
                      </>
                    )}
                  </DashboardSurfaceCard>
                  {!businessProfitPoolsReviewed &&
                  shareBusinesses.length === 0 &&
                  !historicalSetupLocked ? (
                    <DashboardSurfaceCard className="border-amber-200 bg-amber-50 text-amber-950 xl:col-span-2">
                      <form
                        action={markBusinessProfitPoolsReviewedAction}
                        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            No historical business profit pools?
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-900">
                            Record an auditable review before member ledger
                            backfill when this cooperative has no past business
                            profit or dividend pools to migrate.
                          </p>
                        </div>
                        <label className="space-y-1 text-xs font-medium text-amber-900">
                          Type NO BUSINESS PROFITS
                          <input
                            className="h-9 w-full rounded-md border border-amber-200 bg-background px-3 text-sm text-foreground"
                            name="confirmation"
                            placeholder="NO BUSINESS PROFITS"
                            required
                            type="text"
                          />
                        </label>
                        <div className="flex items-end justify-end">
                          <Button size="sm" type="submit" variant="outline">
                            Mark reviewed
                          </Button>
                        </div>
                        <label className="space-y-1 text-xs font-medium text-amber-900 md:col-span-3">
                          Notes
                          <input
                            className="h-9 w-full rounded-md border border-amber-200 bg-background px-3 text-sm text-foreground"
                            name="notes"
                            placeholder="Board minute, review note, or approver"
                            type="text"
                          />
                        </label>
                      </form>
                    </DashboardSurfaceCard>
                  ) : null}
                  <DashboardSurfaceCard
                    as="section"
                    className="scroll-mt-24"
                    id="profit-entries"
                  >
                    <p className="text-sm font-medium text-foreground">
                      Backfill business profit
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add dated profit entries, then generate member allocations
                      from share percentages on that profit date.
                    </p>
                    <div className="mt-4">
                      {businessProfitReviewedWithoutPools ? (
                        <HistoricalSetupLockedNotice label="No historical profit entries are required" />
                      ) : historicalSetupLocked ? (
                        <HistoricalSetupLockedNotice label="Business profit entries are locked" />
                      ) : (
                        <ShareBusinessProfitEntryForm
                          businesses={shareBusinessOptions}
                          dividendPeriods={dividendPeriodOptions}
                          financeStartDate={tenantStartDate}
                        />
                      )}
                    </div>
                  </DashboardSurfaceCard>

                  <div className="grid gap-4">
                    <section className="grid gap-4 md:grid-cols-2">
                      <DashboardStatCard
                        label="Business capital tracked"
                        value={formatCurrency(totalBusinessCapital)}
                        detail="Total registered capital across all historical businesses."
                      />
                      <DashboardStatCard
                        label="Dated profit recorded"
                        value={formatCurrency(
                          totalRecordedProfitEntries || totalBusinessProfit
                        )}
                        detail="Profit entries are allocated using member share percentage at the profit date."
                      />
                    </section>

                    <DashboardDataTable>
                      <DashboardTable>
                        <DashboardTableHead>
                          <DashboardTableHeaderCell>
                            Business
                          </DashboardTableHeaderCell>
                          <DashboardTableHeaderCell>
                            Period
                          </DashboardTableHeaderCell>
                          <DashboardTableHeaderCell>
                            Capital
                          </DashboardTableHeaderCell>
                          <DashboardTableHeaderCell>
                            Allocatable profit
                          </DashboardTableHeaderCell>
                          <DashboardTableHeaderCell>
                            Dividend link
                          </DashboardTableHeaderCell>
                          <DashboardTableHeaderCell>
                            Latest profit entry
                          </DashboardTableHeaderCell>
                          <DashboardTableHeaderCell align="right">
                            Status
                          </DashboardTableHeaderCell>
                        </DashboardTableHead>
                        <DashboardTableBody>
                          {shareBusinesses.map((business) => {
                            const latestProfitEntry = business.profitEntries[0]

                            return (
                              <DashboardTableRow key={business.id}>
                                <DashboardTableCell>
                                  <p className="font-medium text-foreground">
                                    {business.name}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {business.notes ?? "No note"}
                                  </p>
                                  {!historicalSetupLocked ? (
                                    <details className="mt-2">
                                      <summary className="cursor-pointer list-none text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                        Edit business
                                      </summary>
                                      <form
                                        action={updateShareBusinessAction}
                                        className="mt-3 grid min-w-[320px] gap-2 rounded-lg border border-border/70 bg-background p-3 md:grid-cols-2"
                                      >
                                        <input
                                          name="shareBusinessId"
                                          type="hidden"
                                          value={business.id}
                                        />
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground md:col-span-2">
                                          Business name
                                          <input
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                            defaultValue={business.name}
                                            name="name"
                                            required
                                            type="text"
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Capital
                                          <CurrencyPrefixInput
                                            defaultValue={
                                              business.capitalAmount
                                            }
                                            min="0"
                                            name="capitalAmount"
                                            required
                                            step="0.01"
                                            type="number"
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Recorded profit
                                          <CurrencyPrefixInput
                                            defaultValue={business.profitAmount}
                                            min="0"
                                            name="profitAmount"
                                            required
                                            step="0.01"
                                            type="number"
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Start date
                                          <DatePickerInput
                                            defaultValue={business.startDate}
                                            min={tenantStartDate ?? undefined}
                                            name="startDate"
                                            placeholder="Select start date"
                                            required
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          End date
                                          <DatePickerInput
                                            defaultValue={
                                              business.endDate ?? ""
                                            }
                                            min={
                                              business.startDate ||
                                              tenantStartDate ||
                                              undefined
                                            }
                                            name="endDate"
                                            placeholder="Select end date"
                                          />
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Dividend period
                                          <select
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                            defaultValue={
                                              business.linkedDividendPeriod
                                                ?.id ?? ""
                                            }
                                            name="linkedDividendPeriodId"
                                          >
                                            <option value="">Not linked</option>
                                            {dividendPeriodOptions.map(
                                              (period) => (
                                                <option
                                                  key={period.id}
                                                  value={period.id}
                                                >
                                                  {period.label}
                                                </option>
                                              )
                                            )}
                                          </select>
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                          Status
                                          <select
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                            defaultValue={business.status}
                                            name="status"
                                          >
                                            <option value="planned">
                                              Planned
                                            </option>
                                            <option value="active">
                                              Active
                                            </option>
                                            <option value="completed">
                                              Completed
                                            </option>
                                            <option value="archived">
                                              Archived
                                            </option>
                                          </select>
                                        </label>
                                        <label className="space-y-1 text-xs font-medium text-muted-foreground md:col-span-2">
                                          Notes
                                          <input
                                            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                            defaultValue={business.notes ?? ""}
                                            name="notes"
                                            placeholder="Board note or source file"
                                            type="text"
                                          />
                                        </label>
                                        <div className="flex justify-end md:col-span-2">
                                          <Button
                                            size="sm"
                                            type="submit"
                                            variant="outline"
                                          >
                                            Update business
                                          </Button>
                                        </div>
                                      </form>
                                    </details>
                                  ) : null}
                                </DashboardTableCell>
                                <DashboardTableCell>
                                  {business.startDate}
                                  {business.endDate
                                    ? ` → ${business.endDate}`
                                    : " → Ongoing"}
                                </DashboardTableCell>
                                <DashboardTableCell>
                                  {formatCurrency(business.capitalAmount)}
                                </DashboardTableCell>
                                <DashboardTableCell className="font-medium">
                                  {formatCurrency(
                                    business.profitEntries.reduce(
                                      (sum, entry) =>
                                        sum + entry.allocatableProfitAmount,
                                      0
                                    ) || business.profitAmount
                                  )}
                                </DashboardTableCell>
                                <DashboardTableCell>
                                  {business.linkedDividendPeriod ? (
                                    <span>
                                      {business.linkedDividendPeriod.name}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Not linked yet
                                    </span>
                                  )}
                                </DashboardTableCell>
                                <DashboardTableCell>
                                  {latestProfitEntry ? (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-foreground">
                                        {formatCurrency(
                                          latestProfitEntry.allocatableProfitAmount
                                        )}{" "}
                                        · {latestProfitEntry.profitDate}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Gross{" "}
                                        {formatCurrency(
                                          latestProfitEntry.profitAmount
                                        )}{" "}
                                        · expenses{" "}
                                        {formatCurrency(
                                          latestProfitEntry.expenseAmount
                                        )}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {latestProfitEntry.reason ??
                                          "No reason recorded"}{" "}
                                        · {latestProfitEntry.status}
                                      </p>
                                      {!historicalSetupLocked &&
                                      !latestProfitEntry.hasPublishedAllocations ? (
                                        <details className="w-full">
                                          <summary className="cursor-pointer list-none text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                            Edit profit entry
                                          </summary>
                                          <form
                                            action={
                                              updateShareBusinessProfitEntryAction
                                            }
                                            className="mt-3 grid gap-2 rounded-lg border border-border/70 bg-background p-3 text-left md:grid-cols-2"
                                          >
                                            <input
                                              name="profitEntryId"
                                              type="hidden"
                                              value={latestProfitEntry.id}
                                            />
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Profit date
                                              <DatePickerInput
                                                defaultValue={
                                                  latestProfitEntry.profitDate
                                                }
                                                min={
                                                  tenantStartDate ?? undefined
                                                }
                                                name="profitDate"
                                                placeholder="Select profit date"
                                                required
                                              />
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Gross profit
                                              <CurrencyPrefixInput
                                                defaultValue={
                                                  latestProfitEntry.profitAmount
                                                }
                                                min="0"
                                                name="profitAmount"
                                                required
                                                step="0.01"
                                                type="number"
                                              />
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Expense / charges
                                              <CurrencyPrefixInput
                                                defaultValue={
                                                  latestProfitEntry.expenseAmount
                                                }
                                                min="0"
                                                name="expenseAmount"
                                                step="0.01"
                                                type="number"
                                              />
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Allocatable profit
                                              <CurrencyPrefixInput
                                                defaultValue={
                                                  latestProfitEntry.allocatableProfitAmount
                                                }
                                                min="0"
                                                name="allocatableProfitAmount"
                                                required
                                                step="0.01"
                                                type="number"
                                              />
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Dividend period
                                              <select
                                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                                defaultValue={
                                                  latestProfitEntry
                                                    .linkedDividendPeriod?.id ??
                                                  ""
                                                }
                                                name="linkedDividendPeriodId"
                                              >
                                                <option value="">
                                                  Not linked
                                                </option>
                                                {dividendPeriodOptions.map(
                                                  (period) => (
                                                    <option
                                                      key={period.id}
                                                      value={period.id}
                                                    >
                                                      {period.label}
                                                    </option>
                                                  )
                                                )}
                                              </select>
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Status
                                              <select
                                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                                defaultValue={
                                                  latestProfitEntry.status
                                                }
                                                name="status"
                                              >
                                                <option value="draft">
                                                  Draft
                                                </option>
                                                <option value="reviewed">
                                                  Reviewed
                                                </option>
                                                <option value="approved">
                                                  Approved
                                                </option>
                                                <option value="archived">
                                                  Archived
                                                </option>
                                              </select>
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Source
                                              <select
                                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                                defaultValue={
                                                  latestProfitEntry.sourceType
                                                }
                                                name="sourceType"
                                              >
                                                <option value="manual">
                                                  Manual
                                                </option>
                                                <option value="backfill">
                                                  Backfill
                                                </option>
                                                <option value="import">
                                                  Import
                                                </option>
                                              </select>
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground">
                                              Reason
                                              <input
                                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                                defaultValue={
                                                  latestProfitEntry.reason ?? ""
                                                }
                                                name="reason"
                                                placeholder="Board approval or source file"
                                                type="text"
                                              />
                                            </label>
                                            <label className="space-y-1 text-xs font-medium text-muted-foreground md:col-span-2">
                                              Notes
                                              <input
                                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                                defaultValue={
                                                  latestProfitEntry.notes ?? ""
                                                }
                                                name="notes"
                                                placeholder="Optional internal note"
                                                type="text"
                                              />
                                            </label>
                                            <div className="flex justify-end md:col-span-2">
                                              <Button
                                                size="sm"
                                                type="submit"
                                                variant="outline"
                                              >
                                                Update profit entry
                                              </Button>
                                            </div>
                                          </form>
                                        </details>
                                      ) : null}
                                      {latestProfitEntry.hasPublishedAllocations ? (
                                        <TrendPill tone="warning">
                                          Profit entry locked
                                        </TrendPill>
                                      ) : null}
                                      <p className="text-xs text-muted-foreground">
                                        {latestProfitEntry.allocationCount}{" "}
                                        allocations ·{" "}
                                        {formatCurrency(
                                          latestProfitEntry.allocatedProfitAmount
                                        )}
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {historicalSetupLocked ? (
                                          <TrendPill tone="warning">
                                            Allocation locked
                                          </TrendPill>
                                        ) : (
                                          <>
                                            <GenerateShareProfitAllocationsButton
                                              profitEntryId={
                                                latestProfitEntry.id
                                              }
                                            />
                                            <PublishShareProfitAllocationsButton
                                              disabled={
                                                latestProfitEntry.allocationCount ===
                                                  0 ||
                                                latestProfitEntry.hasPublishedAllocations
                                              }
                                              profitEntryId={
                                                latestProfitEntry.id
                                              }
                                            />
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      No profit entry
                                    </span>
                                  )}
                                </DashboardTableCell>
                                <DashboardTableCell align="right">
                                  <TrendPill
                                    tone={
                                      business.status === "completed"
                                        ? "positive"
                                        : business.status === "active"
                                          ? "warning"
                                          : "neutral"
                                    }
                                  >
                                    {business.status}
                                  </TrendPill>
                                </DashboardTableCell>
                              </DashboardTableRow>
                            )
                          })}
                          {shareBusinesses.length === 0 ? (
                            <DashboardTableRow>
                              <td
                                className="px-4 py-4 text-sm text-muted-foreground"
                                colSpan={7}
                              >
                                {businessProfitReviewedWithoutPools
                                  ? "No historical business profit pools were found during migration review."
                                  : "No historical business periods have been recorded yet."}
                              </td>
                            </DashboardTableRow>
                          ) : null}
                        </DashboardTableBody>
                      </DashboardTable>
                    </DashboardDataTable>
                  </div>
                </section>
              </DashboardSectionCard>
            </section>
          ) : null}
        </main>
      </div>
    </DashboardPageShell>
  )
}
