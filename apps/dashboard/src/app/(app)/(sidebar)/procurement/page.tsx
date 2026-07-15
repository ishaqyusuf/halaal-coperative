import type { SearchParams } from "nuqs"
import { ProcurementPageView } from "@/components/procurement-page-view"
import { loadProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadProcurementPageData } from "@/lib/procurement/load-procurement-page"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type ProcurementSortField =
  | "approvedCost"
  | "estimatedMonthlyRepayment"
  | "itemName"
  | "memberName"
  | "outstandingAmount"
  | "requestedAt"
  | "requestedCost"
  | "status"
  | "vendorName"

type ProcurementStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "purchased"
  | "rejected"
  | "submitted"
  | "under_review"

function getProcurementSort(
  sort?: string[] | null
): [ProcurementSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, ProcurementSortField> = {
    approved: "approvedCost",
    approvedCost: "approvedCost",
    estimatedMonthlyRepayment: "estimatedMonthlyRepayment",
    itemName: "itemName",
    monthly: "estimatedMonthlyRepayment",
    outstandingAmount: "outstandingAmount",
    requested: "requestedCost",
    requestedAt: "requestedAt",
    requestedCost: "requestedCost",
    request: "itemName",
    schedule: "outstandingAmount",
    status: "status",
    vendor: "vendorName",
    vendorName: "vendorName",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getProcurementStatus(
  value: string | null
): ProcurementStatus | undefined {
  const validStatuses = new Set<ProcurementStatus>([
    "active",
    "approved",
    "cancelled",
    "completed",
    "purchased",
    "rejected",
    "submitted",
    "under_review",
  ])

  return validStatuses.has(value as ProcurementStatus)
    ? (value as ProcurementStatus)
    : undefined
}

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadProcurementFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings, caller] = await Promise.all([
    loadProcurementPageData(),
    getInitialTableSettings("procurement"),
    getServerCaller(),
  ])
  const queryInput = {
    q: filter.q || undefined,
    sort: getProcurementSort(sort),
    status: getProcurementStatus(filter.status),
  }
  const listOptions = trpc.procurement.list.infiniteQueryOptions(queryInput, {
    getNextPageParam: ({ meta }) => meta?.cursor,
  })

  if (data.state === "staff-ready" || data.state === "member-ready") {
    const initialPage = await caller.procurement.list(queryInput)

    getQueryClient().setQueryData(listOptions.queryKey, {
      pageParams: [listOptions.initialPageParam],
      pages: [initialPage],
    })
  }

  return (
    <HydrateClient>
      <ProcurementPageView
        data={data}
        procurementInitialSettings={initialSettings}
      />
    </HydrateClient>
  )
}
