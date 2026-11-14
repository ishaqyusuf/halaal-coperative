"use client"

import { useQuery } from "@tanstack/react-query"
import { useMobileAccessParams } from "@/hooks/use-mobile-access-params"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import { formatAccessAmount, plural } from "./format"
import { MobileInvoiceList } from "./mobile-invoice-list"
import { RemittanceDialog } from "./remittance-dialog"

export function PlatformReceivablesView() {
  const trpc = useTRPC()
  const { remitInvoiceId, setParams } = useMobileAccessParams()
  const receivables = useQuery(
    trpc.cooperativeMobileBilling.listReceivables.queryOptions()
  )

  if (receivables.isPending) {
    return <MobileAccessLoading label="Loading bills…" />
  }

  if (!receivables.data) {
    return (
      <MobileAccessLoadError
        message="Bills could not be loaded."
        retry={() => void receivables.refetch()}
      />
    )
  }

  const unpaid = receivables.data.filter((bill) => bill.status === "issued")
  const owed = unpaid.reduce((sum, bill) => sum + bill.totalAmount, 0)
  const selected = receivables.data.find((bill) => bill.id === remitInvoiceId)

  return (
    <section className="space-y-3">
      <p className="text-base text-muted-foreground">
        {unpaid.length > 0
          ? `${plural(unpaid.length, "bill")} not paid · ${formatAccessAmount(owed, unpaid[0]?.currencyCode ?? "NGN")}`
          : receivables.data.length > 0
            ? "All bills are paid."
            : "No bills yet."}
      </p>
      {receivables.isError ? (
        <MobileAccessLoadError
          message="Bills could not be refreshed."
          retry={() => void receivables.refetch()}
        />
      ) : null}
      {receivables.data.length > 0 ? (
        <MobileInvoiceList
          action={{
            label: "Mark paid",
            run: (bill) => void setParams({ remitInvoiceId: bill.id }),
            when: (bill) => bill.status === "issued" && !receivables.isError,
          }}
          invoices={receivables.data}
        />
      ) : null}
      <RemittanceDialog
        invoice={selected?.status === "issued" ? selected : undefined}
        onClose={() => void setParams({ remitInvoiceId: null })}
      />
    </section>
  )
}
