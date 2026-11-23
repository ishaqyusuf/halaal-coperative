"use client"

import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { createQaAmount, formatCurrency, qaToday } from "@halaalvest/utils"
import { useState, useTransition } from "react"
import type {
  BusinessDetail,
  BusinessProfitEntry,
  BusinessSetup,
} from "@/components/business/form-context"
import { useBusinessRefresh } from "@/components/business/use-business-refresh"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { RequestConfirmDialog } from "@/components/requests/request-confirm-dialog"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useMarkWorkflowSaved } from "@/components/workflow-presentation"
import { useBusinessParams } from "@/hooks/use-business-params"
import {
  businessStatusOptions,
  formatDateRange,
  todayInputDate,
  type BusinessStatus,
} from "@/lib/business/business-words"
import {
  createShareBusinessAction,
  createShareBusinessProfitEntryAction,
  updateShareBusinessAction,
  updateShareBusinessProfitEntryAction,
} from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { formatDayMonthYear } from "@/utils/format"

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function amountOf(value: string) {
  const amount = Number(value)

  return value.trim() && Number.isFinite(amount) && amount >= 0 ? amount : null
}

type BusinessDraft = {
  capitalAmount: string
  endDate: string
  name: string
  notes: string
  startDate: string
  status: BusinessStatus
}

/**
 * Add or change a business: what it is, the money put in and when it runs.
 * Profit is recorded separately on the business, so a new business can be
 * added before it makes any.
 */
export function BusinessForm({
  business,
  disabled,
}: {
  business?: BusinessDetail
  disabled: boolean
}) {
  const markSaved = useMarkWorkflowSaved()
  const refresh = useBusinessRefresh()
  const { setParams } = useBusinessParams()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<BusinessDraft>(() => ({
    capitalAmount: business ? String(business.capitalAmount) : "",
    endDate: business?.endDate ?? "",
    name: business?.name ?? "",
    notes: business?.notes ?? "",
    startDate: business?.startDate ?? "",
    status: business?.status ?? "active",
  }))
  const capital = amountOf(draft.capitalAmount)
  const endsBeforeStart = Boolean(
    draft.endDate && draft.startDate && draft.endDate < draft.startDate
  )
  const canSave =
    !disabled &&
    Boolean(draft.name.trim()) &&
    capital !== null &&
    Boolean(draft.startDate) &&
    !endsBeforeStart

  function update<TKey extends keyof BusinessDraft>(
    key: TKey,
    value: BusinessDraft[TKey]
  ) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      const values = {
        capitalAmount: draft.capitalAmount,
        endDate: draft.endDate,
        name: draft.name.trim(),
        notes: draft.notes.trim(),
        startDate: draft.startDate,
        status: draft.status,
      }

      try {
        if (business) {
          await updateShareBusinessAction(
            objectToFormData({
              ...values,
              // Kept as they are: profit is recorded per entry, and seasons
              // are separate from the business's own dates (ADR-016).
              linkedDividendPeriodId: business.linkedDividendPeriodId ?? "",
              profitAmount: String(business.profitAmount),
              shareBusinessId: business.id,
            })
          )
          markSaved()
          showSuccess("Business saved", values.name)
          await refresh(() =>
            setParams({ businessId: business.id, businessType: "details" })
          )
        } else {
          await createShareBusinessAction(
            objectToFormData({ ...values, sourceType: "manual" })
          )
          markSaved()
          showSuccess("Business added", values.name)
          await refresh(() => setParams(null))
        }
      } catch (error) {
        showError("Could not save the business", errorMessage(error))
      }
    })
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={draft}
        enabled={!isPending && !disabled}
        isDirty={Boolean(draft.name || draft.capitalAmount)}
        onFill={() =>
          setDraft({
            capitalAmount: createQaAmount(500_000, 3_000_000, 50_000),
            endDate: "",
            name: `Community farm ${Math.floor(Math.random() * 90) + 10}`,
            notes: "Agreed at the general meeting.",
            startDate: qaToday(),
            status: "active",
          })
        }
        restore={setDraft}
      />
      <RequestField label="Business name">
        <Input
          disabled={isPending || disabled}
          onChange={(event) => update("name", event.target.value)}
          placeholder="For example, Community market"
          value={draft.name}
        />
      </RequestField>
      <RequestField label="Money put in (₦)">
        <Input
          disabled={isPending || disabled}
          inputMode="decimal"
          onChange={(event) => update("capitalAmount", event.target.value)}
          value={draft.capitalAmount}
        />
      </RequestField>
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Started on">
          <DatePickerInput
            className="h-11 text-base"
            disabled={isPending || disabled}
            name="startDate"
            onChange={(value: string) => update("startDate", value)}
            placeholder="Pick a date"
            value={draft.startDate}
          />
        </RequestField>
        <RequestField
          hint={endsBeforeStart ? "Must be after the start date." : undefined}
          label="Ended on"
          optional
        >
          <DatePickerInput
            className="h-11 text-base"
            disabled={isPending || disabled}
            min={draft.startDate || undefined}
            name="endDate"
            onChange={(value: string) => update("endDate", value)}
            placeholder="Still running"
            value={draft.endDate}
          />
        </RequestField>
      </div>
      <RequestField label="Status">
        <NativeSelect
          className="h-11 text-base"
          disabled={isPending || disabled}
          onChange={(event) =>
            update("status", event.target.value as BusinessStatus)
          }
          value={draft.status}
        >
          {businessStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </RequestField>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending || disabled}
          onChange={(event) => update("notes", event.target.value)}
          value={draft.notes}
        />
      </RequestField>
      <RequestFormActions>
        <Button disabled={isPending || !canSave} onClick={save} type="button">
          {isPending ? "Saving..." : business ? "Save changes" : "Add business"}
        </Button>
      </RequestFormActions>
    </div>
  )
}

type ProfitDraft = {
  costReason: string
  costs: string
  notes: string
  profit: string
  profitDate: string
}

/** The dates a new live profit may use: inside the season and the business. */
function getProfitDateRange(
  business: BusinessDetail,
  season: BusinessSetup["currentProfitSeason"]
) {
  const min = [season.periodStart, business.startDate]
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)
  const max = [season.periodEnd, business.endDate, todayInputDate()]
    .filter((value): value is string => Boolean(value))
    .sort()[0]

  return { max, min }
}

/**
 * Record (or correct) profit a business made: what came in, what it cost,
 * and the rest is shared with members when the season closes. A confirm
 * names the amount before anything is saved.
 */
export function ProfitEntryForm({
  business,
  disabled,
  entry,
  setup,
}: {
  business: BusinessDetail
  disabled: boolean
  entry?: BusinessProfitEntry
  setup: BusinessSetup
}) {
  const markSaved = useMarkWorkflowSaved()
  const refresh = useBusinessRefresh()
  const { setParams } = useBusinessParams()
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [draft, setDraft] = useState<ProfitDraft>(() => ({
    costReason: entry?.reason ?? "",
    costs: entry?.expenseAmount ? String(entry.expenseAmount) : "",
    notes: entry?.notes ?? "",
    profit: entry ? String(entry.profitAmount) : "",
    profitDate: entry?.profitDate ?? "",
  }))
  const season = setup.currentProfitSeason
  const seasonClosed = !season.canRecordProfit
  const range = getProfitDateRange(business, season)
  const profit = amountOf(draft.profit)
  const costs = draft.costs.trim() ? amountOf(draft.costs) : 0
  const toShare =
    profit !== null && costs !== null ? Math.round((profit - costs) * 100) / 100 : null
  const costsTooHigh = toShare !== null && toShare < 0
  const needsCostReason = (costs ?? 0) > 0 && !draft.costReason.trim()
  const outOfRange = Boolean(
    draft.profitDate &&
      ((range.min && draft.profitDate < range.min) ||
        (range.max && draft.profitDate > range.max))
  )
  const canSave =
    !disabled &&
    !seasonClosed &&
    Boolean(draft.profitDate) &&
    !outOfRange &&
    profit !== null &&
    profit > 0 &&
    costs !== null &&
    !costsTooHigh &&
    !needsCostReason
  const blocked = disabled || seasonClosed

  function update<TKey extends keyof ProfitDraft>(key: TKey, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      const values = {
        allocatableProfitAmount: String(toShare ?? 0),
        expenseAmount: String(costs ?? 0),
        notes: draft.notes.trim(),
        profitAmount: draft.profit,
        profitDate: draft.profitDate,
        reason: (costs ?? 0) > 0 ? draft.costReason.trim() : "",
        sourceType: "manual",
        // New profit waits in the open season; closing the season moves it on.
        status: entry?.status ?? "draft",
      }

      try {
        if (entry) {
          await updateShareBusinessProfitEntryAction(
            objectToFormData({ ...values, profitEntryId: entry.id })
          )
        } else {
          await createShareBusinessProfitEntryAction(
            objectToFormData({ ...values, shareBusinessId: business.id })
          )
        }
        markSaved()
        setConfirmOpen(false)
        showSuccess(
          entry ? "Profit saved" : "Profit recorded",
          `${formatCurrency(toShare ?? 0)} for ${business.name}`
        )
        await refresh(() =>
          setParams({
            businessId: business.id,
            businessType: "details",
            profitEntryId: null,
          })
        )
      } catch (error) {
        setConfirmOpen(false)
        showError("Could not save the profit", errorMessage(error))
      }
    })
  }

  if (seasonClosed && !entry) {
    // Nothing can be recorded: say why, without an empty form.
    return (
      <p className="rounded-(--ui-radius-surface) border border-border bg-card px-4 py-3 text-base text-foreground">
        {season.reason ??
          "No season is open for new profit. Ask an admin to check the profit settings."}
      </p>
    )
  }

  return (
    <div className="grid gap-5">
      <DashboardStateQuickFill
        draft={draft}
        enabled={!isPending && !blocked}
        isDirty={Boolean(draft.profit || draft.costs)}
        onFill={() => {
          const amount = Number(createQaAmount(200_000, 900_000, 10_000))
          const date = range.max ?? qaToday()

          setDraft({
            costReason: "Transport and market levy",
            costs: String(Math.round(amount * 0.15)),
            notes: "Checked against the business bank statement.",
            profit: String(amount),
            profitDate: date,
          })
        }}
        restore={setDraft}
      />
      <p className="rounded-(--ui-radius-surface) border border-border bg-card px-4 py-3 text-base text-foreground">
        {seasonClosed
          ? (season.reason ??
            "No season is open for new profit. Ask an admin to check the profit settings.")
          : `Goes into ${season.label}${
              season.periodStart && season.periodEnd && !season.label.includes("(")
                ? ` (${formatDateRange(season.periodStart, season.periodEnd)})`
                : ""
            }.`}
      </p>
      <RequestField
        hint={
          outOfRange && range.min && range.max
            ? `Pick a date from ${formatDayMonthYear(range.min)} to ${formatDayMonthYear(range.max)}.`
            : undefined
        }
        label="Date of the profit"
      >
        <DatePickerInput
            className="h-11 text-base"
          disabled={isPending || blocked}
          max={range.max}
          min={range.min}
          name="profitDate"
          onChange={(value: string) => update("profitDate", value)}
          placeholder="Pick a date"
          value={draft.profitDate}
        />
      </RequestField>
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Profit made (₦)">
          <Input
            disabled={isPending || blocked}
            inputMode="decimal"
            onChange={(event) => update("profit", event.target.value)}
            value={draft.profit}
          />
        </RequestField>
        <RequestField
          hint={costsTooHigh ? "Costs can't be more than the profit." : undefined}
          label="Costs (₦)"
          optional
        >
          <Input
            disabled={isPending || blocked}
            inputMode="decimal"
            onChange={(event) => update("costs", event.target.value)}
            value={draft.costs}
          />
        </RequestField>
      </div>
      {(costs ?? 0) > 0 ? (
        <RequestField label="What were the costs for?">
          <Input
            disabled={isPending || blocked}
            onChange={(event) => update("costReason", event.target.value)}
            value={draft.costReason}
          />
        </RequestField>
      ) : null}
      <div className="flex items-baseline justify-between gap-3 border-y border-border py-4">
        <span className="text-base text-muted-foreground">To share with members</span>
        <span className="text-xl font-semibold tabular-nums">
          {toShare !== null && !costsTooHigh ? formatCurrency(toShare) : "—"}
        </span>
      </div>
      <RequestField label="Note" optional>
        <Textarea
          disabled={isPending || blocked}
          onChange={(event) => update("notes", event.target.value)}
          value={draft.notes}
        />
      </RequestField>
      <RequestFormActions>
        <Button
          disabled={isPending || !canSave}
          onClick={() => setConfirmOpen(true)}
          type="button"
        >
          {entry ? "Save changes" : "Record profit"}
        </Button>
      </RequestFormActions>

      <RequestConfirmDialog
        confirmLabel={entry ? "Save changes" : "Record profit"}
        description="Members see it only after the season is shared."
        facts={[
          { label: "Business", value: business.name },
          {
            label: "Date",
            value: formatDayMonthYear(draft.profitDate) ?? draft.profitDate,
          },
          { label: "Profit made", value: formatCurrency(profit ?? 0) },
          { label: "Costs", value: formatCurrency(costs ?? 0) },
          { label: "To share", value: formatCurrency(toShare ?? 0) },
        ]}
        onConfirm={save}
        onOpenChange={setConfirmOpen}
        open={confirmOpen}
        pending={isPending}
        title={`Record ${formatCurrency(toShare ?? 0)} profit?`}
      />
    </div>
  )
}
