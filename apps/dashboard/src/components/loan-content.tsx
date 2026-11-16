"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { formatCurrency } from "@halaalvest/utils"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  GuarantorAnswerConfirm,
  LoanDecisionConfirm,
  LoanPayOutConfirm,
  LoanRequestForm,
  type LoanProductChoice,
} from "@/components/forms/loan-forms"
import { LoanFacts, LoanStatusWord } from "@/components/loans/loan-status-word"
import { useLoanParams } from "@/hooks/use-loan-params"
import {
  getGuarantorSummary,
  getGuarantorWord,
  getInstallmentWord,
  getLoanRequestWord,
  getLoanWord,
  isInstallmentLate,
} from "@/lib/loans/loan-words"
import { canFinalizeLoanRequest } from "@/lib/loans/loan-action-guards"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

export type LoanMemberOption = { id: string; label: string }

export type LoanContentProps = {
  /** Money available to lend now (deployable funds). */
  availablePool: number
  canReview: boolean
  devMode: boolean
  disabledReason?: string | null
  fixedMember?: LoanMemberOption
  loanProducts: LoanProductChoice[]
}

function useCompleteLoanWorkflow() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const trpc = useTRPC()
  const { setParams } = useLoanParams()

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries(trpc.loans.requests.infiniteQueryFilter()),
      queryClient.invalidateQueries(trpc.loans.portfolio.infiniteQueryFilter()),
      queryClient.invalidateQueries(trpc.loans.request.queryFilter()),
      queryClient.invalidateQueries(trpc.loans.loan.queryFilter()),
    ])
    await setParams(null)
    router.refresh()
  }
}

function LoadingLine() {
  return <p className="py-6 text-base text-muted-foreground">Loading…</p>
}

function NotFound({ what }: { what: string }) {
  return (
    <p className="border-y border-border py-6 text-base text-muted-foreground">
      This {what} could not be found.
    </p>
  )
}

function money(value: number | string | null | undefined) {
  return formatCurrency(Number(value ?? 0))
}

function requestSummary(request: {
  member: { fullName: string }
  requestedAmount: number | string
  requestedTermMonths: number
}) {
  return `${request.member.fullName} · ${money(request.requestedAmount)} over ${request.requestedTermMonths} month${request.requestedTermMonths === 1 ? "" : "s"}`
}

/** Why a request cannot be approved yet, from its guarantors' answers. */
function getApprovalBlocker(
  guarantors: Array<{ guarantorMember: { fullName: string }; status: string }>
) {
  const summary = getGuarantorSummary(guarantors)
  return summary.tone === "attention" || summary.tone === "bad"
    ? `${summary.label}. A loan can be approved once every guarantor agrees.`
    : null
}

function useLoanRequest(loanRequestId: string | null) {
  const trpc = useTRPC()
  return useQuery(
    trpc.loans.request.queryOptions(
      { loanRequestId: loanRequestId ?? "" },
      { enabled: Boolean(loanRequestId) }
    )
  )
}

function useLoan(loanId: string | null) {
  const trpc = useTRPC()
  return useQuery(
    trpc.loans.loan.queryOptions(
      { loanId: loanId ?? "" },
      { enabled: Boolean(loanId) }
    )
  )
}

/* ------------------------------------------------------------------------ */
/* Request details (sheet)                                                   */
/* ------------------------------------------------------------------------ */

function LoanRequestDetails({
  canReview,
  loanRequestId,
}: {
  canReview: boolean
  loanRequestId: string
}) {
  const { open } = useLoanParams()
  const { data: request, isLoading } = useLoanRequest(loanRequestId)

  if (isLoading) return <LoadingLine />
  if (!request) return <NotFound what="request" />

  const word = getLoanRequestWord(request.status)
  const canAct = canReview && canFinalizeLoanRequest(request.status)
  const blocker = getApprovalBlocker(request.guarantorApprovals)
  const chargeTotal = request.charges.reduce(
    (total, charge) => total + Number(charge.amount ?? 0),
    0
  )

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-semibold text-foreground">
          {request.member.fullName}
        </p>
        <LoanStatusWord word={word} />
      </div>

      <LoanFacts
        rows={[
          { label: "Amount", value: money(request.requestedAmount) },
          {
            label: "Months to pay back",
            value: `${request.requestedTermMonths}`,
          },
          {
            label: "Pays back each month",
            value: money(request.estimatedMonthlyServicing),
          },
          Number(request.extraMonthlySavingsAmount) > 0 && {
            label: "Extra savings each month",
            value: money(request.extraMonthlySavingsAmount),
          },
          { label: "Type of loan", value: request.loanProduct.name },
          {
            label: "Asked on",
            value: formatDayMonthYear(request.requestedAt) ?? "—",
          },
          request.charges.length > 0 && {
            label: "Charges",
            value: money(chargeTotal),
          },
          request.purpose ? { label: "For", value: request.purpose } : null,
          request.reviewNotes
            ? { label: "Note", value: request.reviewNotes }
            : null,
        ]}
      />

      <section className="grid gap-3">
        <h3 className="text-lg font-semibold text-foreground">Guarantors</h3>
        {request.guarantorApprovals.length === 0 ? (
          <p className="text-base text-muted-foreground">No guarantors.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {request.guarantorApprovals.map((guarantor) => (
              <li className="grid gap-3 py-3" key={guarantor.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-base font-medium text-foreground">
                    {guarantor.guarantorMember.fullName}
                  </span>
                  <LoanStatusWord word={getGuarantorWord(guarantor.status)} />
                </div>
                {guarantor.responseNotes ? (
                  <p className="text-base text-muted-foreground">
                    {guarantor.responseNotes}
                  </p>
                ) : null}
                {canReview && guarantor.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="touch"
                      onClick={() =>
                        void open({
                          guarantorApprovalId: guarantor.id,
                          guarantorReviewStatus: "approved",
                          loanRequestId: request.id,
                          loanSheetType: "guarantor",
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      They agreed
                    </Button>
                    <Button
                      size="touch"
                      onClick={() =>
                        void open({
                          guarantorApprovalId: guarantor.id,
                          guarantorReviewStatus: "rejected",
                          loanRequestId: request.id,
                          loanSheetType: "guarantor",
                        })
                      }
                      type="button"
                      variant="outline"
                    >
                      They said no
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAct ? (
        <div className="grid gap-3 border-t border-border pt-4">
          {blocker ? (
            <p className="text-base text-amber-900">{blocker}</p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              className="h-12 text-base"
              disabled={Boolean(blocker)}
              onClick={() =>
                void open({
                  loanRequestId: request.id,
                  loanReviewStatus: "approved",
                  loanSheetType: "review",
                })
              }
              type="button"
            >
              Approve
            </Button>
            <Button
              className="h-12 text-base"
              onClick={() =>
                void open({
                  loanRequestId: request.id,
                  loanReviewStatus: "rejected",
                  loanSheetType: "review",
                })
              }
              type="button"
              variant="outline"
            >
              Decline
            </Button>
            {request.status === "submitted" ? (
              <Button
                className="h-12 text-base"
                onClick={() =>
                  void open({
                    loanRequestId: request.id,
                    loanReviewStatus: "under_review",
                    loanSheetType: "review",
                  })
                }
                type="button"
                variant="ghost"
              >
                Mark as being checked
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Loan details (sheet)                                                      */
/* ------------------------------------------------------------------------ */

function LoanDetails({
  availablePool,
  canReview,
  loanId,
}: {
  availablePool: number
  canReview: boolean
  loanId: string
}) {
  const { open } = useLoanParams()
  const { data: loan, isLoading } = useLoan(loanId)

  if (isLoading) return <LoadingLine />
  if (!loan) return <NotFound what="loan" />

  const principal = Number(loan.principalAmount)
  const outstanding = Number(loan.outstandingPrincipal)
  const schedule = loan.repaymentScheduleItems
  const next = schedule.find(
    (item) => item.status !== "paid" && item.status !== "waived"
  )
  const lateCount = schedule.filter((item) =>
    isInstallmentLate(item.dueAt, item.status)
  ).length
  const isLive = loan.status === "active" || loan.status === "disbursed"

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-semibold text-foreground">
          {"member" in loan && loan.member ? loan.member.fullName : "Your loan"}
        </p>
        <LoanStatusWord word={getLoanWord(loan.status)} />
      </div>

      <LoanFacts
        rows={[
          { label: "Still owed", value: money(outstanding) },
          isLive && {
            label: "Paid so far",
            value: money(principal - outstanding),
          },
          { label: "Amount lent", value: money(principal) },
          {
            label: "Pays back each month",
            value: money(loan.estimatedMonthlyServicing),
          },
          next && {
            label: "Next payment",
            value: `${money(Number(next.totalDue) - Number(next.amountPaid))} on ${formatDayMonthYear(next.dueAt) ?? "—"}`,
          },
          lateCount > 0 && {
            label: "Late payments",
            value: <span className="text-red-800">{lateCount}</span>,
          },
          { label: "Months", value: `${loan.termMonths}` },
          { label: "Type of loan", value: loan.loanProduct.name },
          loan.disbursedAt && {
            label: "Paid out on",
            value: formatDayMonthYear(loan.disbursedAt) ?? "—",
          },
        ]}
      />

      {canReview && (loan.status === "approved" || isLive) ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {loan.status === "approved" ? (
            <Button
              className="h-12 text-base"
              onClick={() =>
                void open({ loanId: loan.id, loanSheetType: "disburse" })
              }
              type="button"
            >
              Pay out
            </Button>
          ) : (
            <Link
              className={cn(buttonVariants(), "h-12 text-base")}
              href={`/repayments?repaymentSheetType=post&loanId=${loan.id}`}
            >
              Record a repayment
            </Link>
          )}
          {loan.status === "approved" && principal > availablePool ? (
            <p className="text-base text-amber-900">
              More than the {money(availablePool)} available to lend.
            </p>
          ) : null}
        </div>
      ) : null}

      {schedule.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="text-lg font-semibold text-foreground">
            Payment plan
          </h3>
          <ol className="divide-y divide-border border-y border-border">
            {schedule.map((item) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-base"
                key={item.id}
              >
                <span className="min-w-0 text-foreground">
                  {formatDayMonthYear(item.dueAt)}
                  <span className="text-muted-foreground">
                    {" "}
                    · {money(item.totalDue)}
                  </span>
                </span>
                <LoanStatusWord
                  word={getInstallmentWord(
                    item.status,
                    isInstallmentLate(item.dueAt, item.status)
                  )}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* Confirms                                                                  */
/* ------------------------------------------------------------------------ */

function DecisionConfirm({
  decision,
  loanRequestId,
  onSuccess,
}: {
  decision: "approved" | "rejected" | "under_review"
  loanRequestId: string
  onSuccess: () => Promise<void>
}) {
  const { data: request } = useLoanRequest(loanRequestId)

  return (
    <LoanDecisionConfirm
      blockedReason={
        request ? getApprovalBlocker(request.guarantorApprovals) : null
      }
      decision={decision}
      loanRequestId={loanRequestId}
      onSuccess={onSuccess}
      summary={request ? requestSummary(request) : undefined}
    />
  )
}

function GuarantorConfirm({
  answer,
  guarantorApprovalId,
  loanRequestId,
  onSuccess,
}: {
  answer: "approved" | "rejected"
  guarantorApprovalId: string
  loanRequestId: string | null
  onSuccess: () => Promise<void>
}) {
  const { data: request } = useLoanRequest(loanRequestId)
  const guarantor = request?.guarantorApprovals.find(
    (row) => row.id === guarantorApprovalId
  )

  return (
    <GuarantorAnswerConfirm
      answer={answer}
      guarantorApprovalId={guarantorApprovalId}
      guarantorName={guarantor?.guarantorMember.fullName}
      onSuccess={onSuccess}
      summary={request ? `Guarantor for ${requestSummary(request)}` : undefined}
    />
  )
}

function PayOutConfirm({
  availablePool,
  loanId,
  onSuccess,
}: {
  availablePool: number
  loanId: string
  onSuccess: () => Promise<void>
}) {
  const { data: loan } = useLoan(loanId)
  const amount = loan ? Number(loan.principalAmount) : undefined

  return (
    <LoanPayOutConfirm
      amount={amount}
      loanId={loanId}
      memberName={loan && "member" in loan ? loan.member?.fullName : undefined}
      onSuccess={onSuccess}
      shortfall={
        amount !== undefined && amount > availablePool
          ? `Only ${money(availablePool)} is available to lend. Paying out may be refused.`
          : null
      }
    />
  )
}

/** "Ask for a loan" with its charges, read only while the form is open. */
function LoanRequestFormWithCharges(
  props: Omit<Parameters<typeof LoanRequestForm>[0], "loanRequestCharges">
) {
  const trpc = useTRPC()
  const { data: loanRequestCharges } = useQuery(
    trpc.loans.chargeOptions.queryOptions(undefined, {
      retry: 1,
      staleTime: 5 * 60_000,
    })
  )

  return <LoanRequestForm {...props} loanRequestCharges={loanRequestCharges} />
}

export function LoanContent({
  availablePool,
  canReview,
  devMode,
  disabledReason,
  fixedMember,
  loanProducts,
}: LoanContentProps) {
  const completeLoanWorkflow = useCompleteLoanWorkflow()
  const {
    guarantorApprovalId,
    guarantorReviewStatus,
    loanId,
    loanRequestId,
    loanReviewStatus,
    loanSheetType,
  } = useLoanParams()

  if (loanSheetType === "request") {
    return (
      <LoanRequestFormWithCharges
        devMode={devMode}
        disabledReason={disabledReason}
        fixedMember={fixedMember}
        loanProducts={loanProducts}
        onSuccess={completeLoanWorkflow}
      />
    )
  }

  if (loanSheetType === "request-details" && loanRequestId) {
    return (
      <LoanRequestDetails canReview={canReview} loanRequestId={loanRequestId} />
    )
  }

  if (loanSheetType === "loan-details" && loanId) {
    return (
      <LoanDetails
        availablePool={availablePool}
        canReview={canReview}
        loanId={loanId}
      />
    )
  }

  if (loanSheetType === "review" && loanRequestId && loanReviewStatus) {
    return (
      <DecisionConfirm
        decision={loanReviewStatus}
        loanRequestId={loanRequestId}
        onSuccess={completeLoanWorkflow}
      />
    )
  }

  if (
    loanSheetType === "guarantor" &&
    guarantorApprovalId &&
    guarantorReviewStatus
  ) {
    return (
      <GuarantorConfirm
        answer={guarantorReviewStatus}
        guarantorApprovalId={guarantorApprovalId}
        loanRequestId={loanRequestId}
        onSuccess={completeLoanWorkflow}
      />
    )
  }

  if (loanSheetType === "disburse" && loanId) {
    return (
      <PayOutConfirm
        availablePool={availablePool}
        loanId={loanId}
        onSuccess={completeLoanWorkflow}
      />
    )
  }

  return <NotFound what="item" />
}
