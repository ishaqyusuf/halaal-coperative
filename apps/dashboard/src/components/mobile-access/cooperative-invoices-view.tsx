"use client"

import { useQuery } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useMobileAccessParams } from "@/hooks/use-mobile-access-params"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import { formatAccessAmount } from "./format"
import { MobileInvoiceList } from "./mobile-invoice-list"

const MobileInvoiceSheet = dynamic(() =>
  import("./mobile-invoice-sheet").then((module) => module.MobileInvoiceSheet)
)

/** Halaalvest's monthly bills to the cooperative for mobile access. */
export function CooperativeInvoicesView() {
  const trpc = useTRPC()
  const { mobileInvoiceId, setParams } = useMobileAccessParams()
  const invoices = useQuery(
    trpc.cooperativeMobileBilling.listInvoices.queryOptions()
  )
  const unpaid = invoices.data?.filter((invoice) => invoice.status === "issued")
  const owed = unpaid?.reduce((sum, invoice) => sum + invoice.totalAmount, 0)
  const currency = invoices.data?.[0]?.currencyCode ?? "NGN"

  return (
    <section aria-labelledby="mobile-access-bills" className="space-y-3">
      <div className="space-y-1">
        <h2
          className="font-heading text-xl font-semibold"
          id="mobile-access-bills"
        >
          Bills
        </h2>
        {invoices.data ? (
          <p className="text-base text-muted-foreground">
            {owed
              ? `You owe ${formatAccessAmount(owed, currency)}.`
              : invoices.data.length > 0
                ? "All bills are paid."
                : "A bill comes at the end of each month you give members the app."}
          </p>
        ) : null}
      </div>
      {invoices.isPending ? (
        <MobileAccessLoading label="Loading bills…" />
      ) : null}
      {invoices.isError ? (
        <MobileAccessLoadError
          message="Bills could not be loaded."
          retry={() => void invoices.refetch()}
        />
      ) : null}
      {invoices.data && invoices.data.length > 0 ? (
        <MobileInvoiceList
          invoices={invoices.data}
          onOpen={(invoice) =>
            void setParams({
              mobileInvoiceId: invoice.id,
              paystackReturn: null,
            })
          }
        />
      ) : null}
      {mobileInvoiceId ? <MobileInvoiceSheet /> : null}
    </section>
  )
}
