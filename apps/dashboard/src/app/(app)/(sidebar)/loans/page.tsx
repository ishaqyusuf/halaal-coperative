import { LoansPageView, LoansUnavailableView } from "@/components/loans-page-view"
import { loadLoanParams } from "@/hooks/use-loan-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadLoansPageData } from "@/lib/loans"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type LoanRequestSortField =
  | "memberName"
  | "requestedAt"
  | "reviewStatus"
  | "status"

type LoanPortfolioSortField =
  | "estimatedMonthlyServicing"
  | "loanProductName"
  | "memberName"
  | "status"

function getLoanRequestSort(
  sort?: string[] | null
): [LoanRequestSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "memberName",
    "requestedAt",
    "reviewStatus",
    "status",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as LoanRequestSortField, direction]
}

function getLoanPortfolioSort(
  sort?: string[] | null
): [LoanPortfolioSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "estimatedMonthlyServicing",
    "loanProductName",
    "memberName",
    "status",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as LoanPortfolioSortField, direction]
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  loadLoanParams(params)
  const { sort } = loadSortParams(params)
  const [data, loanRequestTableSettings, loanPortfolioTableSettings, caller] =
    await Promise.all([
      loadLoansPageData(),
      getInitialTableSettings("loanRequests"),
      getInitialTableSettings("loanPortfolio"),
      getServerCaller(),
    ])

  if (data.state !== "ready") {
    return <LoansUnavailableView />
  }
  const memberId = data.isMemberView ? data.members.items[0]?.id : undefined
  const requestInput = {
    memberId,
    sort: getLoanRequestSort(sort),
  }
  const portfolioInput = {
    memberId,
    sort: getLoanPortfolioSort(sort),
  }
  const requestOptions = trpc.loans.requests.infiniteQueryOptions(
    requestInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const portfolioOptions = trpc.loans.portfolio.infiniteQueryOptions(
    portfolioInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )
  const [initialRequestsPage, initialPortfolioPage] = await Promise.all([
    caller.loans.requests(requestInput),
    caller.loans.portfolio(portfolioInput),
  ])

  getQueryClient().setQueryData(requestOptions.queryKey, {
    pageParams: [requestOptions.initialPageParam],
    pages: [initialRequestsPage],
  })
  getQueryClient().setQueryData(portfolioOptions.queryKey, {
    pageParams: [portfolioOptions.initialPageParam],
    pages: [initialPortfolioPage],
  })

  return (
    <HydrateClient>
      <LoansPageView
        {...data}
        loanPortfolioTableSettings={loanPortfolioTableSettings}
        loanRequestTableSettings={loanRequestTableSettings}
      />
    </HydrateClient>
  )
}
