import { createDbRuntime, getMonthlyRecordsPageData } from "@halaalvest/db"
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
import { getRequestTenantOperationProfile } from "@/lib/navigation/operation-profile"
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

  // Read-only: the GET never creates a month or seeds rows. The operation
  // profile is the request-cached copy the sidebar already loaded.
  const rowsQuery = getMonthlyRecordRowsInput({
    q: filter.q,
    sort,
    status: filter.status,
    workplaceId: filter.workplaceId,
  })
  const [{ firstPage, ...data }, monthlyRecordTableSettings, operationProfile] =
    await Promise.all([
      getMonthlyRecordsPageData({
        rowsQuery,
        selectedRecordId,
        tenantId: context.tenant.id,
      }),
      getInitialTableSettings("monthlyRecords"),
      getRequestTenantOperationProfile(context.tenant.id),
    ])

  const selectedYear =
    requestedYear && Number.isInteger(requestedYear)
      ? requestedYear
      : data.selectedRecord?.periodYear ?? new Date().getUTCFullYear()

  const monthlyRecordRowsInput = {
    ...rowsQuery,
    monthlyRecordId: data.selectedRecord?.id,
  }
  const monthlyRecordRowsOptions =
    trpc.monthlyRecords.rows.infiniteQueryOptions(monthlyRecordRowsInput, {
      getNextPageParam: ({ meta }) => meta?.cursor,
    })

  getQueryClient().setQueryData(monthlyRecordRowsOptions.queryKey, {
    pageParams: [monthlyRecordRowsOptions.initialPageParam],
    pages: [firstPage],
  })

  return (
    <HydrateClient>
      <MonthlyRecordsPageView
        {...data}
        canManageWorkplaces={
          operationProfile.services.collection_sources.canStaffCreate
        }
        monthlyRecordTableSettings={monthlyRecordTableSettings}
        selectedYear={selectedYear}
      />
    </HydrateClient>
  )
}
