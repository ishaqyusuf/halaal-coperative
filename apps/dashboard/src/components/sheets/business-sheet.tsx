"use client"

import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { ShareBusinessProfitEntryForm } from "@/components/forms/tenant-finance-forms"
import { useBusinessParams } from "@/hooks/use-business-params"
import {
  markBusinessProfitPoolsReviewedAction,
  updateShareBusinessAction,
  updateShareBusinessProfitEntryAction,
  createShareBusinessProfitEntryAction,
} from "@/lib/dashboard-actions"
import type {
  Business,
  BusinessProfitEntry,
  DividendPeriodOption,
} from "@/components/tables/business/columns"

export function OpenReviewNoBusinessProfitSheet() {
  const { setParams } = useBusinessParams()

  return (
    <Button
      onClick={() => setParams({ businessType: "reviewNone" })}
      type="button"
      variant="outline"
    >
      Review none
    </Button>
  )
}

function getSelectedProfitEntry(
  business: Business | undefined,
  profitEntryId: string | null
): BusinessProfitEntry | null {
  if (!business) {
    return null
  }

  return (
    business.profitEntries.find((entry) => entry.id === profitEntryId) ??
    business.profitEntries[0] ??
    null
  )
}

export function BusinessSheet({
  canReviewNoProfit,
  dividendPeriods,
  financeStartDate,
  isLocked,
  rows,
}: {
  canReviewNoProfit: boolean
  dividendPeriods: DividendPeriodOption[]
  financeStartDate?: string | null
  isLocked: boolean
  rows: Business[]
}) {
  const { businessId, businessType, profitEntryId, setParams } =
    useBusinessParams()
  const isProfit = businessType === "profit"
  const isEdit = businessType === "edit"
  const isEditProfit = businessType === "editProfit"
  const isReviewNone = businessType === "reviewNone"
  const isOpen = isProfit || isEdit || isEditProfit || isReviewNone
  const business = rows.find((row) => row.id === businessId)
  const profitEntry = getSelectedProfitEntry(business, profitEntryId)
  const businessOptions = rows.map((row) => ({ id: row.id, label: row.name }))
  const title = isProfit
    ? "Add profit entry"
    : isEdit
      ? "Edit business"
      : isEditProfit
        ? "Edit profit entry"
        : "Review no business profits"

  const handleOnOpenChange = (open: boolean) => {
    if (!open) {
      setParams(null)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Historical business and profit entries are migration inputs used for
            member dividend and share profit computation.
          </SheetDescription>
        </SheetHeader>

        {isProfit && business ? (
          <form
            action={createShareBusinessProfitEntryAction}
            className="grid gap-4 px-6"
          >
            <input name="shareBusinessId" type="hidden" value={business.id} />
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Business
              <Input disabled value={business.name} />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Profit date
              <Input
                disabled={isLocked}
                min={financeStartDate ?? undefined}
                name="profitDate"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Gross profit
              <Input
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
              <Input
                disabled={isLocked}
                min="0"
                name="expenseAmount"
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Final allocatable profit
              <Input
                disabled={isLocked}
                min="0"
                name="allocatableProfitAmount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Dividend period
              <NativeSelect disabled={isLocked} name="linkedDividendPeriodId">
                <option value="">Not linked</option>
                {dividendPeriods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Source
              <NativeSelect
                defaultValue="backfill"
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
                defaultValue="draft"
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
                disabled={isLocked}
                name="reason"
                placeholder="Board approval or source file"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Notes
              <Textarea
                disabled={isLocked}
                name="notes"
                placeholder="Optional internal note"
              />
            </label>
            <Button disabled={isLocked} type="submit">
              Save profit entry
            </Button>
          </form>
        ) : isProfit ? (
          <div className="px-6">
            <ShareBusinessProfitEntryForm
              businesses={businessOptions}
              dividendPeriods={dividendPeriods}
              financeStartDate={financeStartDate}
            />
          </div>
        ) : isEdit && business ? (
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
              <Input
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
              <Input
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
              <Input
                defaultValue={business.startDate}
                disabled={isLocked}
                min={financeStartDate ?? undefined}
                name="startDate"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              End date
              <Input
                defaultValue={business.endDate ?? ""}
                disabled={isLocked}
                min={business.startDate || financeStartDate || undefined}
                name="endDate"
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Dividend period
              <NativeSelect
                defaultValue={business.linkedDividendPeriod?.id ?? ""}
                disabled={isLocked}
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
        ) : isEditProfit && profitEntry ? (
          <form
            action={updateShareBusinessProfitEntryAction}
            className="grid gap-4 px-6"
          >
            <input name="profitEntryId" type="hidden" value={profitEntry.id} />
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Profit date
              <Input
                defaultValue={profitEntry.profitDate}
                disabled={isLocked}
                min={financeStartDate ?? undefined}
                name="profitDate"
                required
                type="date"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Gross profit
              <Input
                defaultValue={profitEntry.profitAmount}
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
              <Input
                defaultValue={profitEntry.expenseAmount}
                disabled={isLocked}
                min="0"
                name="expenseAmount"
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Final allocatable profit
              <Input
                defaultValue={profitEntry.allocatableProfitAmount}
                disabled={isLocked}
                min="0"
                name="allocatableProfitAmount"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Dividend period
              <NativeSelect
                defaultValue={profitEntry.linkedDividendPeriod?.id ?? ""}
                disabled={isLocked}
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
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Source
              <NativeSelect
                defaultValue={profitEntry.sourceType}
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
                defaultValue={profitEntry.status}
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
                defaultValue={profitEntry.reason ?? ""}
                disabled={isLocked}
                name="reason"
                placeholder="Board approval or source file"
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-muted-foreground">
              Notes
              <Textarea
                defaultValue={profitEntry.notes ?? ""}
                disabled={isLocked}
                name="notes"
                placeholder="Optional internal note"
              />
            </label>
            <Button
              disabled={isLocked || profitEntry.hasPublishedAllocations}
              type="submit"
            >
              Save changes
            </Button>
          </form>
        ) : isReviewNone && canReviewNoProfit ? (
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
        ) : (
          <div className="px-6 text-sm text-muted-foreground">
            Select a business record to continue.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
