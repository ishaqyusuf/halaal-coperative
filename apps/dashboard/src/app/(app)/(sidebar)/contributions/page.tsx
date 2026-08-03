import { getContributionFilterMetadata } from "@halaalvest/db"
import { resolveDateFilter } from "@halaalvest/utils"
import {
  ContributionsPageView,
  ContributionsUnavailableView,
} from "@/components/contributions-page-view"
import { loadContributionParams } from "@/hooks/use-contribution-params"
import { loadContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadContributionsPageData } from "@/lib/contributions"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"
import { getEnumValue } from "@/utils/enum"

type ContributionSortField =
  | "amount"
  | "committedAmount"
  | "extraSavingsAmount"
  | "memberName"
  | "postedAt"

function getSort(
  sort?: string[] | null
): [ContributionSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "amount",
    "committedAmount",
    "extraSavingsAmount",
    "memberName",
    "postedAt",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as ContributionSortField, direction]
}

export default async function ContributionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters = loadContributionsFilterParams(params)
  loadContributionParams(params)
  const { sort } = loadSortParams(params)
  const selectedBatchId =
    typeof params.batchId === "string" ? params.batchId : undefined
  const context = await getDashboardServerContext()
  const [data, filterList, contributionTableSettings, caller] =
    await Promise.all([
      loadContributionsPageData(filters, { selectedBatchId }),
      context.tenant
        ? getContributionFilterMetadata(context.tenant.id)
        : Promise.resolve([]),
      getInitialTableSettings("contributions"),
      getServerCaller(),
    ])

  if (data.state !== "ready") {
    return <ContributionsUnavailableView />
  }

  const dateRange = resolveDateFilter(filters.dateRange)
  const ledgerInput = {
    channel: getEnumValue(filters.channel, [
      "cash",
      "manual",
      "payroll",
      "transfer",
    ] as const),
    from: dateRange?.from,
    memberId: filters.memberId ?? undefined,
    q: filters.search ?? undefined,
    sort: getSort(sort),
    to: dateRange?.to,
  }
  const ledgerOptions = trpc.contributions.ledger.infiniteQueryOptions(
    ledgerInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const initialLedgerPage = await caller.contributions.ledger(ledgerInput)

  getQueryClient().setQueryData(ledgerOptions.queryKey, {
    pageParams: [ledgerOptions.initialPageParam],
    pages: [initialLedgerPage],
  })

  return (
    <HydrateClient>
      <ContributionsPageView
        {...data}
        contributionTableSettings={contributionTableSettings}
        filterList={filterList}
      />
    </HydrateClient>
  )
}
