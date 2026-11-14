"use client"

import {
  createQaAmount,
  qaFirstOfNextMonth,
  qaMonthLabel,
} from "@halaalvest/utils"
import { DashboardNativeQuickFill } from "@/components/dashboard-quick-fill"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  ChargeDefinitionForm,
  ChargeDefinitionVersionForm,
} from "@/components/forms/tenant-finance-forms"
import { ChargeAmountsList } from "@/components/charge/charge-amounts-list"
import { useChargeSheetFormContext } from "@/components/charge/form-context"
import { useChargeParams } from "@/hooks/use-charge-params"
import {
  createChargeDefinitionVersionAction,
  updateChargeDefinitionVersionAction,
} from "@/lib/dashboard-actions"

export function ChargeContent() {
  const { financeStartDate, isLocked, quickFillEnabled, rows } =
    useChargeSheetFormContext()
  const { chargeId, chargeType, chargeVersionId, setParams } = useChargeParams()
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
      <ChargeDefinitionForm
        devMode={quickFillEnabled}
        financeStartDate={financeStartDate}
        onSuccess={() => setParams(null)}
      />
    )
  }

  if (isUpdate && charge) {
    return (
      <form
        action={createChargeDefinitionVersionAction}
        className="grid gap-5"
      >
        <DashboardNativeQuickFill
          enabled={!isLocked && quickFillEnabled}
          values={() => ({
            amount: createQaAmount(500, 5_000, 250),
            // A dated update must come after the current version.
            effectiveFrom:
              financeStartDate && financeStartDate > qaFirstOfNextMonth()
                ? financeStartDate
                : qaFirstOfNextMonth(),
            notes: `Rate agreed at the ${qaMonthLabel()} general meeting.`,
          })}
        />
        <input name="chargeDefinitionId" type="hidden" value={charge.id} />
        <input name="kind" type="hidden" value={charge.kind} />
        <input
          name="chargeValueType"
          type="hidden"
          value={charge.chargeValueType}
        />
        <label className="grid gap-2 text-base font-medium text-foreground">
          Charge
          <Input disabled value={charge.name} />
        </label>
        <label className="grid gap-2 text-base font-medium text-foreground">
          Starts from
          <DatePickerInput
            disabled={isLocked}
            min={financeStartDate ?? undefined}
            name="effectiveFrom"
            placeholder="Pick a date"
            required
          />
        </label>
        <label className="grid gap-2 text-base font-medium text-foreground">
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
        <label className="grid gap-2 text-base font-medium text-foreground">
          Note (optional)
          <Textarea
            disabled={isLocked}
            name="notes"
            placeholder="For example: agreed at the general meeting"
          />
        </label>
        <Button className="h-12" disabled={isLocked} type="submit">
          Save new amount
        </Button>
      </form>
    )
  }

  if (isUpdate) {
    return (
      <ChargeDefinitionVersionForm
        chargeDefinitions={chargeOptions}
        financeStartDate={financeStartDate}
      />
    )
  }

  if (charge && !chargeVersionId) {
    return (
      <ChargeAmountsList
        charge={charge}
        isLocked={isLocked}
        onAdd={() =>
          setParams({ chargeType: "update", chargeVersionId: null })
        }
        onPick={(versionId) => setParams({ chargeVersionId: versionId })}
      />
    )
  }

  if (version) {
    return (
      <form
        action={updateChargeDefinitionVersionAction}
        className="grid gap-5"
      >
        <DashboardNativeQuickFill
          enabled={!isLocked && quickFillEnabled}
          values={() => ({
            amount: createQaAmount(500, 5_000, 250),
            // A dated update must come after the current version.
            effectiveFrom:
              financeStartDate && financeStartDate > qaFirstOfNextMonth()
                ? financeStartDate
                : qaFirstOfNextMonth(),
            notes: `Rate agreed at the ${qaMonthLabel()} general meeting.`,
          })}
        />
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
        <label className="grid gap-2 text-base font-medium text-foreground">
          Starts from
          <DatePickerInput
            defaultValue={version.effectiveFrom}
            disabled={isLocked}
            min={financeStartDate ?? undefined}
            name="effectiveFrom"
            placeholder="Pick a date"
            required
          />
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

  return (
    <p className="text-base text-muted-foreground">
      This charge wasn't found. Close and pick it again.
    </p>
  )
}
