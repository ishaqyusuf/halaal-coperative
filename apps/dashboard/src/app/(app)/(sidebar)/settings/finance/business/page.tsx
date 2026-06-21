import type { Metadata } from "next"
import type { SearchParams } from "nuqs"
import {
  createDbRuntime,
  getTenantFinanceSetup,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
} from "@halaalvest/db"
import { BusinessHeader } from "@/components/business-header"
import { ScrollableContent } from "@/components/dashboard"
import { SecondaryMenu } from "@/components/secondary-menu"
import { DataTable } from "@/components/tables/business/data-table"
import type {
  Business,
  DividendPeriodOption,
} from "@/components/tables/business/columns"
import { loadBusinessFilterParams } from "@/hooks/use-business-filter-params"
import { loadBusinessParams } from "@/hooks/use-business-params"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Business | Finance Settings",
}

const financeMenuItems = [
  { path: "/settings/finance", label: "Overview" },
  { path: "/settings/finance/shares", label: "Shares" },
  { path: "/settings/finance/charges", label: "Charges" },
  { path: "/settings/finance/business", label: "Business" },
  { path: "/settings/finance/loan", label: "Loan" },
  { path: "/settings/finance/migration", label: "Migration" },
]

const demoDividendPeriods = [
  {
    id: "period-1",
    label: "Q1 2024 distribution · published",
  },
]

const demoShareBusinesses: Business[] = [
  {
    capitalAmount: 500000,
    endDate: "2024-04-30",
    id: "business-1",
    linkedDividendPeriod: {
      id: "period-1",
      name: "Q1 2024 distribution",
      status: "published",
    },
    name: "Ramadan retail pool",
    notes: "Seasonal trading business used for first dividend distribution.",
    profitAmount: 85000,
    profitEntries: [
      {
        allocatedProfitAmount: 0,
        allocationCount: 0,
        allocatableProfitAmount: 80000,
        expenseAmount: 5000,
        hasPublishedAllocations: false,
        id: "profit-1",
        linkedDividendPeriod: {
          id: "period-1",
          name: "Q1 2024 distribution",
          status: "published",
        },
        notes: "Historical profit backfill",
        profitAmount: 85000,
        profitDate: "2024-04-30",
        reason: "Board-approved seasonal trading distribution",
        sourceType: "backfill",
        status: "reviewed",
      },
    ],
    startDate: "2024-01-15",
    status: "completed",
  },
]

type RawLinkedDividendPeriod = {
  id: string
  name: string
  status: string
}

type RawBusinessProfitAllocation = {
  allocatedProfitAmount: number | string
  status: string
}

type RawBusinessProfitEntry = {
  allocatableProfitAmount?: number | string | null
  allocations?: RawBusinessProfitAllocation[] | null
  expenseAmount?: number | string | null
  id: string
  linkedDividendPeriod?: RawLinkedDividendPeriod | null
  notes?: string | null
  profitAmount: number | string
  profitDate: Date
  reason?: string | null
  sourceType: string
  status?: string | null
}

type RawBusiness = {
  capitalAmount: number | string
  endDate?: Date | null
  id: string
  linkedDividendPeriod?: RawLinkedDividendPeriod | null
  name: string
  notes?: string | null
  profitAmount: number | string
  profitEntries?: RawBusinessProfitEntry[] | null
  startDate: Date
  status: string
}

type RawDividendPeriod = {
  id: string
  name: string
  status: string
}

function mapBusinessRows(rows: RawBusiness[]): Business[] {
  return rows.map((business) => ({
    capitalAmount: Number(business.capitalAmount),
    endDate: business.endDate
      ? business.endDate.toISOString().slice(0, 10)
      : null,
    id: business.id,
    linkedDividendPeriod: business.linkedDividendPeriod
      ? {
          id: business.linkedDividendPeriod.id,
          name: business.linkedDividendPeriod.name,
          status: business.linkedDividendPeriod.status,
        }
      : null,
    name: business.name,
    notes: business.notes,
    profitAmount: Number(business.profitAmount),
    profitEntries: (business.profitEntries ?? []).map((entry) => ({
      allocatedProfitAmount: (entry.allocations ?? []).reduce(
        (sum: number, allocation) =>
          sum + Number(allocation.allocatedProfitAmount),
        0
      ),
      allocationCount: entry.allocations?.length ?? 0,
      allocatableProfitAmount: Number(
        entry.allocatableProfitAmount ?? entry.profitAmount
      ),
      expenseAmount: Number(entry.expenseAmount ?? 0),
      hasPublishedAllocations: (entry.allocations ?? []).some(
        (allocation) => allocation.status === "published"
      ),
      id: entry.id,
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
      reason: entry.reason,
      sourceType: entry.sourceType,
      status: entry.status ?? "draft",
    })),
    startDate: business.startDate.toISOString().slice(0, 10),
    status: business.status,
  }))
}

export default function FinanceBusinessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  return <FinanceBusinessPageContent searchParams={searchParams} />
}

async function FinanceBusinessPageContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  loadBusinessFilterParams(resolvedSearchParams)
  loadBusinessParams(resolvedSearchParams)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  let canReviewNoProfit = false
  let isLocked = false
  let rows = demoShareBusinesses
  let tenantName = context.tenant?.name ?? "Demo cooperative"
  let dividendPeriods: DividendPeriodOption[] = demoDividendPeriods

  if (context.tenant && runtime.status === "database-configured") {
    const [data, migrationState, migrationMemberReview] = await Promise.all([
      getTenantFinanceSetup(context.tenant.id),
      getTenantInitialMigrationState(context.tenant.id),
      listInitialMigrationMemberReview(context.tenant.id),
    ])
    const hasAppliedMemberBackfill = migrationMemberReview.some(
      (member) =>
        member.status === "backfill_applied" ||
        member.appliedBackfillBatches > 0 ||
        member.appliedBackfillMonths > 0
    )
    const businessProfitPoolsReviewed =
      migrationState.snapshot.steps.find(
        (step) => step.key === "business_profit_pools"
      )?.complete ?? false

    isLocked =
      !migrationState.snapshot.canUseMigrationTools || hasAppliedMemberBackfill
    tenantName = data.tenant?.name ?? context.tenant.name
    rows = mapBusinessRows(data.shareBusinesses)
    canReviewNoProfit =
      !businessProfitPoolsReviewed && rows.length === 0 && !isLocked
    dividendPeriods = data.dividendPeriods.map((period: RawDividendPeriod) => ({
      id: period.id,
      label: `${period.name} · ${period.status}`,
    }))
  }

  return (
    <ScrollableContent>
      <div className="flex max-w-[980px] flex-col gap-6">
        <SecondaryMenu items={financeMenuItems} />

        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Finance settings
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Business
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Manage the historical business registry, profit entries, and
            dividend-ready allocatable profit for {tenantName} before member
            import.
          </p>
        </div>

        <BusinessHeader
          canReviewNoProfit={canReviewNoProfit}
          isLocked={isLocked}
        />
        <DataTable
          canReviewNoProfit={canReviewNoProfit}
          dividendPeriods={dividendPeriods}
          hasSourceRows={rows.length > 0}
          isLocked={isLocked}
          rows={rows}
        />
      </div>
    </ScrollableContent>
  )
}
