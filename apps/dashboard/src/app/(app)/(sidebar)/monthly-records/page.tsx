import {
  createDbRuntime,
  getOrCreateMonthlyRecordsPageData,
} from "@halaalvest/db"
import {
  MonthlyRecordsAccessUnavailableView,
  MonthlyRecordsPageView,
  MonthlyRecordsRuntimeUnavailableView,
} from "@/components/monthly-records-page-view"
import { loadMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { financeManagementRoles, hasAnyRole } from "@/lib/workspace-access"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type MonthlyRecordSortField =
  | "allChargesAmount"
  | "contributionAmount"
  | "currentBalance"
  | "finalIncomeAmount"
  | "loanRepaymentAmount"
  | "loanStatus"
  | "memberName"
  | "shareChargeAmount"
  | "status"
  | "totalPaidAmount"
  | "totalPayableAmount"

function getMonthlyRecordSort(
  sort?: string[] | null
): [MonthlyRecordSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "allChargesAmount",
    "contributionAmount",
    "currentBalance",
    "finalIncomeAmount",
    "loanRepaymentAmount",
    "loanStatus",
    "memberName",
    "shareChargeAmount",
    "status",
    "totalPaidAmount",
    "totalPayableAmount",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as MonthlyRecordSortField, direction]
}

export default async function MonthlyRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  loadMonthlyRecordParams(params)
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

  const [data, caller] = await Promise.all([
    getOrCreateMonthlyRecordsPageData({
      actorUserId: context.auth.user.id,
      selectedRecordId,
      tenantId: context.tenant.id,
    }),
    getServerCaller(),
  ])

  const selectedYear =
    requestedYear && Number.isInteger(requestedYear)
      ? requestedYear
      : data.selectedRecord?.periodYear ?? new Date().getUTCFullYear()

  const monthlyRecordTableSettings =
    await getInitialTableSettings("monthlyRecords")
  const monthlyRecordRowsInput = {
    monthlyRecordId: data.selectedRecord?.id,
    sort: getMonthlyRecordSort(sort),
  }
  const monthlyRecordRowsOptions =
    trpc.monthlyRecords.rows.infiniteQueryOptions(monthlyRecordRowsInput, {
      getNextPageParam: ({ meta }) => meta?.cursor,
    })
  const initialMonthlyRecordRowsPage =
    await caller.monthlyRecords.rows(monthlyRecordRowsInput)

  getQueryClient().setQueryData(monthlyRecordRowsOptions.queryKey, {
    pageParams: [monthlyRecordRowsOptions.initialPageParam],
    pages: [initialMonthlyRecordRowsPage],
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
