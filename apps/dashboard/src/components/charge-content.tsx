"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  ChargeDefinitionForm,
  ChargeDefinitionVersionForm,
} from "@/components/forms/tenant-finance-forms"
import { useChargeSheetFormContext } from "@/components/charge/form-context"
import { useChargeParams } from "@/hooks/use-charge-params"
import {
  createChargeDefinitionVersionAction,
  updateChargeDefinitionVersionAction,
} from "@/lib/dashboard-actions"

export function ChargeContent() {
  const { financeStartDate, isLocked, quickFillEnabled, rows } =
    useChargeSheetFormContext()
  const { chargeId, chargeType, chargeVersionId, setParams } =
    useChargeParams()
  const isCreate = chargeType === "create"
  const isUpdate = chargeType === "update"
  const charge = rows.find((row) => row.id === chargeId)
  const version =
    charge?.versions.find((item) => item.id === chargeVersionId) ??
    charge?.currentVersion ??
    null
  const chargeOptions = rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: `${row.name} (${row.code})`,
  }))

  if (isCreate) {
    return (
      <div className="px-6">
        <ChargeDefinitionForm
          devMode={quickFillEnabled}
          financeStartDate={financeStartDate}
          onSuccess={() => setParams(null)}
        />
      </div>
    )
  }

  if (isUpdate && charge) {
    return (
      <form
        action={createChargeDefinitionVersionAction}
        className="grid gap-4 px-6"
      >
        <input name="chargeDefinitionId" type="hidden" value={charge.id} />
        <input name="kind" type="hidden" value={charge.kind} />
        <input
          name="chargeValueType"
          type="hidden"
          value={charge.chargeValueType}
        />
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Charge
          <Input disabled value={`${charge.name} (${charge.code})`} />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Effective date
          <DatePickerInput
            disabled={isLocked}
            min={financeStartDate ?? undefined}
            name="effectiveFrom"
            placeholder="Select effective date"
            required
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Amount
          <CurrencyPrefixInput
            disabled={isLocked}
            min="0"
            name="amount"
            placeholder="0.00"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          Notes
          <Textarea
            disabled={isLocked}
            name="notes"
            placeholder="Reason or board reference"
          />
        </label>
        <Button disabled={isLocked} type="submit">
          Save update
        </Button>
      </form>
    )
  }

  if (isUpdate) {
    return (
      <div className="px-6">
        <ChargeDefinitionVersionForm
          chargeDefinitions={chargeOptions}
          financeStartDate={financeStartDate}
        />
      </div>
    )
  }

  if (version) {
    return (
      <form
        action={updateChargeDefinitionVersionAction}
        className="grid gap-4 px-6"
      >
        <input
          name="chargeDefinitionVersionId"
          type="hidden"
          value={version.id}
        />
        <input
          name="chargeValueType"
          type="hidden"
          value={version.chargeValueType}
        />
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

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a charge update to edit.
    </div>
  )
}
