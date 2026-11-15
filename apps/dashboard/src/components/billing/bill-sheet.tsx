"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Label } from "@halaalvest/ui/components/label"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import {
  MobileAccessLoadError,
  MobileAccessLoading,
} from "@/components/mobile-access/access-page-state"
import {
  formatAccessAmount,
  plural,
} from "@/components/mobile-access/format"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useBillingParams } from "@/hooks/use-billing-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { billStatusText, fundingSourceText } from "./bill-list"

/** One Halaalvest bill (`?billId=`): lines, where the money comes from, Pay. */
export function BillSheet() {
  const { billId, paystackReturn, setParams } = useBillingParams()

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("billing", "bill")}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) void setParams({ billId: null, paystackReturn: null })
      }}
      open={Boolean(billId)}
    >
      {billId ? (
        <BillContent
          billId={billId}
          returnedFromPaystack={paystackReturn === true}
        />
      ) : null}
    </WorkflowPresentation>
  )
}

function BillHeader({ title, description }: { title: string; description: string }) {
  return (
    <SheetHeader className="gap-1 px-4 pt-4 sm:px-6">
      <SheetTitle className="font-heading text-2xl font-semibold">{title}</SheetTitle>
      <SheetDescription className="text-base text-muted-foreground">
        {description}
      </SheetDescription>
    </SheetHeader>
  )
}

function BillContent({
  billId,
  returnedFromPaystack,
}: {
  billId: string
  returnedFromPaystack: boolean
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const detail = useQuery(trpc.platformBilling.billDetail.queryOptions({ billId }))
  const bill = detail.data

  async function refreshBills() {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.platformBilling.billDetail.queryFilter({ billId })
      ),
      queryClient.invalidateQueries(trpc.platformBilling.listBills.queryFilter()),
      queryClient.invalidateQueries(
        trpc.platformBilling.fundingSources.queryFilter()
      ),
    ])
  }
  const checkout = useMutation(
    trpc.platformBilling.startPaystackCheckout.mutationOptions({
      onSuccess: (result) => {
        if (result.status === "checkout") window.location.assign(result.url)
        else return refreshBills()
      },
    })
  )
  const verify = useMutation(
    trpc.platformBilling.verifyPaystackCheckout.mutationOptions({
      onSuccess: ({ status }) => (status === "paid" ? refreshBills() : undefined),
    })
  )
  const openingCheckout = checkout.isPending || checkout.data?.status === "checkout"
  const busy = openingCheckout || verify.isPending

  if (detail.isPending) {
    return (
      <>
        <BillHeader description="Loading" title="Bill" />
        <div className="px-4 sm:px-6">
          <MobileAccessLoading label="Loading bill…" />
        </div>
      </>
    )
  }

  if (!bill) {
    return (
      <>
        <BillHeader description="Not loaded" title="Bill" />
        <div className="px-4 sm:px-6">
          <MobileAccessLoadError
            message="This bill could not be loaded."
            retry={() => void detail.refetch()}
          />
        </div>
      </>
    )
  }

  const money = (amount: number) => formatAccessAmount(amount, bill.currencyCode)
  const total = money(bill.totalAmount)
  const source = fundingSourceText(bill.fundingSource)
  const paymentNote =
    verify.data?.status === "failed"
      ? "Paystack says the payment failed. You can try again."
      : verify.data?.status === "unavailable"
        ? "No Paystack payment was found for this bill."
        : (returnedFromPaystack && !verify.data) || verify.data?.status === "pending"
          ? "We are still waiting for Paystack to confirm your payment."
          : null

  return (
    <>
      <BillHeader
        description={billStatusText(bill)}
        title={`${bill.periodLabel} bill`}
      />

      <div className="space-y-6 px-4 pb-6 sm:px-6">
        <p className="font-heading text-3xl font-semibold tabular-nums">{total}</p>

        <section aria-labelledby="bill-lines" className="space-y-2">
          <h3 className="text-base font-semibold" id="bill-lines">
            What this bill is for
          </h3>
          {bill.lines.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {bill.lines.map((line) => (
                <li
                  className="flex items-start justify-between gap-3 py-3"
                  key={line.kind}
                >
                  <span className="min-w-0 text-base break-words">
                    {line.description}
                  </span>
                  <span className="shrink-0 text-base tabular-nums">
                    {money(line.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">
              No seats, assistant use over the free allowance or mobile access
              this month.
            </p>
          )}
          {bill.seatFeePayer === "members" && bill.seatCount > 0 ? (
            <p className="text-sm text-muted-foreground">
              Members pay the seat fee: {bill.chargedSeats} of{" "}
              {plural(bill.seatCount, "member")} charged so far.
            </p>
          ) : null}
        </section>

        {bill.status === "issued" ? (
          <section aria-labelledby="bill-pay" className="space-y-4">
            <h3 className="text-base font-semibold" id="bill-pay">
              Pay this bill
            </h3>
            {bill.canChooseFunding ? (
              <FundingSourcePicker
                billId={bill.id}
                current={bill.fundingSource?.id ?? null}
                currentType={bill.fundingSource?.type ?? null}
                currencyCode={bill.currencyCode}
                onSaved={refreshBills}
                total={bill.totalAmount}
              />
            ) : source ? (
              <p className="text-base">{source}</p>
            ) : null}

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
            {bill.paystackCheckoutEnabled || bill.paystackPaymentPending ? (
              <div className="flex flex-wrap gap-3">
                {bill.paystackCheckoutEnabled ? (
                  <Button
                    className="h-11 px-5 text-base"
                    disabled={busy || !bill.fundingSource}
                    onClick={() => {
                      verify.reset()
                      checkout.mutate({ billId })
                    }}
                    type="button"
                  >
                    {openingCheckout
                      ? "Opening Paystack…"
                      : bill.paystackPaymentPending
                        ? "Go back to Paystack"
                        : `Pay ${total}`}
                  </Button>
                ) : null}
                {bill.paystackPaymentPending ? (
                  <Button
                    className="h-11 text-base"
                    disabled={busy}
                    onClick={() => {
                      checkout.reset()
                      verify.mutate({ billId })
                    }}
                    type="button"
                    variant="outline"
                  >
                    {verify.isPending ? "Checking…" : "Check payment"}
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-base text-muted-foreground">
                Online payment isn&apos;t available here yet. Pay Halaalvest by
                bank transfer; we mark the bill paid when the money arrives.
              </p>
            )}
            {bill.paystackCheckoutEnabled && !bill.fundingSource ? (
              <p className="text-sm text-muted-foreground">
                Choose where the money comes from first.
              </p>
            ) : null}
          </section>
        ) : bill.status === "paid" ? (
          <div className="space-y-1 text-base text-muted-foreground">
            {source ? <p className="text-foreground">{source}</p> : null}
            {bill.paymentReference ? (
              <p>
                Payment reference{" "}
                <span className="break-all text-foreground">
                  {bill.paymentReference}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {bill.mobileItems.length ? (
          <section aria-labelledby="bill-mobile" className="space-y-2">
            <h3 className="text-base font-semibold" id="bill-mobile">
              Members given the mobile app
            </h3>
            <ul className="divide-y divide-border border-y border-border">
              {bill.mobileItems.map((item) => (
                <li
                  className="flex items-center justify-between gap-3 py-3"
                  key={item.id}
                >
                  <span className="min-w-0 text-base break-words">
                    {item.memberName}
                  </span>
                  <span className="shrink-0 text-base tabular-nums">
                    {money(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Bill number <span className="break-all">{bill.id}</span>
        </p>
      </div>
    </>
  )
}

function FundingSourcePicker({
  billId,
  current,
  currentType,
  currencyCode,
  total,
  onSaved,
}: {
  billId: string
  current: string | null
  currentType: "charge" | "business" | null
  currencyCode: string
  total: number
  onSaved: () => Promise<void>
}) {
  const trpc = useTRPC()
  const sources = useQuery(trpc.platformBilling.fundingSources.queryOptions())
  const [selected, setSelected] = useState(
    current && currentType ? `${currentType}:${current}` : ""
  )
  const choose = useMutation(
    trpc.platformBilling.chooseFundingSource.mutationOptions({ onSuccess: onSaved })
  )
  const money = (amount: number) => formatAccessAmount(amount, currencyCode)

  if (sources.isPending) return <MobileAccessLoading label="Loading your funds…" />
  if (!sources.data)
    return (
      <MobileAccessLoadError
        message="Your charges and businesses could not be loaded."
        retry={() => void sources.refetch()}
      />
    )

  const charges = sources.data.filter((source) => source.type === "charge")
  const businesses = sources.data.filter((source) => source.type === "business")
  const chosen = sources.data.find(
    (source) => `${source.type}:${source.id}` === selected
  )
  const unchanged = selected === (current && currentType ? `${currentType}:${current}` : "")
  const label = (source: (typeof sources.data)[number]) =>
    `${source.name} (${money(source.available)} available)`

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!chosen || unchanged) return
        choose.mutate({ billId, sourceType: chosen.type, sourceId: chosen.id })
      }}
    >
      <DashboardStateQuickFill
        draft={selected}
        enabled={!choose.isPending}
        isDirty={!unchanged}
        onFill={() => {
          const first = [...sources.data]
            .sort((a, b) => b.available - a.available)
            .at(0)
          if (first) setSelected(`${first.type}:${first.id}`)
        }}
        restore={setSelected}
      />
      <div className="space-y-2">
        <Label className="text-base" htmlFor="bill-funding-source">
          Where does the money come from?
        </Label>
        <NativeSelect
          className="w-full"
          disabled={choose.isPending}
          id="bill-funding-source"
          onChange={(event) => setSelected(event.target.value)}
          value={selected}
        >
          <NativeSelectOption value="">Choose a charge or business</NativeSelectOption>
          {charges.length ? (
            <NativeSelectOptGroup label="Charges">
              {charges.map((source) => (
                <NativeSelectOption key={source.id} value={`charge:${source.id}`}>
                  {label(source)}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ) : null}
          {businesses.length ? (
            <NativeSelectOptGroup label="Businesses">
              {businesses.map((source) => (
                <NativeSelectOption key={source.id} value={`business:${source.id}`}>
                  {label(source)}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          ) : null}
        </NativeSelect>
        {chosen ? (
          <p className="text-sm text-muted-foreground">
            {chosen.type === "charge" ? "Collected" : "Profit recorded"}{" "}
            {money(chosen.received)}, already paid to Halaalvest{" "}
            {money(chosen.paidOut)}.
            {chosen.available < total
              ? ` That is less than this bill; the books will show ${chosen.name} paying more than it has.`
              : null}
          </p>
        ) : null}
      </div>
      {choose.error ? (
        <p className="text-base text-destructive" role="alert">
          {choose.error.message}
        </p>
      ) : null}
      {choose.isSuccess && unchanged ? (
        <p className="text-base" role="status">
          Saved.
        </p>
      ) : null}
      <Button
        className="h-11 text-base"
        disabled={!chosen || unchanged || choose.isPending}
        type="submit"
        variant={current ? "outline" : "default"}
      >
        {choose.isPending ? "Saving…" : current ? "Change source" : "Use this source"}
      </Button>
    </form>
  )
}
