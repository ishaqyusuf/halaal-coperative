"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useMobileAccessParams } from "@/hooks/use-mobile-access-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import {
  formatAccessAmount,
  formatAccessDay,
  formatBillingMonth,
  plural,
} from "./format"
import { invoiceStatusText } from "./mobile-invoice-list"

/** One bill (`?mobileInvoiceId=`), with Paystack payment when it is set up. */
export function MobileInvoiceSheet() {
  const { mobileInvoiceId, paystackReturn, setParams } = useMobileAccessParams()

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("mobileAccess", "invoice")}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open)
          void setParams({ mobileInvoiceId: null, paystackReturn: null })
      }}
      open={Boolean(mobileInvoiceId)}
    >
      {mobileInvoiceId ? (
        <MobileInvoiceContent
          invoiceId={mobileInvoiceId}
          returnedFromPaystack={paystackReturn === true}
        />
      ) : null}
    </WorkflowPresentation>
  )
}

function MobileInvoiceContent({
  invoiceId,
  returnedFromPaystack,
}: {
  invoiceId: string
  returnedFromPaystack: boolean
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

  if (detail.isPending) {
    return (
      <>
        <SheetHeader className="px-4 pt-4 sm:px-6">
          <SheetTitle className="font-heading text-2xl font-semibold">
            Bill
          </SheetTitle>
          <SheetDescription className="sr-only">Loading</SheetDescription>
        </SheetHeader>
        <div className="px-4 sm:px-6">
          <MobileAccessLoading label="Loading bill…" />
        </div>
      </>
    )
  }

  if (!invoice) {
    return (
      <>
        <SheetHeader className="px-4 pt-4 sm:px-6">
          <SheetTitle className="font-heading text-2xl font-semibold">
            Bill
          </SheetTitle>
          <SheetDescription className="sr-only">Not loaded</SheetDescription>
        </SheetHeader>
        <div className="px-4 sm:px-6">
          <MobileAccessLoadError
            message="This bill could not be loaded."
            retry={() => void detail.refetch()}
          />
        </div>
      </>
    )
  }

  const total = formatAccessAmount(invoice.totalAmount, invoice.currencyCode)
  const paymentNote =
    verify.data?.status === "failed"
      ? "Paystack says the payment failed. You can try again."
      : verify.data?.status === "unavailable"
        ? "No Paystack payment was found for this bill."
        : (returnedFromPaystack && !verify.data) ||
            verify.data?.status === "pending"
          ? "We are still waiting for Paystack to confirm your payment."
          : null

  return (
    <>
      <SheetHeader className="gap-1 px-4 pt-4 sm:px-6">
        <SheetTitle className="font-heading text-2xl font-semibold">
          {formatBillingMonth(invoice.period)} bill
        </SheetTitle>
        <SheetDescription className="text-base text-muted-foreground">
          {plural(invoice.itemCount, "member")} · {invoiceStatusText(invoice)}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6 sm:px-6">
        <p className="font-heading text-3xl font-semibold tabular-nums">
          {total}
        </p>

        {invoice.status === "issued" ? (
          <div className="space-y-3">
            {paymentNote ? (
              <p className="text-base" role="status">
                {paymentNote}
              </p>
            ) : null}
            {checkout.error || verify.error ? (
              <p className="text-base text-destructive" role="alert">
                {(checkout.error ?? verify.error)?.message}
              </p>
            ) : null}
            {invoice.paystackCheckoutEnabled ||
            invoice.paystackPaymentPending ? (
              <div className="flex flex-wrap gap-3">
                {invoice.paystackCheckoutEnabled ? (
                  <Button
                    className="h-11 px-5 text-base"
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
                        ? "Go back to Paystack"
                        : `Pay ${total}`}
                  </Button>
                ) : null}
                {invoice.paystackPaymentPending ? (
                  <Button
                    className="h-11 text-base"
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
              </div>
            ) : null}
          </div>
        ) : invoice.paymentReference ? (
          <p className="text-base text-muted-foreground">
            Payment reference{" "}
            <span className="break-all text-foreground">
              {invoice.paymentReference}
            </span>
          </p>
        ) : null}

        <section aria-labelledby="mobile-invoice-members" className="space-y-2">
          <h3 className="text-base font-semibold" id="mobile-invoice-members">
            Members on this bill
          </h3>
          <ul className="divide-y divide-border border-y border-border">
            {invoice.items.map((item) => (
              <li
                className="flex items-center justify-between gap-3 py-3"
                key={item.id}
              >
                <span className="grid min-w-0 gap-0.5">
                  <span className="text-base break-words">
                    {item.memberName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Their charge is due {formatAccessDay(item.chargeDueAt)}
                  </span>
                </span>
                <span className="shrink-0 text-base tabular-nums">
                  {formatAccessAmount(item.amount, invoice.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm text-muted-foreground">
          Bill number <span className="break-all">{invoice.id}</span>
        </p>
      </div>
    </>
  )
}
