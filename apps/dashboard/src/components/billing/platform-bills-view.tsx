"use client"

import { useQuery } from "@tanstack/react-query"
import {
  MobileAccessLoadError,
  MobileAccessLoading,
} from "@/components/mobile-access/access-page-state"
import { formatAccessAmount, plural } from "@/components/mobile-access/format"
import { useBillingParams } from "@/hooks/use-billing-params"
import { useTRPC } from "@/trpc/client"
import { BillList } from "./bill-list"
import { RemittanceDialog } from "./remittance-dialog"

/** /platform/bills: every cooperative's Halaalvest bills, with Mark paid. */
export function PlatformBillsView() {
  const trpc = useTRPC()
  const { remitBillId, setParams } = useBillingParams()
  const receivables = useQuery(trpc.platformBilling.listReceivables.queryOptions())

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
  const selected = receivables.data.find((bill) => bill.id === remitBillId)

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
        <BillList
          action={{
            label: "Mark paid",
            run: (bill) => void setParams({ remitBillId: bill.id }),
            when: (bill) => bill.status === "issued" && !receivables.isError,
          }}
          bills={receivables.data}
        />
      ) : null}
      <RemittanceDialog
        invoice={selected?.status === "issued" ? selected : undefined}
        onClose={() => void setParams({ remitBillId: null })}
      />
    </section>
  )
}
