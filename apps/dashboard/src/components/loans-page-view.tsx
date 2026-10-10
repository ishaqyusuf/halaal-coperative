"use client"

import { formatCurrency } from "@halaalvest/utils"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { LoansToolbar } from "@/components/loans-mobile-toolbar"
import { OpenLoanRequestSheet } from "@/components/open-loan-sheet"
import { LoanSheet } from "@/components/sheets/loan-sheet"
import { LoansDataView } from "@/components/tables/loans/data-view"
import { useLoanFilterParams } from "@/hooks/use-loan-filter-params"
import type { loadLoansPageData } from "@/lib/loans"
import type { TableSettings } from "@/utils/table-settings"

type LoansPageData = Extract<
  Awaited<ReturnType<typeof loadLoansPageData>>,
  { state: "ready" }
>

type LoansPageViewProps = LoansPageData & {
  loanPortfolioTableSettings?: Partial<TableSettings>
  loanRequestTableSettings?: Partial<TableSettings>
}

export function LoansUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Loans"
      title="Loan operations"
      description="The loan workspace is staged for request review, approval sequencing, and liquidity-aware disbursement."
    >
      <WorkspaceEmptyState
        title="Loan workflows need the database runtime."
        body="Once the database-backed environment is active, this route will manage requests, approvals, disbursement, and repayment setup."
      />
    </WorkspacePageShell>
  )
}

export function LoansPageView({
  canReview,
  canSubmit,
  financingCycle,
  loanProducts,
  loanRequestCharges,
  members,
  isMemberView,
  loanPortfolioTableSettings,
  loanRequestTableSettings,
  quickFillEnabled,
  submissionBlockedReason,
}: LoansPageViewProps) {
  const { filter } = useLoanFilterParams()
  const activeView = filter.view ?? "requests"
  const intakeDisabledReason =
    financingCycle.intakeStatus === "open"
      ? null
      : financingCycle.intakeStatus === "missing"
        ? "Open the current monthly financing cycle before accepting loan requests."
        : `The current monthly financing cycle is ${financingCycle.intakeStatus}; intake is closed.`
  const effectiveDisabledReason =
    submissionBlockedReason ?? intakeDisabledReason
  const productUsageByType = {
    normal: financingCycle.normal,
    quick: financingCycle.quick,
  }
  const loanProductOptions = loanProducts.map((product) => {
    const codePrefix = product.code ? `${product.code} - ` : ""
    const remainingAmount = formatCurrency(
      productUsageByType[product.loanType].remainingAmount
    )

    return {
      id: product.id,
      label: `${codePrefix}${product.name} (up to ${product.termMonths} months, ${remainingAmount} remaining)`,
    }
  })
  const memberOptions = members.items.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }))
  const fixedMember =
    isMemberView && members.items[0]
      ? {
          id: members.items[0].id,
          label: `${members.items[0].fullName} (${members.items[0].memberNumber})`,
        }
      : undefined

  return (
    <WorkspacePageShell
      actions={
        canSubmit ? (
          <div className="hidden md:block">
            <OpenLoanRequestSheet disabled={Boolean(effectiveDisabledReason)} />
          </div>
        ) : undefined
      }
      eyebrow="Loans"
      title={isMemberView ? "My loans" : "Loans"}
      description={
        isMemberView
          ? "Request cooperative financing and track your submitted requests and approved loans."
          : "Review financing requests and manage approved loans from one focused workspace."
      }
    >
      {submissionBlockedReason ? (
        <div className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {submissionBlockedReason}
        </div>
      ) : null}

      {effectiveDisabledReason && !submissionBlockedReason ? (
        <p
          className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 md:hidden"
          id="loan-intake-blocker"
        >
          {effectiveDisabledReason}
        </p>
      ) : null}

      {!isMemberView && activeView === "requests" ? (
        <section
          aria-label="Loan request capacity"
          className="hidden border-y border-border/70 md:block"
        >
          <div className="grid grid-cols-4 divide-x divide-border/70">
            <LoanSummaryMetric
              detail={`${formatCurrency(financingCycle.quick.requestedReservedAmount)} reserved`}
              label="Quick capacity"
              value={formatCurrency(financingCycle.quick.remainingAmount)}
            />
            <LoanSummaryMetric
              detail={`${formatCurrency(financingCycle.normal.requestedReservedAmount)} reserved`}
              label="Normal capacity"
              value={formatCurrency(financingCycle.normal.remainingAmount)}
            />
            <LoanSummaryMetric
              detail={`${formatCurrency(financingCycle.deployableFunds.approvedHoldAmount)} held for approvals`}
              label="Deployable funds"
              value={formatCurrency(
                financingCycle.deployableFunds.deployableFunds
              )}
            />
            <LoanSummaryMetric
              detail={
                financingCycle.intakeStatus === "open"
                  ? "Accepting financing requests"
                  : "Financing requests are paused"
              }
              label="Intake status"
              value={
                financingCycle.intakeStatus === "open"
                  ? "Open"
                  : financingCycle.intakeStatus.replace(/_/g, " ")
              }
            />
          </div>
          {financingCycle.warnings.length ? (
            <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {financingCycle.warnings
                .map((warning) => warning.label)
                .join(" · ")}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden border-b border-border md:border-y">
        <div className="px-0 py-4 md:px-4">
          <LoansToolbar
            canSubmit={canSubmit}
            intakeDisabled={Boolean(effectiveDisabledReason)}
            intakeDisabledReason={effectiveDisabledReason}
          />
        </div>
        <LoansDataView
          availablePool={financingCycle.deployableFunds.deployableFunds}
          canReview={canReview}
          initialPortfolioSettings={loanPortfolioTableSettings}
          initialRequestSettings={loanRequestTableSettings}
          memberId={fixedMember?.id}
        />
      </section>

      <LoanSheet
        devMode={quickFillEnabled}
        disabledReason={effectiveDisabledReason}
        fixedMember={fixedMember}
        loanProducts={loanProductOptions}
        loanRequestCharges={loanRequestCharges}
        members={memberOptions}
      />
    </WorkspacePageShell>
  )
}

function LoanSummaryMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 px-4 py-4 xl:px-5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-semibold text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
