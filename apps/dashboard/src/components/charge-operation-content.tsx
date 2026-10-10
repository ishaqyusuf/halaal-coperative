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
import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useTRPC } from "@/trpc/client"
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
  activeCharges: Array<{
    amount: number
    code: string
    id: string
    name: string
  }>
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
    setParams,
  } = useChargeOperationParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()

  async function refreshCharges() {
    await queryClient.invalidateQueries({
      queryKey: trpc.charges.chargeLibrary.queryKey(),
    })
    await setParams(null)
    router.refresh()
  }

  if (chargeOperationSheetType === "definition") {
    return (
      <div className="px-6">
        <ChargeDefinitionForm devMode={devMode} onSuccess={refreshCharges} />
      </div>
    )
  }

  if (chargeOperationSheetType === "application") {
    if (!activeCharges.length) {
      return (
        <div className="grid gap-4 px-6">
          <div className="border-y border-border py-5">
            <h3 className="font-medium">No active fixed charges</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create or activate a fixed-amount charge before posting a manual
              charge to a member. Percentage charges are assessed only by their
              configured workflow.
            </p>
          </div>
          <Button
            className="h-11 md:h-9"
            onClick={() =>
              void setParams({ chargeOperationSheetType: "definition" })
            }
            type="button"
          >
            New charge
          </Button>
        </div>
      )
    }

    return (
      <div className="px-6">
        <ChargeApplicationForm
          chargeDefinitions={activeCharges.map((charge) => ({
            id: charge.id,
            label: charge.name,
            amount: charge.amount,
          }))}
          devMode={devMode}
          members={members.map((member) => ({
            id: member.id,
            label: `${member.fullName} (${member.memberNumber})`,
          }))}
          onSuccess={refreshCharges}
        />
      </div>
    )
  }

  if (chargeOperationSheetType === "waive") {
    return (
      <form
        action={async (formData) => {
          await waiveChargeApplicationAction(formData)
          await refreshCharges()
        }}
        className="grid gap-4 px-6"
      >
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
      <form
        action={async (formData) => {
          await reverseChargeApplicationAction(formData)
          await refreshCharges()
        }}
        className="grid gap-4 px-6"
      >
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
      <form
        action={async (formData) => {
          await updateChargeDefinitionAction(formData)
          await refreshCharges()
        }}
        className="grid gap-4 px-6"
      >
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
      <form
        action={async (formData) => {
          await updateChargeDefinitionAction(formData)
          await refreshCharges()
        }}
        className="grid gap-4 px-6"
      >
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
