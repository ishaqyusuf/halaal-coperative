import type { TenantFinanceSetupLock } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import type { ReactNode } from "react"
import {
  FinanceSettingsFrame,
  FinanceSettingsSection,
} from "@/components/finance-settings/finance-settings-frame"
import { getLoanMonthLabel } from "@/components/finance-settings/loan-month-label"
import { OpenTenantFinanceSettingsSheet } from "@/components/open-tenant-finance-settings-sheet"
import { RequestFacts } from "@/components/requests/request-facts"
import { TenantFinanceSettingsSheet } from "@/components/sheets/tenant-finance-settings-sheet"
import { SummaryCard } from "@/components/summary-card"
import type { FinancingSettingsView } from "@/components/tenant-finance-settings-content"
import {
  formatMultiple,
  getLoanProductWords,
  getLoanTypeName,
  getLoanWindowWords,
} from "@/lib/finance/finance-settings-words"

/**
 * Loans in Finance setup: this month's loan money and requests, the two loan
 * types, and the rules. `historicalLoans` is the opening-loans tool, shown
 * only while past records can still be added.
 */
export function LoanSettingsView({
  financingSettings,
  historicalLoans,
  lock,
}: {
  financingSettings: FinancingSettingsView
  historicalLoans?: ReactNode
  lock: Pick<TenantFinanceSetupLock, "isLive">
}) {
  const { currentCyclePreview: month, policy, products } = financingSettings
  const status = month.existingCycle?.status ?? "draft"
  const monthLabel = getLoanMonthLabel(month.periodStart)
  const collectedShort =
    month.receivedContributionAmount < month.projectedCommitmentAmount

  return (
    <FinanceSettingsFrame intro="How much the cooperative lends each month, and to whom.">
      <FinanceSettingsSection
        action={
          lock.isLive && status !== "closed" ? (
            <OpenTenantFinanceSettingsSheet
              label={
                status === "open"
                  ? "Pause or close"
                  : status === "paused"
                    ? "Open or close"
                    : "Open loan requests"
              }
              type="financingCycle"
              variant={status === "open" ? "outline" : "default"}
            />
          ) : null
        }
        title={monthLabel}
      >
        <p className="text-lg">
          Loan requests:{" "}
          <span className="font-semibold">{getLoanWindowWords(status)}</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            detail={`Expected savings ${formatCurrency(month.projectedCommitmentAmount)}, minus ${formatCurrency(month.reserveBufferAmount)} kept aside`}
            label="Money to lend"
            value={formatCurrency(month.totalCapacityAmount)}
          />
          <SummaryCard
            detail={`${formatCurrency(month.quick.remainingAmount)} left`}
            label="Quick loans"
            value={formatCurrency(month.quick.budgetAmount)}
          />
          <SummaryCard
            detail={`${formatCurrency(month.normal.remainingAmount)} left`}
            label="Normal loans"
            value={formatCurrency(month.normal.budgetAmount)}
          />
        </div>
        {collectedShort ? (
          <p className="text-base text-muted-foreground">
            So far {formatCurrency(month.receivedContributionAmount)} (
            {Math.round(month.collectionCoverage * 100)}%) of expected savings
            has come in.
            {policy.disbursementRequiresDeployableFunds
              ? " Loans are paid out only when the money is in the account."
              : ""}
          </p>
        ) : null}
      </FinanceSettingsSection>

      <FinanceSettingsSection title="Loan types">
        <ul className="divide-y divide-border border-y border-border">
          {([products.quick, products.normal] as const).map((product) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 px-1 py-4 sm:px-3"
              key={product.loanType}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-semibold">
                  {getLoanTypeName(product.loanType)}
                  {product.name &&
                  product.name !== getLoanTypeName(product.loanType)
                    ? ` · ${product.name}`
                    : ""}
                </span>
                <span className="mt-1 block text-base text-muted-foreground">
                  {product.id ? getLoanProductWords(product) : "Not set up yet"}
                </span>
              </span>
              <OpenTenantFinanceSettingsSheet
                label={product.id ? "Change" : "Set up"}
                type={
                  product.loanType === "quick" ? "quickProduct" : "normalProduct"
                }
                variant={product.id ? "outline" : "default"}
              />
            </li>
          ))}
        </ul>
      </FinanceSettingsSection>

      <FinanceSettingsSection
        action={
          <OpenTenantFinanceSettingsSheet
            label="Change rules"
            type="financingPolicy"
          />
        }
        title="Loan rules"
      >
        <RequestFacts
          items={[
            {
              label: "Split of loan money",
              value: `Quick ${policy.quickLoanAllocationPercentage}% · Normal ${policy.normalLoanAllocationPercentage}%`,
            },
            {
              label: "Kept aside each month",
              value: formatCurrency(policy.reserveBufferAmount),
            },
            {
              label: "Most a member can borrow",
              value: `${formatMultiple(policy.loanEligibilityMultiple)} their savings`,
            },
            {
              label: "Approvals for each loan",
              value: policy.requiresDualLoanApproval ? "Two people" : "One person",
            },
          ]}
        />
      </FinanceSettingsSection>

      {historicalLoans}

      <TenantFinanceSettingsSheet
        financingSettings={financingSettings}
        tenantStartDate={null}
      />
    </FinanceSettingsFrame>
  )
}
