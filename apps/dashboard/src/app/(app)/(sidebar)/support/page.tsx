import type { SearchParams } from "nuqs"
import { SupportPageView } from "@/components/support-page-view"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadSupportFilterParams } from "@/hooks/use-support-filter-params"
import { loadSupportPageData } from "@/lib/support/load-support-page"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type SupportSortField =
  | "assignedToUser"
  | "category"
  | "createdAt"
  | "latestReply"
  | "linkedRecord"
  | "priority"
  | "status"
  | "subject"
  | "updatedAt"

type SupportStatus =
  | "closed"
  | "in_progress"
  | "open"
  | "resolved"
  | "waiting_on_member"

type SupportPriority = "high" | "low" | "normal" | "urgent"

function getSupportSort(
  sort?: string[] | null
): [SupportSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, SupportSortField> = {
    assignedToUser: "assignedToUser",
    assignee: "assignedToUser",
    case: "subject",
    category: "category",
    createdAt: "createdAt",
    latestReply: "latestReply",
    linkedRecord: "linkedRecord",
    priority: "priority",
    status: "status",
    subject: "subject",
    updatedAt: "updatedAt",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getSupportStatus(value: string | null): SupportStatus | undefined {
  const validStatuses = new Set<SupportStatus>([
    "closed",
    "in_progress",
    "open",
    "resolved",
    "waiting_on_member",
  ])

  return validStatuses.has(value as SupportStatus)
    ? (value as SupportStatus)
    : undefined
}

function getSupportPriority(value: string | null): SupportPriority | undefined {
  const validPriorities = new Set<SupportPriority>([
    "high",
    "low",
    "normal",
    "urgent",
  ])

  return validPriorities.has(value as SupportPriority)
    ? (value as SupportPriority)
    : undefined
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const filter = loadSupportFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings, caller] = await Promise.all([
    loadSupportPageData(resolvedSearchParams),
    getInitialTableSettings("support"),
    getServerCaller(),
  ])
  const queryInput = {
    priority: getSupportPriority(filter.priority),
    q: filter.q || undefined,
    sort: getSupportSort(sort),
    status: getSupportStatus(filter.status),
  }
  const listOptions = trpc.support.list.infiniteQueryOptions(queryInput, {
    getNextPageParam: ({ meta }) => meta?.cursor,
  })

  if (data.state === "staff-ready" || data.state === "member-ready") {
    const initialPage = await caller.support.list(queryInput)

    getQueryClient().setQueryData(listOptions.queryKey, {
      pageParams: [listOptions.initialPageParam],
      pages: [initialPage],
    })
  }

  return (
    <HydrateClient>
      <SupportPageView data={data} supportInitialSettings={initialSettings} />
    </HydrateClient>
  )
}
