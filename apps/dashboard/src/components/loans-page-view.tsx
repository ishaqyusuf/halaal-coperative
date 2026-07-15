import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
} from "@/components/dashboard"
import { LoanColumnVisibility } from "@/components/loan-column-visibility"
import { OpenLoanRequestSheet } from "@/components/open-loan-sheet"
import { LoanSheet } from "@/components/sheets/loan-sheet"
import { WorkspacePageShell } from "@/components/dashboard"
import { LoanPortfolioTable } from "@/components/tables/loans/portfolio-table"
import { LoanRequestsTable } from "@/components/tables/loans/requests-table"
import { loadLoansPageData } from "@/lib/loans"
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
  dashboard,
  financingCycle,
  loanProducts,
  loanRequestCharges,
  loanRequests,
  loans,
  members,
  isMemberView,
  loanPortfolioTableSettings,
  loanRequestTableSettings,
  quickFillEnabled,
}: LoansPageViewProps) {
  const intakeDisabledReason =
    financingCycle.intakeStatus === "open"
      ? null
      : financingCycle.intakeStatus === "missing"
        ? "Open the current monthly financing cycle before accepting loan requests."
        : `The current monthly financing cycle is ${financingCycle.intakeStatus}; intake is closed.`
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
      eyebrow="Loans"
      title={isMemberView ? "My loans" : "Loan operations"}
      description={
        isMemberView
          ? "Request cooperative financing and track your submitted requests and approved loans."
          : "Review requests, approval history, liquidity posture, and approved loans from a denser credit-control workspace."
      }
    >
      {canSubmit ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <OpenLoanRequestSheet disabled={Boolean(intakeDisabledReason)} />
            }
            description={
              isMemberView
                ? "Choose the product, amount, term, and any extra monthly savings you want to keep while servicing the loan."
                : "Capture product, term months, expected monthly servicing, and extra savings commitment in one request."
            }
            eyebrow="Requests"
            title={
              isMemberView ? "Request a loan" : "Submit a new loan request"
            }
          />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Submit loan requests from a focused sheet so the page stays
            dedicated to capacity, review, and portfolio status.
          </p>
        </DashboardSectionCard>
      ) : null}

      {!isMemberView ? (
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <TrendPill
                tone={
                  financingCycle.intakeStatus === "open"
                    ? "positive"
                    : "warning"
                }
              >
                {financingCycle.intakeStatus === "open"
                  ? "intake open"
                  : "intake closed"}
              </TrendPill>
            }
            description="Monthly cycle capacity reserves submitted, under-review, and approved requests against quick and normal budgets."
            eyebrow="Cycle capacity"
            title="Current monthly financing capacity"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardStatCard
              detail={`${formatCurrency(financingCycle.quick.requestedReservedAmount)} requested or held`}
              label="Quick remaining"
              tone={
                financingCycle.quick.remainingAmount <= 0
                  ? "warning"
                  : "positive"
              }
              value={formatCurrency(financingCycle.quick.remainingAmount)}
            />
            <DashboardStatCard
              detail={`${formatCurrency(financingCycle.normal.requestedReservedAmount)} requested or held`}
              label="Normal remaining"
              tone={
                financingCycle.normal.remainingAmount <= 0
                  ? "warning"
                  : "positive"
              }
              value={formatCurrency(financingCycle.normal.remainingAmount)}
            />
            <DashboardStatCard
              detail={`${formatCurrency(financingCycle.deployableFunds.approvedHoldAmount)} approved holds excluded`}
              label="Deployable funds"
              tone={
                financingCycle.deployableFunds.deployableFunds > 0
                  ? "positive"
                  : "warning"
              }
              value={formatCurrency(
                financingCycle.deployableFunds.deployableFunds
              )}
            />
            <DashboardStatCard
              detail={`${Math.round(financingCycle.collectionCoverage * 100)}% of projected commitments collected`}
              label="Collections"
              tone={
                financingCycle.receivedContributionAmount >=
                financingCycle.projectedCommitmentAmount
                  ? "positive"
                  : "warning"
              }
              value={formatCurrency(financingCycle.receivedContributionAmount)}
            />
          </div>
          {financingCycle.warnings.length ? (
            <DashboardSurfaceCard className="mt-4 border-amber-200 bg-amber-50 text-amber-950">
              <p className="text-sm font-medium">Financing cycle warnings</p>
              <ul className="mt-2 space-y-1 text-sm">
                {financingCycle.warnings.map((warning) => (
                  <li key={warning.key}>{warning.label}</li>
                ))}
              </ul>
            </DashboardSurfaceCard>
          ) : null}
        </DashboardSectionCard>
      ) : null}

      {!isMemberView ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <DashboardStatCard
            detail="Currently approved, disbursed, or active loan records."
            label="Active loans"
            value={dashboard.activeLoans.toString()}
          />
          <DashboardStatCard
            detail="Current liquidity available for approved disbursement."
            label="Deployable funds"
            value={formatCurrency(
              financingCycle.deployableFunds.deployableFunds
            )}
          />
          <DashboardStatCard
            detail="Share of active facilities with overdue repayment items."
            label="Delinquency"
            tone={dashboard.delinquencyRate > 0.08 ? "warning" : "default"}
            value={`${Math.round(dashboard.delinquencyRate * 100)}%`}
          />
        </section>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <div className="flex items-center gap-2">
              <LoanColumnVisibility tableType="requests" />
              <TrendPill>{loanRequests.length} requests</TrendPill>
            </div>
          }
          description={
            isMemberView
              ? "Track requests you have submitted and their approval progress."
              : "Review request context, approval history, and monthly servicing before the request becomes a live loan."
          }
          eyebrow={isMemberView ? "Requests" : "Reviews"}
          title={isMemberView ? "My loan requests" : "Loan requests queue"}
        />
        <div className="mt-5">
          <LoanRequestsTable
            canReview={canReview}
            initialSettings={loanRequestTableSettings}
            memberId={fixedMember?.id}
          />
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          actions={
            <div className="flex items-center gap-2">
              <LoanColumnVisibility tableType="portfolio" />
              <TrendPill>{loans.length} loans</TrendPill>
            </div>
          }
          description={
            isMemberView
              ? "Review your approved principal, outstanding balance, and repayment status."
              : "Review live principal, outstanding balance, and liquidity warnings before disbursement."
          }
          eyebrow="Portfolio"
          title={
            isMemberView ? "My approved loans" : "Approved and active loans"
          }
        />
        <div className="mt-5">
          <LoanPortfolioTable
            availablePool={financingCycle.deployableFunds.deployableFunds}
            canReview={canReview}
            initialSettings={loanPortfolioTableSettings}
            memberId={fixedMember?.id}
          />
        </div>
      </DashboardSectionCard>

      <LoanSheet
        devMode={quickFillEnabled}
        disabledReason={intakeDisabledReason}
        fixedMember={fixedMember}
        loanProducts={loanProductOptions}
        loanRequestCharges={loanRequestCharges}
        members={memberOptions}
      />
    </WorkspacePageShell>
  )
}
