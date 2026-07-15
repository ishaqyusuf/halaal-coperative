"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  SharePolicyForm,
  ShareStructureVersionForm,
} from "@/components/forms/tenant-finance-forms"
import { useShareSheetFormContext } from "@/components/share/form-context"
import { useShareParams } from "@/hooks/use-share-params"
import { updateTenantShareStructureVersionAction } from "@/lib/dashboard-actions"

export function ShareContent() {
  const { financeStartDate, isLocked, rows, sharePolicy } =
    useShareSheetFormContext()
  const { setParams, shareId, shareType } = useShareParams()
  const isCreate = shareType === "create"
  const isPolicy = shareType === "policy"
  const version = rows.find((row) => row.id === shareId)

  if (isPolicy) {
    return (
      <div className="px-6">
        <SharePolicyForm defaultPolicy={sharePolicy} />
      </div>
    )
  }

  if (isCreate) {
    return (
      <div className="px-6">
        <ShareStructureVersionForm
          financeStartDate={financeStartDate}
          onSuccess={() => setParams(null)}
        />
      </div>
    )
  }

  if (!version) {
    return (
      <div className="px-6 text-sm text-muted-foreground">
        Select a share rule to edit.
      </div>
    )
  }

  return (
    <form
      action={updateTenantShareStructureVersionAction}
      className="grid gap-4 px-6"
    >
      <input name="shareStructureVersionId" type="hidden" value={version.id} />
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Effective date
        <DatePickerInput
          defaultValue={version.effectiveFrom}
          disabled={isLocked}
          min={financeStartDate ?? undefined}
          name="effectiveFrom"
          placeholder="Select effective date"
          required
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Rule
        <NativeSelect
          defaultValue={version.valueType}
          disabled={isLocked}
          name="valueType"
        >
          <option value="fixed_amount">Fixed amount</option>
          <option value="percentage">Percentage after charges</option>
        </NativeSelect>
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Value
        <CurrencyPrefixInput
          defaultValue={version.amount}
          disabled={isLocked}
          min="0"
          name="amount"
          required
          step="0.01"
          type="number"
        />
      </label>
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Notes
        <Textarea
          defaultValue={version.notes ?? ""}
          disabled={isLocked}
          name="notes"
          placeholder="Reason or board reference"
        />
      </label>
      <Button disabled={isLocked} type="submit">
        Save changes
      </Button>
    </form>
  )
}
