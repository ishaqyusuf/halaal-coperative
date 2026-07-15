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
      <div className="px-6">
        <ShareBusinessForm
          dividendPeriods={dividendPeriods}
          financeStartDate={financeStartDate}
          onSuccess={() => setParams(null)}
          profitHistoryLayout="single"
          profitHistoryMode
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
      <div className="grid gap-5 px-6">
        <div className="grid gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">{business.name}</p>
              <p className="text-sm text-muted-foreground">
                {business.startDate} to {business.endDate ?? "Ongoing"}
              </p>
            </div>
            <Badge variant="outline" className="capitalize">
              {displayEnum(business.status)}
            </Badge>
          </div>
          {business.notes ? (
            <p className="text-sm text-muted-foreground">{business.notes}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Capital</p>
            <p className="mt-1 font-medium">
              {formatCurrency(business.capitalAmount)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Recorded profit</p>
            <p className="mt-1 font-medium">
              {formatCurrency(business.profitAmount)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Latest profit entry</p>
          {latest ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {formatCurrency(latest.allocatableProfitAmount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {latest.profitDate} · {displayEnum(latest.status)}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {displayEnum(latest.sourceType)}
              </Badge>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No profit entry has been recorded yet.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
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
          <Button
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
            dividendPeriods={dividendPeriods}
            financeStartDate={financeStartDate}
            isLocked={isLocked}
          />
          <Button disabled={isLocked} type="submit">
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
            min={financeStartDate ?? undefined}
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
            min={business.startDate || financeStartDate || undefined}
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
          defaultValues={profitEntry}
          dividendPeriods={dividendPeriods}
          financeStartDate={financeStartDate}
          isLocked={isLocked}
        />
        <Button
          disabled={isLocked || profitEntry.hasPublishedAllocations}
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
  defaultValues,
  dividendPeriods,
  financeStartDate,
  isLocked,
}: {
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
  return (
    <>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Profit date
        <DatePickerInput
          defaultValue={defaultValues?.profitDate}
          disabled={isLocked}
          min={financeStartDate ?? undefined}
          name="profitDate"
          placeholder="Select profit date"
          required
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Gross profit
        <CurrencyPrefixInput
          defaultValue={defaultValues?.profitAmount}
          disabled={isLocked}
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
          disabled={isLocked}
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
          disabled={isLocked}
          min="0"
          name="allocatableProfitAmount"
          required
          step="0.01"
          type="number"
        />
      </label>
      <BusinessDividendPeriodSelect
        defaultValue={defaultValues?.linkedDividendPeriod?.id ?? ""}
        dividendPeriods={dividendPeriods}
        disabled={isLocked}
      />
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Source
        <NativeSelect
          defaultValue={defaultValues?.sourceType ?? "manual"}
          disabled={isLocked}
          name="sourceType"
        >
          <option value="manual">Manual</option>
          <option value="backfill">Backfill</option>
          <option value="import">Import</option>
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Status
        <NativeSelect
          defaultValue={defaultValues?.status ?? "draft"}
          disabled={isLocked}
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
          disabled={isLocked}
          name="reason"
          placeholder="Board approval or source file"
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Notes
        <Textarea
          defaultValue={defaultValues?.notes ?? ""}
          disabled={isLocked}
          name="notes"
          placeholder="Optional internal note"
        />
      </label>
    </>
  )
}
