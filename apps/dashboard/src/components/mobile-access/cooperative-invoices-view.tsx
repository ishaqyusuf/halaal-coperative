"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import {
  formatAccessAmount,
  formatAccessDate,
  formatBillingMonth,
} from "./format"
import { MobileInvoiceList } from "./mobile-invoice-list"

function InvoiceDetail({
  invoiceId,
  onClose,
}: {
  invoiceId: string
  onClose: () => void
}) {
  const trpc = useTRPC()
  const detail = useQuery(
    trpc.cooperativeMobileBilling.invoiceDetail.queryOptions({ invoiceId })
  )
  const invoice = detail.data

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {invoice
              ? `${formatBillingMonth(invoice.period)} invoice`
              : "Invoice details"}
          </DialogTitle>
          <DialogDescription>
            Member charges included in this cooperative invoice.
          </DialogDescription>
        </DialogHeader>
        {detail.isPending ? (
          <MobileAccessLoading label="Loading invoice…" />
        ) : null}
        {detail.isError ? (
          <MobileAccessLoadError
            message="This invoice could not be loaded."
            retry={() => void detail.refetch()}
          />
        ) : null}
        {invoice ? (
          <>
            <p className="text-xs break-all text-muted-foreground">
              Invoice reference {invoice.id}
            </p>
            <ul className="divide-y divide-border border-y border-border">
              {invoice.items.map((item) => (
                <li
                  className="flex items-center justify-between gap-3 py-3"
                  key={item.id}
                >
                  <div>
                    <p className="text-sm font-medium break-words">
                      {item.memberName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Charge due {formatAccessDate(item.chargeDueAt)}
                    </p>
                    {!item.chargeAssessed ? (
                      <p className="text-xs text-muted-foreground">
                        Member charge posting pending
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 tabular-nums">
                    {formatAccessAmount(item.amount, invoice.currencyCode)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-right text-sm font-semibold tabular-nums">
              Total{" "}
              {formatAccessAmount(invoice.totalAmount, invoice.currencyCode)}
            </p>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function CooperativeInvoicesView() {
  const trpc = useTRPC()
  const invoices = useQuery(
    trpc.cooperativeMobileBilling.listInvoices.queryOptions()
  )
  const [invoiceId, setInvoiceId] = useState<string>()

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold">Cooperative invoices</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Halaalvest invoices your cooperative for the member charges due each
          month.
        </p>
      </div>
      {invoices.isPending ? (
        <MobileAccessLoading label="Loading invoices…" />
      ) : null}
      {invoices.isError ? (
        <MobileAccessLoadError
          message="Cooperative invoices could not be loaded."
          retry={() => void invoices.refetch()}
        />
      ) : null}
      {invoices.data ? (
        <MobileInvoiceList
          action={{
            label: "View invoice",
            run: (invoice) => setInvoiceId(invoice.id),
          }}
          disabled={invoices.isError}
          invoices={invoices.data}
        />
      ) : null}
      {invoiceId ? (
        <InvoiceDetail
          invoiceId={invoiceId}
          onClose={() => setInvoiceId(undefined)}
        />
      ) : null}
    </section>
  )
}
