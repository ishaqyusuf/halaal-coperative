"use client"

import { formatCurrency } from "@halaalvest/utils"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  RequestSummaryGrid,
  RequestSummaryWide,
} from "@/components/requests/request-summary"
import { SummaryCard } from "@/components/summary-card"
import { useBusinessPageParams } from "@/hooks/use-business-page-params"
import { useTRPC } from "@/trpc/client"

/** Money in businesses, profit waiting to be shared, and profit shared. */
export function BusinessSummaryCards() {
  const trpc = useTRPC()
  const { setParams } = useBusinessPageParams()
  const { data: summary } = useSuspenseQuery(
    trpc.business.summary.queryOptions()
  )

  return (
    <RequestSummaryGrid>
      <RequestSummaryWide>
        <SummaryCard
          detail={
            summary.runningCount === 1
              ? "In 1 running business"
              : `In ${summary.runningCount} running businesses`
          }
          label="Money in businesses"
          value={formatCurrency(summary.activeCapital)}
        />
      </RequestSummaryWide>
      <RequestSummaryWide>
        <SummaryCard
          detail="Profit not shared yet"
          label="Waiting to share"
          onClick={() => void setParams({ view: "seasons" })}
          tone={summary.waitingTotal > 0 ? "attention" : "default"}
          value={formatCurrency(summary.waitingTotal)}
        />
      </RequestSummaryWide>
      <RequestSummaryWide>
        <SummaryCard
          detail="Given to members so far"
          label="Shared with members"
          tone={summary.sharedTotal > 0 ? "good" : "default"}
          value={formatCurrency(summary.sharedTotal)}
        />
      </RequestSummaryWide>
    </RequestSummaryGrid>
  )
}
