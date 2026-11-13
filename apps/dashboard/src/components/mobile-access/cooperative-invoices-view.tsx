"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  returnedFromPaystack,
  onClose,
}: {
  invoiceId: string
  returnedFromPaystack: boolean
  onClose: () => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const detail = useQuery(
    trpc.cooperativeMobileBilling.invoiceDetail.queryOptions({ invoiceId })
  )
  const invoice = detail.data
  async function refreshInvoices() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.cooperativeMobileBilling.invoiceDetail.queryFilter({ invoiceId })
      ),
      queryClient.invalidateQueries(
        trpc.cooperativeMobileBilling.listInvoices.queryFilter()
      ),
    ])
  }
  const checkout = useMutation(
    trpc.cooperativeMobileBilling.startPaystackCheckout.mutationOptions({
      onSuccess: (result) => {
        if (result.status === "checkout") window.location.assign(result.url)
        else return refreshInvoices()
      },
    })
  )
  const verify = useMutation(
    trpc.cooperativeMobileBilling.verifyPaystackCheckout.mutationOptions({
      onSuccess: ({ status }) =>
        status === "paid" ? refreshInvoices() : undefined,
    })
  )
  const openingCheckout =
    checkout.isPending || checkout.data?.status === "checkout"
  const busy = openingCheckout || verify.isPending

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
            {invoice.status === "paid" ? (
              <p className="text-sm" role="status">
                Payment recorded.
              </p>
            ) : (
              <>
                {(returnedFromPaystack && !verify.data) ||
                verify.data?.status === "pending" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Payment confirmation is pending.
                  </p>
                ) : null}
                {verify.data?.status === "failed" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Paystack reported that the payment failed.
                  </p>
                ) : null}
                {verify.data?.status === "unavailable" ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    No Paystack checkout was found for this invoice.
                  </p>
                ) : null}
                {checkout.error || verify.error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {(checkout.error ?? verify.error)?.message}
                  </p>
                ) : null}
                {invoice.paystackPaymentPending ||
                invoice.paystackCheckoutEnabled ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    {invoice.paystackPaymentPending ? (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          checkout.reset()
                          verify.mutate({ invoiceId })
                        }}
                        type="button"
                        variant="outline"
                      >
                        {verify.isPending ? "Checking…" : "Check payment"}
                      </Button>
                    ) : null}
                    {invoice.paystackCheckoutEnabled ? (
                      <Button
                        disabled={busy}
                        onClick={() => {
                          verify.reset()
                          checkout.mutate({ invoiceId })
                        }}
                        type="button"
                      >
                        {openingCheckout
                          ? "Opening Paystack…"
                          : invoice.paystackPaymentPending
                            ? "Open Paystack"
                            : "Pay with Paystack"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function CooperativeInvoicesView({
  returnedInvoiceId,
}: {
  returnedInvoiceId?: string
}) {
  const trpc = useTRPC()
  const invoices = useQuery(
    trpc.cooperativeMobileBilling.listInvoices.queryOptions()
  )
  const [invoiceId, setInvoiceId] = useState(returnedInvoiceId)

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
          returnedFromPaystack={invoiceId === returnedInvoiceId}
          onClose={() => setInvoiceId(undefined)}
        />
      ) : null}
    </section>
  )
}
