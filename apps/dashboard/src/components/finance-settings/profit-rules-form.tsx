"use client"

import type { TenantBusinessProfitPolicySettings } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import { formatCurrency } from "@halaalvest/utils"
import { useState } from "react"
import { ConfirmActionDialog } from "@/components/confirm-action-dialog"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import { SettingsToggle } from "@/components/finance-settings/settings-toggle"
import { useFinanceSettingsSave } from "@/components/finance-settings/use-finance-settings-save"
import { RequestChoice } from "@/components/requests/request-choice"
import {
  RequestField,
  RequestFormActions,
} from "@/components/requests/request-field"
import { useTenantFinanceSettingsParams } from "@/hooks/use-tenant-finance-settings-params"
import { updateTenantBusinessProfitPolicyAction } from "@/lib/dashboard-actions"
import {
  getMonthName,
  getProfitFrequencyWords,
  getProfitSeasonPattern,
  profitFrequencyOptions,
} from "@/lib/finance/finance-settings-words"
import { createQaProfitRules } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"

type Policy = TenantBusinessProfitPolicySettings
type PastProfit = Policy["historicalProfitMigrationMode"]

const pastProfitOptions: ReadonlyArray<{ label: string; value: PastProfit }> = [
  { label: "We'll add it by hand", value: "manual_review_required" },
  { label: "We'll import it", value: "import_historical_profit_pools" },
  { label: "There was none", value: "no_historical_business_profit" },
]

const exampleProfit = 1_000_000

/** How business profit is shared: how often, how much, and approval. */
export function ProfitRulesForm({
  canChangePastProfit,
  policy,
}: {
  /** Past profit (before Halaalvest) can be set only during setup. */
  canChangePastProfit: boolean
  policy: Policy
}) {
  const [frequency, setFrequency] = useState(policy.profitDistributionFrequency)
  const [startMonth, setStartMonth] = useState(policy.financialYearStartMonth)
  const [membersPart, setMembersPart] = useState(
    String(policy.defaultDistributablePercentage)
  )
  const [needsApproval, setNeedsApproval] = useState(
    policy.requiresProfitDistributionApproval
  )
  const [pastProfit, setPastProfit] = useState<PastProfit>(
    policy.historicalProfitMigrationMode
  )
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const { setParams } = useTenantFinanceSettingsParams()
  const { isPending, save } = useFinanceSettingsSave({
    onDone: () => setParams(null),
    successTitle: "Profit sharing saved",
  })
  const membersPercentage = Number(membersPart)
  const validPart =
    membersPart !== "" && membersPercentage >= 0 && membersPercentage <= 100
  const reservePercentage = validPart
    ? Number((100 - membersPercentage).toFixed(2))
    : null
  const changes = [
    frequency !== policy.profitDistributionFrequency && {
      from: getProfitFrequencyWords(policy.profitDistributionFrequency),
      label: "How often",
      to: getProfitFrequencyWords(frequency),
    },
    startMonth !== policy.financialYearStartMonth && {
      from: getMonthName(policy.financialYearStartMonth),
      label: "Financial year starts",
      to: getMonthName(startMonth),
    },
    validPart &&
      membersPercentage !== policy.defaultDistributablePercentage && {
        from: `${policy.defaultDistributablePercentage}%`,
        label: "Goes to members",
        to: `${membersPercentage}%`,
      },
    needsApproval !== policy.requiresProfitDistributionApproval && {
      from: policy.requiresProfitDistributionApproval ? "Yes" : "No",
      label: "Board approves first",
      to: needsApproval ? "Yes" : "No",
    },
    pastProfit !== policy.historicalProfitMigrationMode && {
      from:
        pastProfitOptions.find(
          (option) => option.value === policy.historicalProfitMigrationMode
        )?.label ?? "",
      label: "Profit from before Halaalvest",
      to:
        pastProfitOptions.find((option) => option.value === pastProfit)
          ?.label ?? "",
    },
  ].filter((change): change is { from: string; label: string; to: string } =>
    Boolean(change)
  )

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!validPart) {
      return setError("The part for members must be between 0 and 100.")
    }

    setError(null)
    if (changes.length) setConfirming(true)
  }

  function onConfirm() {
    save(
      () =>
        updateTenantBusinessProfitPolicyAction(
          objectToFormData({
            defaultDistributablePercentage: String(membersPercentage),
            distributionBasis: policy.distributionBasis,
            expenseTreatment: policy.expenseTreatment,
            financialYearStartMonth: String(startMonth),
            historicalProfitMigrationMode: pastProfit,
            profitDistributionFrequency: frequency,
            requiresProfitDistributionApproval: needsApproval,
            reserveRetentionPercentage: String(reservePercentage ?? 0),
          })
        ),
      () => setConfirming(false)
    )
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      {/* Board approval and past profit stay as they are: both are decisions. */}
      <DashboardStateQuickFill
        draft={{ frequency, membersPart, startMonth }}
        enabled={!isPending}
        isDirty={changes.length > 0}
        onFill={() => {
          const draft = createQaProfitRules()
          setFrequency(draft.frequency)
          setStartMonth(draft.startMonth)
          setMembersPart(draft.membersPart)
        }}
        restore={(draft) => {
          setFrequency(draft.frequency)
          setStartMonth(draft.startMonth)
          setMembersPart(draft.membersPart)
        }}
      />
      <RequestChoice
        label="How often is profit shared?"
        onChange={setFrequency}
        options={profitFrequencyOptions}
        value={frequency}
      />
      <RequestField label="Financial year starts in">
        <NativeSelect
          className="[&_select]:h-12 [&_select]:text-lg"
          onChange={(event) => setStartMonth(Number(event.target.value))}
          value={startMonth}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <NativeSelectOption key={index + 1} value={index + 1}>
              {getMonthName(index + 1)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </RequestField>
      <p className="-mt-3 text-base text-muted-foreground">
        Seasons: {getProfitSeasonPattern(frequency, startMonth)}
      </p>
      <RequestField
        hint={
          reservePercentage === null
            ? undefined
            : `The rest (${reservePercentage}%) stays in the cooperative's reserve.`
        }
        label="Part of profit that goes to members (%)"
      >
        <Input
          className="h-12 text-lg"
          inputMode="decimal"
          max={100}
          min={0}
          onChange={(event) => setMembersPart(event.target.value)}
          type="number"
          value={membersPart}
        />
      </RequestField>
      {validPart ? (
        <p
          aria-live="polite"
          className="rounded-(--ui-radius-control) bg-muted/60 px-4 py-3 text-base"
        >
          Example: from {formatCurrency(exampleProfit)} profit, members share{" "}
          {formatCurrency((exampleProfit * membersPercentage) / 100)} by the
          share capital each one holds, and{" "}
          {formatCurrency((exampleProfit * (reservePercentage ?? 0)) / 100)}{" "}
          stays in reserve.
        </p>
      ) : null}
      <SettingsToggle
        checked={needsApproval}
        label="The board approves before profit is shared"
        onChange={setNeedsApproval}
      />
      {canChangePastProfit ? (
        <RequestChoice
          label="Profit from before Halaalvest"
          onChange={setPastProfit}
          options={pastProfitOptions}
          value={pastProfit}
        />
      ) : null}
      {error ? (
        <p className="text-base font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <RequestFormActions>
        <Button disabled={isPending || !changes.length} type="submit">
          {changes.length ? "Save profit sharing" : "No changes yet"}
        </Button>
      </RequestFormActions>

      <ConfirmActionDialog
        actionLabel="Save profit sharing"
        description="The next profit season follows these rules. Profit already shared with members doesn't change."
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        open={confirming}
        pending={isPending}
        title="Change how profit is shared?"
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
