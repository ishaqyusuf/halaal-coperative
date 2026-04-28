import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
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
}

type ChargeDefinitionRow = {
  id: string
  code: string
  name: string
  kind: string
  isActive: boolean
  versions: ChargeVersionRow[]
}

export function TenantFinancePageView({
  chargeDefinitions,
  shareStructureVersions,
  tenantName,
  tenantStartDate,
}: {
  chargeDefinitions: ChargeDefinitionRow[]
  shareStructureVersions: ShareVersionRow[]
  tenantName: string
  tenantStartDate: string | null
}) {
  const activeCharges = chargeDefinitions.filter((charge) => charge.isActive)
  const currentShareAmount =
    shareStructureVersions.length > 0 ? shareStructureVersions[shareStructureVersions.length - 1] : null

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
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Start date"
            title="Cooperative start date"
            description="Use the cooperative start date as the finance history anchor for share and backfill generation."
            actions={
              <Button variant="outline" className="rounded-full">
                Save date
              </Button>
            }
          />
          <div className="mt-5 space-y-4">
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Current value</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{tenantStartDate ?? "No date set yet"}</p>
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
            actions={
              <Button className="rounded-full">Add share update</Button>
            }
          />
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
          actions={<Button className="rounded-full">Add charge</Button>}
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
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
                {charge.versions.map((version, index) => {
                  const isCurrent = index === charge.versions.length - 1

                  return (
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
                          {isCurrent ? "Current version" : "Historical version"}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full">
                  Add charge update
                </Button>
                <Button variant="ghost" className="rounded-full">
                  Edit charge
                </Button>
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
