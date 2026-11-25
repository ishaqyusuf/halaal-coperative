"use client"

import type { LoanProductSettingsRow } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import { useState } from "react"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { SettingsToggle } from "@/components/finance-settings/settings-toggle"
import { useFinanceSettingsSave } from "@/components/finance-settings/use-finance-settings-save"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { updateLoanProductSettingsAction } from "@/lib/dashboard-actions"
import {
  formatMultiple,
  getLoanTypeName,
} from "@/lib/finance/finance-settings-words"
import { createQaLoanProductLimits } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"

/** One loan type: its name, longest repayment, borrowing limit, on or off. */
export function LoanProductForm({
  product,
}: {
  product: LoanProductSettingsRow
}) {
  const typeName = getLoanTypeName(product.loanType)
  const isNew = !product.id
  const [name, setName] = useState(product.name)
  const [termMonths, setTermMonths] = useState(String(product.termMonths))
  const [multiple, setMultiple] = useState(String(product.maxSavingsMultiple))
  // Setting up a missing product starts it on.
  const [isActive, setIsActive] = useState(isNew ? true : product.isActive)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const { setParams } = useTenantFinanceSettingsParams()
  const { isPending, save } = useFinanceSettingsSave({
    onDone: () => setParams(null),
    successTitle: `${typeName} saved`,
  })
  const turningOff = !isNew && product.isActive && !isActive
  const changes = [
    name.trim() !== product.name && {
      from: product.name,
      label: "Name",
      to: name.trim(),
    },
    Number(termMonths) !== product.termMonths && {
      from: `${product.termMonths} months`,
      label: "Longest repayment",
      to: `${Number(termMonths)} months`,
    },
    Number(multiple) !== product.maxSavingsMultiple && {
      from: formatMultiple(product.maxSavingsMultiple),
      label: "Most a member can borrow",
      to: formatMultiple(Number(multiple)),
    },
    isActive !== product.isActive && {
      from: product.isActive ? "On" : "Off",
      label: "Members can ask for it",
      to: isActive ? "On" : "Off",
    },
  ].filter((change): change is { from: string; label: string; to: string } =>
    Boolean(change)
  )

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const months = Number(termMonths)
    const times = Number(multiple)

    if (!name.trim()) return setError("Enter a name members will see.")
    if (!Number.isInteger(months) || months <= 0) {
      return setError("Enter the longest repayment in whole months.")
    }
    if (!(times > 0)) {
      return setError("Enter how many times their savings a member can borrow.")
    }

    setError(null)
    if (isNew || changes.length) setConfirming(true)
  }

  function onConfirm() {
    save(
      () =>
        updateLoanProductSettingsAction(
          objectToFormData(
            {
              code: product.code ?? "",
              isActive,
              loanProductId: product.id ?? "",
              loanType: product.loanType,
              maxSavingsMultiple: multiple,
              name: name.trim(),
              termMonths,
            },
            { booleanMode: "true-false" }
          )
        ),
      () => setConfirming(false)
    )
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit}>
      <DashboardStateQuickFill
        draft={{ multiple, termMonths }}
        enabled={!isPending}
        isDirty={
          Number(termMonths) !== product.termMonths ||
          Number(multiple) !== product.maxSavingsMultiple
        }
        onFill={() => {
          const limits = createQaLoanProductLimits(product.loanType)
          setTermMonths(limits.termMonths)
          setMultiple(limits.maxSavingsMultiple)
        }}
        restore={(draft) => {
          setTermMonths(draft.termMonths)
          setMultiple(draft.multiple)
        }}
      />
      <RequestField label="Name members see">
        <Input
          className="h-12 text-lg"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
      </RequestField>
      <div className="grid gap-5 sm:grid-cols-2">
        <RequestField label="Longest repayment (months)">
          <Input
            className="h-12 text-lg"
            inputMode="numeric"
            min={1}
            onChange={(event) => setTermMonths(event.target.value)}
            type="number"
            value={termMonths}
          />
        </RequestField>
        <RequestField label="Most a member can borrow (× savings)">
          <Input
            className="h-12 text-lg"
            inputMode="decimal"
            min={0.01}
            onChange={(event) => setMultiple(event.target.value)}
            step="0.01"
            type="number"
            value={multiple}
          />
        </RequestField>
      </div>
      <SettingsToggle
        checked={isActive}
        label={`Members can ask for a ${typeName.toLowerCase()}`}
        onChange={setIsActive}
      />
      {error ? (
        <p className="text-base font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <RequestFormActions>
        <Button disabled={isPending || (!isNew && !changes.length)} type="submit">
          {isNew
            ? `Start offering ${typeName.toLowerCase()}s`
            : changes.length
              ? "Save changes"
              : "No changes yet"}
        </Button>
      </RequestFormActions>

      <ConfirmActionDialog
        actionLabel={
          isNew
            ? "Start offering"
            : turningOff
              ? `Turn off ${typeName.toLowerCase()}s`
              : "Save changes"
        }
        description={
          turningOff
            ? `Members can't ask for ${typeName.toLowerCase()}s until you turn them back on. Loans already given don't change.`
            : "New requests use these limits straight away. Loans already given don't change."
        }
        destructive={turningOff}
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        open={confirming}
        pending={isPending}
        title={
          isNew
            ? `Start offering ${typeName.toLowerCase()}s?`
            : turningOff
              ? `Turn off ${typeName.toLowerCase()}s?`
              : `Save ${typeName.toLowerCase()} changes?`
        }
      >
        {changes.length && !isNew ? (
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
        ) : null}
      </ConfirmActionDialog>
    </form>
  )
}
