import type { SearchParams } from "nuqs"
import { MemberSharesPageView } from "@/components/member-shares-page-view"
import { loadShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadMemberSharesPageData } from "@/lib/shares/load-member-shares-page"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type ShareApplicationSortField =
  | "createdAt"
  | "memberName"
  | "requestedUnits"
  | "reviewedAt"
  | "shareValueSnapshot"
  | "status"

type ShareApplicationStatus =
  | "approved"
  | "cancelled"
  | "pending"
  | "rejected"

function getShareApplicationSort(
  sort?: string[] | null
): [ShareApplicationSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, ShareApplicationSortField> = {
    application: "memberName",
    createdAt: "createdAt",
    memberName: "memberName",
    requestedAt: "createdAt",
    requestedUnits: "requestedUnits",
    reviewedAt: "reviewedAt",
    shareValueSnapshot: "shareValueSnapshot",
    status: "status",
    units: "requestedUnits",
    value: "shareValueSnapshot",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getShareApplicationStatus(
  value: string | null
): ShareApplicationStatus | undefined {
  const validStatuses = new Set<ShareApplicationStatus>([
    "approved",
    "cancelled",
    "pending",
    "rejected",
  ])

  return validStatuses.has(value as ShareApplicationStatus)
    ? (value as ShareApplicationStatus)
    : undefined
}

export default async function MemberSharesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadShareApplicationFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, shareApplicationInitialSettings] = await Promise.all([
    loadMemberSharesPageData(),
    getInitialTableSettings("shareApplications"),
  ])

  const queryInput = {
    q: filter.shareApplicationQ ?? undefined,
    sort: getShareApplicationSort(sort),
    status: getShareApplicationStatus(filter.shareApplicationStatus),
  }
  const listOptions = trpc.shareApplications.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  if (data.state === "ready") {
    const caller = await getServerCaller()
    const initialPage = await caller.shareApplications.list(queryInput)

    getQueryClient().setQueryData(listOptions.queryKey, {
      pageParams: [listOptions.initialPageParam],
      pages: [initialPage],
    })
  }

  return (
    <HydrateClient>
      <MemberSharesPageView
        data={data}
        shareApplicationInitialSettings={shareApplicationInitialSettings}
      />
    </HydrateClient>
  )
}
