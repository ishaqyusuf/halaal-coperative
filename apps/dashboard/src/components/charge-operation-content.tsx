"use client"

import {
  createQaReference,
  qaFirstOfNextMonth,
  qaToday,
} from "@halaalvest/utils"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { Input } from "@halaalvest/ui/components/input"
import { Label } from "@halaalvest/ui/components/label"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useState, useTransition, type ReactNode } from "react"
import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  ChargeMemberForm,
  ChargeTypeForm,
} from "@/components/forms/charge-forms"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import {
  useChargeActivityQuery,
  type ChargeActivityRow,
} from "@/hooks/use-charge-activity-query"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import {
  useChargeTypesQuery,
  type ChargeTypeRow,
} from "@/hooks/use-charge-types-query"
import {
  formatChargeAmount,
  getChargeAppliesToWords,
  getChargeFrequencyWord,
} from "@/lib/charges/charge-words"
import {
  reverseChargeApplicationAction,
  settleChargeApplicationAction,
  updateChargeDefinitionAction,
  waiveChargeApplicationAction,
} from "@/lib/dashboard-actions"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

type Frame = "dialog" | "sheet"

function OperationHeader({
  description,
  frame,
  title,
}: {
  description?: string
  frame: Frame
  title: string
}) {
  if (frame === "dialog") {
    return (
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="text-base text-foreground/80">
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>
    )
  }

  return (
    <SheetHeader>
      <SheetTitle className="text-xl font-semibold">{title}</SheetTitle>
      {description ? (
        <SheetDescription className="text-base">{description}</SheetDescription>
      ) : null}
    </SheetHeader>
  )
}

/** Refreshes every charge read after a change, then closes the overlay. */
function useRefreshCharges() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const { setParams } = useChargeOperationParams()

  return async function refreshCharges() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.charges.chargeLibrary.queryKey(),
      }),
      queryClient.invalidateQueries(
        trpc.charges.activity.infiniteQueryFilter()
      ),
    ])
    await setParams(null)
    router.refresh()
  }
}

/** Runs a form action with a toast and refresh; keeps the overlay open on error. */
function useChargeSubmit() {
  const refreshCharges = useRefreshCharges()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function submit(
    action: (formData: FormData) => Promise<unknown>,
    formData: FormData,
    success: { body: string; title: string }
  ) {
    startTransition(async () => {
      try {
        await action(formData)
        showSuccess(success.title, success.body)
        await refreshCharges()
      } catch (error) {
        showError(
          "That did not work",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return { isPending, refreshCharges, submit }
}

function Fact({ label, children }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-base text-muted-foreground">{label}</dt>
      <dd className="text-right text-base font-medium text-foreground">
        {children}
      </dd>
    </div>
  )
}

const versionWords = {
  current: "Now",
  historical: "Before",
  scheduled: "Starts later",
} as const

function ChargeTypeDetails({
  canManageCharges,
  charge,
}: {
  canManageCharges: boolean
  charge: ChargeTypeRow
}) {
  const { setParams } = useChargeOperationParams()
  const appliesTo = getChargeAppliesToWords(charge.appliesTo ?? [])

  return (
    <>
      <OperationHeader frame="sheet" title={charge.name} />
      <div className="grid gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6">
        <div>
          <p className="text-base text-muted-foreground">Amount now</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-semibold tabular-nums">
            {formatChargeAmount(charge.amount, charge.chargeValueType)}
          </p>
          {charge.chargeValueType === "percentage" ? (
            <p className="mt-1 text-base text-muted-foreground">
              Of the amount it is added to.
            </p>
          ) : null}
        </div>

        <dl className="divide-y divide-border border-y border-border">
          <Fact label="Status">{charge.isActive ? "On" : "Off"}</Fact>
          {charge.chargeFrequency === "recurring_monthly" ||
          charge.chargeFrequency === "per_contribution" ? (
            <Fact label="How often">
              {getChargeFrequencyWord(charge.chargeFrequency)}
            </Fact>
          ) : null}
          <Fact label="Added to">{appliesTo}</Fact>
          {charge.isMonthlyLevy ? <Fact label="Monthly levy">Yes</Fact> : null}
        </dl>

        {canManageCharges ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              className="h-11 text-base"
              onClick={() =>
                void setParams({
                  chargeDefinitionId: charge.id,
                  chargeOperationSheetType: "version",
                })
              }
              type="button"
            >
              Change amount
            </Button>
            <Button
              className="h-11 text-base"
              onClick={() =>
                void setParams({
                  chargeDefinitionId: charge.id,
                  chargeOperationSheetType: "toggle",
                })
              }
              type="button"
              variant="outline"
            >
              {charge.isActive ? "Turn off" : "Turn on"}
            </Button>
          </div>
        ) : null}

        <section>
          <h3 className="text-lg font-semibold">Amount history</h3>
          <p className="mt-1 text-base text-muted-foreground">
            Charges already added keep the amount they had.
          </p>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {charge.versions.map((version) => (
              <li
                className="flex items-start justify-between gap-4 py-3"
                key={version.id}
              >
                <div className="min-w-0">
                  <p className="text-base font-medium">
                    From {formatDayMonthYear(version.effectiveFrom)}
                  </p>
                  {version.notes ? (
                    <p className="mt-0.5 text-base break-words text-muted-foreground">
                      {version.notes}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold tabular-nums">
                    {formatChargeAmount(version.amount, charge.chargeValueType)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {versionWords[version.status]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

function ChangeAmountForm({
  charge,
  devMode,
}: {
  charge: ChargeTypeRow
  devMode: boolean
}) {
  const { isPending, submit } = useChargeSubmit()
  const isPercent = charge.chargeValueType === "percentage"

  return (
    <>
      <OperationHeader
        description="Charges already added keep their old amount."
        frame="dialog"
        title={`Change ${charge.name}`}
      />
      <form
        action={(formData) =>
          submit(updateChargeDefinitionAction, formData, {
            body: `${charge.name} has a new amount.`,
            title: "Amount changed",
          })
        }
        className="grid gap-4"
      >
        <DashboardNativeQuickFill
          enabled={devMode}
          values={() => ({
            amount: String(Math.max(charge.amount + (isPercent ? 1 : 500), 1)),
            effectiveFrom: qaFirstOfNextMonth(),
            notes: "Agreed at the general meeting.",
          })}
        />
        <input name="chargeDefinitionId" type="hidden" value={charge.id} />
        <input
          name="kind"
          type="hidden"
          value={isPercent ? "percentage" : "fixed"}
        />
        <input
          name="chargeValueType"
          type="hidden"
          value={charge.chargeValueType}
        />
        <p className="text-base">
          Now:{" "}
          <span className="font-semibold tabular-nums">
            {formatChargeAmount(charge.amount, charge.chargeValueType)}
          </span>
        </p>
        <div className="grid gap-2">
          <Label className="text-base" htmlFor="charge-new-amount">
            New amount{isPercent ? " (%)" : ""}
          </Label>
          <CurrencyPrefixInput
            className="h-11"
            currencyPrefix={isPercent ? "%" : "₦"}
            id="charge-new-amount"
            inputClassName="text-base"
            inputMode="decimal"
            min="0"
            name="amount"
            required
            step="0.01"
            type="number"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-base">Starts on</Label>
          <DatePickerInput
            name="effectiveFrom"
            placeholder="Pick a date"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-base" htmlFor="charge-change-note">
            Reason (optional)
          </Label>
          <Input
            className="h-11 text-base"
            id="charge-change-note"
            name="notes"
            placeholder="For example: agreed at the March meeting"
          />
        </div>
        <Button className="h-11 text-base" disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Save new amount"}
        </Button>
      </form>
    </>
  )
}

function ToggleChargeConfirm({ charge }: { charge: ChargeTypeRow }) {
  const { isPending, submit } = useChargeSubmit()
  const turningOn = !charge.isActive

  return (
    <form
      action={(formData) =>
        submit(updateChargeDefinitionAction, formData, {
          body: `${charge.name} is now ${turningOn ? "on" : "off"}.`,
          title: turningOn ? "Charge turned on" : "Charge turned off",
        })
      }
      className="grid gap-4"
    >
      <OperationHeader
        description={
          turningOn
            ? "It can be added to members again."
            : "It stops being added to members. Charges already added stay."
        }
        frame="dialog"
        title={`Turn ${turningOn ? "on" : "off"} ${charge.name}?`}
      />
      <input name="chargeDefinitionId" type="hidden" value={charge.id} />
      <input name="isActive" type="hidden" value={String(turningOn)} />
      <WorkflowConfirmFooter disabled={isPending}>
        <Button
          className="h-11 text-base"
          disabled={isPending}
          type="submit"
          variant={turningOn ? "default" : "destructive"}
        >
          {isPending ? "Saving…" : turningOn ? "Turn on" : "Turn off"}
        </Button>
      </WorkflowConfirmFooter>
    </form>
  )
}

function getCorrectionCopy(
  type: "reverse" | "waive",
  row: ChargeActivityRow | undefined
) {
  const who = row?.memberName ?? "the member"
  const Who = row?.memberName ?? "The member"
  const what = row
    ? `${row.chargeName} (${formatChargeAmount(row.amount, "fixed_amount")})`
    : "this charge"
  const amount = row
    ? formatChargeAmount(row.amount, "fixed_amount")
    : "The money"
  const moneyBack =
    row?.collectionMode === "pay_separately"
      ? `Give ${who} back the ${amount} they paid.`
      : `${amount} goes back into ${who}'s savings.`

  if (type === "reverse") {
    return {
      action: "Undo charge",
      description: `Use this when it was added by mistake. ${moneyBack}`,
      title: `Undo ${what}?`,
    }
  }

  return {
    action: "Waive charge",
    description:
      row?.status === "pending"
        ? `${Who} will not have to pay it. Nothing was paid, so no money moves.`
        : `${Who} is let off this charge. ${moneyBack}`,
    title: `Waive ${what}?`,
  }
}

function CorrectionConfirm({
  applicationId,
  type,
}: {
  applicationId: string
  type: "reverse" | "waive"
}) {
  const { rows } = useChargeActivityQuery()
  const row = rows.find((item) => item.id === applicationId)
  const { isPending, submit } = useChargeSubmit()
  const [reason, setReason] = useState("")
  const copy = getCorrectionCopy(type, row)

  return (
    <form
      action={(formData) =>
        submit(
          type === "waive"
            ? waiveChargeApplicationAction
            : reverseChargeApplicationAction,
          formData,
          {
            body: "The member's charges are up to date.",
            title: type === "waive" ? "Charge waived" : "Charge undone",
          }
        )
      }
      className="grid gap-4"
    >
      <OperationHeader
        description={copy.description}
        frame="dialog"
        title={copy.title}
      />
      <input name="chargeApplicationId" type="hidden" value={applicationId} />
      <div className="grid gap-2">
        <Label className="text-base" htmlFor="charge-correction-reason">
          Reason
        </Label>
        <Textarea
          className="text-base"
          disabled={isPending}
          id="charge-correction-reason"
          maxLength={500}
          name="reason"
          onChange={(event) => setReason(event.target.value)}
          required
          rows={2}
          value={reason}
        />
        <p className="text-sm text-muted-foreground">Kept with the record.</p>
      </div>
      <WorkflowConfirmFooter disabled={isPending}>
        <Button
          className="h-11 text-base"
          disabled={isPending || !reason.trim()}
          type="submit"
          variant="destructive"
        >
          {isPending ? "Saving…" : copy.action}
        </Button>
      </WorkflowConfirmFooter>
    </form>
  )
}

function RecordPaymentForm({
  applicationId,
  devMode,
}: {
  applicationId: string
  devMode: boolean
}) {
  const { rows } = useChargeActivityQuery()
  const row = rows.find((item) => item.id === applicationId)
  const { isPending, submit } = useChargeSubmit()

  return (
    <>
      <OperationHeader
        description={
          row
            ? `${row.memberName} paid ${formatChargeAmount(row.amount, "fixed_amount")} for ${row.chargeName}.`
            : undefined
        }
        frame="dialog"
        title="Record payment"
      />
      <form
        action={(formData) =>
          submit(settleChargeApplicationAction, formData, {
            body: "The charge is marked as paid.",
            title: "Payment recorded",
          })
        }
        className="grid gap-4"
      >
        <DashboardNativeQuickFill
          enabled={devMode}
          values={() => ({
            notes: "Paid at the cooperative office.",
            paidAt: qaToday(),
            reference: createQaReference("CHG"),
          })}
        />
        <input name="chargeApplicationId" type="hidden" value={applicationId} />
        <div className="grid gap-2">
          <Label className="text-base">Date paid</Label>
          <DatePickerInput name="paidAt" placeholder="Pick a date" required />
        </div>
        <div className="grid gap-2">
          <Label className="text-base" htmlFor="charge-payment-reference">
            Receipt or transfer number
          </Label>
          <Input
            className="h-11 text-base"
            id="charge-payment-reference"
            name="reference"
            required
          />
          <p className="text-sm text-muted-foreground">
            Each number can be used once.
          </p>
        </div>
        <div className="grid gap-2">
          <Label className="text-base" htmlFor="charge-payment-note">
            Note (optional)
          </Label>
          <Input
            className="h-11 text-base"
            id="charge-payment-note"
            name="notes"
          />
        </div>
        <Button className="h-11 text-base" disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Record payment"}
        </Button>
      </form>
    </>
  )
}

function NotFound({ frame }: { frame: Frame }) {
  return (
    <>
      <OperationHeader frame={frame} title="Not found" />
      <p className="px-4 pb-6 text-base text-muted-foreground md:px-6">
        This charge could not be found. It may have been removed.
      </p>
    </>
  )
}

export function ChargeOperationContent({
  canManageCharges,
  devMode,
}: {
  canManageCharges: boolean
  devMode: boolean
}) {
  const { chargeApplicationId, chargeDefinitionId, chargeOperationSheetType } =
    useChargeOperationParams()
  const chargeTypes = useChargeTypesQuery()
  const refreshCharges = useRefreshCharges()
  const charge = chargeTypes.find((item) => item.id === chargeDefinitionId)

  switch (chargeOperationSheetType) {
    case "details":
      return charge ? (
        <ChargeTypeDetails
          canManageCharges={canManageCharges}
          charge={charge}
        />
      ) : (
        <NotFound frame="sheet" />
      )
    case "definition":
      return (
        <>
          <OperationHeader frame="sheet" title="New charge" />
          <div className="px-4 md:px-6">
            <ChargeTypeForm devMode={devMode} onSuccess={refreshCharges} />
          </div>
        </>
      )
    case "application": {
      const manualCharges = chargeTypes.filter(
        (item) => item.isActive && item.chargeValueType === "fixed_amount"
      )

      return (
        <>
          <OperationHeader frame="sheet" title="Charge a member" />
          <div className="px-4 md:px-6">
            {manualCharges.length ? (
              <ChargeMemberForm
                chargeTypes={manualCharges}
                devMode={devMode}
                onSuccess={refreshCharges}
              />
            ) : (
              <p className="border-y border-border py-5 text-base text-muted-foreground">
                Add a naira-amount charge first. Percent charges are added by
                loans and other requests on their own.
              </p>
            )}
          </div>
        </>
      )
    }
    case "version":
      return charge ? (
        <ChangeAmountForm charge={charge} devMode={devMode} />
      ) : (
        <NotFound frame="dialog" />
      )
    case "toggle":
      return charge ? (
        <ToggleChargeConfirm charge={charge} />
      ) : (
        <NotFound frame="dialog" />
      )
    case "waive":
    case "reverse":
      return chargeApplicationId ? (
        <CorrectionConfirm
          applicationId={chargeApplicationId}
          type={chargeOperationSheetType}
        />
      ) : (
        <NotFound frame="dialog" />
      )
    case "settle":
      return chargeApplicationId ? (
        <RecordPaymentForm
          applicationId={chargeApplicationId}
          devMode={devMode}
        />
      ) : (
        <NotFound frame="dialog" />
      )
    default:
      return null
  }
}
