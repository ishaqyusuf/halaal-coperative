import { formatCurrency } from "@halaalvest/utils"
import type { listMemberLoanGuarantorApprovals } from "@halaalvest/db"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  TrendPill,
  WorkspaceEmptyState,
} from "@/components/dashboard"
import { OpenGuarantorApprovalSheet } from "@/components/open-guarantor-approval-sheet"

type GuarantorApproval = Awaited<
  ReturnType<typeof listMemberLoanGuarantorApprovals>
>[number]

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not recorded"

  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusTone(status: string): "neutral" | "positive" | "warning" {
  if (status === "approved") return "positive"
  if (status === "rejected") return "warning"
  return "neutral"
}

function displayStatus(status: string) {
  return status.replace(/_/g, " ")
}

function GuarantorApprovalRow({
  approval,
}: {
  approval: GuarantorApproval
}) {
  const pending = approval.status === "pending"

  return (
    <div className="border border-border/70 bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {approval.loanRequest.member.fullName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {approval.loanRequest.member.memberNumber} ·{" "}
            {approval.loanRequest.loanProduct.name}
          </p>
        </div>
        <TrendPill tone={statusTone(approval.status)}>
          {displayStatus(approval.status)}
        </TrendPill>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MiniMetric
          label="Requested"
          value={formatCurrency(Number(approval.loanRequest.requestedAmount))}
        />
        <MiniMetric
          label="Monthly"
          value={formatCurrency(
            Number(approval.loanRequest.estimatedMonthlyServicing)
          )}
        />
        <MiniMetric
          label="Requested on"
          value={formatDate(approval.requestedAt)}
        />
      </div>
      {approval.loanRequest.purpose ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {approval.loanRequest.purpose}
        </p>
      ) : null}
      {approval.responseNotes ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-foreground">
          Response note: {approval.responseNotes}
        </p>
      ) : null}
      {pending ? (
        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
          <OpenGuarantorApprovalSheet
            approvalId={approval.id}
            status="rejected"
          />
          <OpenGuarantorApprovalSheet
            approvalId={approval.id}
            status="approved"
          />
        </div>
      ) : null}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/70 bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground">
        {value}
      </p>
    </div>
  )
}

export function MemberGuarantorApprovalsView({
  approvals,
}: {
  approvals: GuarantorApproval[]
}) {
  const pendingCount = approvals.filter(
    (approval) => approval.status === "pending"
  ).length

  if (!approvals.length) {
    return (
      <WorkspaceEmptyState
        body="No financing request currently lists you as guarantor."
        title="No guarantor requests."
      />
    )
  }

  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        actions={<TrendPill>{pendingCount} pending</TrendPill>}
        eyebrow="Guarantor"
        title="Requests requiring your response"
      />
      <div className="mt-5 grid gap-3">
        {approvals.map((approval) => (
          <GuarantorApprovalRow approval={approval} key={approval.id} />
        ))}
      </div>
    </DashboardSectionCard>
  )
}
