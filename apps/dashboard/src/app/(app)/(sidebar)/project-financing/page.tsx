import type { SearchParams } from "nuqs"
import { ProjectFinancingPageView } from "@/components/project-financing-page-view"
import { loadProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadProjectFinancingPageData } from "@/lib/project-financing/load-project-financing-page"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type ProjectFinancingSortField =
  | "approvedAmount"
  | "businessName"
  | "disbursedAt"
  | "estimatedMonthlyPayback"
  | "memberName"
  | "requestedAmount"
  | "requestedAt"
  | "status"

type ProjectFinancingStatus =
  | "active"
  | "approved"
  | "cancelled"
  | "completed"
  | "rejected"
  | "submitted"
  | "under_review"

function getProjectFinancingSort(
  sort?: string[] | null
): [ProjectFinancingSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, ProjectFinancingSortField> = {
    approved: "approvedAmount",
    approvedAmount: "approvedAmount",
    businessName: "businessName",
    disbursed: "disbursedAt",
    disbursedAt: "disbursedAt",
    estimatedMonthlyPayback: "estimatedMonthlyPayback",
    monthly: "estimatedMonthlyPayback",
    requested: "requestedAmount",
    requestedAmount: "requestedAmount",
    requestedAt: "requestedAt",
    request: "businessName",
    status: "status",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

function getProjectFinancingStatus(
  value: string | null
): ProjectFinancingStatus | undefined {
  const validStatuses = new Set<ProjectFinancingStatus>([
    "active",
    "approved",
    "cancelled",
    "completed",
    "rejected",
    "submitted",
    "under_review",
  ])

  return validStatuses.has(value as ProjectFinancingStatus)
    ? (value as ProjectFinancingStatus)
    : undefined
}

export default async function ProjectFinancingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadProjectFinancingFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings, caller] = await Promise.all([
    loadProjectFinancingPageData(),
    getInitialTableSettings("projectFinancing"),
    getServerCaller(),
  ])
  const queryInput = {
    q: filter.q || undefined,
    sort: getProjectFinancingSort(sort),
    status: getProjectFinancingStatus(filter.status),
  }
  const listOptions = trpc.projectFinancing.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  if (data.state === "staff-ready" || data.state === "member-ready") {
    const initialPage = await caller.projectFinancing.list(queryInput)

    getQueryClient().setQueryData(listOptions.queryKey, {
      pageParams: [listOptions.initialPageParam],
      pages: [initialPage],
    })
  }

  return (
    <HydrateClient>
      <ProjectFinancingPageView
        data={data}
        projectFinancingInitialSettings={initialSettings}
      />
    </HydrateClient>
  )
}
