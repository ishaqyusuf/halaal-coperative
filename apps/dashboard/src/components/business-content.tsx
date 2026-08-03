"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { formatCurrency } from "@halaalvest/utils"
import { DatePickerInput } from "@/components/date-picker-input"
import { useBusinessFormContext } from "@/components/business/form-context"
import { ShareBusinessForm } from "@/components/forms/tenant-finance-forms"
import type { BusinessProfitEntry } from "@/components/tables/business/columns"
import { useBusinessParams } from "@/hooks/use-business-params"
import {
  createShareBusinessProfitEntryAction,
  markBusinessProfitPoolsReviewedAction,
  updateShareBusinessAction,
  updateShareBusinessProfitEntryAction,
} from "@/lib/dashboard-actions"

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

type CurrentProfitSeason = {
  canRecordProfit: boolean
  id: string | null
  label: string
  periodEnd: string | null
  periodStart: string | null
  reason: string | null
  status: "approved" | "closed" | "draft" | "published" | "unconfigured"
}

function currentLocalDate() {
  const date = new Date()
  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000
  )

  return offsetDate.toISOString().slice(0, 10)
}

function getSelectedProfitEntry(
  business: { profitEntries: unknown[] } | undefined,
  profitEntryId: string | null
): BusinessProfitEntry | null {
  if (!business) {
    return null
  }

  const profitEntries = business.profitEntries as BusinessProfitEntry[]

  return (
    profitEntries.find((entry) => entry.id === profitEntryId) ??
    profitEntries[0] ??
    null
  )
}

export function BusinessContent() {
  const { businessId, businessType, profitEntryId, setParams } =
    useBusinessParams()
  const { business, isBusinessLoading, setup } = useBusinessFormContext()
  const profitEntry = getSelectedProfitEntry(business, profitEntryId)
  const isLocked = setup.isLocked
  const financeStartDate = setup.financeStartDate
  const dividendPeriods = setup.dividendPeriods

  if (businessType === "create") {
    return (
      <div className="px-4 pb-6 sm:px-6">
        <ShareBusinessForm
          currentProfitSeason={setup.currentProfitSeason}
          dividendPeriods={dividendPeriods}
          financeStartDate={financeStartDate}
          onSuccess={() => setParams(null)}
          profitHistoryLayout="single"
          profitHistoryMode
          sourceType="manual"
        />
      </div>
    )
  }

  if (businessType === "reviewNone" && setup.canReviewNoProfit) {
    return (
      <form
        action={markBusinessProfitPoolsReviewedAction}
        className="grid gap-4 px-6"
      >
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Confirmation
          <Input
            name="confirmation"
            placeholder="NO BUSINESS PROFITS"
            required
            type="text"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Notes
          <Textarea
            name="notes"
            placeholder="Board minute, review note, or approver"
          />
        </label>
        <Button type="submit" variant="outline">
          Mark reviewed
        </Button>
      </form>
    )
  }

  if (isBusinessLoading) {
    return (
      <div className="px-6 text-sm text-muted-foreground">
        Loading business record...
      </div>
    )
  }

  if (!business && businessId) {
    return (
      <div className="px-6 text-sm text-muted-foreground">
        Business record could not be loaded.
      </div>
    )
  }

  if (businessType === "details" && business) {
    const latest = business.profitEntries[0]

    return (
      <div className="px-4 pb-6 sm:px-6" data-business-details-flat>
        <section className="border-b border-border/70 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {business.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {business.startDate} to {business.endDate ?? "Ongoing"}
              </p>
            </div>
            <Badge className="shrink-0 capitalize" variant="outline">
              {displayEnum(business.status)}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {business.notes ?? "No internal note has been added."}
          </p>
        </section>

        <dl className="divide-y divide-border/70 border-b border-border/70 py-1 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:py-5">
          <div className="py-4 sm:py-0 sm:pr-5">
            <dt className="text-xs text-muted-foreground">Capital</dt>
            <dd className="mt-1 font-medium text-foreground tabular-nums">
              {formatCurrency(business.capitalAmount)}
            </dd>
          </div>
          <div className="py-4 sm:py-0 sm:pl-5">
            <dt className="text-xs text-muted-foreground">Recorded profit</dt>
            <dd className="mt-1 font-medium text-foreground tabular-nums">
              {formatCurrency(business.profitAmount)}
            </dd>
          </div>
        </dl>

        <section className="border-b border-border/70 py-5">
          <p className="text-xs font-medium text-muted-foreground">
            Latest profit entry
          </p>
          {latest ? (
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground tabular-nums">
                  {formatCurrency(latest.allocatableProfitAmount)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {latest.profitDate} · {displayEnum(latest.status)}
                </p>
                {latest.linkedDividendPeriod ? (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {latest.linkedDividendPeriod.name}
                  </p>
                ) : null}
              </div>
              <Badge className="shrink-0 capitalize" variant="outline">
                {displayEnum(latest.sourceType)}
              </Badge>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No profit entry has been recorded yet.
            </p>
          )}
        </section>

        <div className="grid gap-2 pt-5 md:flex md:justify-end">
          <Button
            className="h-11 w-full md:h-9 md:w-auto"
            disabled={isLocked}
            onClick={() =>
              setParams({
                businessId: business.id,
                businessType: "edit",
                profitEntryId: null,
              })
            }
            type="button"
            variant="outline"
          >
            Edit business
          </Button>
          <Button
            className="h-11 w-full md:h-9 md:w-auto"
            disabled={isLocked}
            onClick={() =>
              setParams({
                businessId: business.id,
                businessType: "profit",
                profitEntryId: null,
              })
            }
            type="button"
          >
            Add profit entry
          </Button>
        </div>
      </div>
    )
  }

  if (businessType === "profit") {
    if (business) {
      return (
        <form
          action={createShareBusinessProfitEntryAction}
          className="grid gap-4 px-6"
        >
          <input name="shareBusinessId" type="hidden" value={business.id} />
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            Business
            <Input disabled value={business.name} />
          </label>
          <ProfitEntryFields
            businessEndDate={business.endDate}
            businessStartDate={business.startDate}
            currentProfitSeason={setup.currentProfitSeason}
            dividendPeriods={dividendPeriods}
            financeStartDate={financeStartDate}
            isLocked={isLocked}
          />
          <Button
            disabled={isLocked || !setup.currentProfitSeason.canRecordProfit}
            type="submit"
          >
            Save profit entry
          </Button>
        </form>
      )
    }

    return (
      <div className="px-6 text-sm text-muted-foreground">
        Select a business before adding a profit entry.
      </div>
    )
  }

  if (businessType === "edit" && business) {
    return (
      <form action={updateShareBusinessAction} className="grid gap-4 px-6">
        <input name="shareBusinessId" type="hidden" value={business.id} />
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Business name
          <Input
            defaultValue={business.name}
            disabled={isLocked}
            name="name"
            required
            type="text"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Capital
          <CurrencyPrefixInput
            defaultValue={business.capitalAmount}
            disabled={isLocked}
            min="0"
            name="capitalAmount"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Recorded profit
          <CurrencyPrefixInput
            defaultValue={business.profitAmount}
            disabled={isLocked}
            min="0"
            name="profitAmount"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Start date
          <DatePickerInput
            defaultValue={business.startDate}
            disabled={isLocked}
            name="startDate"
            placeholder="Select start date"
            required
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          End date
          <DatePickerInput
            defaultValue={business.endDate ?? ""}
            disabled={isLocked}
            min={business.startDate || undefined}
            name="endDate"
            placeholder="Select end date"
          />
        </label>
        <BusinessDividendPeriodSelect
          defaultValue={business.linkedDividendPeriod?.id ?? ""}
          dividendPeriods={dividendPeriods}
          disabled={isLocked}
        />
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Status
          <NativeSelect
            defaultValue={business.status}
            disabled={isLocked}
            name="status"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </NativeSelect>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Notes
          <Textarea
            defaultValue={business.notes ?? ""}
            disabled={isLocked}
            name="notes"
            placeholder="Board note or source file"
          />
        </label>
        <Button disabled={isLocked} type="submit">
          Save changes
        </Button>
      </form>
    )
  }

  if (businessType === "editProfit" && profitEntry) {
    return (
      <form
        action={updateShareBusinessProfitEntryAction}
        className="grid gap-4 px-6"
      >
        <input name="profitEntryId" type="hidden" value={profitEntry.id} />
        <ProfitEntryFields
          businessEndDate={business?.endDate}
          businessStartDate={business?.startDate}
          currentProfitSeason={setup.currentProfitSeason}
          defaultValues={profitEntry}
          dividendPeriods={dividendPeriods}
          financeStartDate={financeStartDate}
          isLocked={isLocked}
        />
        <Button
          disabled={
            isLocked ||
            profitEntry.hasPublishedAllocations ||
            (profitEntry.sourceType === "manual" &&
              !setup.currentProfitSeason.canRecordProfit)
          }
          type="submit"
        >
          Save changes
        </Button>
      </form>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a business record to continue.
    </div>
  )
}

function BusinessDividendPeriodSelect({
  defaultValue,
  disabled,
  dividendPeriods,
}: {
  defaultValue?: string
  disabled?: boolean
  dividendPeriods: Array<{ id: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      Dividend period
      <NativeSelect
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        name="linkedDividendPeriodId"
      >
        <option value="">Not linked</option>
        {dividendPeriods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.label}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

function ProfitEntryFields({
  businessEndDate,
  businessStartDate,
  currentProfitSeason,
  defaultValues,
  dividendPeriods,
  financeStartDate,
  isLocked,
}: {
  businessEndDate?: string | null
  businessStartDate?: string | null
  currentProfitSeason: CurrentProfitSeason
  defaultValues?: {
    allocatableProfitAmount: number
    expenseAmount: number
    linkedDividendPeriod?: { id: string } | null
    notes?: string | null
    profitAmount: number
    profitDate: string
    reason?: string | null
    sourceType: string
    status: string
  }
  dividendPeriods: Array<{ id: string; label: string }>
  financeStartDate?: string | null
  isLocked: boolean
}) {
  const isHistoricalEntry = Boolean(
    defaultValues?.sourceType && defaultValues.sourceType !== "manual"
  )
  const isProfitCaptureBlocked =
    !isHistoricalEntry && !currentProfitSeason.canRecordProfit
  const minimumProfitDate = isHistoricalEntry
    ? (financeStartDate ?? undefined)
    : [currentProfitSeason.periodStart, businessStartDate]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1)
  const maximumProfitDate = isHistoricalEntry
    ? (businessEndDate ?? undefined)
    : [currentProfitSeason.periodEnd, businessEndDate, currentLocalDate()]
        .filter((value): value is string => Boolean(value))
        .sort()[0]

  return (
    <>
      {!isHistoricalEntry ? (
        <div
          className="grid gap-1 border-b border-border/70 pb-4"
          data-current-profit-season
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-foreground">
              Current profit season
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {currentProfitSeason.status}
            </span>
          </div>
          <span className="text-sm text-foreground">
            {currentProfitSeason.label}
          </span>
          <span className="text-xs leading-5 text-muted-foreground">
            {currentProfitSeason.periodStart && currentProfitSeason.periodEnd
              ? `Record realized profit from ${minimumProfitDate ?? currentProfitSeason.periodStart} to ${maximumProfitDate ?? currentProfitSeason.periodEnd}. Distribution review begins after ${currentProfitSeason.periodEnd}.`
              : (currentProfitSeason.reason ??
                "Configure an open profit season before recording realized profit.")}
          </span>
        </div>
      ) : null}
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Profit date
        <DatePickerInput
          defaultValue={defaultValues?.profitDate}
          disabled={isLocked || isProfitCaptureBlocked}
          max={maximumProfitDate}
          min={minimumProfitDate}
          name="profitDate"
          placeholder="Select profit date"
          required
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Gross profit
        <CurrencyPrefixInput
          defaultValue={defaultValues?.profitAmount}
          disabled={isLocked || isProfitCaptureBlocked}
          min="0"
          name="profitAmount"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Expense / charges
        <CurrencyPrefixInput
          defaultValue={defaultValues?.expenseAmount}
          disabled={isLocked || isProfitCaptureBlocked}
          min="0"
          name="expenseAmount"
          step="0.01"
          type="number"
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Final allocatable profit
        <CurrencyPrefixInput
          defaultValue={defaultValues?.allocatableProfitAmount}
          disabled={isLocked || isProfitCaptureBlocked}
          min="0"
          name="allocatableProfitAmount"
          required
          step="0.01"
          type="number"
        />
      </label>
      {isHistoricalEntry ? (
        <BusinessDividendPeriodSelect
          defaultValue={defaultValues?.linkedDividendPeriod?.id ?? ""}
          dividendPeriods={dividendPeriods}
          disabled={isLocked}
        />
      ) : null}
      <input
        name="sourceType"
        type="hidden"
        value={isHistoricalEntry ? defaultValues?.sourceType : "manual"}
      />
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Status
        <NativeSelect
          defaultValue={defaultValues?.status ?? "draft"}
          disabled={isLocked || isProfitCaptureBlocked}
          name="status"
        >
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Reason
        <Input
          defaultValue={defaultValues?.reason ?? ""}
          disabled={isLocked || isProfitCaptureBlocked}
          name="reason"
          placeholder="Board approval or source file"
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Notes
        <Textarea
          defaultValue={defaultValues?.notes ?? ""}
          disabled={isLocked || isProfitCaptureBlocked}
          name="notes"
          placeholder="Optional internal note"
        />
      </label>
    </>
  )
}
