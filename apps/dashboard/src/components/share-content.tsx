"use client"

import {
  createQaAmount,
  qaFirstOfNextMonth,
  qaMonthLabel,
} from "@halaalvest/utils"
import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { DatePickerInput } from "@/components/date-picker-input"
import { ShareModelForm } from "@/components/finance-settings/share-model-form"
import { ShareStructureVersionForm } from "@/components/forms/tenant-finance-forms"
import { useShareSheetFormContext } from "@/components/share/form-context"
import { useShareParams } from "@/hooks/use-share-params"
import { updateTenantShareStructureVersionAction } from "@/lib/dashboard-actions"

export function ShareContent() {
  const { canChangeModel, financeStartDate, isLocked, rows, sharePolicy } =
    useShareSheetFormContext()
  const { setParams, shareId, shareType } = useShareParams()
  const isCreate = shareType === "create"
  const isPolicy = shareType === "policy"
  const version = rows.find((row) => row.id === shareId)

  if (isPolicy) {
    return (
      <ShareModelForm
        canChangeModel={canChangeModel ?? false}
        policy={sharePolicy}
      />
    )
  }

  if (isCreate) {
    return (
      <ShareStructureVersionForm
        financeStartDate={financeStartDate}
        onSuccess={() => setParams(null)}
      />
    )
  }

  if (!version) {
    return (
      <p className="text-base text-muted-foreground">
        This amount wasn’t found. Close and pick it again.
      </p>
    )
  }

  return (
    <form
      action={updateTenantShareStructureVersionAction}
      className="grid gap-5"
    >
      <DashboardNativeQuickFill
        values={() => ({
          amount: createQaAmount(2_000, 10_000, 500),
          effectiveFrom: qaFirstOfNextMonth(),
          notes: `Share value reviewed at the ${qaMonthLabel()} general meeting.`,
          valueType: "fixed_amount",
        })}
      />
      <input name="shareStructureVersionId" type="hidden" value={version.id} />
      <label className="grid gap-2 text-base font-medium text-foreground">
        Starts from
        <DatePickerInput
          defaultValue={version.effectiveFrom}
          disabled={isLocked}
          min={financeStartDate ?? undefined}
          name="effectiveFrom"
          placeholder="Select effective date"
          required
        />
      </label>
      <label className="grid gap-2 text-base font-medium text-foreground">
        How it’s worked out
        <NativeSelect
          defaultValue={version.valueType}
          disabled={isLocked}
          name="valueType"
        >
          <option value="fixed_amount">A fixed amount</option>
          <option value="percentage">A part of each payment, after charges</option>
        </NativeSelect>
      </label>
      <label className="grid gap-2 text-base font-medium text-foreground">
        Amount
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
      <label className="grid gap-2 text-base font-medium text-foreground">
        Note (optional)
        <Textarea
          defaultValue={version.notes ?? ""}
          disabled={isLocked}
          name="notes"
          placeholder="For example: agreed at the general meeting"
        />
      </label>
      <Button className="h-12" disabled={isLocked} type="submit">
        Save changes
      </Button>
    </form>
  )
}
