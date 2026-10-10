import type { SearchParams } from "nuqs"
import { PaymentReceiptsPageView } from "@/components/payment-receipts-page-view"
import { loadPaymentReceiptFilterParams } from "@/hooks/use-payment-receipt-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadPaymentReceiptsPageData } from "@/lib/payment-receipts/load-payment-receipts-page"
import { getPaymentReceiptListInput } from "@/lib/payment-receipts/payment-receipt-list-input"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

export default async function PaymentReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadPaymentReceiptFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings] = await Promise.all([
    loadPaymentReceiptsPageData(),
    getInitialTableSettings("paymentReceipts"),
  ])
  const queryInput = getPaymentReceiptListInput(filter, sort)
  const listOptions = trpc.paymentReceipts.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  if (data.state === "staff-ready" || data.state === "member-ready") {
    await batchPrefetch([listOptions])
  }

  return (
    <HydrateClient>
      <PaymentReceiptsPageView
        data={data}
        paymentReceiptsInitialSettings={initialSettings}
      />
    </HydrateClient>
  )
}
