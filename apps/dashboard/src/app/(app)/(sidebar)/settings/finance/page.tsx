import { createDbRuntime, getTenantFinanceSetup } from "@halaalvest/db"
import { TenantFinancePageView } from "@/components/tenant-finance-page-view"
import { getDashboardServerContext } from "@/lib/server-context"

const demoShareVersions = [
  {
    id: "share-1",
    effectiveFrom: "2024-01-01",
    amount: 10000,
    notes: "Initial cooperative default share",
  },
  {
    id: "share-2",
    effectiveFrom: "2025-01-01",
    amount: 15000,
    notes: "Raised after annual review",
  },
]

const demoChargeDefinitions = [
  {
    id: "charge-1",
    code: "ADM",
    name: "Administrative fee",
    kind: "fixed",
    isActive: true,
    versions: [
      {
        id: "charge-1-v1",
        effectiveFrom: "2024-01-01",
        amount: 1500,
        notes: "Initial amount",
        status: "historical" as const,
      },
      {
        id: "charge-1-v2",
        effectiveFrom: "2025-02-01",
        amount: 2000,
        notes: "Updated amount",
        status: "current" as const,
      },
    ],
  },
  {
    id: "charge-2",
    code: "LEVY",
    name: "Monthly levy",
    kind: "fixed",
    isActive: true,
    versions: [
      {
        id: "charge-2-v1",
        effectiveFrom: "2024-01-01",
        amount: 1000,
        notes: "Default levy",
        status: "current" as const,
      },
    ],
  },
]

const demoShareBusinesses = [
  {
    id: "business-1",
    capitalAmount: 500000,
    endDate: "2024-04-30",
    linkedDividendPeriod: {
      id: "period-1",
      name: "Q1 2024 distribution",
      status: "published",
    },
    name: "Ramadan retail pool",
    notes: "Seasonal trading business used for first dividend distribution.",
    profitEntries: [
      {
        id: "profit-1",
        allocatedProfitAmount: 0,
        allocationCount: 0,
        hasPublishedAllocations: false,
        linkedDividendPeriod: {
          id: "period-1",
          name: "Q1 2024 distribution",
          status: "published",
        },
        notes: "Historical profit backfill",
        profitAmount: 85000,
        profitDate: "2024-04-30",
        sourceType: "backfill",
      },
    ],
    profitAmount: 85000,
    startDate: "2024-01-15",
    status: "completed",
  },
]

const demoDividendPeriods = [
  {
    id: "period-1",
    name: "Q1 2024 distribution",
    periodStart: "2024-01-01",
    periodEnd: "2024-03-31",
    status: "published",
    totalProfitAmount: 85000,
  },
]

export default async function FinanceSetupPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const today = new Date()

  if (context.tenant && runtime.status === "database-configured") {
    const data = await getTenantFinanceSetup(context.tenant.id)

    return (
      <TenantFinancePageView
        chargeDefinitions={data.chargeDefinitions.map((charge: any) => {
          const currentVersion =
            [...charge.versions]
              .reverse()
              .find((version: any) => new Date(version.effectiveFrom).getTime() <= today.getTime()) ??
            null

          return {
            id: charge.id,
            code: charge.code,
            name: charge.name,
            kind: charge.kind,
            isActive: charge.isActive,
            versions: charge.versions.map((version: any) => ({
              id: version.id,
              effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
              amount: Number(version.amount),
              notes: version.notes,
              status:
                currentVersion?.id === version.id
                  ? "current"
                  : new Date(version.effectiveFrom).getTime() > today.getTime()
                    ? "scheduled"
                    : "historical",
            })),
          }
        })}
        shareStructureVersions={data.shareStructureVersions.map((version: any) => ({
          id: version.id,
          effectiveFrom: version.effectiveFrom.toISOString().slice(0, 10),
          amount: Number(version.amount),
          notes: version.notes,
        }))}
        shareBusinesses={data.shareBusinesses.map((business: any) => ({
          id: business.id,
          capitalAmount: Number(business.capitalAmount),
          endDate: business.endDate ? business.endDate.toISOString().slice(0, 10) : null,
          linkedDividendPeriod: business.linkedDividendPeriod
            ? {
                id: business.linkedDividendPeriod.id,
                name: business.linkedDividendPeriod.name,
                status: business.linkedDividendPeriod.status,
              }
            : null,
          name: business.name,
          notes: business.notes,
          profitEntries: (business.profitEntries ?? []).map((entry: any) => ({
            id: entry.id,
            allocatedProfitAmount: (entry.allocations ?? []).reduce(
              (sum: number, allocation: any) => sum + Number(allocation.allocatedProfitAmount),
              0,
            ),
            allocationCount: entry.allocations?.length ?? 0,
            hasPublishedAllocations: (entry.allocations ?? []).some(
              (allocation: any) => allocation.status === "published",
            ),
            linkedDividendPeriod: entry.linkedDividendPeriod
              ? {
                  id: entry.linkedDividendPeriod.id,
                  name: entry.linkedDividendPeriod.name,
                  status: entry.linkedDividendPeriod.status,
                }
              : null,
            notes: entry.notes,
            profitAmount: Number(entry.profitAmount),
            profitDate: entry.profitDate.toISOString().slice(0, 10),
            sourceType: entry.sourceType,
          })),
          profitAmount: Number(business.profitAmount),
          startDate: business.startDate.toISOString().slice(0, 10),
          status: business.status,
        }))}
        dividendPeriods={data.dividendPeriods.map((period: any) => ({
          id: period.id,
          name: period.name,
          periodStart: period.periodStart.toISOString().slice(0, 10),
          periodEnd: period.periodEnd.toISOString().slice(0, 10),
          status: period.status,
          totalProfitAmount: Number(period.totalProfitAmount),
        }))}
        tenantName={data.tenant?.name ?? context.tenant.name}
        tenantStartDate={data.tenant?.startDate?.toISOString().slice(0, 10) ?? null}
      />
    )
  }

  return (
    <TenantFinancePageView
      chargeDefinitions={demoChargeDefinitions}
      dividendPeriods={demoDividendPeriods}
      shareBusinesses={demoShareBusinesses}
      shareStructureVersions={demoShareVersions}
      tenantName={context.tenant?.name ?? "Demo cooperative"}
      tenantStartDate={context.tenant?.startDate ?? "2024-01-01"}
    />
  )
}
