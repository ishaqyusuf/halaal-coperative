import type { Metadata } from "next"
import {
  LoansPageView,
  LoansUnavailableView,
} from "@/components/loans-page-view"
import { loadLoanFilterParams } from "@/hooks/use-loan-filter-params"
import { loadLoanParams } from "@/hooks/use-loan-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadLoansPageData } from "@/lib/loans"
import {
  getLoanPortfolioListInput,
  getLoanRequestListInput,
} from "@/lib/loans/loan-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export const metadata: Metadata = {
  description:
    "Request, review, approve, and service cooperative financing safely.",
  title: "Loans",
}

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  loadLoanParams(params)
  const filter = loadLoanFilterParams(params)
  const { sort } = loadSortParams(params)
  const [data, loanRequestTableSettings, loanPortfolioTableSettings] =
    await Promise.all([
      loadLoansPageData(),
      getInitialTableSettings("loanRequests"),
      getInitialTableSettings("loanPortfolio"),
    ])

  if (data.state !== "ready") {
    return <LoansUnavailableView />
  }

  const memberId = data.isMemberView ? data.members.items[0]?.id : undefined
  const activeView = filter.view ?? "requests"

  if (activeView === "portfolio") {
    const portfolioInput = getLoanPortfolioListInput(filter, sort, memberId)
    await batchPrefetch([
      trpc.loans.portfolio.infiniteQueryOptions(portfolioInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }),
    ])
  } else {
    const requestInput = getLoanRequestListInput(filter, sort, memberId)
    await batchPrefetch([
      trpc.loans.requests.infiniteQueryOptions(requestInput, {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }),
    ])
  }

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
