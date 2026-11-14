"use client"

import type { TenantSharePolicySettings } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { formatCurrency } from "@halaalvest/utils"
import { useState } from "react"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { useFinanceSettingsSave } from "@/components/finance-settings/use-finance-settings-save"
import { RequestChoice } from "@/components/requests/request-choice"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useShareParams } from "@/hooks/use-share-params"
import { updateTenantSharePolicyAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

type Mode = TenantSharePolicySettings["configurationMode"]

const modeOptions: ReadonlyArray<{ label: string; value: Mode }> = [
  { label: "Members buy share units", value: "unit_based" },
  { label: "Part of each monthly payment", value: "monthly_history" },
]

/**
 * The share model. The model itself can change only while past setup is
 * open; once members' records are in, only the unit price and limits can.
 */
export function ShareModelForm({
  canChangeModel,
  policy,
}: {
  canChangeModel: boolean
  policy: TenantSharePolicySettings
}) {
  const [mode, setMode] = useState<Mode>(policy.configurationMode)
  const [unitAmount, setUnitAmount] = useState(String(policy.unitAmount))
  const [least, setLeast] = useState(String(policy.compulsoryShareUnits))
  const [most, setMost] = useState(String(policy.maximumShareUnits))
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const { setParams } = useShareParams()
  const { isPending, save } = useFinanceSettingsSave({
    onDone: () => setParams(null),
    successTitle: "Shares saved",
  })
  const isUnits = mode === "unit_based"
  const changes = [
    mode !== policy.configurationMode && {
      from:
        modeOptions.find((option) => option.value === policy.configurationMode)
          ?.label ?? "",
      label: "How members hold shares",
      to: modeOptions.find((option) => option.value === mode)?.label ?? "",
    },
    isUnits &&
      Number(unitAmount) !== policy.unitAmount && {
        from: formatCurrency(policy.unitAmount),
        label: "Price of one unit",
        to: formatCurrency(Number(unitAmount)),
      },
    isUnits &&
      (Number(least) !== policy.compulsoryShareUnits ||
        Number(most) !== policy.maximumShareUnits) && {
        from: `${policy.compulsoryShareUnits} to ${policy.maximumShareUnits} units`,
        label: "Units each member holds",
        to: `${Number(least)} to ${Number(most)} units`,
      },
  ].filter((change): change is { from: string; label: string; to: string } =>
    Boolean(change)
  )

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (isUnits) {
      const price = Number(unitAmount)
      const fewest = Number(least)
      const largest = Number(most)

      if (!(price > 0)) return setError("Enter the price of one unit.")
      if (!Number.isInteger(fewest) || fewest < 0) {
        return setError("Enter the fewest units as a whole number (0 or more).")
      }
      if (!Number.isInteger(largest) || largest <= 0) {
        return setError("Enter the most units as a whole number.")
      }
      if (largest < fewest) {
        return setError("The most units can't be below the fewest.")
      }
    }

    setError(null)
    if (changes.length) setConfirming(true)
  }

  function onConfirm() {
    save(
      () =>
        updateTenantSharePolicyAction(
          objectToFormData(
            isUnits
              ? {
                  compulsoryShareUnits: least,
                  configurationMode: mode,
                  maximumShareUnits: most,
                  unitAmount,
                }
              : { configurationMode: mode }
          )
        ),
      () => setConfirming(false)
    )
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      {canChangeModel ? (
        <RequestChoice
          label="How do members hold shares?"
          onChange={setMode}
          options={modeOptions}
          value={mode}
        />
      ) : null}
      {isUnits ? (
        <>
          <RequestField label="Price of one unit">
            <CurrencyInput
              allowNegative={false}
              className="h-12 text-lg"
              decimalScale={2}
              inputMode="decimal"
              onValueChange={(values) => setUnitAmount(values.value)}
              value={unitAmount}
              valueIsNumericString
            />
          </RequestField>
          <div className="grid gap-5 sm:grid-cols-2">
            <RequestField label="Fewest units a member must hold">
              <Input
                className="h-12 text-lg"
                inputMode="numeric"
                min={0}
                onChange={(event) => setLeast(event.target.value)}
                type="number"
                value={least}
              />
            </RequestField>
            <RequestField label="Most units a member can hold">
              <Input
                className="h-12 text-lg"
                inputMode="numeric"
                min={1}
                onChange={(event) => setMost(event.target.value)}
                type="number"
                value={most}
              />
            </RequestField>
          </div>
        </>
      ) : (
        <p className="text-base text-muted-foreground">
          Set the monthly share amount on the Shares page after saving.
        </p>
      )}
      {error ? (
        <p className="text-base font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <RequestFormActions>
        <Button disabled={isPending || !changes.length} type="submit">
          {changes.length ? "Save shares" : "No changes yet"}
        </Button>
      </RequestFormActions>

      <ConfirmActionDialog
        actionLabel="Save shares"
        description={
          mode !== policy.configurationMode
            ? "Members' shares follow the new way from now on."
            : "New share requests use these terms. Shares members already hold keep the price they paid."
        }
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        open={confirming}
        pending={isPending}
        title="Change how shares work?"
      >
        <ul className="grid gap-2 text-base">
          {changes.map((change) => (
            <li className="grid gap-0.5" key={change.label}>
              <span className="text-muted-foreground">{change.label}</span>
              <span className="font-medium">
                {change.from} → {change.to}
              </span>
            </li>
          ))}
        </ul>
      </ConfirmActionDialog>
    </form>
  )
}
