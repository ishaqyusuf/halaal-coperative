import { Button } from "@halaalvest/ui/components/button"
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
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  ChargeDefinitionForm,
  ChargeDefinitionVersionForm,
  FinanceStartDateForm,
  GenerateShareProfitAllocationsButton,
  PublishShareProfitAllocationsButton,
  ShareBusinessForm,
  ShareBusinessProfitEntryForm,
  ShareStructureVersionForm,
} from "@/components/forms/tenant-finance-forms"

type ShareVersionRow = {
  id: string
  effectiveFrom: string
  amount: number
  notes?: string | null
}

type ChargeVersionRow = {
  id: string
  effectiveFrom: string
  amount: number
  notes?: string | null
  status: "current" | "historical" | "scheduled"
}

type ChargeDefinitionRow = {
  id: string
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
    hasPublishedAllocations: boolean
    linkedDividendPeriod?: {
      id: string
      name: string
      status: string
    } | null
    notes?: string | null
    profitAmount: number
    profitDate: string
    sourceType: string
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

export function TenantFinancePageView({
  chargeDefinitions,
  dividendPeriods,
  shareBusinesses,
  shareStructureVersions,
  tenantName,
  tenantStartDate,
}: {
  chargeDefinitions: ChargeDefinitionRow[]
  dividendPeriods: DividendPeriodRow[]
  shareBusinesses: ShareBusinessRow[]
  shareStructureVersions: ShareVersionRow[]
  tenantName: string
  tenantStartDate: string | null
}) {
  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)
  const currentShareAmount =
    shareStructureVersions.length > 0 ? shareStructureVersions[shareStructureVersions.length - 1] : null
  const totalBusinessProfit = shareBusinesses.reduce((sum, business) => sum + business.profitAmount, 0)
  const totalRecordedProfitEntries = shareBusinesses.reduce(
    (sum, business) =>
      sum + business.profitEntries.reduce((entrySum, entry) => entrySum + entry.profitAmount, 0),
    0,
  )
  const totalBusinessCapital = shareBusinesses.reduce((sum, business) => sum + business.capitalAmount, 0)
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

  return (
    <WorkspacePageShell
      eyebrow="Settings"
      title="Finance setup"
      description={`Configure ${tenantName}'s cooperative start date, dated share defaults, and charge history before posting member backfill.`}
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          label="Cooperative start"
          value={tenantStartDate ?? "Not set"}
          detail="The earliest date used when generating finance backfill."
        />
        <DashboardStatCard
          label="Share versions"
          value={shareStructureVersions.length.toString()}
          detail="Dated default monthly share amounts for the cooperative."
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
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Start date"
            title="Cooperative start date"
            description="Use the cooperative start date as the finance history anchor for share and backfill generation."
            actions={<TrendPill tone="neutral">Finance anchor</TrendPill>}
          />
          <div className="mt-5 space-y-4">
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Current value</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{tenantStartDate ?? "No date set yet"}</p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <FinanceStartDateForm defaultStartDate={tenantStartDate} />
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Finance rule</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Share defaults, charge versions, and member backfill generation should not begin before the cooperative start date unless a migration override is introduced later.
              </p>
            </DashboardSurfaceCard>
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Shares"
            title="Default share structure history"
            description="Track every cooperative-wide monthly share amount change with an effective date."
            actions={<TrendPill tone="positive">History enabled</TrendPill>}
          />
          <DashboardSurfaceCard className="mb-5">
            <ShareStructureVersionForm />
          </DashboardSurfaceCard>
          <div className="mt-5">
            <DashboardDataTable>
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableHeaderCell>Effective date</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Amount</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Notes</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell align="right">Status</DashboardTableHeaderCell>
                </DashboardTableHead>
                <DashboardTableBody>
                  {shareStructureVersions.map((version, index) => {
                    const isCurrent = index === shareStructureVersions.length - 1

                    return (
                      <DashboardTableRow key={version.id}>
                        <DashboardTableCell>{version.effectiveFrom}</DashboardTableCell>
                        <DashboardTableCell className="font-medium">
                          {formatCurrency(version.amount)}
                        </DashboardTableCell>
                        <DashboardTableCell>{version.notes ?? "No note"}</DashboardTableCell>
                        <DashboardTableCell align="right">
                          <TrendPill tone={isCurrent ? "positive" : "neutral"}>
                            {isCurrent ? "Current" : "Historical"}
                          </TrendPill>
                        </DashboardTableCell>
                      </DashboardTableRow>
                    )
                  })}
                </DashboardTableBody>
              </DashboardTable>
            </DashboardDataTable>
          </div>
          {currentShareAmount ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Current default monthly share: <span className="font-medium text-foreground">{formatCurrency(currentShareAmount.amount)}</span>
            </p>
          ) : null}
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Charges"
          title="Charge structure history"
          description="Each charge definition keeps its identity, while dated versions hold the amount history used for backfill generation."
          actions={<TrendPill tone="positive">Monthly resolution ready</TrendPill>}
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <DashboardSurfaceCard>
            <p className="text-sm font-medium text-foreground">Create charge definition</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this for new recurring or one-off charges that the backfill system must resolve by month.
            </p>
            <div className="mt-4">
              <ChargeDefinitionForm />
            </div>
          </DashboardSurfaceCard>

          <DashboardSurfaceCard>
            <p className="text-sm font-medium text-foreground">Add charge amount update</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every update history is part of the month-by-month charge resolution used during backfill.
            </p>
            <div className="mt-4">
              <ChargeDefinitionVersionForm chargeDefinitions={chargeDefinitionOptions} />
            </div>
          </DashboardSurfaceCard>

          {chargeDefinitions.map((charge) => (
            <DashboardSurfaceCard key={charge.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{charge.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {charge.code} · {charge.kind}
                  </p>
                </div>
                <TrendPill tone={charge.isActive ? "positive" : "warning"}>
                  {charge.isActive ? "Active" : "Inactive"}
                </TrendPill>
              </div>

              <div className="mt-4 space-y-3">
                {charge.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{version.effectiveFrom}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{version.notes ?? "No note"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(version.amount)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {version.status === "current"
                          ? "Current version"
                          : version.status === "scheduled"
                            ? "Scheduled version"
                            : "Historical version"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <TrendPill tone="neutral">{charge.versions.length} versions</TrendPill>
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Share business"
          title="Historical business registry"
          description="Register every past business period with capital, profit, and dates so future dividend generation can remain accurate."
          actions={<TrendPill tone="positive">Dividend foundation</TrendPill>}
        />
        <section className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardSurfaceCard>
            <p className="text-sm font-medium text-foreground">Record business and profit period</p>
            <p className="mt-1 text-sm text-muted-foreground">
              This registry becomes the canonical input for future profit allocation and dividend pre-generation.
            </p>
            <div className="mt-4">
              <ShareBusinessForm dividendPeriods={dividendPeriodOptions} />
            </div>
          </DashboardSurfaceCard>
          <DashboardSurfaceCard>
            <p className="text-sm font-medium text-foreground">Backfill business profit</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add dated profit entries, then generate member allocations from share percentages on that profit date.
            </p>
            <div className="mt-4">
              <ShareBusinessProfitEntryForm
                businesses={shareBusinessOptions}
                dividendPeriods={dividendPeriodOptions}
              />
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
                value={formatCurrency(totalRecordedProfitEntries || totalBusinessProfit)}
                detail="Profit entries are allocated using member share percentage at the profit date."
              />
            </section>

            <DashboardDataTable>
              <DashboardTable>
                <DashboardTableHead>
                  <DashboardTableHeaderCell>Business</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Period</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Capital</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Profit</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Dividend link</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell>Latest profit entry</DashboardTableHeaderCell>
                  <DashboardTableHeaderCell align="right">Status</DashboardTableHeaderCell>
                </DashboardTableHead>
                <DashboardTableBody>
                  {shareBusinesses.map((business) => {
                    const latestProfitEntry = business.profitEntries[0]

                    return (
                      <DashboardTableRow key={business.id}>
                        <DashboardTableCell>
                          <p className="font-medium text-foreground">{business.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{business.notes ?? "No note"}</p>
                        </DashboardTableCell>
                        <DashboardTableCell>
                          {business.startDate}
                          {business.endDate ? ` → ${business.endDate}` : " → Ongoing"}
                        </DashboardTableCell>
                        <DashboardTableCell>{formatCurrency(business.capitalAmount)}</DashboardTableCell>
                        <DashboardTableCell className="font-medium">
                          {formatCurrency(
                            business.profitEntries.reduce((sum, entry) => sum + entry.profitAmount, 0)
                              || business.profitAmount,
                          )}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          {business.linkedDividendPeriod ? (
                            <span>{business.linkedDividendPeriod.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Not linked yet</span>
                          )}
                        </DashboardTableCell>
                        <DashboardTableCell>
                          {latestProfitEntry ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-foreground">
                                {formatCurrency(latestProfitEntry.profitAmount)} · {latestProfitEntry.profitDate}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {latestProfitEntry.allocationCount} allocations · {formatCurrency(latestProfitEntry.allocatedProfitAmount)}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <GenerateShareProfitAllocationsButton profitEntryId={latestProfitEntry.id} />
                                <PublishShareProfitAllocationsButton
                                  disabled={latestProfitEntry.allocationCount === 0 || latestProfitEntry.hasPublishedAllocations}
                                  profitEntryId={latestProfitEntry.id}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No profit entry</span>
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
                </DashboardTableBody>
              </DashboardTable>
            </DashboardDataTable>
          </div>
        </section>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
