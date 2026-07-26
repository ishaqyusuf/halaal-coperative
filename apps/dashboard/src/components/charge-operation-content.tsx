"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import {
  ChargeApplicationForm,
  ChargeDefinitionForm,
} from "@/components/forms/finance-forms"
import { DatePickerInput } from "@/components/date-picker-input"
import { Input } from "@halaalvest/ui/components/input"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"
import {
  reverseChargeApplicationAction,
  updateChargeDefinitionAction,
  waiveChargeApplicationAction,
} from "@/lib/dashboard-actions"

export function ChargeOperationContent({
  activeCharges,
  devMode,
  members,
}: {
  activeCharges: Array<{ code: string; id: string; name: string }>
  devMode: boolean
  members: Array<{ fullName: string; id: string; memberNumber: string }>
}) {
  const {
    chargeApplicationId,
    chargeDefinitionId,
    chargeIsActive,
    chargeKind,
    chargeOperationSheetType,
    chargeValueType,
  } = useChargeOperationParams()

  if (chargeOperationSheetType === "definition") {
    return (
      <div className="px-6">
        <ChargeDefinitionForm devMode={devMode} />
      </div>
    )
  }

  if (chargeOperationSheetType === "application") {
    return (
      <div className="px-6">
        <ChargeApplicationForm
          chargeDefinitions={activeCharges.map((charge) => ({
            id: charge.id,
            label: charge.name,
          }))}
          devMode={devMode}
          members={members.map((member) => ({
            id: member.id,
            label: `${member.fullName} (${member.memberNumber})`,
          }))}
        />
      </div>
    )
  }

  if (chargeOperationSheetType === "waive") {
    return (
      <form action={waiveChargeApplicationAction} className="grid gap-4 px-6">
        <input
          name="chargeApplicationId"
          type="hidden"
          value={chargeApplicationId ?? ""}
        />
        <p className="text-sm text-muted-foreground">
          Waive this posted charge application. This action is recorded against
          the application history.
        </p>
        <Button disabled={!chargeApplicationId} type="submit" variant="outline">
          Waive charge
        </Button>
      </form>
    )
  }

  if (chargeOperationSheetType === "reverse") {
    return (
      <form action={reverseChargeApplicationAction} className="grid gap-4 px-6">
        <input
          name="chargeApplicationId"
          type="hidden"
          value={chargeApplicationId ?? ""}
        />
        <p className="text-sm text-muted-foreground">
          Reverse this posted charge application and keep the correction visible
          in activity history.
        </p>
        <Button disabled={!chargeApplicationId} type="submit" variant="outline">
          Reverse charge
        </Button>
      </form>
    )
  }

  if (chargeOperationSheetType === "toggle") {
    const activating = chargeIsActive === "true"

    return (
      <form action={updateChargeDefinitionAction} className="grid gap-4 px-6">
        <input
          name="chargeDefinitionId"
          type="hidden"
          value={chargeDefinitionId ?? ""}
        />
        <input name="isActive" type="hidden" value={chargeIsActive ?? ""} />
        <p className="text-sm text-muted-foreground">
          {activating
            ? "Activate this charge so it can be used for future postings."
            : "Deactivate this charge so it is no longer available for new postings."}
        </p>
        <Button
          disabled={!chargeDefinitionId || !chargeIsActive}
          type="submit"
          variant="outline"
        >
          {activating ? "Activate charge" : "Deactivate charge"}
        </Button>
      </form>
    )
  }

  if (chargeOperationSheetType === "version") {
    return (
      <form action={updateChargeDefinitionAction} className="grid gap-4 px-6">
        <input
          name="chargeDefinitionId"
          type="hidden"
          value={chargeDefinitionId ?? ""}
        />
        <input name="kind" type="hidden" value={chargeKind ?? ""} />
        <input
          name="chargeValueType"
          type="hidden"
          value={chargeValueType ?? ""}
        />
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Effective date
          <DatePickerInput
            name="effectiveFrom"
            placeholder="Select effective date"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          New amount
          <CurrencyPrefixInput
            min="0"
            name="amount"
            placeholder="0.00"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-foreground">
          Notes
          <Input
            name="notes"
            placeholder="Reason or board reference"
            type="text"
          />
        </label>
        <Button disabled={!chargeDefinitionId} type="submit" variant="outline">
          Save live update
        </Button>
      </form>
    )
  }

  return (
    <div className="px-6 text-sm text-muted-foreground">
      Select a charge action to continue.
    </div>
  )
}
