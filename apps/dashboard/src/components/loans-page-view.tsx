"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { LoansToolbar } from "@/components/loans-mobile-toolbar"
import { OpenLoanRequestSheet } from "@/components/open-loan-sheet"
import { LoanSheet } from "@/components/sheets/loan-sheet"
import { SummaryCard } from "@/components/summary-card"
import { LoansDataView } from "@/components/tables/loans/data-view"
import type { LoansPageData } from "@/lib/loans/load-loans-page"
import type { TableSettings } from "@/utils/table-settings"

type ReadyLoansPageData = Extract<LoansPageData, { state: "ready" }>

type LoansPageViewProps = ReadyLoansPageData & {
  loanPortfolioTableSettings?: Partial<TableSettings>
  loanRequestTableSettings?: Partial<TableSettings>
}

export function LoansUnavailableView() {
  return (
    <WorkspacePageShell
      description="Loans are not available right now."
      eyebrow="Loans"
      title="Loans"
    >
      <WorkspaceEmptyState
        body="Please try again later."
        title="Loans cannot be shown right now."
      />
    </WorkspacePageShell>
  )
}

function Notice({
  action,
  children,
}: {
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-y border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <p>{children}</p>
      {action}
    </div>
  )
}

export function LoansPageView({
  availablePool,
  canReview,
  canSubmit,
  capacity,
  fixedMember,
  intakeFix,
  isMemberView,
  loanPortfolioTableSettings,
  loanProducts,
  loanRequestTableSettings,
  pendingGuarantorCount,
  quickFillEnabled,
  requestBlockedReason,
}: LoansPageViewProps) {
  return (
    <WorkspacePageShell
      actions={
        canSubmit ? (
          <OpenLoanRequestSheet
            className="hidden md:inline-flex"
            disabled={Boolean(requestBlockedReason)}
          />
        ) : undefined
      }
      description={
        isMemberView
          ? "Ask for a loan and see what you owe."
          : "Check loan requests and pay out approved loans."
      }
      eyebrow="Loans"
      title={isMemberView ? "My loans" : "Loans"}
    >
      {canSubmit ? (
        <OpenLoanRequestSheet
          className="h-12 w-full md:hidden"
          disabled={Boolean(requestBlockedReason)}
        />
      ) : null}

      {pendingGuarantorCount > 0 ? (
        <Notice
          action={
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 shrink-0 bg-background text-base"
              )}
              href="/guarantor-approvals"
            >
              Answer now
            </Link>
          }
        >
          {pendingGuarantorCount === 1
            ? "A member asked you to be their guarantor."
            : `${pendingGuarantorCount} members asked you to be their guarantor.`}
        </Notice>
      ) : null}

      {requestBlockedReason && (canSubmit || isMemberView) ? (
        <Notice
          action={
            intakeFix ? (
              <Link
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 shrink-0 bg-background text-base"
                )}
                href={intakeFix.href}
              >
                {intakeFix.label}
              </Link>
            ) : undefined
          }
        >
          <span id="loan-intake-blocker">{requestBlockedReason}</span>
        </Notice>
      ) : null}

      {capacity ? (
        <section aria-label="Money to lend" className="grid gap-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="col-span-2 md:col-span-1">
              <SummaryCard
                detail={
                  capacity.approvedHoldAmount > 0
                    ? `${formatCurrency(capacity.approvedHoldAmount)} kept for approved loans`
                    : undefined
                }
                label="Can lend now"
                tone={capacity.canLendNow > 0 ? "good" : "attention"}
                value={formatCurrency(capacity.canLendNow)}
              />
            </div>
            <SummaryCard
              compact
              label="Quick loans left"
              value={formatCurrency(capacity.quickLeft)}
            />
            <SummaryCard
              compact
              label="Normal loans left"
              value={formatCurrency(capacity.normalLeft)}
            />
          </div>
          {capacity.warnings.length ? (
            <ul className="grid gap-1 text-base text-amber-900">
              {capacity.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="min-w-0 overflow-hidden border-b border-border md:border-y">
        <div className="px-0 py-4 md:px-4">
          <LoansToolbar />
        </div>
        <LoansDataView
          canReview={canReview}
          initialPortfolioSettings={loanPortfolioTableSettings}
          initialRequestSettings={loanRequestTableSettings}
          isMemberView={isMemberView}
          memberId={fixedMember?.id}
        />
      </section>

      <LoanSheet
        availablePool={availablePool}
        canReview={canReview}
        devMode={quickFillEnabled}
        disabledReason={requestBlockedReason}
        fixedMember={fixedMember}
        loanProducts={loanProducts}
      />
    </WorkspacePageShell>
  )
}
