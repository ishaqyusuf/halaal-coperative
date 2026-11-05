import {
  createDbRuntime,
  getMonthlyRecordsPageData,
  pageMonthlyRecordRows,
} from "@halaalvest/db"
import type { Metadata } from "next"
import {
  MonthlyRecordsAccessUnavailableView,
  MonthlyRecordsPageView,
  MonthlyRecordsRuntimeUnavailableView,
} from "@/components/monthly-records-page-view"
import { getMonthlyRecordRowsInput } from "@/components/tables/monthly-records/rows-input"
import { loadMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { loadMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = { title: "Monthly records | Halaalvest" }

export default async function MonthlyRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  loadMonthlyRecordParams(params)
  const filter = loadMonthlyRecordFilterParams(params)
  const { sort } = loadSortParams(params)
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const selectedRecordId =
    typeof params.recordId === "string" ? params.recordId : undefined
  const requestedYear =
    typeof params.year === "string" ? Number(params.year) : undefined

  if (!context.tenant || runtime.status !== "database-configured") {
    return <MonthlyRecordsRuntimeUnavailableView />
  }

  const canManageRecords = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles,
  )

  if (!context.auth.user || !canManageRecords) {
    return <MonthlyRecordsAccessUnavailableView />
  }

  // Read-only: the GET never creates a month or seeds rows.
  const [data, monthlyRecordTableSettings] = await Promise.all([
    getMonthlyRecordsPageData({
      selectedRecordId,
      tenantId: context.tenant.id,
    }),
    getInitialTableSettings("monthlyRecords"),
  ])

  const selectedYear =
    requestedYear && Number.isInteger(requestedYear)
      ? requestedYear
      : data.selectedRecord?.periodYear ?? new Date().getUTCFullYear()

  // The detail above already holds every row, so the table's first page is
  // hydrated from it rather than prefetched through a second detail load.
  const monthlyRecordRowsInput = getMonthlyRecordRowsInput({
    monthlyRecordId: data.selectedRecord?.id,
    q: filter.q,
    sort,
    status: filter.status,
  })
  const monthlyRecordRowsOptions =
    trpc.monthlyRecords.rows.infiniteQueryOptions(monthlyRecordRowsInput, {
      getNextPageParam: ({ meta }) => meta?.cursor,
    })

  getQueryClient().setQueryData(monthlyRecordRowsOptions.queryKey, {
    pageParams: [monthlyRecordRowsOptions.initialPageParam],
    pages: [
      pageMonthlyRecordRows(
        data.selectedRecord?.rows ?? [],
        monthlyRecordRowsInput,
      ),
    ],
  })

  return (
    <HydrateClient>
      <MonthlyRecordsPageView
        {...data}
        monthlyRecordTableSettings={monthlyRecordTableSettings}
        selectedYear={selectedYear}
      />
    </HydrateClient>
  )
}
