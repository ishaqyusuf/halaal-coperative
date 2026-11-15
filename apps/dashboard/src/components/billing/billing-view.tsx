"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { Label } from "@halaalvest/ui/components/label"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Switch } from "@halaalvest/ui/components/switch"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import dynamic from "next/dynamic"
import { useState } from "react"
import {
  AccessConfirmDialog,
  type AccessConfirmation,
} from "@/components/mobile-access/access-confirm-dialog"
import {
  MobileAccessLoadError,
  MobileAccessLoading,
} from "@/components/mobile-access/access-page-state"
import { formatAccessAmount, plural } from "@/components/mobile-access/format"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { useQaQuickFill } from "@/components/qa-quick-fill-provider"
import { useBillingParams } from "@/hooks/use-billing-params"
import { useTRPC } from "@/trpc/client"
import { BillList } from "./bill-list"

const BillSheet = dynamic(() =>
  import("./bill-sheet").then((module) => module.BillSheet)
)

/** /billing: this month so far, the settings, and Halaalvest's bills. */
export function BillingView({ canManageSettings }: { canManageSettings: boolean }) {
  const trpc = useTRPC()
  const { billId, setParams } = useBillingParams()
  const overview = useQuery(trpc.platformBilling.overview.queryOptions())
  const bills = useQuery(trpc.platformBilling.listBills.queryOptions())
  const unpaid = bills.data?.filter((bill) => bill.status === "issued") ?? []
  const owed = unpaid.reduce((sum, bill) => sum + bill.totalAmount, 0)

  return (
    <div className="space-y-10">
      {overview.isPending ? <MobileAccessLoading label="Loading billing…" /> : null}
      {overview.isError ? (
        <MobileAccessLoadError
          message="Billing could not be loaded."
          retry={() => void overview.refetch()}
        />
      ) : null}
      {overview.data ? (
        <>
          <ThisMonth overview={overview.data} />
          <BillingSettings
            canManage={canManageSettings}
            overview={overview.data}
          />
        </>
      ) : null}

      <section aria-labelledby="billing-bills" className="space-y-3">
        <div className="space-y-1">
          <h2 className="font-heading text-xl font-semibold" id="billing-bills">
            Bills
          </h2>
          {bills.data ? (
            <p className="text-base text-muted-foreground">
              {owed
                ? `You owe ${formatAccessAmount(owed, unpaid[0]?.currencyCode ?? "NGN")}.`
                : bills.data.length > 0
                  ? "All bills are paid."
                  : "Your first bill comes on the 1st of next month."}
            </p>
          ) : null}
        </div>
        {bills.isPending ? <MobileAccessLoading label="Loading bills…" /> : null}
        {bills.isError ? (
          <MobileAccessLoadError
            message="Bills could not be loaded."
            retry={() => void bills.refetch()}
          />
        ) : null}
        {bills.data && bills.data.length > 0 ? (
          <BillList
            bills={bills.data}
            onOpen={(bill) => void setParams({ billId: bill.id, paystackReturn: null })}
          />
        ) : null}
        {overview.data && canManageSettings && !overview.data.currentBillId ? (
          <QaIssueBill />
        ) : null}
      </section>
      {billId ? <BillSheet /> : null}
    </div>
  )
}

type Overview = RouterOutputs["platformBilling"]["overview"]

function ThisMonth({ overview }: { overview: Overview }) {
  const money = (amount: number) =>
    formatAccessAmount(amount, overview.prices.currencyCode)
  const { assistant } = overview
  const remaining = Math.max(0, assistant.limit - assistant.messages)

  return (
    <section aria-labelledby="billing-this-month" className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold" id="billing-this-month">
          {overview.periodLabel} so far
        </h2>
        <p className="text-base text-muted-foreground">
          The bill for this month comes on the 1st of next month.
        </p>
      </div>
      <p className="font-heading text-3xl font-semibold tabular-nums">
        {money(overview.estimate.total)}
      </p>
      <dl className="divide-y divide-border border-y border-border">
        <div className="flex items-start justify-between gap-3 py-3">
          <dt className="min-w-0 text-base">
            Seats: {plural(overview.seats, "active member")} ×{" "}
            {money(overview.prices.seatFee)}
          </dt>
          <dd className="shrink-0 text-base tabular-nums">
            {money(overview.seats * overview.prices.seatFee)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 py-3">
          <dt className="grid min-w-0 gap-0.5 text-base">
            <span>
              Assistant: {assistant.messages} of {assistant.freeMessages} free
              messages used
            </span>
            <span className="text-sm text-muted-foreground">
              {assistant.billableMessages > 0
                ? `${plural(assistant.billableMessages, "message")} over the free allowance at ${money(overview.prices.assistantMessagePrice)} each. `
                : null}
              {remaining > 0
                ? `${plural(remaining, "message")} left this month.`
                : "No messages left this month."}
            </span>
          </dt>
          <dd className="shrink-0 text-base tabular-nums">
            {money(assistant.billableMessages * overview.prices.assistantMessagePrice)}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3 py-3">
          <dt className="min-w-0 text-base">
            Mobile app: {plural(overview.mobileTerms, "member")} given the app
          </dt>
          <dd className="shrink-0 text-base tabular-nums">
            {money(
              overview.estimate.lines.find((line) => line.kind === "mobile_access")
                ?.amount ?? 0
            )}
          </dd>
        </div>
      </dl>
    </section>
  )
}

function BillingSettings({
  overview,
  canManage,
}: {
  overview: Overview
  canManage: boolean
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { settings, prices } = overview
  const [payer, setPayer] = useState(settings.seatFeePayer)
  const [autoBilling, setAutoBilling] = useState(settings.assistantAutoBilling)
  const [cap, setCap] = useState<number | undefined>(settings.assistantMonthlyCap)
  const [confirming, setConfirming] = useState<AccessConfirmation | null>(null)
  const save = useMutation(
    trpc.platformBilling.updateSettings.mutationOptions({
      onSuccess: async () => {
        setConfirming(null)
        await queryClient.invalidateQueries(trpc.platformBilling.overview.queryFilter())
      },
    })
  )
  const money = (amount: number) => formatAccessAmount(amount, prices.currencyCode)
  const capValue = cap ?? 0
  const changed =
    payer !== settings.seatFeePayer ||
    autoBilling !== settings.assistantAutoBilling ||
    capValue !== settings.assistantMonthlyCap
  const extraMessages = autoBilling
    ? Math.floor(capValue / prices.assistantMessagePrice)
    : 0

  function submit() {
    save.mutate({
      seatFeePayer: payer,
      assistantAutoBilling: autoBilling,
      assistantMonthlyCap: capValue,
    })
  }

  return (
    <section aria-labelledby="billing-settings" className="space-y-6">
      <h2 className="font-heading text-xl font-semibold" id="billing-settings">
        Settings
      </h2>
      {canManage ? (
        <DashboardStateQuickFill
          draft={{ payer, autoBilling, cap }}
          enabled={!save.isPending}
          isDirty={changed}
          onFill={() => {
            setPayer("members")
            setAutoBilling(true)
            setCap(1500)
          }}
          restore={(draft) => {
            setPayer(draft.payer)
            setAutoBilling(draft.autoBilling)
            setCap(draft.cap)
          }}
        />
      ) : null}

      <fieldset className="space-y-3" disabled={!canManage || save.isPending}>
        <legend className="text-base font-semibold">
          Who pays the {money(prices.seatFee)} seat fee?
        </legend>
        <RadioGroup
          className="gap-3"
          onValueChange={(value) => setPayer(value as typeof payer)}
          value={payer}
        >
          <label className="flex items-start gap-3 text-base" htmlFor="seat-payer-cooperative">
            <RadioGroupItem className="mt-1" id="seat-payer-cooperative" value="cooperative" />
            <span className="grid gap-0.5">
              <span>The cooperative</span>
              <span className="text-sm text-muted-foreground">
                Paid from the cooperative&apos;s own funds. Members are not charged.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-base" htmlFor="seat-payer-members">
            <RadioGroupItem className="mt-1" id="seat-payer-members" value="members" />
            <span className="grid gap-0.5">
              <span>Members</span>
              <span className="text-sm text-muted-foreground">
                At the end of each month, {money(prices.seatFee)} is taken from each
                active member&apos;s savings and shows in their transactions.
              </span>
            </span>
          </label>
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-3" disabled={!canManage || save.isPending}>
        <legend className="text-base font-semibold">Assistant on the website</legend>
        <p className="text-base text-muted-foreground">
          Your staff share {prices.assistantFreeMessages} free messages a month.
          With billing on, more messages cost {money(prices.assistantMessagePrice)} each,
          up to your monthly cap. The assistant stops at the limit.
        </p>
        <div className="flex items-center gap-3">
          <Switch
            checked={autoBilling}
            disabled={!canManage || save.isPending}
            id="assistant-auto-billing"
            onCheckedChange={(checked) => setAutoBilling(checked)}
          />
          <Label className="text-base" htmlFor="assistant-auto-billing">
            Bill messages over the free allowance
          </Label>
        </div>
        {autoBilling ? (
          <div className="max-w-xs space-y-2">
            <Label className="text-base" htmlFor="assistant-monthly-cap">
              Monthly cap
            </Label>
            <CurrencyInput
              allowNegative={false}
              className="h-11 text-base"
              decimalScale={2}
              disabled={!canManage || save.isPending}
              id="assistant-monthly-cap"
              onValueChange={(values) => setCap(values.floatValue)}
              value={cap ?? ""}
            />
            <p className="text-sm text-muted-foreground">
              Up to {plural(extraMessages, "extra message")} a month (
              {prices.assistantFreeMessages + extraMessages} in all).
            </p>
          </div>
        ) : null}
      </fieldset>

      {canManage ? (
        <div className="space-y-2">
          {save.error && !confirming ? (
            <p className="text-base text-destructive" role="alert">
              {save.error.message}
            </p>
          ) : null}
          {save.isSuccess && !changed ? (
            <p className="text-base" role="status">
              Settings saved.
            </p>
          ) : null}
          <Button
            className="h-11 text-base"
            disabled={!changed || save.isPending}
            onClick={() => {
              if (payer !== settings.seatFeePayer) {
                setConfirming(
                  payer === "members"
                    ? {
                        title: "Charge members the seat fee?",
                        description: `From the end of this month, ${money(prices.seatFee)} is taken from each active member's savings every month. Members see it in their transactions.`,
                        actionLabel: "Charge members",
                      }
                    : {
                        title: "Pay the seat fee from the cooperative?",
                        description:
                          "From the end of this month, members are no longer charged the seat fee. The cooperative pays it.",
                        actionLabel: "The cooperative pays",
                      }
                )
                return
              }
              submit()
            }}
            type="button"
          >
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only a cooperative admin can change these settings.
        </p>
      )}
      {confirming ? (
        <AccessConfirmDialog
          confirmation={confirming}
          error={save.error?.message}
          onClose={() => setConfirming(null)}
          onConfirm={submit}
          pending={save.isPending}
        />
      ) : null}
    </section>
  )
}

/** QA sessions only (the server refuses others): bill this month now. */
function QaIssueBill() {
  const quickFill = useQaQuickFill()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { setParams } = useBillingParams()
  const issue = useMutation(
    trpc.platformBilling.issueQaBill.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.platformBilling.overview.queryFilter()),
          queryClient.invalidateQueries(trpc.platformBilling.listBills.queryFilter()),
        ])
        void setParams({ billId: result.billId, paystackReturn: null })
      },
    })
  )
  if (!quickFill.enabled) return null

  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <p className="text-sm text-muted-foreground">
        QA only: close this month now to check the bill.
      </p>
      {issue.error ? (
        <p className="text-sm text-destructive" role="alert">
          {issue.error.message}
        </p>
      ) : null}
      <Button
        className="h-11 text-base"
        disabled={issue.isPending}
        onClick={() => issue.mutate()}
        type="button"
        variant="outline"
      >
        {issue.isPending ? "Issuing…" : "Issue this month's bill (QA)"}
      </Button>
    </div>
  )
}
