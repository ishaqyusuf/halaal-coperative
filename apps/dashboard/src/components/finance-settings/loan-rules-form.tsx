"use client"

import type { TenantFinancingSettingsWorkspace } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { Input } from "@halaalvest/ui/components/input"
import { formatCurrency } from "@halaalvest/utils"
import { useState } from "react"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { SettingsToggle } from "@/components/finance-settings/settings-toggle"
import { useFinanceSettingsSave } from "@/components/finance-settings/use-finance-settings-save"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { updateTenantFinancingPolicyAction } from "@/lib/dashboard-actions"
import {
  getLoanRuleChanges,
  getLoanSplitPreview,
  type LoanRules,
  validateLoanRules,
} from "@/lib/finance/loan-rules"
import { objectToFormData } from "@/lib/form-submit"

type Policy = TenantFinancingSettingsWorkspace["policy"]
type Preview = {
  existingCycle: { status: string } | null
  projectedCommitmentAmount: number
}

function toRules(policy: Policy): LoanRules {
  return {
    activeFinancingBlocksEmergency: policy.activeFinancingBlocksEmergency,
    activeFinancingBlocksProcurement: policy.activeFinancingBlocksProcurement,
    disbursementRequiresDeployableFunds:
      policy.disbursementRequiresDeployableFunds,
    foodPurchaseAllowsCommitmentReductionDuringPayback:
      policy.foodPurchaseAllowsCommitmentReductionDuringPayback,
    foodPurchaseMaximumPaybackMonths: String(
      policy.foodPurchaseMaximumPaybackMonths
    ),
    loanEligibilityMultiple: String(policy.loanEligibilityMultiple),
    procurementAllowsCommitmentReductionDuringPayback:
      policy.procurementAllowsCommitmentReductionDuringPayback,
    procurementMaximumPaybackMonths: String(
      policy.procurementMaximumPaybackMonths
    ),
    quickLoanAllocationPercentage: String(policy.quickLoanAllocationPercentage),
    requiresDualLoanApproval: policy.requiresDualLoanApproval,
    reserveBufferAmount: String(policy.reserveBufferAmount),
    specialSavingsCountsForEligibility:
      policy.specialSavingsCountsForEligibility,
    strictCommitmentDuringFinancing: policy.strictCommitmentDuringFinancing,
  }
}

function RulesGroup({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <fieldset className="grid gap-4 border-t border-border pt-5 first:border-t-0 first:pt-0">
      <legend className="mb-1 text-lg font-semibold text-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

/** Loan rules: the monthly split, who can borrow, approving and paying out. */
export function LoanRulesForm({
  policy,
  preview,
}: {
  policy: Policy
  preview: Preview
}) {
  const initial = toRules(policy)
  const [rules, setRules] = useState<LoanRules>(initial)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setParams } = useTenantFinanceSettingsParams()
  const { isPending, save } = useFinanceSettingsSave({
    onDone: () => setParams(null),
    successTitle: "Loan rules saved",
  })
  const split = getLoanSplitPreview(rules, preview.projectedCommitmentAmount)
  const changes = getLoanRuleChanges(initial, rules)
  const cycleIsOpen = preview.existingCycle?.status === "open"

  function set<K extends keyof LoanRules>(key: K, value: LoanRules[K]) {
    setRules((current) => ({ ...current, [key]: value }))
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validateLoanRules(rules)
    setError(problem)

    if (!problem && changes.length) setConfirming(true)
  }

  function onConfirm() {
    save(
      () =>
        updateTenantFinancingPolicyAction(
          objectToFormData(
            {
              ...rules,
              normalLoanAllocationPercentage: String(
                100 - Number(rules.quickLoanAllocationPercentage)
              ),
              // Product terms live on each loan type; these are kept as they are.
              normalLoanTermMonths: String(policy.normalLoanTermMonths),
              quickLoanTermMonths: String(policy.quickLoanTermMonths),
            },
            { booleanMode: "true-false" }
          )
        ),
      () => setConfirming(false)
    )
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <RulesGroup title="Money for loans each month">
        <RequestField
          hint="This money is never lent out."
          label="Keep aside each month"
        >
          <CurrencyInput
            allowNegative={false}
            className="h-12 text-lg"
            decimalScale={2}
            inputMode="decimal"
            onValueChange={(values) => set("reserveBufferAmount", values.value)}
            value={rules.reserveBufferAmount}
            valueIsNumericString
          />
        </RequestField>
        <RequestField
          hint={`Normal loans get the rest: ${split.normalPercentage}%.`}
          label="Part for quick loans (%)"
        >
          <Input
            className="h-12 text-lg"
            inputMode="decimal"
            max={100}
            min={0}
            onChange={(event) =>
              set("quickLoanAllocationPercentage", event.target.value)
            }
            type="number"
            value={rules.quickLoanAllocationPercentage}
          />
        </RequestField>
        <div
          aria-live="polite"
          className="grid gap-1 rounded-(--ui-radius-control) bg-muted/60 px-4 py-3 text-base"
        >
          <p className="font-medium text-foreground">
            With these rules, this month:
          </p>
          <p>
            {formatCurrency(split.total)} to lend ·{" "}
            {formatCurrency(split.quick)} for quick loans ·{" "}
            {formatCurrency(split.normal)} for normal loans
          </p>
          {cycleIsOpen ? (
            <p className="text-muted-foreground">
              Loan requests are already open this month, so this month keeps
              its amounts. The new split starts next month.
            </p>
          ) : null}
        </div>
      </RulesGroup>

      <RulesGroup title="Who can borrow">
        <RequestField
          hint="Each loan type can set a lower limit."
          label="Most a member can borrow (× their savings)"
        >
          <Input
            className="h-12 text-lg"
            inputMode="decimal"
            min={0.01}
            onChange={(event) =>
              set("loanEligibilityMultiple", event.target.value)
            }
            step="0.01"
            type="number"
            value={rules.loanEligibilityMultiple}
          />
        </RequestField>
        <SettingsToggle
          checked={rules.specialSavingsCountsForEligibility}
          label="Special savings count towards how much they can borrow"
          onChange={(value) => set("specialSavingsCountsForEligibility", value)}
        />
        <SettingsToggle
          checked={rules.strictCommitmentDuringFinancing}
          label="Members can't lower their monthly savings while repaying"
          onChange={(value) => set("strictCommitmentDuringFinancing", value)}
        />
        <SettingsToggle
          checked={rules.activeFinancingBlocksEmergency}
          label="A member repaying a loan can't take a quick loan"
          onChange={(value) => set("activeFinancingBlocksEmergency", value)}
        />
        <SettingsToggle
          checked={rules.activeFinancingBlocksProcurement}
          label="A member repaying a loan can't ask for a purchase"
          onChange={(value) => set("activeFinancingBlocksProcurement", value)}
        />
      </RulesGroup>

      <RulesGroup title="Approving and paying out">
        <SettingsToggle
          checked={rules.requiresDualLoanApproval}
          label="Two people must approve each loan"
          onChange={(value) => set("requiresDualLoanApproval", value)}
        />
        <SettingsToggle
          checked={rules.disbursementRequiresDeployableFunds}
          label="Only pay out when the money is in the account"
          onChange={(value) =>
            set("disbursementRequiresDeployableFunds", value)
          }
        />
      </RulesGroup>

      <RulesGroup title="Purchases and foodstuff">
        <div className="grid gap-4 sm:grid-cols-2">
          <RequestField label="Longest repayment for purchases (months)">
            <Input
              className="h-12 text-lg"
              inputMode="numeric"
              min={1}
              onChange={(event) =>
                set("procurementMaximumPaybackMonths", event.target.value)
              }
              type="number"
              value={rules.procurementMaximumPaybackMonths}
            />
          </RequestField>
          <RequestField label="Longest repayment for foodstuff (months)">
            <Input
              className="h-12 text-lg"
              inputMode="numeric"
              min={1}
              onChange={(event) =>
                set("foodPurchaseMaximumPaybackMonths", event.target.value)
              }
              type="number"
              value={rules.foodPurchaseMaximumPaybackMonths}
            />
          </RequestField>
        </div>
        <SettingsToggle
          checked={rules.procurementAllowsCommitmentReductionDuringPayback}
          label="Members can lower monthly savings while paying for a purchase"
          onChange={(value) =>
            set("procurementAllowsCommitmentReductionDuringPayback", value)
          }
        />
        <SettingsToggle
          checked={rules.foodPurchaseAllowsCommitmentReductionDuringPayback}
          label="Members can lower monthly savings while paying for foodstuff"
          onChange={(value) =>
            set("foodPurchaseAllowsCommitmentReductionDuringPayback", value)
          }
        />
      </RulesGroup>

      {error ? (
        <p className="text-base font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <RequestFormActions>
        <Button disabled={isPending || !changes.length} type="submit">
          {changes.length ? "Save loan rules" : "No changes yet"}
        </Button>
      </RequestFormActions>

      <ConfirmActionDialog
        actionLabel="Save loan rules"
        description={
          cycleIsOpen
            ? "New loan requests follow these rules straight away. This month's loan money stays as it is."
            : "New loan requests follow these rules straight away. Loans already given don't change."
        }
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        open={confirming}
        pending={isPending}
        title="Save new loan rules?"
      >
        <ul className="grid gap-2 text-base">
          {changes.map((change) => (
            <li className="grid gap-0.5" key={change.label}>
              <span className="text-muted-foreground">{change.label}</span>
              <span className="font-medium text-foreground">
                {change.from} → {change.to}
              </span>
            </li>
          ))}
        </ul>
      </ConfirmActionDialog>
    </form>
  )
}

