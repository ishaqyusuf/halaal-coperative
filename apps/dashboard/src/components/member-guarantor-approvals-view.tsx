import type { GuarantorRequestForMember } from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { WorkspaceEmptyState } from "@/components/dashboard"
import { LoanFacts, LoanStatusWord } from "@/components/loans/loan-status-word"
import { OpenGuarantorApprovalSheet } from "@/components/open-guarantor-approval-sheet"
import { formatDayMonthYear } from "@/utils/format"

const answerWords = {
  approved: { label: "You agreed", tone: "good" },
  pending: { label: "Waiting for you", tone: "attention" },
  rejected: { label: "You said no", tone: "default" },
} as const

function GuarantorRequestCard({
  canAnswer,
  request,
}: {
  canAnswer: boolean
  request: GuarantorRequestForMember
}) {
  const pending = request.status === "pending" && canAnswer
  const loan = request.loanRequest

  return (
    <li className="grid gap-4 rounded-(--ui-radius-surface) border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xl font-semibold text-foreground">
          {loan.member.fullName}
        </p>
        <LoanStatusWord word={answerWords[request.status]} />
      </div>
      <LoanFacts
        rows={[
          { label: "Loan", value: formatCurrency(loan.requestedAmount) },
          {
            label: "Pays back",
            value: `${formatCurrency(loan.estimatedMonthlyServicing)} a month for ${loan.requestedTermMonths} months`,
          },
          loan.purpose ? { label: "For", value: loan.purpose } : null,
          {
            label: "Asked on",
            value: formatDayMonthYear(request.requestedAt) ?? "—",
          },
          request.responseNotes
            ? { label: "Your note", value: request.responseNotes }
            : null,
        ]}
      />
      {pending ? (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <OpenGuarantorApprovalSheet approvalId={request.id} status="rejected" />
          <OpenGuarantorApprovalSheet approvalId={request.id} status="approved" />
        </div>
      ) : null}
    </li>
  )
}

export function MemberGuarantorApprovalsView({
  canAnswer,
  requests,
}: {
  canAnswer: boolean
  requests: GuarantorRequestForMember[]
}) {
  if (!requests.length) {
    return (
      <WorkspaceEmptyState
        body="When a member asks you to be their guarantor, it shows here."
        title="Nobody has asked you yet."
      />
    )
  }

  const waiting = requests.filter((request) => request.status === "pending")

  return (
    <div className="grid gap-4">
      <p className="text-lg text-foreground">
        {waiting.length === 0
          ? "You have answered every request."
          : waiting.length === 1
            ? "1 request is waiting for your answer."
            : `${waiting.length} requests are waiting for your answer.`}{" "}
        <span className="text-muted-foreground">
          A guarantor promises to help if the member stops paying.
        </span>
      </p>
      {canAnswer ? null : (
        <p className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-base text-amber-950">
          You can answer once the cooperative has checked your details. Please
          contact the cooperative.
        </p>
      )}
      <ul className="grid gap-4">
        {requests.map((request) => (
          <GuarantorRequestCard
            canAnswer={canAnswer}
            key={request.id}
            request={request}
          />
        ))}
      </ul>
    </div>
  )
}
