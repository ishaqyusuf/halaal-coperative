import type { SearchParams } from "nuqs"
import { PaymentReceiptsPageView } from "@/components/payment-receipts-page-view"
import { loadPaymentReceiptFilterParams } from "@/hooks/use-payment-receipt-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { loadPaymentReceiptsPageData } from "@/lib/payment-receipts/load-payment-receipts-page"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"

type PaymentReceiptSortField =
  | "memberName"
  | "paidAt"
  | "paymentReference"
  | "status"
  | "submittedAt"
  | "totalAmount"

function getPaymentReceiptSort(
  sort?: string[] | null
): [PaymentReceiptSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const fieldMap: Record<string, PaymentReceiptSortField> = {
    amount: "totalAmount",
    paidAt: "paidAt",
    receipt: "memberName",
    reference: "paymentReference",
    status: "status",
    submittedAt: "submittedAt",
    totalAmount: "totalAmount",
  }
  const sortField = fieldMap[field]

  if (!sortField) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [sortField, direction]
}

export default async function PaymentReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const filter = loadPaymentReceiptFilterParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const [data, initialSettings, caller] = await Promise.all([
    loadPaymentReceiptsPageData(),
    getInitialTableSettings("paymentReceipts"),
    getServerCaller(),
  ])
  const queryInput = {
    q: filter.q || undefined,
    sort: getPaymentReceiptSort(sort),
    status:
      filter.status === "approved" ||
      filter.status === "correction_requested" ||
      filter.status === "rejected" ||
      filter.status === "submitted" ||
      filter.status === "under_review"
        ? filter.status
        : undefined,
  }
  const listOptions = trpc.paymentReceipts.list.infiniteQueryOptions(
    queryInput,
    {
      getNextPageParam: ({ meta }) => meta?.cursor,
    }
  )

  if (data.state === "staff-ready" || data.state === "member-ready") {
    const initialPage = await caller.paymentReceipts.list(queryInput)

    getQueryClient().setQueryData(listOptions.queryKey, {
      pageParams: [listOptions.initialPageParam],
      pages: [initialPage],
    })
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
